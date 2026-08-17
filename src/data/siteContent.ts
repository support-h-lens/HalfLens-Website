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

export const productionStages = [
  { id: '01', label: 'IDEA' },
  { id: '02', label: 'DIRECTION' },
  { id: '03', label: 'STORYBOARD' },
  { id: '04', label: 'PRODUCTION' },
  { id: '05', label: 'POST' },
  { id: '06', label: 'COLOR' },
  { id: '07', label: 'IMPACT' },
]

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
    client: 'مجلس شؤون الأسرة',
    role: 'التوجيه الإبداعي · الإنتاج',
    format: 'فيلم حملة · 16:9',
    palette: 'amber',
    youtube: {
      id: 'ZlY0tDv5sSY',
      url: 'https://www.youtube.com/watch?v=ZlY0tDv5sSY',
      poster: 'https://i.ytimg.com/vi/ZlY0tDv5sSY/maxresdefault.jpg',
      aspectRatio: 854 / 416,
    },
  },
  {
    id: '02',
    title: 'الفيديو الختامي',
    category: 'كأس السعودية · فيلم فعالية',
    year: '2026',
    client: 'كأس السعودية',
    role: 'الإنتاج · ما بعد الإنتاج',
    format: 'فيلم فعالية · 4K',
    palette: 'violet',
    youtube: {
      id: 'eNBa3qMzcsI',
      url: 'https://www.youtube.com/watch?v=eNBa3qMzcsI',
      poster: 'https://i.ytimg.com/vi/eNBa3qMzcsI/maxresdefault.jpg',
      aspectRatio: 1280 / 616,
    },
  },
  {
    id: '03',
    title: 'اللي حصل في ليب',
    category: 'ليب · تغطية إبداعية',
    year: '2025',
    client: 'ليب',
    role: 'التصوير السينمائي · المونتاج',
    format: 'حملة اجتماعية · 9:16',
    palette: 'cyan',
    youtube: {
      id: '2ouTbDrYWRw',
      url: 'https://www.youtube.com/watch?v=2ouTbDrYWRw',
      poster: 'https://i.ytimg.com/vi/2ouTbDrYWRw/maxresdefault.jpg',
      aspectRatio: 16 / 9,
    },
  },
  {
    id: '04',
    title: 'حملة تعزيز الهوية',
    category: 'الصندوق الصناعي · حملة مؤسسية',
    year: '2025',
    client: 'صندوق التنمية الصناعية السعودي',
    role: 'التوجيه الإبداعي · الموشن جرافيك',
    format: 'فيلم علامة تجارية · 16:9',
    palette: 'crimson',
    youtube: {
      id: 'JEqH-iUKIZo',
      url: 'https://www.youtube.com/watch?v=JEqH-iUKIZo',
      poster: 'https://i.ytimg.com/vi/JEqH-iUKIZo/maxresdefault.jpg',
      aspectRatio: 16 / 9,
    },
  },
  {
    id: '05',
    title: 'تعزيز الهوية — الفصل الثاني',
    category: 'الصندوق الصناعي · فيلم علامة',
    year: '2025',
    client: 'صندوق التنمية الصناعية السعودي',
    role: 'الإنتاج · تصحيح الألوان',
    format: 'فيلم علامة تجارية · 4K',
    palette: 'silver',
  },
]

export const clientsContent = {
  eyebrow: '04 — عملاؤنا',
  title: 'ثقة من مجالات متعددة.',
  description:
    'نعمل مع الجهات التي ترى في الإنتاج شريكًا في النجاح، لا مجرد خطوة تنفيذية.',
  statValue: '+40',
  statLabel: 'شراكة إبداعية',
}

export const projectTypes = [
  'فيديو إبداعي',
  'تصوير فوتوغرافي',
  'موشن جرافيك 2D + 3D',
  'تغطية إعلامية',
  'إعلان سينمائي',
  'أخرى',
]

export const clientTestimonial = {
  quote: 'مساحة مخصصة لشهادة عميل معتمدة تصف أثر الشراكة وجودة التجربة من الفكرة حتى التسليم.',
  attribution: 'CLIENT TESTIMONIAL · PENDING APPROVAL',
}

