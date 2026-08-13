type SequenceFrameSource = ImageBitmap | HTMLImageElement

type SequenceDirection = -1 | 0 | 1

interface CachedFrame {
  source: SequenceFrameSource
  lastUsed: number
}

interface PendingFrame {
  abortController: AbortController
  requestedAt: number
}

interface SequenceDiagnostic {
  type: 'target' | 'cache-hit' | 'decoded' | 'drawn' | 'stale' | 'evicted'
  timestamp: number
  desiredFrame: number
  drawnFrame: number | null
  frame?: number
  direction: SequenceDirection
  cacheSize: number
  pendingCount: number
  cacheHits: number
  cacheMisses: number
  staleFramesSuppressed: number
  decodeLatencyMs?: number
  drawLatencyMs?: number
  targetSettleMs?: number
}

declare global {
  interface Window {
    __HLENS_SEQUENCE_DIAGNOSTICS__?: boolean
  }
}

interface CinematicSequenceRendererOptions {
  canvas: HTMLCanvasElement
  frameCount: number
  frameUrl: (frame: number) => string
  onFirstFrame?: () => void
}

const FRAME_WIDTH = 1920
const FRAME_HEIGHT = 1080

export class CinematicSequenceRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly frameCount: number
  private readonly frameUrl: (frame: number) => string
  private readonly onFirstFrame?: () => void
  private readonly cache = new Map<number, CachedFrame>()
  private readonly pending = new Map<number, PendingFrame>()

  private desiredFrame = 0
  private drawnFrame: number | null = null
  private direction: SequenceDirection = 0
  private generation = 0
  private destroyed = false
  private firstFrameDrawn = false
  private cacheHits = 0
  private cacheMisses = 0
  private staleFramesSuppressed = 0
  private targetChangedAt = performance.now()
  private resizeObserver: ResizeObserver
  private workQueue: number[] = []
  private maxCacheSize = 14
  private maxConcurrentLoads = 3
  private lookAhead = 8
  private lookBehind = 4

  constructor({
    canvas,
    frameCount,
    frameUrl,
    onFirstFrame,
  }: CinematicSequenceRendererOptions) {
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!context) throw new Error('Canvas 2D context is unavailable')

    this.canvas = canvas
    this.context = context
    this.frameCount = frameCount
    this.frameUrl = frameUrl
    this.onFirstFrame = onFirstFrame
    this.configureForViewport()
    this.resizeCanvas()

    this.resizeObserver = new ResizeObserver(() => {
      this.configureForViewport()
      this.resizeCanvas()
      if (this.drawnFrame !== null) this.drawCachedFrame(this.drawnFrame)
    })
    this.resizeObserver.observe(canvas)
  }

  setProgress(progress: number) {
    if (this.destroyed) return

    const normalizedProgress = Math.min(1, Math.max(0, progress))
    this.setTargetFrame(Math.round(normalizedProgress * (this.frameCount - 1)))
  }

  setTargetFrame(frame: number) {
    if (this.destroyed) return

    const nextFrame = this.clampFrame(frame)
    const previousFrame = this.desiredFrame
    if (nextFrame !== previousFrame) {
      this.direction = Math.sign(nextFrame - previousFrame) as SequenceDirection
      this.desiredFrame = nextFrame
      this.targetChangedAt = performance.now()
      this.generation += 1
      this.emitDiagnostic('target', nextFrame)
    }

    const cached = this.cache.get(nextFrame)
    if (cached) {
      this.cacheHits += 1
      cached.lastUsed = performance.now()
      this.emitDiagnostic('cache-hit', nextFrame)
      this.drawCachedFrame(nextFrame)
    } else {
      this.cacheMisses += 1
    }

    this.rebuildWorkQueue()
    this.abortObsoleteLoads()
    this.pumpLoads()
  }

  destroy() {
    this.destroyed = true
    this.resizeObserver.disconnect()
    this.pending.forEach(({ abortController }) => abortController.abort())
    this.pending.clear()
    this.cache.forEach(({ source }) => this.releaseSource(source))
    this.cache.clear()
    this.workQueue = []
  }

  private configureForViewport() {
    const width = window.innerWidth
    if (width <= 720) {
      this.maxCacheSize = 8
      this.maxConcurrentLoads = 2
      this.lookAhead = 4
      this.lookBehind = 2
    } else if (width <= 1024) {
      this.maxCacheSize = 11
      this.maxConcurrentLoads = 2
      this.lookAhead = 6
      this.lookBehind = 3
    } else {
      this.maxCacheSize = 14
      this.maxConcurrentLoads = 3
      this.lookAhead = 8
      this.lookBehind = 4
    }
  }

  private resizeCanvas() {
    const bounds = this.canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return

    const dprCap = window.innerWidth <= 720 ? 1 : 1.25
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
    const width = Math.max(1, Math.round(bounds.width * dpr))
    const height = Math.max(1, Math.round(bounds.height * dpr))

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  private rebuildWorkQueue() {
    this.workQueue = this.getWantedFrames().filter(
      (frame) => !this.cache.has(frame) && !this.pending.has(frame),
    )
  }

  private getWantedFrames() {
    const wanted: number[] = [this.desiredFrame]
    const primaryDirection = this.direction || 1

    for (let offset = 1; offset <= this.lookAhead; offset += 1) {
      wanted.push(this.clampFrame(this.desiredFrame + primaryDirection * offset))
    }
    for (let offset = 1; offset <= this.lookBehind; offset += 1) {
      wanted.push(this.clampFrame(this.desiredFrame - primaryDirection * offset))
    }

    return [...new Set(wanted)]
  }

  private abortObsoleteLoads() {
    const retainedFrames = new Set<number>([this.desiredFrame])
    const radius = Math.max(this.lookAhead, this.lookBehind)
    for (let offset = 1; offset <= radius; offset += 1) {
      retainedFrames.add(this.clampFrame(this.desiredFrame + offset))
      retainedFrames.add(this.clampFrame(this.desiredFrame - offset))
    }

    this.pending.forEach(({ abortController }, frame) => {
      if (!retainedFrames.has(frame)) abortController.abort()
    })

    if (
      !this.cache.has(this.desiredFrame)
      && !this.pending.has(this.desiredFrame)
      && this.pending.size >= this.maxConcurrentLoads
    ) {
      const prefetch = [...this.pending.entries()].find(([frame]) => frame !== this.desiredFrame)
      prefetch?.[1].abortController.abort()
    }
  }

  private pumpLoads() {
    if (this.destroyed) return

    const loadLimit = this.firstFrameDrawn ? this.maxConcurrentLoads : 1
    while (this.pending.size < loadLimit && this.workQueue.length > 0) {
      const frame = this.workQueue.shift()
      if (frame === undefined || this.cache.has(frame) || this.pending.has(frame)) continue
      void this.loadFrame(frame, this.generation)
    }
  }

  private async loadFrame(frame: number, generationAtRequest: number) {
    const abortController = new AbortController()
    const requestedAt = performance.now()
    this.pending.set(frame, { abortController, requestedAt })

    try {
      const response = await fetch(this.frameUrl(frame), {
        cache: 'force-cache',
        signal: abortController.signal,
      })
      if (!response.ok) throw new Error(`Frame ${frame} failed with ${response.status}`)

      const blob = await response.blob()
      const source = await this.decodeFrame(blob)
      const completedAt = performance.now()

      if (this.destroyed || abortController.signal.aborted) {
        this.releaseSource(source)
        return
      }

      this.cache.set(frame, { source, lastUsed: completedAt })
      this.emitDiagnostic('decoded', frame, {
        decodeLatencyMs: completedAt - requestedAt,
      })
      this.evictDistantFrames()

      if (frame === this.desiredFrame) {
        this.drawCachedFrame(frame)
      } else if (generationAtRequest !== this.generation) {
        this.staleFramesSuppressed += 1
        this.emitDiagnostic('stale', frame)
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.warn(`[sequence] Unable to load frame ${frame}`, error)
      }
    } finally {
      this.pending.delete(frame)
      this.rebuildWorkQueue()
      this.pumpLoads()
    }
  }

  private async decodeFrame(blob: Blob): Promise<SequenceFrameSource> {
    if ('createImageBitmap' in window) {
      return createImageBitmap(blob)
    }

    const objectUrl = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.decoding = 'async'
      image.src = objectUrl
      await image.decode()
      return image
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  private drawCachedFrame(frame: number) {
    if (frame !== this.desiredFrame && frame !== this.drawnFrame) return

    const cached = this.cache.get(frame)
    if (!cached) return

    const startedAt = performance.now()
    cached.lastUsed = startedAt

    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    const scale = Math.min(canvasWidth / FRAME_WIDTH, canvasHeight / FRAME_HEIGHT)
    const drawWidth = FRAME_WIDTH * scale
    const drawHeight = FRAME_HEIGHT * scale
    const drawX = (canvasWidth - drawWidth) / 2
    const verticalPosition = window.innerWidth <= 720 ? 0.22 : 0.5
    const drawY = (canvasHeight - drawHeight) * verticalPosition

    this.context.fillStyle = '#111132'
    this.context.fillRect(0, 0, canvasWidth, canvasHeight)
    this.context.imageSmoothingEnabled = true
    this.context.imageSmoothingQuality = 'high'
    this.context.drawImage(cached.source, drawX, drawY, drawWidth, drawHeight)
    this.drawnFrame = frame

    const completedAt = performance.now()
    this.emitDiagnostic('drawn', frame, {
      drawLatencyMs: completedAt - startedAt,
      targetSettleMs: completedAt - this.targetChangedAt,
    })

    if (!this.firstFrameDrawn) {
      this.firstFrameDrawn = true
      this.onFirstFrame?.()
    }
  }

  private evictDistantFrames() {
    if (this.cache.size <= this.maxCacheSize) return

    const wantedFrames = new Set(this.getWantedFrames())
    const candidates = [...this.cache.entries()]
      .filter(([frame]) => frame !== this.desiredFrame && frame !== this.drawnFrame)
      .sort(([frameA, cachedA], [frameB, cachedB]) => {
        const wantedDifference = Number(wantedFrames.has(frameA))
          - Number(wantedFrames.has(frameB))
        if (wantedDifference) return wantedDifference

        const distanceDifference = Math.abs(frameB - this.desiredFrame)
          - Math.abs(frameA - this.desiredFrame)
        return distanceDifference || cachedA.lastUsed - cachedB.lastUsed
      })

    while (this.cache.size > this.maxCacheSize && candidates.length > 0) {
      const candidate = candidates.shift()
      if (!candidate) break
      const [frame, cached] = candidate
      this.cache.delete(frame)
      this.releaseSource(cached.source)
      this.emitDiagnostic('evicted', frame)
    }
  }

  private releaseSource(source: SequenceFrameSource) {
    if ('close' in source && typeof source.close === 'function') source.close()
  }

  private clampFrame(frame: number) {
    return Math.min(this.frameCount - 1, Math.max(0, frame))
  }

  private emitDiagnostic(
    type: SequenceDiagnostic['type'],
    frame?: number,
    extra: Partial<Pick<SequenceDiagnostic, 'decodeLatencyMs' | 'drawLatencyMs' | 'targetSettleMs'>> = {},
  ) {
    if (!window.__HLENS_SEQUENCE_DIAGNOSTICS__) return

    window.dispatchEvent(new CustomEvent<SequenceDiagnostic>('hlens:cinematic-sequence', {
      detail: {
        type,
        timestamp: performance.now(),
        desiredFrame: this.desiredFrame,
        drawnFrame: this.drawnFrame,
        frame,
        direction: this.direction,
        cacheSize: this.cache.size,
        pendingCount: this.pending.size,
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
        staleFramesSuppressed: this.staleFramesSuppressed,
        ...extra,
      },
    }))
  }
}
