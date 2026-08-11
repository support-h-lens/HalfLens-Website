import { useEffect, useState } from 'react'

type VideoPreload = 'none' | 'auto'

interface CinematicVideoLoaderOptions {
  desktopSrc: string
  mobileSrc: string
  mobileMaxWidth?: number
}

interface CinematicVideoSource {
  src: string | undefined
  preload: VideoPreload
  isLocal: boolean
}

interface NetworkInformationLike {
  effectiveType?: string
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number },
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

const initialSource: CinematicVideoSource = {
  src: undefined,
  preload: 'none',
  isLocal: false,
}

const cinematicCacheName = 'h-lens-cinematic-v1'

function markOnce(name: string) {
  if (!performance.getEntriesByName(name).length) performance.mark(name)
}

export function useCinematicVideoLoader({
  desktopSrc,
  mobileSrc,
  mobileMaxWidth = 1024,
}: CinematicVideoLoaderOptions) {
  const [source, setSource] = useState<CinematicVideoSource>(initialSource)

  useEffect(() => {
    let disposed = false
    let phase: 'waiting' | 'fetching' | 'local' | 'remote' = 'waiting'
    let remoteRequested = false
    let objectUrl: string | undefined
    let idleHandle: number | undefined
    let firstPaintFrame: number | undefined
    let secondPaintFrame: number | undefined
    let postPaintTimer: number | undefined
    let fallbackTimer: number | undefined
    let abortController: AbortController | undefined

    const idleWindow = window as WindowWithIdleCallback
    const connection = (navigator as NavigatorWithConnection).connection
    const constrainedConnection = Boolean(
      connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType ?? ''),
    )
    const selectedSrc = window.matchMedia(`(max-width: ${mobileMaxWidth}px)`).matches
      ? mobileSrc
      : desktopSrc

    const showRemoteSource = () => {
      if (disposed || phase === 'local' || phase === 'remote') return
      phase = 'remote'
      markOnce('cinematic-preload-fallback')
      setSource({ src: selectedSrc, preload: 'auto', isLocal: false })
    }

    const requestRemoteSource = () => {
      if (phase === 'local' || phase === 'remote') return
      remoteRequested = true

      if (phase === 'fetching') {
        abortController?.abort()
        return
      }

      showRemoteSource()
    }

    const fetchCompleteAsset = async () => {
      if (disposed || remoteRequested || phase !== 'waiting') return

      phase = 'fetching'
      abortController = new AbortController()
      markOnce('cinematic-preload-start')

      try {
        let mediaCache: Cache | undefined
        if ('caches' in window) {
          try {
            mediaCache = await window.caches.open(cinematicCacheName)
            const cachedResponse = await mediaCache.match(selectedSrc)
            const selectedUrl = new URL(selectedSrc, window.location.href).href
            const cachedRequests = await mediaCache.keys()
            await Promise.all(
              cachedRequests
                .filter((request) => request.url !== selectedUrl)
                .map((request) => mediaCache?.delete(request)),
            )
            if (cachedResponse) {
              const cachedBlob = await cachedResponse.blob()
              if (disposed) return

              objectUrl = URL.createObjectURL(cachedBlob)
              phase = 'local'
              markOnce('cinematic-preload-cache-hit')
              markOnce('cinematic-preload-complete')
              setSource({ src: objectUrl, preload: 'auto', isLocal: true })
              return
            }
          } catch {
            mediaCache = undefined
          }
        }

        if (remoteRequested) {
          phase = 'waiting'
          showRemoteSource()
          return
        }

        const response = await fetch(selectedSrc, {
          cache: mediaCache ? 'no-store' : 'force-cache',
          signal: abortController.signal,
          priority: 'low',
        } as RequestInit & { priority: 'low' })

        if (!response.ok) throw new Error(`Cinematic preload failed: ${response.status}`)

        const cacheWrite = mediaCache
          ? mediaCache.put(selectedSrc, response.clone()).catch(() => undefined)
          : Promise.resolve()
        const [videoBlob] = await Promise.all([response.blob(), cacheWrite])
        if (disposed) return
        if (remoteRequested) {
          showRemoteSource()
          return
        }

        objectUrl = URL.createObjectURL(videoBlob)
        phase = 'local'
        markOnce('cinematic-preload-complete')
        setSource({ src: objectUrl, preload: 'auto', isLocal: true })
      } catch (error) {
        if (disposed) return

        if (remoteRequested || !(error instanceof DOMException && error.name === 'AbortError')) {
          phase = 'waiting'
          showRemoteSource()
        }
      }
    }

    const scheduleFullPreload = () => {
      if (disposed || constrainedConnection || remoteRequested || phase !== 'waiting') return

      const idleDelay = connection?.effectiveType === '3g' ? 1800 : 600
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(() => void fetchCompleteAsset(), {
          timeout: idleDelay,
        })
      } else {
        fallbackTimer = window.setTimeout(() => void fetchCompleteAsset(), 120)
      }
    }

    const scheduleAfterFirstScreen = () => {
      firstPaintFrame = window.requestAnimationFrame(() => {
        secondPaintFrame = window.requestAnimationFrame(() => {
          postPaintTimer = window.setTimeout(scheduleFullPreload, 80)
        })
      })
    }

    const handleLoad = () => scheduleAfterFirstScreen()
    const handleScrollIntent = () => requestRemoteSource()
    const handleKeyIntent = (event: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) requestRemoteSource()
    }

    window.addEventListener('wheel', handleScrollIntent, { passive: true, once: true })
    window.addEventListener('touchstart', handleScrollIntent, { passive: true, once: true })
    window.addEventListener('scroll', handleScrollIntent, { passive: true, once: true })
    window.addEventListener('keydown', handleKeyIntent)

    if (window.scrollY > 24) {
      requestRemoteSource()
    } else if (document.readyState === 'complete') {
      scheduleAfterFirstScreen()
    } else {
      window.addEventListener('load', handleLoad, { once: true })
    }

    return () => {
      disposed = true
      abortController?.abort()
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('wheel', handleScrollIntent)
      window.removeEventListener('touchstart', handleScrollIntent)
      window.removeEventListener('scroll', handleScrollIntent)
      window.removeEventListener('keydown', handleKeyIntent)
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle)
      if (firstPaintFrame !== undefined) window.cancelAnimationFrame(firstPaintFrame)
      if (secondPaintFrame !== undefined) window.cancelAnimationFrame(secondPaintFrame)
      if (postPaintTimer !== undefined) window.clearTimeout(postPaintTimer)
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [desktopSrc, mobileMaxWidth, mobileSrc])

  return source
}
