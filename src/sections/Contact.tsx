import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react'
import { ArrowIcon } from '../components/ArrowIcon'
import { contactChannels, contactPaths, projectTypes } from '../data/siteContent'

type ContactPath = keyof typeof contactPaths

const careerCvMaxBytes = 10 * 1024 * 1024

interface ProjectTypeSelectProps {
  invalid: boolean
  onChange: (value: string) => void
  triggerRef: RefObject<HTMLButtonElement>
  value: string
}

function ProjectTypeSelect({
  invalid,
  onChange,
  triggerRef,
  value,
}: ProjectTypeSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectedIndex = projectTypes.indexOf(value)

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isOpen])

  const openMenu = (preferredIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActiveIndex(preferredIndex)
    setIsOpen(true)
  }

  const selectOption = (index: number) => {
    onChange(projectTypes[index])
    setActiveIndex(index)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const lastIndex = projectTypes.length - 1

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) openMenu()
        else setActiveIndex((index) => Math.min(index + 1, lastIndex))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) openMenu(selectedIndex >= 0 ? selectedIndex : lastIndex)
        else setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        if (!isOpen) break
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        if (!isOpen) break
        event.preventDefault()
        setActiveIndex(lastIndex)
        break
      case 'Enter':
      case ' ':
        if (!isOpen) break
        event.preventDefault()
        selectOption(activeIndex)
        break
      case 'Escape':
        if (!isOpen) break
        event.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div
      ref={rootRef}
      className={`project-select${isOpen ? ' project-select--open' : ''}${
        invalid ? ' project-select--invalid' : ''
      }`}
    >
      <input name="projectType" type="hidden" value={value} readOnly />
      <button
        ref={triggerRef}
        id="project-type"
        className="project-select__trigger"
        type="button"
        role="combobox"
        aria-activedescendant={isOpen ? `project-type-option-${activeIndex}` : undefined}
        aria-controls="project-type-options"
        aria-describedby={invalid ? 'project-type-error' : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={invalid}
        aria-labelledby="project-type-label project-type-value"
        aria-required="true"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span
          id="project-type-value"
          className={value ? '' : 'project-select__placeholder'}
        >
          {value || 'اختر نوع المشروع'}
        </span>
        <span className="project-select__chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="m3 6 5 5 5-5" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <ul id="project-type-options" className="project-select__options" role="listbox">
          {projectTypes.map((option, index) => {
            const isSelected = option === value
            const isActive = index === activeIndex

            return (
              <li
                id={`project-type-option-${index}`}
                className={`${isActive ? 'is-active' : ''}${
                  isSelected ? ' is-selected' : ''
                }`}
                role="option"
                aria-selected={isSelected}
                key={option}
                onClick={() => selectOption(index)}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => setActiveIndex(index)}
              >
                <span>{option}</span>
                <span className="project-select__selected-mark" aria-hidden="true" />
              </li>
            )
          })}
        </ul>
      ) : null}

      {invalid ? (
        <p id="project-type-error" className="project-select__error" role="alert">
          يرجى اختيار نوع المشروع.
        </p>
      ) : null}
    </div>
  )
}

