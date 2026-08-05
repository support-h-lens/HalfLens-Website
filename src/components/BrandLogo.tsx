interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/half-lens-logo-white.png"
      alt="نصف عدسة للإنتاج"
      width="978"
      height="654"
    />
  )
}
