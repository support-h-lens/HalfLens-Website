import type { FormEvent } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { contactChannels, contactContent } from '../data/siteContent'

export function Contact() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '')
    const company = String(data.get('company') ?? '')
    const email = String(data.get('email') ?? '')
    const type = String(data.get('projectType') ?? '')
    const message = String(data.get('message') ?? '')
    const subject = encodeURIComponent(`طلب مشروع جديد — ${company || name}`)
    const body = encodeURIComponent(
      `الاسم: ${name}\nالجهة: ${company}\nالبريد: ${email}\nنوع المشروع: ${type}\n\n${message}`,
    )
    window.location.href = `mailto:bd@h-lens.co?subject=${subject}&body=${body}`
  }

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <div className="contact__glow" aria-hidden="true" />
      <div className="contact__frame-label" aria-hidden="true">
        <span>FINAL FRAME</span>
        <span>READY TO COLLABORATE</span>
      </div>
      <div className="layout-container contact__layout">
        <div className="contact__intro">
          <p className="eyebrow" dir="ltr">
            {contactContent.eyebrow}
          </p>
          <h2 id="contact-title">
            {contactContent.title.split('\n').map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p>{contactContent.description}</p>

          <dl className="contact__channels">
            {contactChannels.map((channel) => (
              <div key={channel.label}>
                <dt>{channel.label}</dt>
                <dd>
                  <a href={channel.href} dir="ltr">
                    {channel.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">الاسم</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="company">الجهة</label>
            <input id="company" name="company" type="text" autoComplete="organization" />
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              required
            />
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="project-type">نوع المشروع</label>
            <select id="project-type" name="projectType" defaultValue="" required>
              <option value="" disabled>
                اختر نوع المشروع
              </option>
              <option>فيديو إبداعي</option>
              <option>تصوير فوتوغرافي</option>
              <option>موشن جرافيك 2D + 3D</option>
              <option>تغطية إعلامية</option>
              <option>إعلان سينمائي</option>
              <option>أخرى</option>
            </select>
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="message">حدثنا عن الفكرة</label>
            <textarea id="message" name="message" rows={4} required />
          </div>
          <div className="contact-form__footer form-field--wide">
            <p>سيُفتح تطبيق البريد لإرسال تفاصيل المشروع مباشرة إلى فريقنا.</p>
            <button className="button button--submit" type="submit">
              <span>أرسل تفاصيل المشروع</span>
              <ArrowIcon />
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
