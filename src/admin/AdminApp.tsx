import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  deleteEntity,
  getMembership,
  importCurrentWebsiteContent,
  listAccessUsers,
  listClients,
  listProjects,
  listRedirects,
  listSections,
  saveClient,
  saveCmsAccess,
  saveProject,
  saveRedirect,
  saveSection,
  setEntityStatus,
} from './cmsApi'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  AdminView,
  CmsClient,
  CmsAccessUser,
  CmsMember,
  CmsProject,
  CmsRedirect,
  CmsSection,
  CmsRole,
  PublishStatus,
} from './types'

const statusLabels: Record<PublishStatus, string> = {
  draft: 'مسودة',
  published: 'منشور',
  archived: 'مؤرشف',
}

const roleLabels = {
  owner: 'مالك الموقع',
  editor: 'محرر',
  viewer: 'قارئ',
}

const navigation: Array<{ id: AdminView; label: string; index: string }> = [
  { id: 'overview', label: 'نظرة عامة', index: '01' },
  { id: 'projects', label: 'الأعمال', index: '02' },
  { id: 'clients', label: 'العملاء', index: '03' },
  { id: 'sections', label: 'نصوص الموقع', index: '04' },
  { id: 'redirects', label: 'تحويلات SEO', index: '05' },
  { id: 'access', label: 'صلاحيات الدخول', index: '06' },
]

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' | 'success' }) {
  return <div className={`admin-notice admin-notice--${tone}`}>{children}</div>
}

function Login({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError || !data.session) {
      setError('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.')
      return
    }
    onAuthenticated(data.session)
  }

  return (
    <main className="admin-auth" dir="rtl">
      <div className="admin-auth__frame" aria-hidden="true" />
      <section className="admin-auth__panel">
        <img src="/half-lens-logo-white.png" alt="H-Lens" className="admin-auth__logo" />
        <p className="admin-kicker"><span /> CONTROL ROOM / 01</p>
        <h1>لوحة تحكم<br />الموقع.</h1>
        <p className="admin-auth__intro">مساحة خاصة لإدارة المحتوى المنشور على موقع H-Lens.</p>
        <form onSubmit={submit} className="admin-auth__form">
          <label>
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <button className="admin-primary-button" type="submit" disabled={loading}>
            <span>{loading ? 'جارٍ التحقق…' : 'دخول آمن'}</span>
            <ArrowIcon />
          </button>
        </form>
        <p className="admin-auth__security">الدخول متاح للحسابات المصرح بها فقط. جميع الصلاحيات محمية على مستوى قاعدة البيانات.</p>
      </section>
    </main>
  )
}

function ConfigurationRequired() {
  return (
    <main className="admin-auth" dir="rtl">
      <section className="admin-auth__panel">
        <img src="/half-lens-logo-white.png" alt="H-Lens" className="admin-auth__logo" />
        <p className="admin-kicker"><span /> CONFIGURATION</p>
        <h1>الإدارة غير<br />مهيأة بعد.</h1>
        <Notice tone="error">يلزم ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في بيئة النشر.</Notice>
      </section>
    </main>
  )
}

function AccessDenied({ onLogout }: { onLogout: () => void }) {
  return (
    <main className="admin-auth" dir="rtl">
      <section className="admin-auth__panel">
        <img src="/half-lens-logo-white.png" alt="H-Lens" className="admin-auth__logo" />
        <p className="admin-kicker"><span /> ACCESS DENIED</p>
        <h1>الحساب غير<br />مصرح له.</h1>
        <p className="admin-auth__intro">تسجيل الدخول صحيح، لكن هذا الحساب غير موجود ضمن قائمة إدارة الموقع.</p>
        <button className="admin-secondary-button" type="button" onClick={onLogout}>تسجيل الخروج</button>
      </section>
    </main>
  )
}

interface AdminData {
  projects: CmsProject[]
  clients: CmsClient[]
  sections: CmsSection[]
  redirects: CmsRedirect[]
  accessUsers: CmsAccessUser[]
}

const emptyData: AdminData = { projects: [], clients: [], sections: [], redirects: [], accessUsers: [] }

