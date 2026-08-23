import { useEffect, useState } from 'react'
import {
  clients as fallbackClients,
  contactChannels as fallbackContactChannels,
  projects as fallbackProjects,
} from '../data/siteContent'
import type { ClientItem, ContactChannel, ProjectItem } from '../types/content'

interface PublicProjectRow {
  project_code: string
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
}

interface PublicClientRow {
  client_code: string
  name: string
  abbreviation: string
  logo_url: string | null
}

interface PublicSectionRow {
  content: Record<string, unknown>
}

export interface PublicWebsiteContent {
  projects: ProjectItem[]
  clients: ClientItem[]
  contactChannels: ContactChannel[]
}

const fallbackContent: PublicWebsiteContent = {
  projects: fallbackProjects,
  clients: fallbackClients,
  contactChannels: fallbackContactChannels,
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const fetchRows = async <T,>(path: string, signal: AbortSignal): Promise<T[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return []

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    cache: 'no-store',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    signal,
  })

  if (!response.ok) throw new Error(`CMS request failed with ${response.status}`)
  return response.json() as Promise<T[]>
}

const mapProject = (row: PublicProjectRow): ProjectItem => {
  const youtubeId = row.youtube_id?.trim()

  return {
    id: row.project_code,
    title: row.title,
    category: row.category,
    client: row.client,
    role: row.production_role,
    format: row.format || '',
    year: row.project_year?.toString() || '',
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

const mapClient = (row: PublicClientRow): ClientItem => ({
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

const getContactChannels = (rows: PublicSectionRow[]): ContactChannel[] => {
  const channels = rows[0]?.content?.channels
  if (!Array.isArray(channels)) return fallbackContactChannels

  const validChannels = channels.filter(isContactChannel)
  return validChannels.length > 0 ? validChannels : fallbackContactChannels
}

export function usePublicWebsiteContent(): PublicWebsiteContent {
  const [content, setContent] = useState<PublicWebsiteContent>(fallbackContent)

  useEffect(() => {
    if (!isConfigured) return undefined

    const controller = new AbortController()
    const projectsQuery =
      'website_projects?select=project_code,title,category,client,production_role,format,project_year,palette,image_url,youtube_id,youtube_url,youtube_poster_url,aspect_ratio&status=eq.published&order=sort_order.asc,created_at.asc'
    const clientsQuery =
      'website_clients?select=client_code,name,abbreviation,logo_url&status=eq.published&order=sort_order.asc,created_at.asc'
    const contactQuery =
      'website_sections?select=content&section_key=eq.contact&status=eq.published&limit=1'

    void Promise.allSettled([
      fetchRows<PublicProjectRow>(projectsQuery, controller.signal),
      fetchRows<PublicClientRow>(clientsQuery, controller.signal),
      fetchRows<PublicSectionRow>(contactQuery, controller.signal),
    ]).then(([projectResult, clientResult, contactResult]) => {
      if (controller.signal.aborted) return

      setContent({
        projects:
          projectResult.status === 'fulfilled' && projectResult.value.length > 0
            ? projectResult.value.map(mapProject)
            : fallbackProjects,
        clients:
          clientResult.status === 'fulfilled' && clientResult.value.length > 0
            ? clientResult.value.map(mapClient)
            : fallbackClients,
        contactChannels:
          contactResult.status === 'fulfilled'
            ? getContactChannels(contactResult.value)
            : fallbackContactChannels,
      })
    })

    return () => controller.abort()
  }, [])

  return content
}
