import {
  clients,
  contactChannels,
  contactContent,
  projects,
} from '../data/siteContent'
import { supabase } from './supabase'
import { validateArchiveWork, type ArchiveWorkFields } from '../lib/archiveWorks'
import type {
  CmsArchiveWork,
  CmsClient,
  CmsDeployment,
  CmsMember,
  CmsProject,
  CmsRedirect,
  CmsSection,
  PublishStatus,
} from './types'

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

const websiteMediaBucket = 'website-media'
const clientLogoMimeTypes = new Set([
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const clientLogoExtension = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && ['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension
  }

  const mimeExtensions: Record<string, string> = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  return mimeExtensions[file.type] || ''
}

export interface UploadedClientLogo {
  path: string
  publicUrl: string
}

export const uploadClientLogo = async (file: File): Promise<UploadedClientLogo> => {
  const extension = clientLogoExtension(file)
  const fallbackContentTypes: Record<string, string> = {
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    webp: 'image/webp',
  }
  const contentType = file.type || fallbackContentTypes[extension] || ''
  if (!clientLogoMimeTypes.has(contentType) || !extension) {
    throw new Error('صيغة الشعار غير مدعومة. استخدم SVG أو PNG أو JPG أو WEBP.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الشعار يجب ألا يتجاوز 5 ميجابايت.')
  }

  const path = `clients/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(websiteMediaBucket)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    })

  throwIfError(error)
  const { data } = supabase.storage.from(websiteMediaBucket).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export const removeClientLogos = async (paths: string[]) => {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(websiteMediaBucket).remove(paths)
  throwIfError(error)
}

export const getMembership = async (): Promise<CmsMember | null> => {
  const { data: currentUserId, error: userError } = await supabase
    .rpc('website_cms_current_user_id')

  throwIfError(userError)
  if (!currentUserId) return null

  const { data, error } = await supabase
    .from('website_cms_members')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_active', true)
    .maybeSingle()

  throwIfError(error)
  return data as CmsMember | null
}

export const listProjects = async (): Promise<CmsProject[]> => {
  const { data, error } = await supabase
    .from('website_projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  throwIfError(error)
  return (data || []) as CmsProject[]
}

export const listClients = async (): Promise<CmsClient[]> => {
  const { data, error } = await supabase
    .from('website_clients')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  throwIfError(error)
  return (data || []) as CmsClient[]
}

export const listArchiveWorks = async (): Promise<CmsArchiveWork[]> => {
  const { data, error } = await supabase.from('website_archive_works').select('*')
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true })
  throwIfError(error)
  return (data || []) as CmsArchiveWork[]
}

export const saveArchiveWork = async (work: ArchiveWorkFields & { id?: string }) => {
  // Explicit allowlist: edits never overwrite status or homepage data.
  const payload = validateArchiveWork(work)
  const query = work.id
    ? supabase.from('website_archive_works').update(payload).eq('id', work.id)
    : supabase.from('website_archive_works').insert(payload)
  const { error } = await query
  throwIfError(error)
}

export const listSections = async (): Promise<CmsSection[]> => {
  const { data, error } = await supabase
    .from('website_sections')
    .select('*')
    .order('sort_order', { ascending: true })
  throwIfError(error)
  return (data || []) as CmsSection[]
}

export const listRedirects = async (): Promise<CmsRedirect[]> => {
  const { data, error } = await supabase
    .from('website_redirects')
    .select('*')
    .order('source_path', { ascending: true })
  throwIfError(error)
  return (data || []) as CmsRedirect[]
}

export const listDeployments = async (): Promise<CmsDeployment[]> => {
  const { data, error } = await supabase
    .from('website_deployments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error && ['42P01', 'PGRST205'].includes((error as { code?: string }).code || '')) return []
  throwIfError(error)
  return (data || []) as CmsDeployment[]
}

export const publishWebsite = async (): Promise<CmsDeployment> => {
  const { data, error } = await supabase.functions.invoke('publish-website', {
    body: { ref: 'main' },
  })
  throwIfError(error)
  if (!data?.deployment) throw new Error('لم تُرجع خدمة النشر حالة صالحة.')
  return data.deployment as CmsDeployment
}

export const saveProject = async (
  project: Partial<CmsProject> & Pick<CmsProject, 'project_code' | 'slug' | 'title' | 'category' | 'client' | 'production_role'>,
) => {
  const payload = { ...project }
  const query = project.id
    ? supabase.from('website_projects').update(payload).eq('id', project.id)
    : supabase.from('website_projects').insert(payload)
  const { error } = await query
  throwIfError(error)
}

export const saveClient = async (
  client: Partial<CmsClient> & Pick<CmsClient, 'client_code' | 'name' | 'abbreviation'>,
) => {
  const payload = { ...client }
  const query = client.id
    ? supabase.from('website_clients').update(payload).eq('id', client.id)
    : supabase.from('website_clients').insert(payload)
  const { error } = await query
  throwIfError(error)
}

export const saveClients = async (
  clientItems: Array<Partial<CmsClient> & Pick<CmsClient, 'client_code' | 'name' | 'abbreviation'>>,
) => {
  if (clientItems.length === 0) return
  const { error } = await supabase.from('website_clients').insert(clientItems)
  throwIfError(error)
}

export const saveSection = async (
  section: Partial<CmsSection> & Pick<CmsSection, 'section_key' | 'label' | 'content'>,
) => {
  const payload = { ...section }
  const query = section.id
    ? supabase.from('website_sections').update(payload).eq('id', section.id)
    : supabase.from('website_sections').insert(payload)
  const { error } = await query
  throwIfError(error)
}

export const saveRedirect = async (
  redirect: Partial<CmsRedirect> & Pick<CmsRedirect, 'source_path' | 'target_path'>,
) => {
  const payload = { ...redirect }
  const query = redirect.id
    ? supabase.from('website_redirects').update(payload).eq('id', redirect.id)
    : supabase.from('website_redirects').insert(payload)
  const { error } = await query
  throwIfError(error)
}

export const setEntityStatus = async (
  table: 'website_projects' | 'website_clients' | 'website_sections' | 'website_archive_works',
  id: string,
  status: PublishStatus,
) => {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  throwIfError(error)
}

export const deleteEntity = async (
  table: 'website_projects' | 'website_clients' | 'website_sections' | 'website_redirects' | 'website_archive_works',
  id: string,
) => {
  const { error } = await supabase.from(table).delete().eq('id', id)
  throwIfError(error)
}

export const importCurrentWebsiteContent = async () => {
  const projectRows = projects.map((project, index) => ({
    project_code: project.id,
    slug: project.slug,
    title: project.title,
    category: project.category,
    client: project.client,
    production_role: project.role,
    format: project.format,
    project_year: Number(project.year) || null,
    palette: project.palette,
    image_url: project.image || null,
    youtube_id: project.youtube?.id || null,
    youtube_url: project.youtube?.url || null,
    youtube_poster_url: project.youtube?.poster || null,
    aspect_ratio: project.youtube?.aspectRatio || 16 / 9,
    sort_order: index,
    status: 'published' as const,
    seo_title: project.title,
    seo_description: project.category,
  }))

  const clientRows = clients.map((client, index) => ({
    client_code: client.id,
    name: client.name,
    abbreviation: client.abbreviation,
    logo_url: client.logo || null,
    sort_order: index,
    status: 'published' as const,
  }))

  const sectionRows = [
    {
      section_key: 'contact',
      label: 'بيانات التواصل',
      content: { ...contactContent, channels: contactChannels },
      sort_order: 5,
    },
  ].map((section) => ({ ...section, status: 'published' as const }))

  const [projectResult, clientResult, sectionResult] = await Promise.all([
    supabase.from('website_projects').upsert(projectRows, { onConflict: 'project_code', ignoreDuplicates: true }),
    supabase.from('website_clients').upsert(clientRows, { onConflict: 'client_code', ignoreDuplicates: true }),
    supabase.from('website_sections').upsert(sectionRows, { onConflict: 'section_key', ignoreDuplicates: true }),
  ])

  throwIfError(projectResult.error)
  throwIfError(clientResult.error)
  throwIfError(sectionResult.error)
}