export const clients: ClientItem[] = [
  {
    id: '01',
    name: 'الخطوط السعودية',
    abbreviation: 'SAUDIA',
    logo: '/media/clients/saudia.svg',
  },
  {
    id: '02',
    name: 'ديوان المظالم',
    abbreviation: 'BOG',
    logo: '/media/clients/board-of-grievances.svg',
  },
  {
    id: '03',
    name: 'LEAP',
    abbreviation: 'LEAP',
    logo: '/media/clients/leap.svg',
  },
  {
    id: '04',
    name: 'صدى',
    abbreviation: 'SADA',
    logo: '/media/clients/sada.png',
  },
  {
    id: '05',
    name: 'شركة علم',
    abbreviation: 'ELM',
    logo: '/media/clients/elm.svg',
  },
  {
    id: '06',
    name: 'وزارة الثقافة',
    abbreviation: 'MINISTRY OF CULTURE',
    logo: '/media/clients/ministry-of-culture.svg',
  },
  {
    id: '07',
    name: 'بيت الثقافة',
    abbreviation: 'CULTURE HOUSE',
    logo: '/media/clients/culture-house.svg',
  },
  {
    id: '08',
    name: 'وزارة الصحة',
    abbreviation: 'MINISTRY OF HEALTH',
    logo: '/media/clients/ministry-of-health.png',
  },
  {
    id: '09',
    name: 'وزارة العدل',
    abbreviation: 'MINISTRY OF JUSTICE',
    logo: '/media/clients/ministry-of-justice.webp',
  },
  {
    id: '10',
    name: 'الاتحاد السعودي لكرة القدم',
    abbreviation: 'SAFF',
    logo: '/media/clients/saudi-football-federation.png',
  },
  {
    id: '11',
    name: 'البنك العربي الوطني anb',
    abbreviation: 'ANB',
    logo: '/media/clients/anb.png',
  },
  {
    id: '12',
    name: 'SABB',
    abbreviation: 'SABB',
    logo: '/media/clients/sabb.png',
  },
  {
    id: '13',
    name: 'وزارة النقل',
    abbreviation: 'MINISTRY OF TRANSPORT',
    logo: '/media/clients/ministry-of-transport.svg',
  },
  {
    id: '14',
    name: 'وزارة الإعلام',
    abbreviation: 'MINISTRY OF MEDIA',
    logo: '/media/clients/ministry-of-media.svg',
  },
  {
    id: '15',
    name: 'نادي الهلال السعودي',
    abbreviation: 'AL HILAL',
    logo: '/media/clients/al-hilal.png',
  },
  {
    id: '16',
    name: 'مؤسسة محمد بن سلمان مسك',
    abbreviation: 'MISK',
    logo: '/media/clients/misk.png',
  },
  {
    id: '17',
    name: 'وزارة الاتصالات وتقنية المعلومات',
    abbreviation: 'MCIT',
    logo: '/media/clients/mcit.png',
  },
  {
    id: '18',
    name: 'وزارة الإسكان',
    abbreviation: 'MINISTRY OF HOUSING',
    logo: '/media/clients/ministry-of-housing.svg',
  },
  {
    id: '19',
    name: 'وزارة الرياضة',
    abbreviation: 'MINISTRY OF SPORT',
    logo: '/media/clients/ministry-of-sport.svg',
  },
  {
    id: '20',
    name: 'هيئة الزكاة والضريبة والجمارك',
    abbreviation: 'ZATCA',
    logo: '/media/clients/zatca.svg',
  },
  {
    id: '21',
    name: 'الهيئة السعودية للملكية الفكرية',
    abbreviation: 'SAIP',
    logo: '/media/clients/saip.svg',
  },
  {
    id: '22',
    name: 'البنك السعودي الفرنسي',
    abbreviation: 'BSF',
    logo: '/media/clients/bsf.svg',
  },
  {
    id: '23',
    name: 'صندوق التنمية الصناعية السعودي',
    abbreviation: 'SIDF',
    logo: '/media/clients/sidf.png',
  },
  {
    id: '24',
    name: 'وزارة الموارد البشرية والتنمية الاجتماعية',
    abbreviation: 'HRSD',
    logo: '/media/clients/hrsd.svg',
  },
  {
    id: '25',
    name: 'وزارة الطاقة',
    abbreviation: 'MINISTRY OF ENERGY',
    logo: '/media/clients/ministry-of-energy.svg',
  },
  {
    id: '26',
    name: 'سنابل للاستثمار',
    abbreviation: 'SANABIL INVESTMENTS',
    logo: '/media/clients/sanabil.svg',
  },
  {
    id: '27',
    name: 'نادي الصقور السعودي',
    abbreviation: 'SAUDI FALCONS CLUB',
    logo: '/media/clients/saudi-falcons-club.svg',
  },
  {
    id: '28',
    name: 'العمل المرن',
    abbreviation: 'MRN',
    logo: '/media/clients/mrn.svg',
  },
  {
    id: '29',
    name: 'مجموعة بودل للضيافة',
    abbreviation: 'BOUDL HOSPITALITY GROUP',
    logo: '/media/clients/boudl.png',
  },
  {
    id: '30',
    name: 'الاتحاد السعودي للأمن السيبراني والبرمجة والدرونز',
    abbreviation: 'SAFCSP',
    logo: '/media/clients/safcsp.png',
  },
  {
    id: '31',
    name: 'stc pay',
    abbreviation: 'STC PAY',
    logo: '/media/clients/stc-pay.svg',
  },
  {
    id: '32',
    name: 'شركة لين لخدمات الأعمال',
    abbreviation: 'LEAN',
    logo: '/media/clients/lean.svg',
  },
  {
    id: '33',
    name: 'عوائد',
    abbreviation: 'AWAED',
    logo: '/media/clients/awaed.png',
  },
  {
    id: '34',
    name: 'تداول السعودية',
    abbreviation: 'TADAWUL',
    logo: '/media/clients/tadawul.svg',
  },
]

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
