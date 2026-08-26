import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { clients, clientsContent } from '../data/siteContent'
import { gsap, ScrollTrigger, refreshScrollTriggerWhenReady } from '../lib/gsap'
import type { ClientItem } from '../types/content'

const finalClientStatValue = Number.parseInt(clientsContent.statValue.replace(/\D/g, ''), 10)

function ClientLogo({
  client,
  duplicate = false,
}: {
  client: ClientItem
  duplicate?: boolean
}) {
  return (
    <li className="clients__ticker-item" aria-hidden={duplicate || undefined}>
      {client.logo ? (
        <img
          className={`client-logo client-logo--${client.id}`}
          src={client.logo}
          alt={duplicate ? '' : client.name}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          className="client-placeholder"
          aria-label={duplicate ? undefined : client.name}
        >
          <strong dir="ltr">{client.abbreviation}</strong>
          <small>CLIENT</small>
        </span>
      )}
    </li>
  )
}

export function Clients({ items = clients }: { items?: ClientItem[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const statRef = useRef<HTMLDivElement>(null)
  const statNumberRef = useRef<HTMLSpanElement>(null)
  const rowBreak = Math.ceil(items.length / 2)
  const clientRows = [items.slice(0, rowBreak), items.slice(rowBreak)].filter((row) => row.length > 0)

  useLayoutEffect(() => {
    const section = sectionRef.current
    const stat = statRef.current
    const statNumber = statNumberRef.current
    if (!section || !stat || !statNumber || !Number.isFinite(finalClientStatValue)) return undefined

    let countTween: gsap.core.Tween | undefined
    let countTrigger: ScrollTrigger | undefined
    let tickerTrigger: ScrollTrigger | undefined
    const stopReadyRefresh = refreshScrollTriggerWhenReady()

    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const logoImages = section.querySelectorAll<HTMLImageElement>('.client-logo')

      const setTickerActive = (active: boolean) => {
        if (active) {
          logoImages.forEach((image) => {
            image.loading = 'eager'
          })
        }

        section.classList.toggle('clients--ticker-active', active && !reduceMotion)
      }

      tickerTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 120%',
        end: 'bottom -20%',
        invalidateOnRefresh: true,
        onToggle: ({ isActive }) => setTickerActive(isActive),
        onRefresh: ({ isActive }) => setTickerActive(isActive),
      })

      if (reduceMotion) {
        statNumber.textContent = String(finalClientStatValue)
        return
      }

      const counter = { value: 1 }
      statNumber.textContent = '1'
      countTrigger = ScrollTrigger.create({
        trigger: stat,
        start: 'top 88%',
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => {
          countTween = gsap.to(counter, {
            value: finalClientStatValue,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => { statNumber.textContent = String(Math.round(counter.value)) },
            onComplete: () => { statNumber.textContent = String(finalClientStatValue) },
          })
        },
      })
    }, section)

    return () => {
      stopReadyRefresh()
      countTween?.kill()
      countTrigger?.kill()
      tickerTrigger?.kill()
      section.classList.remove('clients--ticker-active')
      context.revert()
    }
  }, [items])

  return (
    <section ref={sectionRef} id="clients" className="clients light-section" aria-labelledby="clients-title">
      <div className="layout-container clients__heading">
        <SectionHeading
          eyebrow={clientsContent.eyebrow}
          title={clientsContent.title}
          description={clientsContent.description}
          theme="light"
        />
        <div ref={statRef} className="clients__stat">
          <strong dir="ltr">
            <span className="visually-hidden" dir="rtl">أكثر من {finalClientStatValue} شركة</span>
            <span aria-hidden="true">+</span>
            <span ref={statNumberRef} aria-hidden="true">{finalClientStatValue}</span>
          </strong>
          <span>{clientsContent.statLabel}</span>
        </div>
      </div>

      <div className="clients__field" role="region" aria-label="شعارات عملاء هاف لينس">
        <div className="layout-container clients__field-header">
          <p>شركاء النجاح</p>
          <span dir="ltr">TRUST FIELD / 01</span>
        </div>

        <div className="clients__ticker">
          {clientRows.map((row, rowIndex) => (
            <div className="clients__ticker-row" key={`client-row-${rowIndex + 1}`}>
              <div
                className={`clients__ticker-track clients__ticker-track--${rowIndex === 0 ? 'left' : 'right'}`}
                style={{
                  '--ticker-duration': `${Math.max(56, row.length * 5.2 + rowIndex * 4)}s`,
                } as CSSProperties}
              >
                <ul className="clients__ticker-group" aria-label={`صف العملاء ${rowIndex + 1}`}>
                  {row.map((client) => <ClientLogo client={client} key={client.id} />)}
                </ul>
                <ul className="clients__ticker-group clients__ticker-group--clone" aria-hidden="true">
                  {row.map((client) => (
                    <ClientLogo client={client} duplicate key={`${client.id}-duplicate`} />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="layout-container clients__note">
        <span dir="ltr">PUBLIC · PRIVATE · CULTURE · TECHNOLOGY</span>
        <p>شراكات صنعت أثرًا في قطاعات حكومية، تقنية، ثقافية ورياضية.</p>
      </div>
    </section>
  )
}