function StatusBadge({ status }: { status: PublishStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabels[status]}</span>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="admin-empty">
      <span>HL / EMPTY</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button className="admin-modal__backdrop" type="button" aria-label="إغلاق" onClick={onClose} />
      <section className="admin-modal__panel">
        <header>
          <div>
            <p className="admin-kicker"><span /> EDITOR</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><CloseIcon /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function ProjectForm({
  project,
  onSave,
  onClose,
}: {
  project: CmsProject | null
  onSave: (project: Parameters<typeof saveProject>[0]) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    project_code: project?.project_code || '',
    slug: project?.slug || '',
    title: project?.title || '',
    category: project?.category || '',
    client: project?.client || '',
    production_role: project?.production_role || '',
    format: project?.format || '',
    project_year: project?.project_year?.toString() || '',
    palette: project?.palette || 'amber',
    image_url: project?.image_url || '',
    youtube_id: project?.youtube_id || '',
    youtube_url: project?.youtube_url || '',
    youtube_poster_url: project?.youtube_poster_url || '',
    aspect_ratio: project?.aspect_ratio?.toString() || '1.777',
    sort_order: project?.sort_order?.toString() || '0',
    status: project?.status || 'draft',
    seo_title: project?.seo_title || '',
    seo_description: project?.seo_description || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...(project?.id ? { id: project.id } : {}),
        ...form,
        project_year: form.project_year ? Number(form.project_year) : null,
        aspect_ratio: Number(form.aspect_ratio) || 1.777,
        sort_order: Number(form.sort_order) || 0,
        palette: form.palette as CmsProject['palette'],
        status: form.status as PublishStatus,
        image_url: form.image_url || null,
        youtube_id: form.youtube_id || null,
        youtube_url: form.youtube_url || null,
        youtube_poster_url: form.youtube_poster_url || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ المشروع.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-editor-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label><span>رمز المشروع</span><input value={form.project_code} onChange={(e) => update('project_code', e.target.value)} required /></label>
        <label><span>الرابط المختصر</span><input dir="ltr" value={form.slug} onChange={(e) => update('slug', e.target.value)} required /></label>
        <label className="span-2"><span>اسم المشروع</span><input value={form.title} onChange={(e) => update('title', e.target.value)} required /></label>
        <label><span>العميل</span><input value={form.client} onChange={(e) => update('client', e.target.value)} required /></label>
        <label><span>التصنيف</span><input value={form.category} onChange={(e) => update('category', e.target.value)} required /></label>
        <label className="span-2"><span>دور H-Lens</span><input value={form.production_role} onChange={(e) => update('production_role', e.target.value)} required /></label>
        <label><span>السنة</span><input type="number" inputMode="numeric" value={form.project_year} onChange={(e) => update('project_year', e.target.value)} /></label>
        <label><span>الصيغة</span><input value={form.format} onChange={(e) => update('format', e.target.value)} /></label>
        <label><span>الترتيب</span><input type="number" value={form.sort_order} onChange={(e) => update('sort_order', e.target.value)} /></label>
        <label><span>اللون</span><select value={form.palette} onChange={(e) => update('palette', e.target.value)}><option value="amber">Amber</option><option value="violet">Violet</option><option value="cyan">Cyan</option><option value="crimson">Crimson</option><option value="silver">Silver</option></select></label>
        <label><span>الحالة</span><select value={form.status} onChange={(e) => update('status', e.target.value)}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
        <label><span>نسبة العرض</span><input dir="ltr" value={form.aspect_ratio} onChange={(e) => update('aspect_ratio', e.target.value)} /></label>
        <label className="span-2"><span>رابط صورة الغلاف</span><input dir="ltr" type="url" value={form.youtube_poster_url} onChange={(e) => update('youtube_poster_url', e.target.value)} /></label>
        <label><span>YouTube ID</span><input dir="ltr" value={form.youtube_id} onChange={(e) => update('youtube_id', e.target.value)} /></label>
        <label><span>رابط YouTube</span><input dir="ltr" type="url" value={form.youtube_url} onChange={(e) => update('youtube_url', e.target.value)} /></label>
        <label className="span-2"><span>رابط صورة بديلة</span><input dir="ltr" type="url" value={form.image_url} onChange={(e) => update('image_url', e.target.value)} /></label>
        <label className="span-2"><span>عنوان SEO</span><input value={form.seo_title} onChange={(e) => update('seo_title', e.target.value)} maxLength={60} /></label>
        <label className="span-2"><span>وصف SEO</span><textarea value={form.seo_description} onChange={(e) => update('seo_description', e.target.value)} maxLength={160} rows={3} /></label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <footer className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>إلغاء</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ المشروع'}<ArrowIcon /></button></footer>
    </form>
  )
}

function ClientForm({ client, onSave, onClose }: { client: CmsClient | null; onSave: (client: Parameters<typeof saveClient>[0]) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    client_code: client?.client_code || '',
    name: client?.name || '',
    abbreviation: client?.abbreviation || '',
    logo_url: client?.logo_url || '',
    sort_order: client?.sort_order?.toString() || '0',
    status: client?.status || 'draft',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...(client?.id ? { id: client.id } : {}),
        ...form,
        logo_url: form.logo_url || null,
        sort_order: Number(form.sort_order) || 0,
        status: form.status as PublishStatus,
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ العميل.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="admin-editor-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label><span>الرمز</span><input dir="ltr" value={form.client_code} onChange={(e) => update('client_code', e.target.value)} required /></label>
        <label><span>الاختصار</span><input dir="ltr" value={form.abbreviation} onChange={(e) => update('abbreviation', e.target.value)} required /></label>
        <label className="span-2"><span>اسم العميل</span><input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
        <label className="span-2"><span>مسار أو رابط الشعار</span><input dir="ltr" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="/media/clients/logo.svg" /></label>
        <label><span>الترتيب</span><input type="number" value={form.sort_order} onChange={(e) => update('sort_order', e.target.value)} /></label>
        <label><span>الحالة</span><select value={form.status} onChange={(e) => update('status', e.target.value)}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <footer className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>إلغاء</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ العميل'}<ArrowIcon /></button></footer>
    </form>
  )
}

function SectionForm({ section, onSave, onClose }: { section: CmsSection | null; onSave: (section: Parameters<typeof saveSection>[0]) => Promise<void>; onClose: () => void }) {
  const [sectionKey, setSectionKey] = useState(section?.section_key || '')
  const [label, setLabel] = useState(section?.label || '')
  const [content, setContent] = useState(JSON.stringify(section?.content || {}, null, 2))
  const [status, setStatus] = useState<PublishStatus>(section?.status || 'draft')
  const [sortOrder, setSortOrder] = useState(section?.sort_order?.toString() || '0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>
      await onSave({ ...(section?.id ? { id: section.id } : {}), section_key: sectionKey, label, content: parsed, status, sort_order: Number(sortOrder) || 0 })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof SyntaxError ? 'صيغة JSON غير صحيحة.' : submitError instanceof Error ? submitError.message : 'تعذر حفظ القسم.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="admin-editor-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label><span>مفتاح القسم</span><input dir="ltr" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} required /></label>
        <label><span>اسم القسم</span><input value={label} onChange={(e) => setLabel(e.target.value)} required /></label>
        <label><span>الترتيب</span><input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
        <label><span>الحالة</span><select value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
        <label className="span-2"><span>المحتوى المنظم (JSON)</span><textarea className="admin-code-field" dir="ltr" value={content} onChange={(e) => setContent(e.target.value)} rows={18} spellCheck={false} required /></label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <footer className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>إلغاء</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ القسم'}<ArrowIcon /></button></footer>
    </form>
  )
}

function RedirectForm({ redirect, onSave, onClose }: { redirect: CmsRedirect | null; onSave: (redirect: Parameters<typeof saveRedirect>[0]) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ source_path: redirect?.source_path || '/', target_path: redirect?.target_path || '/', status_code: redirect?.status_code?.toString() || '301', is_active: redirect?.is_active ?? true, notes: redirect?.notes || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ ...(redirect?.id ? { id: redirect.id } : {}), source_path: form.source_path, target_path: form.target_path, status_code: Number(form.status_code) as 301 | 308, is_active: form.is_active, notes: form.notes || null })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ التحويل.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="admin-editor-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label><span>المسار القديم</span><input dir="ltr" value={form.source_path} onChange={(e) => setForm({ ...form, source_path: e.target.value })} required /></label>
        <label><span>الوجهة الجديدة</span><input dir="ltr" value={form.target_path} onChange={(e) => setForm({ ...form, target_path: e.target.value })} required /></label>
        <label><span>نوع التحويل</span><select value={form.status_code} onChange={(e) => setForm({ ...form, status_code: e.target.value })}><option value="301">301 — دائم</option><option value="308">308 — دائم مع حفظ الطريقة</option></select></label>
        <label className="admin-checkbox"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><span>تحويل نشط</span></label>
        <label className="span-2"><span>ملاحظات داخلية</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} /></label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <footer className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>إلغاء</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ التحويل'}<ArrowIcon /></button></footer>
    </form>
  )
}

