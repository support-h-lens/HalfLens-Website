import { SectionHeading } from '../components/SectionHeading'
import { clients, clientsContent } from '../data/siteContent'

export function Clients() {
  return (
    <section id="clients" className="clients light-section" aria-labelledby="clients-title">
      <div className="layout-container clients__heading">
        <SectionHeading
          eyebrow={clientsContent.eyebrow}
          title={clientsContent.title}
          description={clientsContent.description}
          theme="light"
        />
        <div className="clients__stat">
          <strong dir="ltr">+40</strong>
          <span>شراكة إبداعية</span>
        </div>
      </div>

      <ul className="layout-container clients__grid" aria-label="شعارات العملاء المؤقتة">
        {clients.map((client) => (
          <li key={client.id}>
            {client.logo ? (
              <img src={client.logo} alt={client.name} loading="lazy" />
            ) : (
              <span className="client-placeholder" aria-label={client.name}>
                <strong dir="ltr">{client.abbreviation}</strong>
                <small>CLIENT LOGO</small>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="clients__note layout-container">
        ستُستبدل هذه العناصر بشعارات العملاء المعتمدة عند توفير ملفاتها.
      </p>
    </section>
  )
}
