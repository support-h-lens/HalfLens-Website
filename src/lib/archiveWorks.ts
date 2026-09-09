import { workCategories, type WorkCategoryId } from './workCategories'

export interface ArchiveWorkItem {
  id: string
  workType: WorkCategoryId
  title: string
  client: string
  year: number
  link: string
  poster?: string
}

export interface ArchiveWorkFields {
  work_type: WorkCategoryId
  title: string
  client: string
  project_year: number
  link_url: string
}

export interface PublicArchiveWorkRow extends ArchiveWorkFields { id: string }

export function safeWorkLink(value: string): string | null {
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed) || /[\s\\]/.test(trimmed) || trimmed.length > 2048) return null
  try {
    const url = new URL(trimmed)
    if (!url.hostname || url.username || url.password) return null
    return url.href
  } catch { return null }
}

export function workLinkPoster(link: string): string | undefined {
  const safe = safeWorkLink(link)
  if (!safe) return undefined
  const url = new URL(safe)
  let id: string | null | undefined
  if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) id = url.pathname.split('/')[1]
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    const [, kind, videoId] = url.pathname.split('/')
    id = kind === 'watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(kind) ? videoId : null
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined
}

export function validateArchiveWork(fields: ArchiveWorkFields): ArchiveWorkFields {
  const link = safeWorkLink(fields.link_url)
  if (!workCategories.some(category => category.id === fields.work_type)) throw new Error('اختر نوع العمل.')
  if (!fields.title.trim() || fields.title.trim().length > 200) throw new Error('أدخل اسم العمل (حتى 200 حرف).')
  if (!fields.client.trim() || fields.client.trim().length > 200) throw new Error('أدخل اسم العميل (حتى 200 حرف).')
  if (!Number.isInteger(fields.project_year) || fields.project_year < 1900 || fields.project_year > 2100) throw new Error('أدخل سنة صحيحة بين 1900 و2100.')
  if (!link) throw new Error('أدخل رابطًا كاملاً يبدأ بـ https:// أو http:// دون بيانات تسجيل دخول.')
  return { work_type: fields.work_type, title: fields.title.trim(), client: fields.client.trim(), project_year: fields.project_year, link_url: link }
}

export function mapArchiveWork(row: PublicArchiveWorkRow): ArchiveWorkItem | null {
  try {
    const fields = validateArchiveWork(row)
    return { id: row.id, workType: fields.work_type, title: fields.title, client: fields.client, year: fields.project_year, link: fields.link_url, poster: workLinkPoster(fields.link_url) }
  } catch { return null }
}
