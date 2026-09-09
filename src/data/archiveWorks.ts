import type { ArchiveWorkItem } from '../lib/archiveWorks'

// Independent offline snapshot, not derived from the homepage collection.
// The fifth legacy entry has no video link yet; retain its existing case study.
export const archiveWorks: ArchiveWorkItem[] = [
  { id: 'legacy-01', workType: 'cinematic-ads', title: 'حملة الوالدية الفاعلة', client: 'مجلس شؤون الأسرة', year: 2026, link: 'https://www.youtube.com/watch?v=ZlY0tDv5sSY', poster: 'https://i.ytimg.com/vi/ZlY0tDv5sSY/hqdefault.jpg' },
  { id: 'legacy-02', workType: 'media-coverage', title: 'الفيديو الختامي', client: 'كأس السعودية', year: 2026, link: 'https://www.youtube.com/watch?v=eNBa3qMzcsI', poster: 'https://i.ytimg.com/vi/eNBa3qMzcsI/hqdefault.jpg' },
  { id: 'legacy-03', workType: 'media-coverage', title: 'اللي حصل في ليب', client: 'ليب', year: 2025, link: 'https://www.youtube.com/watch?v=2ouTbDrYWRw', poster: 'https://i.ytimg.com/vi/2ouTbDrYWRw/hqdefault.jpg' },
  { id: 'legacy-04', workType: 'motion-graphics', title: 'حملة تعزيز الهوية', client: 'صندوق التنمية الصناعية السعودي', year: 2025, link: 'https://www.youtube.com/watch?v=JEqH-iUKIZo', poster: 'https://i.ytimg.com/vi/JEqH-iUKIZo/hqdefault.jpg' },
  { id: 'legacy-05', workType: 'creative-films', title: 'تعزيز الهوية — الفصل الثاني', client: 'صندوق التنمية الصناعية السعودي', year: 2025, link: 'https://h-lens.co/work/identity-campaign-chapter-two/' },
]