function Dashboard({ session, membership, onLogout }: { session: Session; membership: CmsMember; onLogout: () => void }) {
  const [view, setView] = useState<AdminView>('overview')
  const [data, setData] = useState<AdminData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editor, setEditor] = useState<{ kind: 'project' | 'client' | 'section' | 'redirect'; item: CmsProject | CmsClient | CmsSection | CmsRedirect | null } | null>(null)
  const canEdit = membership.cms_role !== 'viewer'
  const canDelete = membership.cms_role === 'owner'
  const visibleNavigation = useMemo(
    () => membership.cms_role === 'owner' ? navigation : navigation.filter((item) => item.id !== 'access'),
    [membership.cms_role],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [projectsData, clientsData, sectionsData, redirectsData, accessUsersData] = await Promise.all([
        listProjects(),
        listClients(),
        listSections(),
        listRedirects(),
        membership.cms_role === 'owner' ? listAccessUsers() : Promise.resolve([]),
      ])
      setData({ projects: projectsData, clients: clientsData, sections: sectionsData, redirects: redirectsData, accessUsers: accessUsersData })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات لوحة التحكم.')
    } finally {
      setLoading(false)
    }
  }, [membership.cms_role])

  useEffect(() => { void refresh() }, [refresh])

  const notify = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3200)
  }

  const changeStatus = async (table: Parameters<typeof setEntityStatus>[0], id: string, status: PublishStatus) => {
    try {
      await setEntityStatus(table, id, status)
      await refresh()
      notify(status === 'published' ? 'تم نشر المحتوى.' : 'تم تحديث حالة المحتوى.')
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'تعذر تحديث الحالة.')
    }
  }

  const remove = async (table: Parameters<typeof deleteEntity>[0], id: string, label: string) => {
    if (!window.confirm(`حذف «${label}» نهائيًا؟`)) return
    try {
      await deleteEntity(table, id)
      await refresh()
      notify('تم الحذف.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف العنصر.')
    }
  }

  const importContent = async () => {
    if (!window.confirm('سيتم نسخ محتوى الموقع الحالي إلى لوحة التحكم مع وضعه كمنشور. متابعة؟')) return
    setLoading(true)
    try {
      await importCurrentWebsiteContent()
      await refresh()
      notify('تمت تهيئة محتوى الموقع الحالي بنجاح.')
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'تعذر تهيئة المحتوى.')
      setLoading(false)
    }
  }

  const updateAccess = async (user: CmsAccessUser, role: CmsRole, isActive: boolean) => {
    try {
      await saveCmsAccess(user.user_id, role, isActive)
      await refresh()
      notify('تم تحديث صلاحية الدخول.')
    } catch (accessError) {
      const messageText = accessError instanceof Error && accessError.message.includes('website_cms_last_owner')
        ? 'لا يمكن تعطيل آخر مالك نشط للوحة التحكم.'
        : accessError instanceof Error ? accessError.message : 'تعذر تحديث الصلاحية.'
      setError(messageText)
    }
  }

  const counts = useMemo(() => ({
    projects: data.projects.length,
    clients: data.clients.length,
    sections: data.sections.length,
    drafts: [...data.projects, ...data.clients, ...data.sections].filter((item) => item.status === 'draft').length,
  }), [data])

  const viewTitle = visibleNavigation.find((item) => item.id === view)?.label || ''

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <a href="/" className="admin-sidebar__brand" aria-label="العودة إلى الموقع"><img src="/half-lens-logo-white.png" alt="H-Lens" /><span>WEBSITE<br />CONTROL</span></a>
        <nav aria-label="أقسام لوحة التحكم">
          {visibleNavigation.map((item) => <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => setView(item.id)}><span>{item.label}</span><small>{item.index}</small></button>)}
        </nav>
        <div className="admin-sidebar__account">
          <span>{session.user.email}</span>
          <small>{roleLabels[membership.cms_role]}</small>
          <button type="button" onClick={onLogout}>تسجيل الخروج</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-kicker"><span /> LIVE CMS / {visibleNavigation.find((item) => item.id === view)?.index}</p><h1>{viewTitle}</h1></div>
          <div className="admin-topbar__actions">
            <a href="/" target="_blank" rel="noreferrer" className="admin-secondary-button">معاينة الموقع</a>
            {canEdit && ['projects', 'clients', 'sections', 'redirects'].includes(view) && <button type="button" className="admin-primary-button" onClick={() => setEditor({ kind: view === 'projects' ? 'project' : view === 'clients' ? 'client' : view === 'sections' ? 'section' : 'redirect', item: null })}><span>إضافة جديد</span><span aria-hidden="true">＋</span></button>}
          </div>
          <select className="admin-mobile-nav" value={view} onChange={(event) => setView(event.target.value as AdminView)} aria-label="القسم الحالي">{visibleNavigation.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </header>

        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? <div className="admin-loading"><span /><p>جارٍ تحميل المحتوى…</p></div> : (
          <>
            {view === 'overview' && (
              <section className="admin-overview">
                <div className="admin-stat-grid">
                  <button type="button" onClick={() => setView('projects')}><small>الأعمال</small><strong>{counts.projects.toString().padStart(2, '0')}</strong><span>مشروعًا في لوحة التحكم</span></button>
                  <button type="button" onClick={() => setView('clients')}><small>العملاء</small><strong>{counts.clients.toString().padStart(2, '0')}</strong><span>شعارًا وهوية عميل</span></button>
                  <button type="button" onClick={() => setView('sections')}><small>الأقسام</small><strong>{counts.sections.toString().padStart(2, '0')}</strong><span>قسمًا قابلًا للتحرير</span></button>
                  <button type="button" onClick={() => setView('projects')}><small>بانتظار النشر</small><strong>{counts.drafts.toString().padStart(2, '0')}</strong><span>مسودة تحتاج المراجعة</span></button>
                </div>
                <div className="admin-overview__lower">
                  <article>
                    <p className="admin-kicker"><span /> PUBLISHING FLOW</p>
                    <h2>حرّر بأمان.<br />وانشر بوضوح.</h2>
                    <p>كل محتوى يبدأ كمسودة، ثم ينتقل للنشر بقرار واضح. لا توجد أي مفاتيح سرية داخل المتصفح، والصلاحيات تُراجع في قاعدة البيانات مع كل طلب.</p>
                  </article>
                  <article className="admin-checklist">
                    <h3>جاهزية لوحة التحكم</h3>
                    <ul><li><span>01</span>مصادقة وحفظ آمن للجلسة</li><li><span>02</span>صلاحيات مالك ومحرر وقارئ</li><li><span>03</span>إدارة مسودات ونشر وأرشفة</li><li><span>04</span>تحويلات SEO جاهزة للترحيل</li></ul>
                    {canEdit && counts.projects + counts.clients + counts.sections === 0 && <button type="button" className="admin-primary-button" onClick={importContent}>تهيئة المحتوى الحالي<ArrowIcon /></button>}
                  </article>
                </div>
              </section>
            )}

            {view === 'projects' && (
              <section className="admin-collection">
                {data.projects.length === 0 ? <EmptyState title="لا توجد أعمال بعد" description="أضف مشروعًا جديدًا أو هيّئ محتوى الموقع الحالي من النظرة العامة." /> : data.projects.map((project) => (
                  <article className="admin-project-row" key={project.id}>
                    <div className="admin-project-row__media">{project.youtube_poster_url || project.image_url ? <img src={project.youtube_poster_url || project.image_url || ''} alt="" /> : <span>{project.project_code}</span>}</div>
                    <div className="admin-project-row__content"><div><small>PROJECT / {project.project_code}</small><StatusBadge status={project.status} /></div><h2>{project.title}</h2><p>{project.client} · {project.category}</p><dl><div><dt>السنة</dt><dd>{project.project_year || '—'}</dd></div><div><dt>الترتيب</dt><dd>{project.sort_order}</dd></div><div><dt>آخر تحديث</dt><dd>{formatDate(project.updated_at)}</dd></div></dl></div>
                    <div className="admin-row-actions">{canEdit && <><button type="button" onClick={() => setEditor({ kind: 'project', item: project })}>تحرير</button>{project.status !== 'published' ? <button type="button" onClick={() => void changeStatus('website_projects', project.id, 'published')}>نشر</button> : <button type="button" onClick={() => void changeStatus('website_projects', project.id, 'draft')}>إرجاع لمسودة</button>}</>}{canDelete && <button type="button" className="danger" onClick={() => void remove('website_projects', project.id, project.title)}>حذف</button>}</div>
                  </article>
                ))}
              </section>
            )}

            {view === 'clients' && (
              <section className="admin-client-grid">
                {data.clients.length === 0 ? <EmptyState title="لا يوجد عملاء بعد" description="أضف هوية عميل أو هيّئ محتوى الموقع الحالي." /> : data.clients.map((client) => (
                  <article key={client.id}>
                    <div className="admin-client-logo">{client.logo_url ? <img src={client.logo_url} alt={client.name} /> : <strong>{client.abbreviation}</strong>}</div>
                    <div className="admin-client-info"><div><small>{client.client_code}</small><StatusBadge status={client.status} /></div><h2>{client.name}</h2><p>الترتيب: {client.sort_order}</p></div>
                    <div className="admin-row-actions">{canEdit && <><button type="button" onClick={() => setEditor({ kind: 'client', item: client })}>تحرير</button>{client.status !== 'published' ? <button type="button" onClick={() => void changeStatus('website_clients', client.id, 'published')}>نشر</button> : <button type="button" onClick={() => void changeStatus('website_clients', client.id, 'draft')}>مسودة</button>}</>}{canDelete && <button type="button" className="danger" onClick={() => void remove('website_clients', client.id, client.name)}>حذف</button>}</div>
                  </article>
                ))}
              </section>
            )}

            {view === 'sections' && (
              <section className="admin-section-list">
                {data.sections.length === 0 ? <EmptyState title="لا توجد أقسام بعد" description="هيّئ نصوص الموقع الحالية، ثم حررها بصورة منظمة." /> : data.sections.map((section) => (
                  <article key={section.id}><div className="admin-section-list__index">{(section.sort_order + 1).toString().padStart(2, '0')}</div><div><small>{section.section_key}</small><h2>{section.label}</h2><p>{Object.keys(section.content).length} حقول منظمة · آخر تحديث {formatDate(section.updated_at)}</p></div><StatusBadge status={section.status} /><div className="admin-row-actions">{canEdit && <><button type="button" onClick={() => setEditor({ kind: 'section', item: section })}>تحرير</button>{section.status !== 'published' ? <button type="button" onClick={() => void changeStatus('website_sections', section.id, 'published')}>نشر</button> : <button type="button" onClick={() => void changeStatus('website_sections', section.id, 'draft')}>مسودة</button>}</>}{canDelete && <button type="button" className="danger" onClick={() => void remove('website_sections', section.id, section.label)}>حذف</button>}</div></article>
                ))}
              </section>
            )}

            {view === 'redirects' && (
              <section className="admin-redirects">
                <header><div><p className="admin-kicker"><span /> SEO MIGRATION</p><h2>احتفظ بقيمة كل رابط قديم.</h2></div><p>سنضيف هنا مسارات WordPress القديمة ووجهاتها الجديدة قبل تحويل النطاق. لا تظهر هذه القائمة للعامة.</p></header>
                {data.redirects.length === 0 ? <EmptyState title="لا توجد تحويلات بعد" description="سنملأها بعد جرد روابط WordPress في مرحلة ترحيل SEO." /> : <div className="admin-table"><div className="admin-table__head"><span>المسار القديم</span><span>الوجهة</span><span>النوع</span><span>الحالة</span><span /></div>{data.redirects.map((redirect) => <div className="admin-table__row" key={redirect.id}><code>{redirect.source_path}</code><code>{redirect.target_path}</code><strong>{redirect.status_code}</strong><span>{redirect.is_active ? 'نشط' : 'متوقف'}</span><div className="admin-row-actions">{canEdit && <button type="button" onClick={() => setEditor({ kind: 'redirect', item: redirect })}>تحرير</button>}{canDelete && <button type="button" className="danger" onClick={() => void remove('website_redirects', redirect.id, redirect.source_path)}>حذف</button>}</div></div>)}</div>}
              </section>
            )}

            {view === 'access' && membership.cms_role === 'owner' && (
              <section className="admin-access">
                <header>
                  <div><p className="admin-kicker"><span /> ACCESS CONTROL</p><h2>من يستطيع<br />إدارة الموقع؟</h2></div>
                  <p>الدخول إلى صفحة <code>/admin</code> لا يكفي. يجب أن يملك الشخص حسابًا نشطًا في منصة H-Lens، ثم تمنحه أنت صلاحية واضحة هنا.</p>
                </header>
                <div className="admin-access__roles">
                  <article><span>OWNER</span><h3>مالك</h3><p>تحرير ونشر وحذف المحتوى، وإدارة صلاحيات المستخدمين.</p></article>
                  <article><span>EDITOR</span><h3>محرر</h3><p>إنشاء المحتوى وتحريره ونشره، من دون الحذف أو إدارة الوصول.</p></article>
                  <article><span>VIEWER</span><h3>قارئ</h3><p>معاينة لوحة التحكم والمحتوى فقط، من دون أي تعديل.</p></article>
                </div>
                <div className="admin-access__list">
                  {data.accessUsers.map((user) => (
                    <article key={user.user_id} className={user.account_status !== 'active' ? 'is-disabled' : ''}>
                      <div className="admin-access__identity"><span>{user.full_name.slice(0, 1)}</span><div><h3>{user.full_name}</h3><p dir="ltr">{user.email}</p></div></div>
                      <div className="admin-access__controls">
                        <label><span>الصلاحية</span><select value={user.cms_role || 'viewer'} onChange={(event) => void updateAccess(user, event.target.value as CmsRole, user.cms_is_active ?? true)} disabled={user.account_status !== 'active'}><option value="owner">مالك</option><option value="editor">محرر</option><option value="viewer">قارئ</option></select></label>
                        <label className="admin-access-toggle"><input type="checkbox" checked={Boolean(user.cms_is_active)} onChange={(event) => void updateAccess(user, user.cms_role || 'viewer', event.target.checked)} disabled={user.account_status !== 'active'} /><span>{user.cms_is_active ? 'مسموح' : 'غير مسموح'}</span></label>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {editor?.kind === 'project' && <Modal title={editor.item ? 'تحرير المشروع' : 'مشروع جديد'} onClose={() => setEditor(null)}><ProjectForm project={editor.item as CmsProject | null} onClose={() => setEditor(null)} onSave={async (item) => { await saveProject(item); await refresh(); notify('تم حفظ المشروع.') }} /></Modal>}
      {editor?.kind === 'client' && <Modal title={editor.item ? 'تحرير العميل' : 'عميل جديد'} onClose={() => setEditor(null)}><ClientForm client={editor.item as CmsClient | null} onClose={() => setEditor(null)} onSave={async (item) => { await saveClient(item); await refresh(); notify('تم حفظ العميل.') }} /></Modal>}
      {editor?.kind === 'section' && <Modal title={editor.item ? 'تحرير القسم' : 'قسم جديد'} onClose={() => setEditor(null)}><SectionForm section={editor.item as CmsSection | null} onClose={() => setEditor(null)} onSave={async (item) => { await saveSection(item); await refresh(); notify('تم حفظ القسم.') }} /></Modal>}
      {editor?.kind === 'redirect' && <Modal title={editor.item ? 'تحرير التحويل' : 'تحويل جديد'} onClose={() => setEditor(null)}><RedirectForm redirect={editor.item as CmsRedirect | null} onClose={() => setEditor(null)} onSave={async (item) => { await saveRedirect(item); await refresh(); notify('تم حفظ التحويل.') }} /></Modal>}
    </div>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<CmsMember | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [accessChecked, setAccessChecked] = useState(false)

  const authorize = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    setAccessChecked(false)
    if (!nextSession) {
      setMembership(null)
      setAccessChecked(true)
      return
    }
    try {
      setMembership(await getMembership())
    } catch {
      setMembership(null)
    } finally {
      setAccessChecked(true)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false)
      return
    }
    void supabase.auth.getSession().then(({ data }) => authorize(data.session)).finally(() => setAuthLoading(false))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { void authorize(nextSession) })
    return () => listener.subscription.unsubscribe()
  }, [authorize])

  if (!isSupabaseConfigured) return <ConfigurationRequired />
  if (authLoading || !accessChecked) return <div className="admin-splash"><img src="/half-lens-logo-white.png" alt="H-Lens" /><span /></div>
  if (!session) return <Login onAuthenticated={(nextSession) => void authorize(nextSession)} />
  if (!membership) return <AccessDenied onLogout={() => void supabase.auth.signOut()} />
  return <Dashboard session={session} membership={membership} onLogout={() => void supabase.auth.signOut()} />
}
