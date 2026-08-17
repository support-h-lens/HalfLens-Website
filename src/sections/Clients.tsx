import { useLayoutEffect, useRef } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { clientTestimonial, clients, clientsContent } from '../data/siteContent'
import type { CSSProperties } from 'react'
import { gsap, ScrollTrigger, refreshScrollTriggerWhenReady } from '../lib/gsap'
import type { ClientItem } from '../types/content'

const finalClientStatValue = Number.parseInt(
  clientsContent.statValue.replace(/\D/g, ''),
  10,
)

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
          <small>CLIENT LOGO</small>
        </span>
      )}
    </li>
  )
}

export function Clients() {
  const sectionRef = useRef<HTMLElement>(null)
  const statRef = useRef<HTMLDivElement>(null)
  const statNumberRef = useRef<HTMLSpanElement>(null)
  const rowBreak = Math.ceil(clients.length / 2)
  const clientRows = [clients.slice(0, rowBreak), clients.slice(rowBreak)]

  useLayoutEffect(() => {
    const section = sectionRef.current
    const stat = statRef.current
    const statNumber = statNumberRef.current
    if (!section || !stat || !statNumber || !Number.isFinite(finalClientStatValue)) {
      return undefined
    }

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
            onUpdate: () => {
              statNumber.textContent = String(Math.round(counter.value))
            },
            onComplete: () => {
              statNumber.textContent = String(finalClientStatValue)
            },
          })
        },
      })
    }, stat)

    return () => {
      stopReadyRefresh()
      countTween?.kill()
      countTrigger?.kill()
      tickerTrigger?.kill()
      section.classList.remove('clients--ticker-active')
      context.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="clients light-section"
      aria-labelledby="clients-title"
    >
      <div className="layout-container clients__heading">
        <SectionHeading
          eyebrow={clientsContent.eyebrow}
          title={clientsContent.title}
          description={clientsContent.description}
          theme="light"
        />
        <div ref={statRef} className="clients__stat">
          <strong dir="ltr" aria-label={`أكثر من ${finalClientStatValue} شركة`}>
            <span aria-hidden="true">+</span>
            <span ref={statNumberRef} aria-hidden="true">{finalClientStatValue}</span>
          </strong>
          <span>{clientsContent.statLabel}</span>
        </div>
      </div>

      <div
        className="clients__ticker"
        role="region"
        aria-label="شعارات عملاء هاف لينس"
      >
        {clientRows.map((row, rowIndex) => (
          <div className="clients__ticker-row" key={`client-row-${rowIndex + 1}`}>
            <div
              className={`clients__ticker-track clients__ticker-track--${
                rowIndex === 0 ? 'left' : 'right'
              }`}
              style={
                {
                  '--ticker-duration': `${Math.max(
                    44,
                    row.length * 4.7 + rowIndex * 3,
                  )}s`,
                } as CSSProperties
              }
            >
              <ul
                className="clients__ticker-group"
                aria-label={`صف العملاء ${rowIndex + 1}`}
              >
                {row.map((client) => (
                  <ClientLogo client={client} key={client.id} />
                ))}
              </ul>
              <ul
                className="clients__ticker-group clients__ticker-group--clone"
                aria-hidden="true"
              >
                {row.map((client) => (
                  <ClientLogo
                    client={client}
                    duplicate
                    key={`${client.id}-duplicate`}
                  />
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <p className="clients__note layout-container">
        شراكات صنعت أثرًا في قطاعات حكومية، تقنية، ثقافية ورياضية.
      </p>

      <aside className="layout-container clients__testimonial" aria-label="شهادة عميل">
        <span className="clients__testimonial-mark" aria-hidden="true">“</span>
        <blockquote>{clientTestimonial.quote}</blockquote>
        <p dir="ltr">{clientTestimonial.attribution}</p>
      </aside>
    </section>
  )
}
