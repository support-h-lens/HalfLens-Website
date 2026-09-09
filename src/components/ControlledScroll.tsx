import { useEffect } from 'react'
import { installControlledScroll } from '../lib/controlledScroll'
import { installScrollRefreshPolicy } from '../lib/gsap'

export function ControlledScroll() {
  useEffect(installControlledScroll, [])
  useEffect(installScrollRefreshPolicy, [])
  return null
}
