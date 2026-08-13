import { useLayoutEffect, useRef, useState } from 'react'
import { cinematicFilm } from '../data/media'
import { useCinematicVideoLoader } from '../hooks/useCinematicVideoLoader'
import { CinematicFrameScheduler } from '../lib/cinematicFrameScheduler'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'
import { Hero } from '../sections/Hero'
import { OurStory } from '../sections/OurStory'
import { Services } from '../sections/Services'
import { CinematicMediaStage } from './CinematicMediaStage'
import { CinematicSequenceStage } from './CinematicSequenceStage'

interface CinematicVideoStageProps {
  storyRef: React.RefObject<HTMLDivElement>
}

function CinematicVideoStage({ storyRef }: CinematicVideoStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [readyVideo, setReadyVideo] = useState<{
    currentSrc: string
    duration: number
    readyState: number
    source: string
  } | null>(null)
  const videoSource = useCinematicVideoLoader({
    desktopSrc: cinematicFilm.src,
    mobileSrc: cinematicFilm.mobileSrc,
  })

  useLayoutEffect(() => {
    const story = storyRef.current
    const video = videoRef.current
    if (
      !story
      || !video
      || !readyVideo
      || readyVideo.source !== videoSource.src
      || readyVideo.currentSrc !== video.currentSrc
      || readyVideo.duration <= 0
      || readyVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) return undefined

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
          const firstFrame = cinematicFilm.initialTime
          const lastFrame = Math.max(firstFrame, readyVideo.duration - 0.05)

          video.pause()

          if (reduceMotion) {
            video.currentTime = Math.min(1.1, lastFrame)
            return
          }

          if (!desktop && !mobile) return

          const scheduler = new CinematicFrameScheduler({
            video,
            frameRate: cinematicFilm.frameRate,
            firstTime: firstFrame,
            lastTime: lastFrame,
          })
          const scrollTrigger = ScrollTrigger.create({
            trigger: story,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: ({ progress }) => scheduler.setProgress(progress),
            onRefresh: ({ progress }) => scheduler.setProgress(progress),
          })

          scheduler.setProgress(scrollTrigger.progress)

          return () => {
            scheduler.destroy()
            scrollTrigger.kill()
          }
        },
      )
    }, story)

    const cancelRefresh = refreshScrollTriggerWhenReady()

    return () => {
      cancelRefresh()
      media?.revert()
      context.revert()
    }
  }, [readyVideo, storyRef, videoSource.src])

  return (
    <CinematicMediaStage
      ref={videoRef}
      className="cinematic-media-stage--fullscreen"
      videoSrc={videoSource.src}
      preload={videoSource.preload}
      posterSrc={cinematicFilm.poster}
      initialTime={cinematicFilm.initialTime}
      onVideoReady={setReadyVideo}
    />
  )
}

function getExperimentalRenderer() {
  if (typeof window === 'undefined') return 'video'
  return new URLSearchParams(window.location.search).get('renderer') === 'sequence'
    ? 'sequence'
    : 'video'
}

export function CinematicStory() {
  const storyRef = useRef<HTMLDivElement>(null)
  const renderer = getExperimentalRenderer()

  return (
    <div ref={storyRef} className="cinematic-story" data-cinematic-renderer={renderer}>
      <div className="cinematic-story__sticky" aria-hidden="true">
        {renderer === 'sequence' ? (
          <CinematicSequenceStage storyRef={storyRef} />
        ) : (
          <CinematicVideoStage storyRef={storyRef} />
        )}
      </div>

      <div className="cinematic-story__chapters">
        <Hero />
        <OurStory />
        <Services />
      </div>
    </div>
  )
}
