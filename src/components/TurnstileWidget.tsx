import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type TurnstileWidgetId = string

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  appearance: 'always' | 'execute' | 'interaction-only'
  execution: 'render' | 'execute'
  language: string
  retry: 'auto' | 'never'
  size: 'normal' | 'compact' | 'flexible'
  theme: 'light' | 'dark' | 'auto'
  callback: (token: string) => void
  'error-callback': (errorCode: string) => boolean
  'expired-callback': () => void
  'timeout-callback': () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => TurnstileWidgetId
  execute: (widgetId: TurnstileWidgetId) => void
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
  verify: () => Promise<string>
}

interface TurnstileWidgetProps {
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
  function TurnstileWidget({ onTokenChange, siteKey }, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<TurnstileWidgetId | null>(null)
    const loadErrorRef = useRef(false)
    const onTokenChangeRef = useRef(onTokenChange)
    const pendingVerificationRef = useRef<{
      promise: Promise<string>
      reject: (error: Error) => void
      resolve: (token: string) => void
      timeoutId: number
    } | null>(null)
    const tokenRef = useRef('')
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

    onTokenChangeRef.current = onTokenChange

    useImperativeHandle(forwardedRef, () => ({
      reset() {
        tokenRef.current = ''
        onTokenChangeRef.current('')
        if (pendingVerificationRef.current) {
          window.clearTimeout(pendingVerificationRef.current.timeoutId)
          pendingVerificationRef.current.reject(new Error('تمت إعادة ضبط التحقق الأمني.'))
          pendingVerificationRef.current = null
        }
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
      async verify() {
        if (tokenRef.current) return tokenRef.current

        const readyDeadline = window.performance.now() + 5000
        while (!widgetIdRef.current || !window.turnstile) {
          if (loadErrorRef.current || window.performance.now() >= readyDeadline) {
            throw new Error('تعذر تجهيز التحقق الأمني. تحقق من اتصالك ثم حاول مرة أخرى.')
          }
          await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
        }

        if (pendingVerificationRef.current) {
          return pendingVerificationRef.current.promise
        }

        let resolveVerification!: (token: string) => void
        let rejectVerification!: (error: Error) => void
        const promise = new Promise<string>((resolve, reject) => {
          resolveVerification = resolve
          rejectVerification = reject
        })

        const timeoutId = window.setTimeout(() => {
          pendingVerificationRef.current?.reject(
            new Error('استغرق التحقق الأمني وقتًا أطول من المتوقع، يرجى المحاولة مرة أخرى.'),
          )
          pendingVerificationRef.current = null
          setStatus('error')
        }, 60_000)

        pendingVerificationRef.current = {
          promise,
          reject: rejectVerification,
          resolve: resolveVerification,
          timeoutId,
        }
        setStatus('loading')
        try {
          window.turnstile.execute(widgetIdRef.current)
        } catch {
          pendingVerificationRef.current = null
          throw new Error('تعذر بدء التحقق الأمني، يرجى المحاولة مرة أخرى.')
        }
        return promise
      },
    }), [])

    useEffect(() => {
      let disposed = false

      setStatus('loading')
      loadErrorRef.current = false
      loadTurnstile()
        .then((turnstile) => {
          if (disposed || !containerRef.current || widgetIdRef.current) return

          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action: 'job_application',
            appearance: 'interaction-only',
            execution: 'execute',
            language: 'ar',
            retry: 'auto',
            size: 'flexible',
            theme: 'dark',
            callback: (token) => {
              if (disposed) return
              tokenRef.current = token
              setStatus('ready')
              onTokenChangeRef.current(token)
              if (pendingVerificationRef.current) {
                window.clearTimeout(pendingVerificationRef.current.timeoutId)
              }
              pendingVerificationRef.current?.resolve(token)
              pendingVerificationRef.current = null
            },
            'error-callback': (errorCode) => {
              if (disposed) return true
              tokenRef.current = ''
              onTokenChangeRef.current('')

              const retryable = errorCode.startsWith('300')
                || errorCode.startsWith('600')
                || errorCode === '110600'
                || errorCode === '110620'
                || errorCode === '200500'

              if (retryable) {
                setStatus('loading')
                return true
              }

              setStatus('error')
              if (pendingVerificationRef.current) {
                window.clearTimeout(pendingVerificationRef.current.timeoutId)
              }
              pendingVerificationRef.current?.reject(
                new Error('تعذر التحقق الأمني، يرجى المحاولة مرة أخرى.'),
              )
              pendingVerificationRef.current = null
              return true
            },
            'expired-callback': () => {
              if (disposed) return
              setStatus('loading')
              tokenRef.current = ''
              onTokenChangeRef.current('')
            },
            'timeout-callback': () => {
              if (disposed) return
              setStatus('loading')
              tokenRef.current = ''
              onTokenChangeRef.current('')
              if (pendingVerificationRef.current) {
                window.clearTimeout(pendingVerificationRef.current.timeoutId)
              }
              pendingVerificationRef.current?.reject(
                new Error('انتهت مهلة التحقق الأمني، يرجى المحاولة مرة أخرى.'),
              )
              pendingVerificationRef.current = null
            },
          })
        })
        .catch(() => {
          if (disposed) return
          loadErrorRef.current = true
          setStatus('error')
        })

      return () => {
        disposed = true
        tokenRef.current = ''
        onTokenChangeRef.current('')
        if (pendingVerificationRef.current) {
          window.clearTimeout(pendingVerificationRef.current.timeoutId)
        }
        pendingVerificationRef.current?.reject(new Error('تم إلغاء التحقق الأمني.'))
        pendingVerificationRef.current = null
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