export function Contact() {
  const projectTypeTriggerRef = useRef<HTMLButtonElement>(null)
  const clientTabRef = useRef<HTMLButtonElement>(null)
  const careerTabRef = useRef<HTMLButtonElement>(null)
  const [activePath, setActivePath] = useState<ContactPath>('client')
  const [projectType, setProjectType] = useState('')
  const [projectTypeInvalid, setProjectTypeInvalid] = useState(false)
  const [careerCvName, setCareerCvName] = useState('')
  const [careerCvError, setCareerCvError] = useState('')
  const activeContent = contactPaths[activePath]
  const visibleChannels = contactChannels.filter((channel) => {
    if (activePath === 'career') {
      return channel.href === 'mailto:hr@h-lens.co' || channel.href.startsWith('tel:')
    }

    return channel.href !== 'mailto:hr@h-lens.co'
  })

  const selectPath = (path: ContactPath) => {
    setActivePath(path)
  }

  const handlePathKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentPath: ContactPath,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    const nextPath: ContactPath =
      event.key === 'Home'
        ? 'client'
        : event.key === 'End'
          ? 'career'
          : currentPath === 'client'
            ? 'career'
            : 'client'

    selectPath(nextPath)
    window.requestAnimationFrame(() => {
      if (nextPath === 'client') clientTabRef.current?.focus()
      else careerTabRef.current?.focus()
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!projectType) {
      setProjectTypeInvalid(true)
      window.requestAnimationFrame(() => projectTypeTriggerRef.current?.focus())
      return
    }

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

  const handleCareerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    const name = String(data.get('careerName') ?? '')
    const email = String(data.get('careerEmail') ?? '')
    const phone = String(data.get('careerPhone') ?? '')
    const specialty = String(data.get('specialty') ?? '')
    const portfolio = String(data.get('portfolio') ?? '')
    const message = String(data.get('careerMessage') ?? '')
    const cv = data.get('careerCv')
    const cvName = cv instanceof File && cv.name ? cv.name : 'غير محدد'
    const subject = encodeURIComponent(`طلب انضمام جديد — ${specialty || name}`)
    const body = encodeURIComponent(
      `الاسم: ${name}\nالبريد: ${email}\nالهاتف: ${phone}\nالتخصص: ${specialty}\nرابط الأعمال أو LinkedIn: ${portfolio}\nملف السيرة الذاتية المختار: ${cvName}\nيرجى إرفاق ملف السيرة الذاتية قبل إرسال الرسالة.\n\n${message}`,
    )
    window.location.href = `mailto:hr@h-lens.co?subject=${subject}&body=${body}`
  }

  const handleCareerCvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    input.setCustomValidity('')
    setCareerCvError('')

    if (!file) {
      setCareerCvName('')
      return
    }

    if (file.size > careerCvMaxBytes) {
      const message = 'يجب ألا يتجاوز حجم السيرة الذاتية 10 ميجابايت.'
      input.value = ''
      input.setCustomValidity(message)
      setCareerCvName('')
      setCareerCvError(message)
      input.reportValidity()
      return
    }

    setCareerCvName(file.name)
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
          <p className="eyebrow">{activeContent.eyebrow}</p>
          <h2 id="contact-title" key={`${activePath}-title`}>
            {activeContent.title.split('\n').map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p key={`${activePath}-description`}>{activeContent.description}</p>

          <dl className="contact__channels">
            {visibleChannels.map((channel) => (
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

        <div className="contact__form-column">
          <div className="contact__path-tabs" role="tablist" aria-label="اختر مسار التواصل">
            <button
              ref={clientTabRef}
              id="contact-tab-client"
              className={activePath === 'client' ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-controls="contact-panel-client"
              aria-selected={activePath === 'client'}
              tabIndex={activePath === 'client' ? 0 : -1}
              onClick={() => selectPath('client')}
              onKeyDown={(event) => handlePathKeyDown(event, 'client')}
            >
              <span>01</span>
              {contactPaths.client.label}
            </button>
            <button
              ref={careerTabRef}
              id="contact-tab-career"
              className={activePath === 'career' ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-controls="contact-panel-career"
              aria-selected={activePath === 'career'}
              tabIndex={activePath === 'career' ? 0 : -1}
              onClick={() => selectPath('career')}
              onKeyDown={(event) => handlePathKeyDown(event, 'career')}
            >
              <span>02</span>
              {contactPaths.career.label}
            </button>
          </div>

          <div
            id="contact-panel-client"
            className="contact__path-panel"
            role="tabpanel"
            aria-labelledby="contact-tab-client"
            hidden={activePath !== 'client'}
          >
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
                <label id="project-type-label" htmlFor="project-type">نوع المشروع</label>
                <ProjectTypeSelect
                  invalid={projectTypeInvalid}
                  onChange={(value) => {
                    setProjectType(value)
                    setProjectTypeInvalid(false)
                  }}
                  triggerRef={projectTypeTriggerRef}
                  value={projectType}
                />
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

          <div
            id="contact-panel-career"
            className="contact__path-panel"
            role="tabpanel"
            aria-labelledby="contact-tab-career"
            hidden={activePath !== 'career'}
          >
            <form className="contact-form" onSubmit={handleCareerSubmit}>
              <div className="form-field">
                <label htmlFor="career-name">الاسم</label>
                <input id="career-name" name="careerName" type="text" autoComplete="name" required />
              </div>
              <div className="form-field">
                <label htmlFor="career-phone">رقم التواصل</label>
                <input
                  id="career-phone"
                  name="careerPhone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  dir="ltr"
                  required
                />
              </div>
              <div className="form-field form-field--wide">
                <label htmlFor="career-email">البريد الإلكتروني</label>
                <input
                  id="career-email"
                  name="careerEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  dir="ltr"
                  required
                />
              </div>
              <div className="form-field form-field--wide">
                <label htmlFor="specialty">المسمى الوظيفي أو التخصص</label>
                <input id="specialty" name="specialty" type="text" required />
              </div>
              <div className="form-field form-field--wide">
                <label htmlFor="portfolio-link">رابط الأعمال أو LinkedIn</label>
                <input
                  id="portfolio-link"
                  name="portfolio"
                  type="url"
                  inputMode="url"
                  dir="ltr"
                  placeholder="https://"
                  required
                />
              </div>
              <div className="form-field form-field--wide">
                <span id="career-cv-label" className="form-field__label">
                  السيرة الذاتية
                </span>
                <input
                  id="career-cv"
                  className="cv-upload__input"
                  name="careerCv"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  aria-describedby={`career-cv-hint${careerCvError ? ' career-cv-error' : ''}`}
                  aria-labelledby="career-cv-label career-cv-name"
                  onChange={handleCareerCvChange}
                  required
                />
                <label
                  className={`cv-upload${careerCvName ? ' cv-upload--selected' : ''}`}
                  htmlFor="career-cv"
                >
                  <span className="cv-upload__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5V20h14v-4.5" />
                    </svg>
                  </span>
                  <span className="cv-upload__details">
                    <strong id="career-cv-name" dir="auto">
                      {careerCvName || 'اختر ملف السيرة الذاتية'}
                    </strong>
                    <small id="career-cv-hint">PDF أو DOC أو DOCX · بحد أقصى 10 ميجابايت</small>
                  </span>
                  <span className="cv-upload__action">
                    {careerCvName ? 'تغيير الملف' : 'اختيار ملف'}
                  </span>
                </label>
                {careerCvError ? (
                  <p id="career-cv-error" className="cv-upload__error" role="alert">
                    {careerCvError}
                  </p>
                ) : null}
              </div>
              <div className="form-field form-field--wide">
                <label htmlFor="career-message">عرّفنا بنفسك</label>
                <textarea id="career-message" name="careerMessage" rows={4} required />
              </div>
              <div className="contact-form__footer form-field--wide">
                <p>
                  سيُفتح تطبيق البريد لإرسال الطلب. أرفق ملف السيرة الذاتية الذي اخترته قبل
                  الإرسال.
                </p>
                <button className="button button--submit" type="submit">
                  <span>أرسل طلب الانضمام</span>
                  <ArrowIcon />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
