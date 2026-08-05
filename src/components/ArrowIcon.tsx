interface ArrowIconProps {
  direction?: 'down' | 'up-left'
}

export function ArrowIcon({ direction = 'up-left' }: ArrowIconProps) {
  return (
    <svg
      className={`arrow-icon arrow-icon--${direction}`}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M4 16 16 4M7 4h9v9" />
    </svg>
  )
}
