import { useEffect, useState } from 'react'
import type { PublicArchiveWorkRow } from './archiveWorks'
import {
  createPublicWebsiteContent,
  fallbackPublicWebsiteContent,
  type PublicClientRow,
  type PublicProjectRow,
  type PublicSectionRow,
  type PublicWebsiteContent,
} from './cmsContent'

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

export function usePublicWebsiteContent(
  initialContent?: PublicWebsiteContent,
): PublicWebsiteContent {
  const [content, setContent] = useState<PublicWebsiteContent>(
    initialContent || fallbackPublicWebsiteContent,
  )

  useEffect(() => {
    if (!isConfigured) return undefined

    const controller = new AbortController()
    const archiveQuery = 'website_archive_works?select=id,work_type,title,client,project_year,link_url&status=eq.published&order=sort_order.asc,created_at.asc,id.asc'
    if (initialContent) {
      // Keep the pre-rendered homepage/SEO snapshot; refresh just the independent
      // directory so published edits reach visitors without a full site release.
      if (window.location.pathname.replace(/\/$/, '') === '/work') {
        void fetchRows<PublicArchiveWorkRow>(archiveQuery, controller.signal).then(rows => {
          if (!controller.signal.aborted) setContent({ ...initialContent, archiveWorks: createPublicWebsiteContent([], [], [], rows).archiveWorks })
        }).catch(() => { /* Network failure keeps the published build snapshot. */ })
      }
      return () => controller.abort()
    }
    const projectsQuery =
      'website_projects?select=project_code,slug,title,category,client,production_role,format,project_year,palette,image_url,youtube_id,youtube_url,youtube_poster_url,aspect_ratio,seo_title,seo_description,seo_image,intro,challenge,role_details,services,deliverables,result,transcript,updated_at&status=eq.published&order=sort_order.asc,created_at.asc'
    const clientsQuery =
      'website_clients?select=client_code,name,abbreviation,logo_url&status=eq.published&order=sort_order.asc,created_at.asc'
    const contactQuery =
      'website_sections?select=content&section_key=eq.contact&status=eq.published&limit=1'

    void Promise.allSettled([
      fetchRows<PublicProjectRow>(projectsQuery, controller.signal),
      fetchRows<PublicClientRow>(clientsQuery, controller.signal),
      fetchRows<PublicSectionRow>(contactQuery, controller.signal),
      fetchRows<PublicArchiveWorkRow>(archiveQuery, controller.signal),
    ]).then(([projectResult, clientResult, contactResult, archiveResult]) => {
      if (controller.signal.aborted) return

      setContent(createPublicWebsiteContent(
        projectResult.status === 'fulfilled' ? projectResult.value : [],
        clientResult.status === 'fulfilled' ? clientResult.value : [],
        contactResult.status === 'fulfilled' ? contactResult.value : [],
        archiveResult.status === 'fulfilled' ? archiveResult.value : undefined,
      ))
    })

    return () => controller.abort()
  }, [initialContent])

  return content
}

export type { PublicWebsiteContent } from './cmsContent'
