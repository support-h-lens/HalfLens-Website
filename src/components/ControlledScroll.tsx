import { useEffect } from 'react'

const MAX_WHEEL_DELTA = 132
const MAX_TARGET_LEAD = 680
const MAX_SPEED_PX_PER_SECOND = 2100
const FOLLOW_STRENGTH = 0.22
const SETTLE_DISTANCE = 1.5

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const normalizedWheelDelta = (event: WheelEvent) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight * 0.85
  return event.deltaY
}

const canNestedSurfaceScroll = (event: WheelEvent, direction: number) => {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue
    if (node === document.body || node === document.documentElement) break

    const { overflowY } = window.getComputedStyle(node)
    if (!/(auto|scroll|overlay)/.test(overflowY) || node.scrollHeight <= node.clientHeight + 1) {
      continue
    }

    const canMoveDown = node.scrollTop + node.clientHeight < node.scrollHeight - 1
    const canMoveUp = node.scrollTop > 1
    if ((direction > 0 && canMoveDown) || (direction < 0 && canMoveUp)) return true
  }

  return false
}

export function ControlledScroll() {
  useEffect(() => {
    const desktopPointer = window.matchMedia(
      '(min-width: 721px) and (hover: hover) and (pointer: fine)',
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let animationFrame = 0
    let previousTimestamp = 0
    let targetY = window.scrollY
    let isRunning = false

    const isEnabled = () =>
      desktopPointer.matches &&
      !reducedMotion.matches &&
      !document.body.classList.contains('menu-is-open')

    const maximumScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

    const stop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      previousTimestamp = 0
      isRunning = false
      targetY = window.scrollY
    }

    const renderStep = (timestamp: number) => {
      const currentY = window.scrollY
      const distance = targetY - currentY

      if (Math.abs(distance) <= SETTLE_DISTANCE) {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' })
        animationFrame = 0
        previousTimestamp = 0
        isRunning = false
        return
      }

      const elapsed = previousTimestamp
        ? Math.min((timestamp - previousTimestamp) / 1000, 0.05)
        : 1 / 60
      previousTimestamp = timestamp

      const frameAdjustedFollow = 1 - Math.pow(1 - FOLLOW_STRENGTH, elapsed * 60)
      const desiredStep = distance * frameAdjustedFollow

      if (Math.abs(desiredStep) < 1) {
        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' })
        animationFrame = 0
        previousTimestamp = 0
        isRunning = false
        return
      }

      const maximumStep = MAX_SPEED_PX_PER_SECOND * elapsed
      const nextY = currentY + clamp(desiredStep, -maximumStep, maximumStep)

      window.scrollTo({ top: nextY, left: 0, behavior: 'instant' })
      animationFrame = window.requestAnimationFrame(renderStep)
    }

    const handleWheel = (event: WheelEvent) => {
      if (
        !isEnabled() ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        event.deltaY === 0
      ) {
        return
      }

      const rawDelta = normalizedWheelDelta(event)
      const direction = Math.sign(rawDelta)
      if (canNestedSurfaceScroll(event, direction)) return

      event.preventDefault()

      const currentY = window.scrollY
      if (!isRunning) targetY = currentY

      const controlledDelta = clamp(rawDelta, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA)
      const requestedTarget = clamp(targetY + controlledDelta, 0, maximumScroll())
      targetY = currentY + clamp(requestedTarget - currentY, -MAX_TARGET_LEAD, MAX_TARGET_LEAD)

      isRunning = true
      if (!animationFrame) animationFrame = window.requestAnimationFrame(renderStep)
    }

    const handleNativeScroll = () => {
      if (!isRunning) targetY = window.scrollY
    }

    const handlePreferenceChange = () => stop()
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (
        ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)
      ) {
        stop()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('scroll', handleNativeScroll, { passive: true })
    window.addEventListener('resize', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('keydown', handleKeyboardNavigation)
    desktopPointer.addEventListener('change', handlePreferenceChange)
    reducedMotion.addEventListener('change', handlePreferenceChange)

    return () => {
      stop()
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('scroll', handleNativeScroll)
      window.removeEventListener('resize', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', handleKeyboardNavigation)
      desktopPointer.removeEventListener('change', handlePreferenceChange)
      reducedMotion.removeEventListener('change', handlePreferenceChange)
    }
  }, [])

  return null
}
