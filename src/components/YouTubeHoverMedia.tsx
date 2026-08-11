import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface YouTubeHoverMediaProps {
  posterUrl: string
  title: string
  videoId: string
}

export function YouTubeHoverMedia({
  posterUrl,
  title,
  videoId,
}: YouTubeHoverMediaProps) {
  const playerRef = useRef<HTMLIFrameElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false)
  const [allowsHoverPlayback, setAllowsHoverPlayback] = useState(false)
  const [posterSource, setPosterSource] = useState(posterUrl)

  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updatePlaybackPreference = () => {
      const canPlayOnHover = hoverQuery.matches && !reducedMotionQuery.matches
      setAllowsHoverPlayback(canPlayOnHover)

      if (!canPlayOnHover) {
        setIsHovered(false)
        setIsPlayerReady(false)
        setShouldLoadPlayer(false)
      }
    }

    updatePlaybackPreference()
    hoverQuery.addEventListener('change', updatePlaybackPreference)
    reducedMotionQuery.addEventListener('change', updatePlaybackPreference)

    return () => {
      hoverQuery.removeEventListener('change', updatePlaybackPreference)
      reducedMotionQuery.removeEventListener('change', updatePlaybackPreference)
    }
  }, [])

  const embedSource = useMemo(() => {
    const parameters = new URLSearchParams({
      autoplay: '0',
      controls: '0',
      disablekb: '1',
      enablejsapi: '1',
      iv_load_policy: '3',
      loop: '1',
      modestbranding: '1',
      mute: '0',
      playlist: videoId,
      playsinline: '1',
      rel: '0',
    })

    return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`
  }, [videoId])

  const sendPlayerCommand = useCallback(
    (command: 'pauseVideo' | 'playVideo' | 'seekTo' | 'unMute', args: unknown[] = []) => {
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: command, args }),
        'https://www.youtube-nocookie.com',
      )
    },
    [],
  )

  const startPreview = () => {
    if (!allowsHoverPlayback) return
    setShouldLoadPlayer(true)
    setIsHovered(true)

    if (isPlayerReady) {
      sendPlayerCommand('unMute')
      sendPlayerCommand('playVideo')
    }
  }

  const stopPreview = () => {
    sendPlayerCommand('pauseVideo')
    sendPlayerCommand('seekTo', [0, true])
    setIsHovered(false)
  }

  const handlePlayerLoad = () => {
    setIsPlayerReady(true)
    if (!isHovered) {
      sendPlayerCommand('pauseVideo')
      sendPlayerCommand('seekTo', [0, true])
      return
    }
    sendPlayerCommand('unMute')
    sendPlayerCommand('playVideo')
  }

  return (
    <div
      className={`project-video${isHovered && isPlayerReady ? ' project-video--playing' : ''}`}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      <img
        className="project-video__poster"
        src={posterSource}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => {
          const fallbackSource = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          if (posterSource !== fallbackSource) setPosterSource(fallbackSource)
        }}
      />

      {shouldLoadPlayer ? (
        <iframe
          ref={playerRef}
          className="project-video__player"
          src={embedSource}
          title={`${title} — YouTube preview`}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          onLoad={handlePlayerLoad}
        />
      ) : null}

    </div>
  )
}
