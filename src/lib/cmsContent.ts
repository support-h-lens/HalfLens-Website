import {
  clients as fallbackClients,
  contactChannels as fallbackContactChannels,
  projects as fallbackProjects,
} from '../data/siteContent'
import type { ClientItem, ContactChannel, ProjectItem } from '../types/content'
import { archiveWorks as fallbackArchiveWorks } from '../data/archiveWorks'
import { mapArchiveWork, type ArchiveWorkItem, type PublicArchiveWorkRow } from './archiveWorks'

export interface PublicProjectRow {
  project_code: string
  slug: string
  title: string
  category: string
  client: string
  production_role: string
  format: string | null
  project_year: number | null
  palette: ProjectItem['palette']
  image_url: string | null
  youtube_id: string | null
  youtube_url: string | null
  youtube_poster_url: string | null
  aspect_ratio: number | null
  seo_title: string | null
  seo_description: string | null
  seo_image?: string | null
  intro?: string | null
  challenge?: string | null
  role_details?: string | null
  services?: string[] | null
  deliverables?: string[] | null
  result?: string | null
  transcript?: string | null
  updated_at?: string | null
}

export interface PublicClientRow {
  client_code: string
  name: string
  abbreviation: string
  logo_url: string | null
}

export interface PublicSectionRow {
  content: Record<string, unknown>
}

export interface PublicWebsiteContent {
  archiveWorks: ArchiveWorkItem[]
  projects: ProjectItem[]
  clients: ClientItem[]
  contactChannels: ContactChannel[]
}

export const fallbackPublicWebsiteContent: PublicWebsiteContent = {
  archiveWorks: fallbackArchiveWorks,
  projects: fallbackProjects,
  clients: fallbackClients,
  contactChannels: fallbackContactChannels,
}

const canonicalProjectSlugs: Record<string, string> = {
  '01': 'effective-parenting-campaign',
  '02': 'saudi-cup-closing-film',
  '03': 'leap-coverage',
  '04': 'identity-campaign',
  '05': 'identity-campaign-chapter-two',
}

export const mapProject = (row: PublicProjectRow): ProjectItem => {
  const youtubeId = row.youtube_id?.trim()
  const canonicalSlug = /^project-0?\d+$/i.test(row.slug)
    ? canonicalProjectSlugs[row.project_code] || row.slug
    : row.slug

  return {
    id: row.project_code,
    slug: canonicalSlug,
    title: row.title,
    category: row.category,
    client: row.client,
    role: row.production_role,
    format: row.format || '',
    year: row.project_year?.toString() || '',
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    seoImage: row.seo_image || undefined,
    intro: row.intro || undefined,
    challenge: row.challenge || undefined,
    roleDetails: row.role_details || undefined,
    services: row.services?.filter(Boolean) || undefined,
    deliverables: row.deliverables?.filter(Boolean) || undefined,
    result: row.result || undefined,
    transcript: row.transcript || undefined,
    updatedAt: row.updated_at || undefined,
    palette: row.palette,
    image: row.image_url || undefined,
    youtube: youtubeId
      ? {
          id: youtubeId,
          url: row.youtube_url || `https://www.youtube.com/watch?v=${youtubeId}`,
          poster:
            row.youtube_poster_url ||
            `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
          aspectRatio: row.aspect_ratio || 16 / 9,
        }
      : undefined,
  }
}

export const mapClient = (row: PublicClientRow): ClientItem => ({
  id: row.client_code,
  name: row.name,
  abbreviation: row.abbreviation,
  logo: row.logo_url || undefined,
})

const isContactChannel = (value: unknown): value is ContactChannel => {
  if (!value || typeof value !== 'object') return false
  const channel = value as Partial<ContactChannel>
  return (
    typeof channel.label === 'string' &&
    typeof channel.value === 'string' &&
    typeof channel.href === 'string'
  )
}

export const getContactChannels = (rows: PublicSectionRow[]): ContactChannel[] => {
  const channels = rows[0]?.content?.channels
  if (!Array.isArray(channels)) return fallbackContactChannels

  const validChannels = channels.filter(isContactChannel)
  return validChannels.length > 0 ? validChannels : fallbackContactChannels
}

export function createPublicWebsiteContent(
  projectRows: PublicProjectRow[],
  clientRows: PublicClientRow[],
  sectionRows: PublicSectionRow[],
  archiveRows?: PublicArchiveWorkRow[],
): PublicWebsiteContent {
  return {
    // A successful empty collection is intentional, not an instruction to resurrect fallbacks.
    archiveWorks: archiveRows === undefined ? fallbackArchiveWorks : archiveRows.map(mapArchiveWork).filter((work): work is ArchiveWorkItem => work !== null),
    projects: projectRows.length > 0 ? projectRows.map(mapProject) : fallbackProjects,
    clients: clientRows.length > 0 ? clientRows.map(mapClient) : fallbackClients,
    contactChannels: getContactChannels(sectionRows),
  }
}
