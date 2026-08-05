interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  theme?: 'dark' | 'light'
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  theme = 'dark',
}: SectionHeadingProps) {
  return (
    <header className={`section-heading section-heading--${theme}`}>
      <p className="section-heading__eyebrow" dir="ltr">
        {eyebrow}
      </p>
      <h2>{title}</h2>
      {description ? <p className="section-heading__description">{description}</p> : null}
    </header>
  )
}
