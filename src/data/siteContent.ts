import type {
  ClientItem,
  ContactChannel,
  NavigationItem,
  ProjectItem,
  ServiceItem,
} from '../types/content'

export const navigation: NavigationItem[] = [
  { id: 'hero', label: 'الرئيسية' },
  { id: 'story', label: 'قصتنا' },
  { id: 'services', label: 'خدماتنا' },
  { id: 'portfolio', label: 'أعمالنا' },
  { id: 'clients', label: 'عملاؤنا' },
  { id: 'contact', label: 'تواصل معنا' },
]

export const heroContent = {
  eyebrow: 'HALF LENS · RIYADH',
  titleLineOne: 'نرى الفكرة.',
  titleLineTwo: 'ونصنع أثرها.',
  description:
    'شريك إبداعي في الإنتاج المرئي، نحوّل الأفكار إلى صور تُرى، وتُسمع، وتبقى.',
  primaryAction: 'شاهد أعمالنا',
  secondaryAction: 'ابدأ مشروعك',
}

export const storyContent = {
  eyebrow: '01 — قصتنا',
  title: 'نصفٌ يكتمل بك.',
  lead:
    'اسمنا HALF LENS لأن نجاحنا له نصف آخر لا يكتمل إلا بك. نبدأ من رؤيتك، ونضيف إليها خبرتنا لنصنع عملاً يحمل أثرًا حقيقيًا.',
  supporting:
    'فريق شاب جمعه الشغف والإبداع، ننطلق نحو آفاق أوسع بإتقان، وجودة، ورؤية مختلفة.',
  statValue: '+40',
  statAccessibleLabel: 'أكثر من 40 شركة',
  statLabel: 'شركة وجهة وثقت بنا',
  highlights: [
    'مرونة في التعامل وشمولية في الخدمات',
    'طاقات شابة بتخصص واحترافية',
    'جاهزية إنتاجية على مدار الساعة',
  ],
}

export const servicesContent = {
  eyebrow: '02 — خدماتنا',
  title: 'كل ما تحتاجه الصورة، تحت سقف واحد.',
  intro:
    'من لحظة كتابة الفكرة حتى آخر معالجة لونية؛ نبني فرقًا مرنة لكل مشروع ونحافظ على رؤية واحدة متماسكة.',
}

export const services: ServiceItem[] = [
  {
    id: '01',
    title: 'فيديوهات إبداعية',
    description: 'سرد بصري أصيل يحوّل الرسالة إلى تجربة يتذكرها الجمهور.',
    meta: 'CREATIVE FILMS',
    side: 'start',
  },
  {
    id: '02',
    title: 'تصوير فوتوغرافي',
    description: 'صور دقيقة ومعبّرة للعلامات، المنتجات، والأشخاص.',
    meta: 'PHOTOGRAPHY',
    side: 'end',
  },
  {
    id: '03',
    title: 'موشن جرافيك 2D + 3D',
    description: 'عوالم متحركة تشرح الأفكار المعقدة بأسلوب بسيط وجذّاب.',
    meta: 'MOTION & CGI',
    side: 'start',
  },
  {
    id: '04',
    title: 'تغطيات إعلامية',
    description: 'فرق سريعة تلتقط اللحظة وتنقل روح الحدث كما حدثت.',
    meta: 'LIVE COVERAGE',
    side: 'end',
  },
  {
    id: '05',
    title: 'إعلانات سينمائية',
    description: 'إنتاج متكامل بمستوى سينمائي من المعالجة إلى التسليم.',
    meta: 'COMMERCIALS',
    side: 'start',
  },
]

export const portfolioContent = {
  eyebrow: '03 — أعمال مختارة',
  title: 'الصورة هي الدليل.',
  description:
    'مجموعة مختارة من مشاريعنا في الحملات، الأفلام الختامية، وصناعة الهوية المرئية.',
}

export const projects: ProjectItem[] = [
  {
    id: '01',
    title: 'حملة الوالدية الفاعلة',
    category: 'مجلس شؤون الأسرة · حملة توعوية',
    year: '2026',
    palette: 'amber',
  },
  {
    id: '02',
    title: 'الفيديو الختامي',
    category: 'كأس السعودية · فيلم فعالية',
    year: '2026',
    palette: 'violet',
  },
  {
    id: '03',
    title: 'اللي حصل في ليب',
    category: 'ليب · تغطية إبداعية',
    year: '2025',
    palette: 'cyan',
  },
  {
    id: '04',
    title: 'حملة تعزيز الهوية',
    category: 'الصندوق الصناعي · حملة مؤسسية',
    year: '2025',
    palette: 'crimson',
  },
  {
    id: '05',
    title: 'تعزيز الهوية — الفصل الثاني',
    category: 'الصندوق الصناعي · فيلم علامة',
    year: '2025',
    palette: 'silver',
  },
]

export const clientsContent = {
  eyebrow: '04 — عملاؤنا',
  title: 'ثقة من مجالات متعددة.',
  description:
    'نعمل مع الجهات التي ترى في الإنتاج شريكًا في النجاح، لا مجرد خطوة تنفيذية.',
}

export const clients: ClientItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1).padStart(2, '0'),
  name: `شعار العميل ${String(index + 1).padStart(2, '0')}`,
  abbreviation: `HL·${String(index + 1).padStart(2, '0')}`,
}))

export const contactContent = {
  eyebrow: '05 — تواصل معنا',
  title: 'لديك فكرة؟\nلنكمل نصفها الآخر.',
  description:
    'أخبرنا بما تريد صناعته. سنعود إليك لنفهم المشروع، نطاقه، والطريقة الأنسب لتحويله إلى صورة.',
}

export const contactChannels: ContactChannel[] = [
  {
    label: 'تطوير الأعمال',
    value: 'bd@h-lens.co',
    href: 'mailto:bd@h-lens.co',
  },
  {
    label: 'الموارد البشرية',
    value: 'hr@h-lens.co',
    href: 'mailto:hr@h-lens.co',
  },
  {
    label: 'الهاتف',
    value: '+966 54 844 9704',
    href: 'tel:+966548449704',
  },
  {
    label: 'هاتف إضافي',
    value: '+966 57 977 7981',
    href: 'tel:+966579777981',
  },
]

export const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/HalfLens_SA/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@halflens_sa' },
  { label: 'X', href: 'https://twitter.com/HalfLens_SA' },
]
