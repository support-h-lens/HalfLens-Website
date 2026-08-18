const cinematicMediaBase = import.meta.env.DEV
  ? '/media'
  : 'https://pub-f57e293f7dcb4b648176c6e821dec885.r2.dev'

export const cinematicFilm = {
  src: `${cinematicMediaBase}/h-lens-camera-scroll.2dca78fcb8a1.mp4`,
  mobileSrc: `${cinematicMediaBase}/h-lens-camera-scroll.d910c0e374dc.mp4`,
  poster: '/media/h-lens-camera-poster.60f5cbbaa591.webp',
  frameRate: 48,
  initialTime: 2 / 48,
} as const
