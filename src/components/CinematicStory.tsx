import { useLayoutEffect, useRef, useState } from 'react'
import { cinematicFilm } from '../data/media'
import { useCinematicVideoLoader } from '../hooks/useCinematicVideoLoader'
import { CinematicFrameScheduler } from '../lib/cinematicFrameScheduler'
import { gsap, refreshScrollTriggerWhenReady, ScrollTrigger } from '../lib/gsap'
import { Hero } from '../sections/Hero'
import { Services } from '../sections/Services'
import { CinematicMediaStage } from './CinematicMediaStage'

export function CinematicStory() {
  const storyRef = useRef<HTMLDivElement>(null)
  const chaptersRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [needsVideoTap, setNeedsVideoTap] = useState(false)
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
    const chapters = chaptersRef.current
    if (!story || !chapters) return
    const media = gsap.matchMedia()
    const context = gsap.context(() => {
      media.add({
        motion: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 721px) and (hover: hover) and (pointer: fine)',
      }, ({ conditions }) => {
        if (!conditions?.motion) return
        const hero = story.querySelector<HTMLElement>('.hero')
        if (!hero) return
        if (conditions.desktop) {
          gsap.to(hero, {
            y: () => hero.offsetHeight * .62, ease: 'none',
            scrollTrigger: { trigger: story, start: 'top top', end: () => `+=${hero.offsetHeight}`, scrub: true, invalidateOnRefresh: true },
          })
        }
        gsap.to(hero.querySelector('.hero__layout'), {
          opacity: 0, ease: 'none',
          scrollTrigger: { trigger: story, start: () => `top -=${hero.offsetHeight * .35}`, end: () => `top -=${hero.offsetHeight * .9}`, scrub: true, invalidateOnRefresh: true },
        })
        // Clear the service labels before the film reaches its ending. The
        // existing service animations remain untouched inside this wrapper.
        // Reverse scrolling restores the labels; reduced motion skips the fade.
        const serviceLayout = chapters.querySelector<HTMLElement>('.services__layout')
        if (serviceLayout) {
          gsap.fromTo(serviceLayout, { opacity: 1 }, {
            opacity: 0, ease: 'none',
            scrollTrigger: {
              trigger: chapters,
              start: () => `bottom bottom+=${Math.min(260, Math.max(140, window.innerHeight * .24))}`,
              end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
            },
          })
        }
      })
    }, story)
    const cancelRefresh = refreshScrollTriggerWhenReady()
    return () => { cancelRefresh(); media.revert(); context.revert() }
  }, [])

  useLayoutEffect(() => {
    const story = storyRef.current
    const chapters = chaptersRef.current
    const video = videoRef.current
    if (
      !story
      || !chapters
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
            // Finish the film before the following sheet starts covering it.
            // The sticky stage's final-frame hold is outside this timeline.
            trigger: chapters,
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
  }, [readyVideo, videoSource.src])

  return (
    <div ref={storyRef} className="cinematic-story">
      <div className="cinematic-story__sticky" aria-hidden="true">
        <CinematicMediaStage
          key={videoSource.assetSrc}
          ref={videoRef}
          className="cinematic-media-stage--fullscreen"
          videoSrc={videoSource.src}
          preload={videoSource.preload}
          active={videoSource.isActive}
          posterSrc={cinematicFilm.poster}
          portraitPosterSrc={cinematicFilm.mobilePoster}
          initialTime={cinematicFilm.initialTime}
          onVideoReady={setReadyVideo}
          onPlaybackBlocked={setNeedsVideoTap}
        />
      </div>

      <div ref={chaptersRef} className="cinematic-story__chapters">
        <Hero onStartFilm={needsVideoTap ? () => videoRef.current?.dispatchEvent(new Event('hlens:activate-video')) : undefined} />
        <Services />
      </div>
      <div className="cinematic-story__tail" aria-hidden="true" />
    </div>
  )
}
