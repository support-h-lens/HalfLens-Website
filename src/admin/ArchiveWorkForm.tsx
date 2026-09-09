import { useState, type FormEvent } from 'react'
import { validateArchiveWork, type ArchiveWorkFields } from '../lib/archiveWorks'
import { workCategories, type WorkCategoryId } from '../lib/workCategories'
import type { CmsArchiveWork } from './types'

export function ArchiveWorkForm({ work, onSave, onClose }: {
  work: CmsArchiveWork | null
  onSave: (work: ArchiveWorkFields & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    work_type: work?.work_type || '', title: work?.title || '', client: work?.client || '',
    project_year: String(work?.project_year ?? new Date().getFullYear()), link_url: work?.link_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const fields = validateArchiveWork({ ...form, work_type: form.work_type as WorkCategoryId, project_year: Number(form.project_year) })
      await onSave({ ...fields, ...(work ? { id: work.id } : {}) })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ العمل.')
    } finally { setSaving(false) }
  }
  return (
    <form className="admin-editor-form" onSubmit={submit}>
      <p className="admin-archive-hint">هذا العمل لصفحة «كل الأعمال» فقط، ولن يُضاف إلى أعمال الصفحة الرئيسية. تُستخرج معاينة YouTube تلقائيًا من الرابط.</p>
      <fieldset className="admin-form-grid admin-archive-fields" disabled={saving}>
        <label className="span-2"><span>نوع العمل</span><select value={form.work_type} onChange={e => update('work_type', e.target.value)} required><option value="" disabled>اختر نوع العمل</option>{workCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
        <label className="span-2"><span>اسم العمل</span><input value={form.title} onChange={e => update('title', e.target.value)} maxLength={200} required /></label>
        <label><span>العميل</span><input value={form.client} onChange={e => update('client', e.target.value)} maxLength={200} required /></label>
        <label><span>السنة</span><input type="number" inputMode="numeric" min={1900} max={2100} step={1} value={form.project_year} onChange={e => update('project_year', e.target.value)} required /></label>
        <label className="span-2"><span>رابط العمل</span><input type="url" dir="ltr" placeholder="https://www.youtube.com/watch?v=…" value={form.link_url} onChange={e => update('link_url', e.target.value)} maxLength={2048} required /></label>
      </fieldset>
      {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
      <p className="admin-archive-hint">{work ? 'الحفظ يحافظ على حالة النشر الحالية.' : 'يُحفظ العمل كمسودة. اضغط «نشر» من القائمة عندما يصبح جاهزًا.'}</p>
      <div className="admin-form-actions"><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ…' : work ? 'حفظ التعديلات' : 'حفظ المسودة'}</button><button className="admin-secondary-button" type="button" disabled={saving} onClick={onClose}>إلغاء</button></div>
    </form>
  )
}
