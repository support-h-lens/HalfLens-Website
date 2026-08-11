export type SectionId =
  | 'hero'
  | 'story'
  | 'services'
  | 'portfolio'
  | 'clients'
  | 'contact'

export interface NavigationItem {
  id: SectionId
  label: string
}

export interface ServiceItem {
  id: string
  title: string
  description: string
  meta: string
  side: 'start' | 'end'
}

export interface ProjectItem {
  id: string
  title: string
  category: string
  client: string
  role: string
  format: string
  year: string
  palette: 'amber' | 'violet' | 'cyan' | 'crimson' | 'silver'
  image?: string
  youtube?: {
    id: string
    url: string
    poster: string
    aspectRatio: number
  }
}

export interface ClientItem {
  id: string
  name: string
  abbreviation: string
  logo?: string
}

export interface ContactChannel {
  label: string
  value: string
  href: string
}
