export function SectionMarker({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <div className="section-marker">
      <span className="section-marker__index" dir="ltr"><i aria-hidden="true" />({number})</span>
      <span>{label}</span>
      <span className="section-marker__detail" dir="ltr">{detail}</span>
    </div>
  )
}
