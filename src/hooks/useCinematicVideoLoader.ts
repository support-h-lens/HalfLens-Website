import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { isLayoutPortrait, layoutViewportEvent } from '../lib/stableViewport'

type VideoPreload = 'none' | 'auto'

interface CinematicVideoLoaderOptions {
  desktopSrc: string
  mobileSrc: string
}

interface CinematicVideoSource {
  selection: object | null
  assetSrc: string
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
  selection: null,
  assetSrc: '',
  src: undefined,
  preload: 'none',
  isLocal: false,
}

const cinematicCacheName = 'h-lens-cinematic-v1'

const portraitMediaQuery = '(orientation: portrait)'
const getIsPortrait = isLayoutPortrait
const getServerIsPortrait = () => false
function subscribeToOrientation(onChange: () => void) {
  const query = window.matchMedia(portraitMediaQuery)
  const changed = () => {
    if (document.documentElement.dataset.layoutPortrait === undefined) onChange()
  }
  query.addEventListener('change', changed)
  window.addEventListener(layoutViewportEvent, onChange)
  return () => {
    query.removeEventListener('change', changed)
    window.removeEventListener(layoutViewportEvent, onChange)
  }
}

function markOnce(name: string) {
  if (!performance.getEntriesByName(name).length) performance.mark(name)
}

export function useCinematicVideoLoader({
  desktopSrc,
  mobileSrc,
}: CinematicVideoLoaderOptions) {
  const [source, setSource] = useState<CinematicVideoSource>(initialSource)
  const [isActive, setIsActive] = useState(false)
  const hasScrollIntent = useRef(false)
  const isPortrait = useSyncExternalStore(subscribeToOrientation, getIsPortrait, getServerIsPortrait)
  const selectedSrc = isPortrait ? mobileSrc : desktopSrc
  // Each switch gets a new identity, even a quick portrait-landscape-portrait turn.
  const selection = useMemo(() => ({ src: selectedSrc }), [selectedSrc])

  useEffect(() => {
    let disposed = false
    let phase: 'waiting' | 'fetching' | 'prepared' | 'local' | 'remote' = 'waiting'
    let remoteRequested = false
    let objectUrl: string | undefined
    let idleHandle: number | undefined
    let firstPaintFrame: number | undefined
    let secondPaintFrame: number | undefined
    let postPaintTimer: number | undefined
    let fallbackTimer: number | undefined
    let intentFallbackTimer: number | undefined
    let abortController: AbortController | undefined

    const idleWindow = window as WindowWithIdleCallback
    const connection = (navigator as NavigatorWithConnection).connection
    const constrainedConnection = Boolean(
      connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType ?? ''),
    )
    const selectedUrl = new URL(selectedSrc, window.location.href)
    const canUseFetchCache = selectedUrl.origin === window.location.origin

    const showPreparedOrRemoteSource = () => {
      if (disposed || phase === 'local' || phase === 'remote') return
      if (phase === 'prepared' && objectUrl) {
        phase = 'local'
        setSource({ selection, assetSrc: selectedSrc, src: objectUrl, preload: 'auto', isLocal: true })
        return
      }
      phase = 'remote'
      markOnce('cinematic-preload-fallback')
      setSource({ selection, assetSrc: selectedSrc, src: selectedSrc, preload: 'auto', isLocal: false })
    }

    const requestRemoteSource = () => {
      hasScrollIntent.current = true
      setIsActive(true)
      if (phase === 'local' || phase === 'remote') return
      remoteRequested = true

      if (phase === 'fetching') {
        // Give an almost-complete download a short chance to become a local blob.
        // Repeated scroll/key events must not restart this deadline.
        if (intentFallbackTimer === undefined) {
          intentFallbackTimer = window.setTimeout(() => {
            if (disposed || phase !== 'fetching') return
            abortController?.abort()
            showPreparedOrRemoteSource()
          }, 200)
        }
        return
      }

      showPreparedOrRemoteSource()
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
            // Keep both current orientations warm; remove only older versions.
            const currentUrls = [desktopSrc, mobileSrc].map((src) => new URL(src, window.location.href).href)
            const cachedRequests = await mediaCache.keys()
            await Promise.all(
              cachedRequests
                .filter((request) => !currentUrls.includes(request.url))
                .map((request) => mediaCache?.delete(request)),
            )
            if (cachedResponse) {
              const cachedBlob = await cachedResponse.blob()
              if (disposed || phase !== 'fetching') return

              objectUrl = URL.createObjectURL(cachedBlob)
              phase = 'prepared'
              markOnce('cinematic-preload-cache-hit')
              markOnce('cinematic-preload-complete')
              if (remoteRequested) showPreparedOrRemoteSource()
              return
            }
          } catch {
            mediaCache = undefined
          }
        }

        if (remoteRequested) {
          phase = 'waiting'
          showPreparedOrRemoteSource()
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
        if (phase !== 'fetching') return

        objectUrl = URL.createObjectURL(videoBlob)
        phase = 'prepared'
        markOnce('cinematic-preload-complete')
        if (remoteRequested) showPreparedOrRemoteSource()
      } catch (error) {
        if (disposed) return

        if (remoteRequested || !(error instanceof DOMException && error.name === 'AbortError')) {
          showPreparedOrRemoteSource()
        }
      }
    }

    const scheduleFullPreload = () => {
      if (
        disposed
        || constrainedConnection
        || remoteRequested
        || phase !== 'waiting'
      ) return

      if (!canUseFetchCache) {
        // Native media loading can progressively buffer a public cross-origin MP4
        // without CORS. Warm the actual video before the first scroll; don't wait
        // for a full JS fetch, create an opaque blob, or download a second copy.
        markOnce('cinematic-preload-native')
        showPreparedOrRemoteSource()
        return
      }

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

    if (hasScrollIntent.current || window.scrollY > 24) {
      requestRemoteSource()
    } else if (!canUseFetchCache || document.readyState === 'complete') {
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
      if (intentFallbackTimer !== undefined) window.clearTimeout(intentFallbackTimer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [desktopSrc, mobileSrc, selectedSrc, selection])

  // Never render an old blob URL after orientation cleanup has revoked it.
  return {
    ...(source.selection === selection ? source : initialSource),
    assetSrc: selectedSrc,
    isPortrait,
    isActive,
  }
}
