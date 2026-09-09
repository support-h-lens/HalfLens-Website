import { services } from '../data/siteContent'
import type { ProjectItem } from '../types/content'

// Use the same five service names as the website and the CMS Services field.
const definitions = [
  { id: 'creative-films', serviceId: '01', pattern: /فيديو|فيلم|ابداعي|creative|film|video/ },
  { id: 'photography', serviceId: '02', pattern: /فوتوغراف|صور ثابت|photograph/ },
  { id: 'motion-graphics', serviceId: '03', pattern: /موشن|جرافيك|motion|cgi|[23]\s*d/ },
  { id: 'media-coverage', serviceId: '04', pattern: /تغطي|فعالي|coverage|event|closing/ },
  { id: 'cinematic-ads', serviceId: '05', pattern: /اعلان|فيلم حمله|حمله موسسيه|commercial|advert/ },
] as const

export type WorkCategoryId = typeof definitions[number]['id']
export const workCategories = definitions.map(({ id, serviceId }) => ({
  id,
  label: services.find(service => service.id === serviceId)!.title,
}))

const normalize = (value: string) => value.normalize('NFKC').toLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')

export function getProjectCategoryIds(project: ProjectItem): WorkCategoryId[] {
  // Explicit CMS service tags take precedence. Older projects still work using
  // their existing descriptive category/role/format; unknowns stay in All.
  const tagged = normalize((project.services ?? []).join(' '))
  const explicit = definitions.filter(category => category.pattern.test(tagged))
  if (explicit.length) return explicit.map(category => category.id)
  const details = normalize([project.category, project.role, project.format].join(' '))
  return definitions.filter(category => category.pattern.test(details)).map(category => category.id)
}
