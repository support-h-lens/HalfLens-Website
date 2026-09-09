const SEEK_RECOVERY_DELAY_MS = 120
const PRESENTATION_GRACE_MS = 32

type FrameDirection = -1 | 0 | 1

type VideoFrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ) => number
  cancelVideoFrameCallback?: (callbackId: number) => void
}

interface CinematicFrameDiagnostic {
  type: 'target' | 'requested' | 'decoded' | 'presented' | 'settled'
  timestamp: number
  desiredFrame: number
  requestedFrame: number | null
  presentedFrame: number
  targetToPresentedDistance: number
  direction: FrameDirection
  inFlight: boolean
  seeksIssued: number
  requestedFramesSkipped: number
  seekLatencyMs?: number
  settleTimeMs?: number
}

declare global {
  interface Window {
    __HLENS_CINEMATIC_DIAGNOSTICS__?: boolean
  }
}

interface CinematicFrameSchedulerOptions {
  video: HTMLVideoElement
  frameRate: number
  firstTime: number
  lastTime: number
  onStalled?: () => void
  onRecovered?: () => void
}

export class CinematicFrameScheduler {
  private readonly video: VideoFrameCallbackVideo
  private readonly frameRate: number
  private readonly firstTime: number
  private readonly lastTime: number
  private readonly firstFrame: number
  private readonly lastFrame: number
  private readonly onStalled?: () => void
  private readonly onRecovered?: () => void
  private reportedStall = false

  private desiredFrame: number
  private lastRequestedFrame: number | null = null
  private lastCompletedRequestedFrame: number | null = null
  private lastPresentedFrame: number
  private lastDecodedFrame: number
  private direction: FrameDirection = 0
  private inFlight = false
  private destroyed = false
  private seeksIssued = 0
  private requestedFramesSkipped = 0
  private lastTargetChangeAt = performance.now()
  private lastSettledFrame: number | null = null
  private recoveryTimer = 0
  private requestedAt = 0
  private presentationTimer = 0
  private lastPresentationAt = 0
  private readonly requestTimes = new Map<number, number>()
  private pumpFrame = 0
  private videoFrameCallbackId: number | null = null
  private readonly handleSeeked = () => this.completeSeek()
  private readonly handleCanPlay = () => {
    this.completeSeek()
    this.queuePump()
  }
  private readonly handleVisibility = () => {
    if (document.visibilityState !== 'hidden') {
      this.completeSeek()
      this.queuePump()
    }
  }

  constructor({
    video,
    frameRate,
    firstTime,
    lastTime,
    onStalled,
    onRecovered,
  }: CinematicFrameSchedulerOptions) {
    this.video = video
    this.frameRate = frameRate
    this.firstTime = firstTime
    this.lastTime = lastTime
    this.onStalled = onStalled
    this.onRecovered = onRecovered
    this.firstFrame = this.timeToFrame(firstTime)
    this.lastFrame = this.timeToFrame(lastTime)
    this.lastPresentedFrame = this.clampFrame(this.timeToFrame(video.currentTime))
    this.lastDecodedFrame = this.lastPresentedFrame
    this.desiredFrame = this.lastPresentedFrame
    this.video.addEventListener('seeked', this.handleSeeked)
    this.video.addEventListener('canplay', this.handleCanPlay)
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.watchPresentation()
  }

  setProgress(progress: number) {
    if (this.destroyed || !Number.isFinite(progress)) return

    const normalizedProgress = Math.min(1, Math.max(0, progress))
    const targetTime = this.firstTime + (this.lastTime - this.firstTime) * normalizedProgress
    const nextTargetFrame = this.clampFrame(this.timeToFrame(targetTime))

    if (nextTargetFrame === this.desiredFrame) {
      this.queuePump()
      return
    }

    const now = performance.now()
    const frameDelta = nextTargetFrame - this.desiredFrame
    this.direction = Math.sign(frameDelta) as FrameDirection
    this.desiredFrame = nextTargetFrame
    this.lastTargetChangeAt = now
    this.lastSettledFrame = null

    this.emitDiagnostic('target')
    this.queuePump()
  }

