interface CinematicMediaStageProps {
  className?: string
  label?: string
  status?: string
}

/**
 * Stable media boundary for the cinematic sequence.
 * Phase 2 can replace the placeholder body with one video/canvas element while
 * the surrounding hero, story, and service sections remain unchanged.
 */
export function CinematicMediaStage({
  className = '',
  label = 'مساحة الفيلم السينمائي',
  status = 'VIDEO PLACEHOLDER · PHASE 01',
}: CinematicMediaStageProps) {
  return (
    <div
      className={`cinematic-media-stage ${className}`.trim()}
      role="img"
      aria-label={`${label} — سيتم استبدالها بفيلم الكاميرا في المرحلة القادمة`}
    >
      <div className="cinematic-media-stage__glow" aria-hidden="true" />
      <div className="cinematic-media-stage__camera" aria-hidden="true">
        <span className="cinematic-media-stage__top" />
        <span className="cinematic-media-stage__body" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--outer" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--middle" />
        <span className="cinematic-media-stage__lens cinematic-media-stage__lens--inner" />
        <span className="cinematic-media-stage__record-light" />
      </div>

      <div className="cinematic-media-stage__reticle" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="cinematic-media-stage__meta" aria-hidden="true">
        <span>{status}</span>
        <span>16:9 · 4K</span>
      </div>
    </div>
  )
}
