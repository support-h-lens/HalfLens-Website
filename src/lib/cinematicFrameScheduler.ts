const INPUT_SETTLE_DELAY_MS = 18

type FrameDirection = -1 | 0 | 1

type VideoFrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ) => number
  cancelVideoFrameCallback?: (callbackId: number) => void
}

interface CinematicFrameDiagnostic {
  type: 'target' | 'requested' | 'presented' | 'settled'
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
}

export class CinematicFrameScheduler {
  private readonly video: VideoFrameCallbackVideo
  private readonly frameRate: number
  private readonly firstTime: number
  private readonly lastTime: number
  private readonly firstFrame: number
  private readonly lastFrame: number

  private desiredFrame: number
  private lastRequestedFrame: number | null = null
  private lastPresentedFrame: number
  private direction: FrameDirection = 0
  private inFlight = false
  private prioritizeExactTarget = true
  private destroyed = false
  private requestSequence = 0
  private seeksIssued = 0
  private requestedFramesSkipped = 0
  private lastTargetChangeAt = performance.now()
  private lastSettledFrame: number | null = null
  private settleTimer = 0
  private pumpFrame = 0
  private videoFrameCallbackId: number | null = null
  private fallbackSeekedHandler: (() => void) | null = null

  constructor({
    video,
    frameRate,
    firstTime,
    lastTime,
  }: CinematicFrameSchedulerOptions) {
    this.video = video
    this.frameRate = frameRate
    this.firstTime = firstTime
    this.lastTime = lastTime
    this.firstFrame = this.timeToFrame(firstTime)
    this.lastFrame = this.timeToFrame(lastTime)
    this.lastPresentedFrame = this.clampFrame(this.timeToFrame(video.currentTime))
    this.desiredFrame = this.lastPresentedFrame
  }

  setProgress(progress: number) {
    if (this.destroyed) return

    const normalizedProgress = Math.min(1, Math.max(0, progress))
    const targetTime = this.firstTime + (this.lastTime - this.firstTime) * normalizedProgress
    const nextTargetFrame = this.clampFrame(this.timeToFrame(targetTime))

    if (nextTargetFrame === this.desiredFrame) {
      this.queuePump()
      return
    }

    this.direction = Math.sign(nextTargetFrame - this.desiredFrame) as FrameDirection
    this.desiredFrame = nextTargetFrame
    this.lastTargetChangeAt = performance.now()
    this.lastSettledFrame = null
    this.prioritizeExactTarget = false

    window.clearTimeout(this.settleTimer)
    this.settleTimer = window.setTimeout(() => {
      this.prioritizeExactTarget = true
      this.queuePump()
    }, INPUT_SETTLE_DELAY_MS)

    this.emitDiagnostic('target')
    this.queuePump()
  }

  destroy() {
    this.destroyed = true
    window.clearTimeout(this.settleTimer)
    window.cancelAnimationFrame(this.pumpFrame)

    if (this.videoFrameCallbackId !== null) {
      this.video.cancelVideoFrameCallback?.(this.videoFrameCallbackId)
    }
    if (this.fallbackSeekedHandler) {
      this.video.removeEventListener('seeked', this.fallbackSeekedHandler)
    }
  }

  private queuePump() {
    if (this.destroyed || this.pumpFrame) return
    this.pumpFrame = window.requestAnimationFrame(() => {
      this.pumpFrame = 0
      this.pump()
    })
  }

  private pump() {
    if (this.destroyed || this.inFlight) return

    if (this.isAtDesiredTarget()) {
      this.reportSettled()
      return
    }

    const distance = this.desiredFrame - this.lastPresentedFrame
    if (distance === 0) {
      this.reportSettled()
      return
    }

    const nextFrame = this.selectNextFrame(distance)
    this.issueSeek(nextFrame)
  }

  private selectNextFrame(distance: number) {
    const absoluteDistance = Math.abs(distance)
    if (this.prioritizeExactTarget || absoluteDistance <= 2) return this.desiredFrame

    const direction = Math.sign(distance)
    if (absoluteDistance <= 8) {
      return this.lastPresentedFrame + direction * Math.max(2, Math.ceil(absoluteDistance / 2))
    }

    return this.lastPresentedFrame + direction * Math.max(4, Math.ceil(absoluteDistance * 0.65))
  }

  private issueSeek(frame: number) {
    const requestedFrame = this.clampFrame(frame)
    const requestedAt = performance.now()
    const sequence = ++this.requestSequence
    const callbackSupported = typeof this.video.requestVideoFrameCallback === 'function'

    this.inFlight = true
    this.lastRequestedFrame = requestedFrame
    this.seeksIssued += 1
    this.requestedFramesSkipped += Math.max(
      0,
      Math.abs(requestedFrame - this.lastPresentedFrame) - 1,
    )
    this.emitDiagnostic('requested')

    const complete = (presentedTime: number, completedAt: number) => {
      if (this.destroyed || sequence !== this.requestSequence) return

      this.inFlight = false
      this.videoFrameCallbackId = null
      this.fallbackSeekedHandler = null
      this.lastPresentedFrame = this.clampFrame(this.timeToFrame(presentedTime))
      this.emitDiagnostic('presented', {
        seekLatencyMs: completedAt - requestedAt,
      })
      this.reportSettled()
      this.queuePump()
    }

    if (callbackSupported) {
      this.videoFrameCallbackId = this.video.requestVideoFrameCallback?.((now, metadata) => {
        complete(metadata.mediaTime, now)
      }) ?? null
    } else {
      this.fallbackSeekedHandler = () => {
        complete(this.video.currentTime, performance.now())
      }
      this.video.addEventListener('seeked', this.fallbackSeekedHandler, { once: true })
    }

    this.video.pause()
    this.video.currentTime = this.frameToTime(requestedFrame)
  }

  private reportSettled() {
    if (
      !this.prioritizeExactTarget
      || this.inFlight
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
    const requestedTargetIsCurrent = this.lastRequestedFrame === this.desiredFrame
      && Math.abs(this.video.currentTime - this.frameToTime(this.desiredFrame))
        <= 0.25 / this.frameRate
    const presentedTargetIsCurrent = Math.abs(this.lastPresentedFrame - this.desiredFrame) <= 1

    return (this.lastPresentedFrame === this.desiredFrame)
      || (requestedTargetIsCurrent && presentedTargetIsCurrent)
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
