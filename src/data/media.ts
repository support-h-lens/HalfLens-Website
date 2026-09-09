const cinematicMediaBase = import.meta.env.DEV
  ? '/media'
  : 'https://pub-046fd1c457744b10afc99fdd2c5ab3d1.r2.dev'

export const cinematicFilm = {
  src: `${cinematicMediaBase}/h-lens-hero-landscape.b7c04877f910.mp4`,
  mobileSrc: `${cinematicMediaBase}/h-lens-hero-portrait.e971de5ef297.mp4`,
  poster: '/media/h-lens-hero-landscape-poster.1ee743755595.webp',
  mobilePoster: '/media/h-lens-hero-portrait-poster.930b0d69b4f6.webp',
  frameRate: 48,
  initialTime: 2 / 48,
} as const
