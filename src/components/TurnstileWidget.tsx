import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type TurnstileWidgetId = string

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  appearance: 'always' | 'execute' | 'interaction-only'
  language: string
  size: 'normal' | 'compact' | 'flexible'
  theme: 'light' | 'dark' | 'auto'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => TurnstileWidgetId
  remove: (widgetId: TurnstileWidgetId) => void
  reset: (widgetId: TurnstileWidgetId) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void
}

interface TurnstileWidgetProps {
  onError: (message: string) => void
  onTokenChange: (token: string) => void
  siteKey: string
}

const turnstileScriptId = 'cloudflare-turnstile-script'
const turnstileScriptSource = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileScriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const existingScript = document.getElementById(turnstileScriptId) as HTMLScriptElement | null

      const handleLoad = () => {
        if (window.turnstile) resolve(window.turnstile)
        else reject(new Error('Turnstile API did not initialize.'))
      }

      const handleError = () => reject(new Error('Turnstile API failed to load.'))

      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true })
        existingScript.addEventListener('error', handleError, { once: true })
        return
      }

      const script = document.createElement('script')
      script.id = turnstileScriptId
      script.src = turnstileScriptSource
      script.async = true
      script.defer = true
      script.addEventListener('load', handleLoad, { once: true })
      script.addEventListener('error', handleError, { once: true })
      document.head.appendChild(script)
    }).catch((error) => {
      turnstileScriptPromise = null
      throw error
    })
  }

  return turnstileScriptPromise
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onError, onTokenChange, siteKey }, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<TurnstileWidgetId | null>(null)
    const onErrorRef = useRef(onError)
    const onTokenChangeRef = useRef(onTokenChange)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

    onErrorRef.current = onError
    onTokenChangeRef.current = onTokenChange

    useImperativeHandle(forwardedRef, () => ({
      reset() {
        onTokenChangeRef.current('')
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }), [])

    useEffect(() => {
      let disposed = false

      setStatus('loading')
      loadTurnstile()
        .then((turnstile) => {
          if (disposed || !containerRef.current || widgetIdRef.current) return

          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action: 'job_application',
            appearance: 'interaction-only',
            language: 'ar',
            size: 'flexible',
            theme: 'dark',
            callback: (token) => {
              if (disposed) return
              setStatus('ready')
              onTokenChangeRef.current(token)
            },
            'error-callback': () => {
              if (disposed) return
              setStatus('error')
              onTokenChangeRef.current('')
              onErrorRef.current('تعذر إكمال التحقق الأمني. حدّث الصفحة وحاول مرة أخرى.')
            },
            'expired-callback': () => {
              if (disposed) return
              setStatus('loading')
              onTokenChangeRef.current('')
            },
            'timeout-callback': () => {
              if (disposed) return
              setStatus('loading')
              onTokenChangeRef.current('')
            },
          })
        })
        .catch(() => {
          if (disposed) return
          setStatus('error')
          onErrorRef.current('تعذر تحميل التحقق الأمني. تحقق من اتصالك ثم حدّث الصفحة.')
        })

      return () => {
        disposed = true
        onTokenChangeRef.current('')
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
        }
        widgetIdRef.current = null
      }
    }, [siteKey])

    return (
      <div className="turnstile-verification">
        <div ref={containerRef} className="turnstile-verification__widget" />
        <p className="turnstile-verification__status" aria-live="polite">
          {status === 'loading' ? 'جارٍ تجهيز التحقق الأمني…' : null}
          {status === 'error' ? 'التحقق الأمني غير متاح حاليًا.' : null}
          {status === 'ready' ? 'اكتمل التحقق الأمني.' : null}
        </p>
      </div>
    )
  },
)
