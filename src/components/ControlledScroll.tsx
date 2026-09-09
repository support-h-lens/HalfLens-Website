import { useEffect } from 'react'
import { installControlledScroll } from '../lib/controlledScroll'

export function ControlledScroll() {
  useEffect(installControlledScroll, [])
  return null
}
