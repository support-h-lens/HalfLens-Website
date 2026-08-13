import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { cinematicFilm } from '../data/media'
import { CinematicSequenceRenderer } from '../lib/cinematicSequenceRenderer'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'

const SEQUENCE_FRAME_COUNT = 301
const REDUCED_MOTION_FRAME = 33

interface CinematicSequenceStageProps {
  storyRef: RefObject<HTMLDivElement>
}

function sequenceFrameUrl(frame: number) {
  return `/experimental/cinematic-sequence/frame-${String(frame).padStart(3, '0')}.png`
}

export function CinematicSequenceStage({ storyRef }: CinematicSequenceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)

  useLayoutEffect(() => {
    const story = storyRef.current
    const canvas = canvasRef.current
    if (!story || !canvas) return undefined

    const renderer = new CinematicSequenceRenderer({
      canvas,
      frameCount: SEQUENCE_FRAME_COUNT,
      frameUrl: sequenceFrameUrl,
      onFirstFrame: () => setIsReady(true),
    })
    let media: gsap.MatchMedia | undefined
    const context = gsap.context(() => {
      media = gsap.matchMedia()
      media.add(
        {
          desktop: '(min-width: 721px)',
          mobile: '(max-width: 720px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const { desktop, mobile, reduceMotion } = conditions ?? {}
          if (reduceMotion) {
            renderer.setTargetFrame(REDUCED_MOTION_FRAME)
            return
          }
          if (!desktop && !mobile) return

          const scrollTrigger = ScrollTrigger.create({
            trigger: story,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: ({ progress }) => renderer.setProgress(progress),
            onRefresh: ({ progress }) => renderer.setProgress(progress),
          })

          renderer.setProgress(scrollTrigger.progress)
          return () => scrollTrigger.kill()
        },
      )
    }, story)

    const cancelRefresh = refreshScrollTriggerWhenReady()
    return () => {
      cancelRefresh()
      media?.revert()
      context.revert()
      renderer.destroy()
    }
  }, [storyRef])

  return (
    <div
      className={`cinematic-media-stage cinematic-media-stage--video cinematic-media-stage--sequence cinematic-media-stage--fullscreen has-video-poster${
        isReady ? ' is-sequence-ready' : ''
      }`}
      role="img"
      aria-label="فيلم الكاميرا السينمائي"
      data-renderer="sequence"
    >
      <img
        className="cinematic-media-stage__sequence-poster"
        src={cinematicFilm.poster}
        alt=""
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="cinematic-media-stage__sequence-canvas"
        aria-hidden="true"
      />
    </div>
  )
}
