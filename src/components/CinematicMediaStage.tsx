import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

interface CinematicVideoReadyState {
  currentSrc: string
  duration: number
  readyState: number
  source: string
}

interface CinematicMediaStageProps {
  className?: string
  label?: string
  status?: string
  videoSrc?: string
  preload?: 'none' | 'auto'
  active?: boolean
  posterSrc?: string
  portraitPosterSrc?: string
  initialTime?: number
  onVideoReady?: (state: CinematicVideoReadyState) => void
  onPlaybackBlocked?: (blocked: boolean) => void
}

export const CinematicMediaStage = forwardRef<
  HTMLVideoElement,
  CinematicMediaStageProps
>(function CinematicMediaStage(
  {
    className = '',
    label = 'فيلم الكاميرا السينمائي',
    status = 'SCROLL FILM · FRAME CONTROL',
    videoSrc,
    preload = 'none',
    active = true,
    posterSrc,
    portraitPosterSrc,
    initialTime,
    onVideoReady,
    onPlaybackBlocked,
  },
  videoRef,
) {
  const [isVideoReady, setIsVideoReady] = useState(false)
  const notifiedSourceRef = useRef('')
  const elementRef = useRef<HTMLVideoElement | null>(null)
  const primingRef = useRef(false)
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    elementRef.current = video
    if (typeof videoRef === 'function') videoRef(video)
    else if (videoRef) videoRef.current = video
  }, [videoRef])

  useEffect(() => {
    notifiedSourceRef.current = ''
    setIsVideoReady(false)
  }, [videoSrc])

  const notifyVideoReady = useCallback((video: HTMLVideoElement) => {
    if (
      !videoSrc
      || !video.currentSrc
      || !Number.isFinite(video.duration)
      || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      || video.seeking
      || primingRef.current
    ) return

    setIsVideoReady(true)
    onPlaybackBlocked?.(false)
    if (notifiedSourceRef.current === video.currentSrc) return

    notifiedSourceRef.current = video.currentSrc
    onVideoReady?.({
      currentSrc: video.currentSrc,
      duration: video.duration,
      readyState: video.readyState,
      source: videoSrc,
    })
  }, [videoSrc, onVideoReady, onPlaybackBlocked])

  useEffect(() => {
    const video = elementRef.current
    if (!video || !videoSrc || !active) return
    let disposed = false
    let pending = false
    let primed = false
    let attempt = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const primeDecoder = () => {
      if (disposed || pending || primed || reducedMotion.matches || video.error) return
      // A later touch may arrive during a normal scrub seek. Never restart an
      // initialized film or compete with the frame scheduler for its timeline.
      if (video.currentSrc && notifiedSourceRef.current === video.currentSrc) return
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.seeking) {
        notifyVideoReady(video)
        return
      }
      // iOS may preload only metadata for a paused video. Waiting for loadeddata
      // before ever calling play() leaves the poster visible indefinitely.
      // Decode silently, then pause before reporting readiness to the scrubber.
      pending = true
      primingRef.current = true
      const currentAttempt = ++attempt
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      const failed = (error: unknown) => {
        if (disposed || currentAttempt !== attempt) return
        pending = false
        primingRef.current = false
        video.pause()
        if (error instanceof DOMException && error.name === 'NotAllowedError') onPlaybackBlocked?.(true)
      }
      try {
        void video.play().then(() => {
          if (disposed || currentAttempt !== attempt) return
          video.pause()
          pending = false
          primed = true
          primingRef.current = false
          if (initialTime !== undefined && Number.isFinite(video.duration)) {
            video.currentTime = Math.min(initialTime, Math.max(0, video.duration - .001))
          }
          notifyVideoReady(video)
        }, failed)
      } catch (error) { failed(error) }
    }
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        attempt++
        if (pending) video.pause()
        pending = false
        primingRef.current = false
        onPlaybackBlocked?.(false)
      } else primeDecoder()
    }
    // Retry in the original gesture call stack, not a deferred React effect.
    // Keep these listeners after a rejection so a real tap can unlock Safari.
    window.addEventListener('touchend', primeDecoder, { passive: true })
    window.addEventListener('pointerup', primeDecoder, { passive: true })
    window.addEventListener('keydown', primeDecoder)
    video.addEventListener('hlens:activate-video', primeDecoder)
    reducedMotion.addEventListener('change', onMotionChange)
    primeDecoder()
    return () => {
      disposed = true
      attempt++
      if (pending) video.pause()
      primingRef.current = false
      window.removeEventListener('touchend', primeDecoder)
      window.removeEventListener('pointerup', primeDecoder)
      window.removeEventListener('keydown', primeDecoder)
      video.removeEventListener('hlens:activate-video', primeDecoder)
      reducedMotion.removeEventListener('change', onMotionChange)
    }
  }, [active, videoSrc, initialTime, notifyVideoReady, onPlaybackBlocked])

  return (
    <div
      className={`cinematic-media-stage${videoSrc || posterSrc ? ' cinematic-media-stage--video' : ''}${
        isVideoReady && active ? ' is-video-ready' : ''
      }${posterSrc ? ' has-video-poster' : ''} ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <div className="cinematic-media-stage__glow" aria-hidden="true" />
      <div className="cinematic-media-stage__camera" aria-hidden="true">
        <span className="cinematic-media-stage__top" />
        <span className="cinematic-media-stage__body" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--outer" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--middle" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--inner" />
        <span className="cinematic-media-stage__record-light" />
      </div>

      {posterSrc ? (
        <picture className="cinematic-media-stage__poster" aria-hidden="true">
          {portraitPosterSrc ? <source media="(orientation: portrait)" srcSet={portraitPosterSrc} /> : null}
          <img src={posterSrc} alt="" fetchPriority="high" />
        </picture>
      ) : null}

      {videoSrc || posterSrc ? (
        <video
          ref={attachVideo}
          className="cinematic-media-stage__video"
          src={videoSrc}
          muted
          playsInline
          preload={preload}
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget
            // Do not abort the warm-up play promise while metadata is arriving.
            if (primingRef.current) return
            video.pause()
            if (initialTime !== undefined) {
              video.currentTime = Math.min(initialTime, Math.max(0, video.duration - 0.001))
            }
          }}
          onLoadedData={(event) => notifyVideoReady(event.currentTarget)}
          onCanPlay={(event) => notifyVideoReady(event.currentTarget)}
          onSeeked={(event) => notifyVideoReady(event.currentTarget)}
        />
      ) : null}

      <div className="cinematic-media-stage__reticle" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="cinematic-media-stage__meta" aria-hidden="true">
        <span>{status}</span>
        <span>10 SEC · 4K</span>
      </div>
    </div>
  )
})
