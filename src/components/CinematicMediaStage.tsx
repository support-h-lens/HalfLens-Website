import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { CinematicVideoStartup } from '../lib/cinematicVideoStartup'

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
  onVideoReady?: (state: CinematicVideoReadyState | null) => void
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
  const [isPriming, setIsPriming] = useState(false)
  const elementRef = useRef<HTMLVideoElement | null>(null)
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    elementRef.current = video
    if (typeof videoRef === 'function') videoRef(video)
    else if (videoRef) videoRef.current = video
  }, [videoRef])

  useEffect(() => {
    setIsVideoReady(false)
  }, [videoSrc])

  useEffect(() => {
    const video = elementRef.current
    if (!video || !videoSrc || !active) return
    const startup = new CinematicVideoStartup({
      video,
      initialTime: initialTime ?? 0,
      onPriming: setIsPriming,
      onBlocked: blocked => onPlaybackBlocked?.(blocked),
      onReset: () => { setIsVideoReady(false); onVideoReady?.(null) },
      onReady: () => {
        setIsVideoReady(true)
        onVideoReady?.({ currentSrc: video.currentSrc, duration: video.duration, readyState: video.readyState, source: videoSrc })
      },
    })
    return () => startup.destroy()
  }, [active, videoSrc, initialTime, onVideoReady, onPlaybackBlocked])

  return (
    <div
      className={`cinematic-media-stage${videoSrc || posterSrc ? ' cinematic-media-stage--video' : ''}${
        isVideoReady && active ? ' is-video-ready' : ''
      }${isPriming ? ' is-video-priming' : ''}${posterSrc ? ' has-video-poster' : ''} ${className}`.trim()}
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
