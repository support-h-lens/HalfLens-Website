import {
  clients,
  clientsContent,
  contactContent,
  footerContent,
  heroContent,
  portfolioContent,
  projects,
  servicesContent,
  storyContent,
} from '../data/siteContent'
import { supabase } from './supabase'
import type {
  CmsClient,
  CmsAccessUser,
  CmsRole,
  CmsMember,
  CmsProject,
  CmsRedirect,
  CmsSection,
  PublishStatus,
} from './types'

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

export const getMembership = async (): Promise<CmsMember | null> => {
  const { data, error } = await supabase
    .from('website_cms_members')
    .select('*')
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

export const listAccessUsers = async (): Promise<CmsAccessUser[]> => {
  const { data, error } = await supabase.rpc('website_cms_available_users')
  throwIfError(error)
  return (data || []) as CmsAccessUser[]
}

export const saveCmsAccess = async (userId: string, cmsRole: CmsRole, isActive: boolean) => {
  const { error } = await supabase
    .from('website_cms_members')
    .upsert({ user_id: userId, cms_role: cmsRole, is_active: isActive }, { onConflict: 'user_id' })
  throwIfError(error)
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
  table: 'website_projects' | 'website_clients' | 'website_sections',
  id: string,
  status: PublishStatus,
) => {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  throwIfError(error)
}

export const deleteEntity = async (
  table: 'website_projects' | 'website_clients' | 'website_sections' | 'website_redirects',
  id: string,
) => {
  const { error } = await supabase.from(table).delete().eq('id', id)
  throwIfError(error)
}

export const importCurrentWebsiteContent = async () => {
  const projectRows = projects.map((project, index) => ({
    project_code: project.id,
    slug: `project-${project.id}`,
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
    { section_key: 'hero', label: 'الرئيسية', content: heroContent, sort_order: 0 },
    { section_key: 'story', label: 'قصتنا', content: storyContent, sort_order: 1 },
    { section_key: 'services', label: 'خدماتنا', content: servicesContent, sort_order: 2 },
    { section_key: 'portfolio', label: 'أعمالنا', content: portfolioContent, sort_order: 3 },
    { section_key: 'clients', label: 'عملاؤنا', content: clientsContent, sort_order: 4 },
    { section_key: 'contact', label: 'تواصل معنا', content: contactContent, sort_order: 5 },
    { section_key: 'footer', label: 'التذييل', content: footerContent, sort_order: 6 },
  ].map((section) => ({ ...section, status: 'published' as const }))

  const [projectResult, clientResult, sectionResult] = await Promise.all([
    supabase.from('website_projects').upsert(projectRows, { onConflict: 'project_code' }),
    supabase.from('website_clients').upsert(clientRows, { onConflict: 'client_code' }),
    supabase.from('website_sections').upsert(sectionRows, { onConflict: 'section_key' }),
  ])

  throwIfError(projectResult.error)
  throwIfError(clientResult.error)
  throwIfError(sectionResult.error)
}
