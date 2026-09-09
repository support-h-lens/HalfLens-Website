import { useEffect, useRef } from 'react'

// On-demand canvas; SVG is the complete artwork on touch / reduced motion / no JS.
export function LensField() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const field = fieldRef.current
    const canvas = canvasRef.current
    if (!field || !canvas) return
    const motion = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 721px) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let visible = false
    let width = 0
    let height = 0
    let lastRipple = -Infinity
    const ripples: Array<{ x: number; y: number; born: number }> = []
    let context: CanvasRenderingContext2D | null = null
    const draw = (time: number) => {
      frame = 0
      if (!context || !visible || !motion.matches || document.hidden) return
      while (ripples.length && time - ripples[0].born > 1800) ripples.shift()
      context.clearRect(0, 0, width, height)
      for (let ring = 0; ring < 32; ring++) {
        const radius = 26 + ring * Math.min(width, height) / 60
        context.beginPath()
        for (let step = 0; step <= 144; step++) {
          const angle = step / 144 * Math.PI * 2
          const baseX = width * .5 + Math.cos(angle) * radius * 1.15
          const baseY = height * .5 + Math.sin(angle) * radius
          let displacement = 0
          for (const ripple of ripples) {
            const age = (time - ripple.born) / 1000
            const distance = Math.hypot(baseX - ripple.x, baseY - ripple.y)
            const front = distance - age * 230
            displacement += Math.sin(front * .052) * Math.exp(-Math.abs(front) / 90) * Math.exp(-age * 1.8) * 19
          }
          const x = baseX + Math.cos(angle) * displacement
          const y = baseY + Math.sin(angle) * displacement
          if (!step) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = ring % 4 === 0 ? 'rgba(125,229,210,.65)' : 'rgba(136,152,203,.3)'
        context.lineWidth = 1
        context.stroke()
      }
      canvas.classList.add('is-drawn')
      if (ripples.length) frame = requestAnimationFrame(draw)
    }
    const schedule = () => {
      if (!frame && visible && motion.matches && !document.hidden) frame = requestAnimationFrame(draw)
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0; ripples.length = 0 }
    const resize = () => {
      stop()
      canvas.classList.remove('is-drawn')
      if (!motion.matches) return
      const bounds = field.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context = canvas.getContext('2d')
      context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      schedule()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !motion.matches || !visible || document.body.classList.contains('menu-is-open')) return
      const time = performance.now()
      if (time - lastRipple < 90) return
      lastRipple = time
      const bounds = field.getBoundingClientRect()
      ripples.push({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, born: time })
      if (ripples.length > 6) ripples.shift()
      schedule()
    }
    const visibility = () => { if (document.hidden) stop(); else schedule() }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
      else stop()
    })
    const sizeObserver = new ResizeObserver(resize)
    observer.observe(field)
    sizeObserver.observe(field)
    motion.addEventListener('change', resize)
    field.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    resize()
    return () => {
      stop()
      observer.disconnect()
      sizeObserver.disconnect()
      motion.removeEventListener('change', resize)
      field.removeEventListener('pointermove', move)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  return (
    <div ref={fieldRef} className="lens-field" aria-hidden="true">
      <svg className="lens-field__fallback" viewBox="0 0 640 560" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 32 }, (_, i) => <ellipse key={i} cx="320" cy="280" rx={(26 + i * 9.3) * 1.15} ry={26 + i * 9.3} />)}
      </svg>
      <canvas ref={canvasRef} />
      <div className="lens-field__cross lens-field__cross--one">+</div>
      <div className="lens-field__cross lens-field__cross--two">+</div>
      <div className="lens-field__center"><span>H</span><i /><span>L</span></div>
      <div className="lens-field__caption" dir="ltr"><span>THE OTHER HALF / YOU</span><span className="lens-field__hint">MOVE TO EXPLORE ↗</span></div>
    </div>
  )
}
