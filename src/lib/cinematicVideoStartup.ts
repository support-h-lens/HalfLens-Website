interface StartupOptions {
  video: HTMLVideoElement
  initialTime: number
  onReady: () => void
  onReset: () => void
  onBlocked: (blocked: boolean) => void
  onPriming: (priming: boolean) => void
}

// A cached first frame is not evidence that a phone's playback pipeline has
// started. Keep startup separate from the paused, single-flight scroll decoder.
export class CinematicVideoStartup {
  private readonly video: HTMLVideoElement
  private readonly options: StartupOptions
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private readonly touch = window.matchMedia('(hover: none), (pointer: coarse)')
  private disposed = false
  private ready = false
  private primed = false
  private pending = false
  private attempt = 0
  private timeout = 0
  private frame = 0
  private wasHidden = false
  private resumeTime: number

  constructor(options: StartupOptions) {
    this.options = options
    this.video = options.video
    this.resumeTime = options.initialTime
    for (const type of ['loadeddata', 'canplay', 'seeked']) this.video.addEventListener(type, this.checkReady)
    this.video.addEventListener('error', this.onError)
    this.video.addEventListener('hlens:activate-video', this.recover)
    // A swipe need not grant media activation. A genuine click/tap retries in
    // its own call stack, including when the earlier play promise is pending.
    window.addEventListener('touchend', this.onGesture, { passive: true })
    window.addEventListener('click', this.onGesture)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('pageshow', this.onPageShow)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.motion.addEventListener('change', this.onMotion)
    this.start()
    this.checkReady()
  }

  destroy() {
    this.disposed = true
    this.cancelAttempt()
    for (const type of ['loadeddata', 'canplay', 'seeked']) this.video.removeEventListener(type, this.checkReady)
    this.video.removeEventListener('error', this.onError)
    this.video.removeEventListener('hlens:activate-video', this.recover)
    window.removeEventListener('touchend', this.onGesture)
    window.removeEventListener('click', this.onGesture)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('pageshow', this.onPageShow)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.motion.removeEventListener('change', this.onMotion)
  }

  private cancelAttempt() {
    this.attempt++
    window.clearTimeout(this.timeout)
    window.cancelAnimationFrame(this.frame)
    this.timeout = this.frame = 0
    if (this.pending) this.video.pause()
    this.pending = false
    this.options.onPriming(false)
  }

  private checkReady = () => {
    if (this.disposed || this.ready || this.pending || this.video.seeking || this.video.error
      || !this.video.currentSrc || !Number.isFinite(this.video.duration)
      || this.video.duration <= 0 || this.video.readyState < 2
      || (!this.motion.matches && this.touch.matches && !this.primed)) return
    this.ready = true
    window.clearTimeout(this.timeout)
    window.cancelAnimationFrame(this.frame)
    this.timeout = this.frame = 0
    this.options.onBlocked(false)
    this.options.onReady()
  }

  private start(fromGesture = false) {
    if (this.disposed || this.ready || this.motion.matches || document.hidden) return
    if (this.pending && !fromGesture) return
    if (this.video.error) { this.options.onBlocked(true); return }
    if (!this.touch.matches && !this.pending && this.video.readyState >= 2 && !this.video.seeking) {
      this.checkReady()
      return
    }
    // Do not pause a pending play just to retry it: that can consume the new
    // gesture with an AbortError. Supersede its callbacks, not the media load.
    const attempt = ++this.attempt
    window.clearTimeout(this.timeout)
    window.cancelAnimationFrame(this.frame)
    this.pending = true
    this.options.onPriming(true)
    const startTime = this.video.currentTime
    this.video.muted = this.video.defaultMuted = true
    this.video.playsInline = true
    this.timeout = window.setTimeout(() => {
      if (this.disposed || attempt !== this.attempt) return
      this.cancelAttempt()
      this.options.onBlocked(true)
    }, 6000)

    const failed = () => {
      if (this.disposed || attempt !== this.attempt) return
      this.cancelAttempt()
      this.options.onBlocked(true)
    }
    const observeAdvance = () => {
      if (this.disposed || attempt !== this.attempt) return
      if (this.video.readyState >= 2 && !this.video.seeking
        && (Math.abs(this.video.currentTime - startTime) > .01 || this.video.ended)) {
        this.cancelAttempt()
        this.primed = true
        this.video.currentTime = Math.min(this.resumeTime, Math.max(0, this.video.duration - .05))
        // The initial paused seek can stall too, before the scroll scheduler
        // even exists. Keep a bounded handoff, and tolerate a lost seeked event.
        const handoff = this.attempt
        this.timeout = window.setTimeout(() => {
          if (this.disposed || handoff !== this.attempt || this.ready) return
          this.cancelAttempt()
          this.primed = false
          this.options.onBlocked(true)
        }, 6000)
        const awaitReady = () => {
          if (this.disposed || handoff !== this.attempt) return
          this.checkReady()
          if (!this.ready) this.frame = window.requestAnimationFrame(awaitReady)
        }
        awaitReady()
      } else this.frame = window.requestAnimationFrame(observeAdvance)
    }
    try { void this.video.play().then(observeAdvance, failed) } catch { failed() }
  }

  private onGesture = () => { if (!this.ready) this.start(true) }
  private onKey = (event: KeyboardEvent) => {
    if (['Enter', ' ', 'ArrowDown', 'PageDown'].includes(event.key)) this.onGesture()
  }
  private onError = () => {
    if (this.disposed || this.motion.matches) return
    this.cancelAttempt()
    this.ready = this.primed = false
    this.options.onReset()
    this.options.onBlocked(true)
  }
  private recover = () => {
    if (this.disposed || this.motion.matches) return
    this.resumeTime = Number.isFinite(this.video.currentTime) ? this.video.currentTime : this.options.initialTime
    this.cancelAttempt()
    this.ready = this.primed = false
    this.options.onReset()
    // Only an explicit recovery resets an errored or indefinitely seeking
    // resource. Ordinary scrolling never aborts/restarts network range loads.
    if (this.video.error || this.video.seeking) this.video.load()
    this.start(true)
  }
  private onVisibility = () => {
    if (document.hidden) {
      this.wasHidden = true
      this.cancelAttempt()
    } else if (this.wasHidden) {
      this.wasHidden = false
      if (this.touch.matches) this.recover()
      else this.start()
    }
  }
  private onPageShow = (event: PageTransitionEvent) => { if (event.persisted) this.recover() }
  private onMotion = () => {
    if (this.motion.matches) {
      this.cancelAttempt()
      this.options.onBlocked(false)
      this.checkReady()
    } else if (!this.primed && this.touch.matches) this.recover()
    else this.start()
  }
}
