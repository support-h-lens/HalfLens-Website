import { forwardRef, useEffect, useRef, useState } from 'react'

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
  posterSrc?: string
  initialTime?: number
  onVideoReady?: (state: CinematicVideoReadyState) => void
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
    posterSrc,
    initialTime,
    onVideoReady,
  },
  videoRef,
) {
  const [isVideoReady, setIsVideoReady] = useState(false)
  const notifiedSourceRef = useRef('')

  useEffect(() => {
    notifiedSourceRef.current = ''
    setIsVideoReady(false)
  }, [videoSrc])

  const notifyVideoReady = (video: HTMLVideoElement) => {
    if (
      !videoSrc
      || !video.currentSrc
      || !Number.isFinite(video.duration)
      || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) return

    setIsVideoReady(true)
    if (notifiedSourceRef.current === video.currentSrc) return

    notifiedSourceRef.current = video.currentSrc
    onVideoReady?.({
      currentSrc: video.currentSrc,
      duration: video.duration,
      readyState: video.readyState,
      source: videoSrc,
    })
  }

  return (
    <div
      className={`cinematic-media-stage${videoSrc || posterSrc ? ' cinematic-media-stage--video' : ''}${
        isVideoReady ? ' is-video-ready' : ''
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

      {videoSrc || posterSrc ? (
        <video
          ref={videoRef}
          className="cinematic-media-stage__video"
          src={videoSrc}
          poster={posterSrc}
          muted
          playsInline
          preload={preload}
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget
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
