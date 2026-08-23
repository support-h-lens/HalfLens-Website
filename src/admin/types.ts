export type CmsRole = 'owner' | 'editor' | 'viewer'
export type PublishStatus = 'draft' | 'published' | 'archived'

export interface CmsMember {
  id: string
  user_id: string
  cms_role: CmsRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CmsProject {
  id: string
  project_code: string
  slug: string
  title: string
  category: string
  client: string
  production_role: string
  format: string
  project_year: number | null
  palette: 'amber' | 'violet' | 'cyan' | 'crimson' | 'silver'
  image_url: string | null
  youtube_id: string | null
  youtube_url: string | null
  youtube_poster_url: string | null
  aspect_ratio: number
  sort_order: number
  status: PublishStatus
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface CmsClient {
  id: string
  client_code: string
  name: string
  abbreviation: string
  logo_url: string | null
  sort_order: number
  status: PublishStatus
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface CmsSection {
  id: string
  section_key: string
  label: string
  content: Record<string, unknown>
  sort_order: number
  status: PublishStatus
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface CmsRedirect {
  id: string
  source_path: string
  target_path: string
  status_code: 301 | 308
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CmsAccessUser {
  user_id: string
  full_name: string
  email: string
  account_status: 'active' | 'inactive'
  cms_role: CmsRole | null
  cms_is_active: boolean | null
}

export type AdminView = 'overview' | 'projects' | 'clients' | 'sections' | 'redirects' | 'access'