  destroy() {
    this.destroyed = true
    window.clearTimeout(this.recoveryTimer)
    window.clearTimeout(this.presentationTimer)
    window.cancelAnimationFrame(this.pumpFrame)

    if (this.videoFrameCallbackId !== null) {
      this.video.cancelVideoFrameCallback?.(this.videoFrameCallbackId)
    }
    this.video.removeEventListener('seeked', this.handleSeeked)
    this.video.removeEventListener('canplay', this.handleCanPlay)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  private queuePump() {
    if (this.destroyed || this.pumpFrame) return
    this.pumpFrame = window.requestAnimationFrame(() => {
      this.pumpFrame = 0
      this.pump()
    })
  }

  private pump() {
    if (this.destroyed || this.inFlight || this.video.seeking || this.video.readyState < 2 || this.video.error) return

    if (this.hasDecodedTarget()) {
      this.reportSettled()
      return
    }

    // Coalesce input to the newest target, never queue intermediate catch-up frames.
    // Only one decoder seek is allowed at a time, even during rapid reversals.
    this.issueSeek(this.desiredFrame)
  }

  private issueSeek(frame: number) {
    const requestedFrame = this.clampFrame(frame)
    this.requestedAt = performance.now()

    this.inFlight = true
    this.lastRequestedFrame = requestedFrame
    this.seeksIssued += 1
    this.requestedFramesSkipped += Math.max(
      0,
      Math.abs(requestedFrame - this.lastDecodedFrame) - 1,
    )
    this.requestTimes.set(requestedFrame, this.requestedAt)
    if (this.requestTimes.size > 32) this.requestTimes.delete(this.requestTimes.keys().next().value!)
    this.emitDiagnostic('requested')

    if (!this.video.paused) this.video.pause()
    this.video.currentTime = this.frameToTime(requestedFrame)
    this.scheduleRecovery()
  }

  private completeSeek() {
    if (this.destroyed || this.video.seeking || this.video.readyState < 2) return
    // currentTime alone is not evidence of decoding: read it only after seeking ends.
    this.lastDecodedFrame = this.clampFrame(this.timeToFrame(this.video.currentTime))
    if (this.inFlight) {
      window.clearTimeout(this.recoveryTimer)
      this.emitDiagnostic('decoded', { seekLatencyMs: performance.now() - this.requestedAt })
    }
    if (typeof this.video.requestVideoFrameCallback !== 'function') {
      this.lastPresentedFrame = this.lastDecodedFrame
      this.emitDiagnostic('presented', { seekLatencyMs: performance.now() - this.requestedAt })
      this.releaseSeek()
    } else if (this.lastPresentationAt >= this.requestedAt && Math.abs(this.lastPresentedFrame - this.lastDecodedFrame) <= 1) {
      this.releaseSeek()
    } else if (!this.presentationTimer) {
      // Allow the compositor to consume this frame before asking the decoder for
      // another. Hidden/occluded videos may not deliver rVFC; never wait indefinitely.
      this.presentationTimer = window.setTimeout(() => this.releaseSeek(), PRESENTATION_GRACE_MS)
    }
  }

  private releaseSeek() {
    window.clearTimeout(this.presentationTimer)
    this.presentationTimer = 0
    if (this.destroyed || this.video.seeking) return
    window.clearTimeout(this.recoveryTimer)
    if (this.inFlight) this.lastCompletedRequestedFrame = this.lastRequestedFrame
    this.inFlight = false
    if (this.reportedStall) {
      this.reportedStall = false
      this.onRecovered?.()
    }
    this.reportSettled()
    this.queuePump()
  }

  private watchPresentation() {
    if (this.destroyed || typeof this.video.requestVideoFrameCallback !== 'function') return
    this.videoFrameCallbackId = this.video.requestVideoFrameCallback((now, metadata) => {
      if (this.destroyed) return
      this.lastPresentedFrame = this.clampFrame(this.timeToFrame(metadata.mediaTime))
      this.lastPresentationAt = now
      const requestedAt = this.requestTimes.get(this.lastPresentedFrame)
        ?? this.requestTimes.get(this.lastPresentedFrame + 1)
      this.emitDiagnostic('presented', {
        seekLatencyMs: requestedAt === undefined ? undefined : now - requestedAt,
      })
      this.reportSettled()
      if (this.inFlight && !this.video.seeking && Math.abs(this.lastPresentedFrame - (this.lastRequestedFrame ?? -2)) <= 1) {
        this.lastDecodedFrame = this.clampFrame(this.timeToFrame(this.video.currentTime))
        window.clearTimeout(this.recoveryTimer)
        this.releaseSeek()
      }
      // Presentation is observed separately from decoding, with a bounded handoff.
      this.watchPresentation()
    })
  }

  private scheduleRecovery() {
    window.clearTimeout(this.recoveryTimer)
    this.recoveryTimer = window.setTimeout(() => {
      if (this.destroyed || !this.inFlight) return
      this.completeSeek()
      if (this.inFlight && !this.reportedStall && performance.now() - this.requestedAt >= 5000) {
        this.reportedStall = true
        this.onStalled?.()
      }
      // Never interrupt a real network/decode seek, which would repeatedly restart it.
      if (this.inFlight && !this.video.error) this.scheduleRecovery()
    }, SEEK_RECOVERY_DELAY_MS)
  }

  private reportSettled() {
    if (
      this.inFlight
      || !this.hasDecodedTarget()
      || !this.isAtDesiredTarget()
      || this.lastSettledFrame === this.desiredFrame
    ) return

    this.lastSettledFrame = this.desiredFrame
    this.emitDiagnostic('settled', {
      settleTimeMs: performance.now() - this.lastTargetChangeAt,
    })
  }

  private timeToFrame(time: number) {
    return Math.round(time * this.frameRate)
  }

  private frameToTime(frame: number) {
    // Match the MP4 presentation timestamp precision. A raw repeating decimal such
    // as 269 / 48 can land fractionally before the encoded PTS in Chromium and
    // display frame 268; the six-decimal media timestamp selects frame 269.
    return Number((frame / this.frameRate).toFixed(6))
  }

  private isAtDesiredTarget() {
    const requestedTargetIsCurrent = this.lastCompletedRequestedFrame === this.desiredFrame
      && Math.abs(this.video.currentTime - this.frameToTime(this.desiredFrame))
        <= 1 / this.frameRate
    const presentedTargetIsCurrent = Math.abs(this.lastPresentedFrame - this.desiredFrame) <= 1

    return (this.lastPresentedFrame === this.desiredFrame)
      || (requestedTargetIsCurrent && presentedTargetIsCurrent)
  }

  private hasDecodedTarget() {
    // WebKit can finish a seek on the adjacent presentation timestamp. Repeating
    // the identical request cannot improve that quantization and can keep the
    // decoder busy forever after a finger stops. Accept only a COMPLETED request
    // for this exact target within one frame, never an uncompleted currentTime
    // assignment or a stale target after a direction change.
    return this.lastDecodedFrame === this.desiredFrame
      || (this.lastCompletedRequestedFrame === this.desiredFrame
        && Math.abs(this.lastDecodedFrame - this.desiredFrame) <= 1)
  }

  private clampFrame(frame: number) {
    return Math.min(this.lastFrame, Math.max(this.firstFrame, frame))
  }

  private emitDiagnostic(
    type: CinematicFrameDiagnostic['type'],
    extra: Partial<Pick<CinematicFrameDiagnostic, 'seekLatencyMs' | 'settleTimeMs'>> = {},
  ) {
    if (!window.__HLENS_CINEMATIC_DIAGNOSTICS__) return

    window.dispatchEvent(new CustomEvent<CinematicFrameDiagnostic>('hlens:cinematic-video', {
      detail: {
        type,
        timestamp: performance.now(),
        desiredFrame: this.desiredFrame,
        requestedFrame: this.lastRequestedFrame,
        presentedFrame: this.lastPresentedFrame,
        targetToPresentedDistance: this.desiredFrame - this.lastPresentedFrame,
        direction: this.direction,
        inFlight: this.inFlight,
        seeksIssued: this.seeksIssued,
        requestedFramesSkipped: this.requestedFramesSkipped,
        ...extra,
      },
    }))
  }
}
