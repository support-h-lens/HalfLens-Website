-- Preserve the existing public website in this new database. Reruns never overwrite edits.
begin;
insert into public.website_projects (project_code, slug, title, category, client, production_role, format, project_year, palette, image_url, youtube_id, youtube_url, youtube_poster_url, aspect_ratio, sort_order, status, seo_title, seo_description) values
('01', 'effective-parenting-campaign', 'حملة الوالدية الفاعلة', 'مجلس شؤون الأسرة · حملة توعوية', 'مجلس شؤون الأسرة', 'التوجيه الإبداعي · الإنتاج', 'فيلم حملة · 16:9', 2026, 'amber', null, 'ZlY0tDv5sSY', 'https://www.youtube.com/watch?v=ZlY0tDv5sSY', 'https://i.ytimg.com/vi/ZlY0tDv5sSY/maxresdefault.jpg', 2.0528846153846154, 0, 'published', 'حملة الوالدية الفاعلة', 'مجلس شؤون الأسرة · حملة توعوية'),
('02', 'saudi-cup-closing-film', 'الفيديو الختامي', 'كأس السعودية · فيلم فعالية', 'كأس السعودية', 'الإنتاج · ما بعد الإنتاج', 'فيلم فعالية · 4K', 2026, 'violet', null, 'eNBa3qMzcsI', 'https://www.youtube.com/watch?v=eNBa3qMzcsI', 'https://i.ytimg.com/vi/eNBa3qMzcsI/maxresdefault.jpg', 2.0779220779220777, 1, 'published', 'الفيديو الختامي', 'كأس السعودية · فيلم فعالية'),
('03', 'leap-coverage', 'اللي حصل في ليب', 'ليب · تغطية إبداعية', 'ليب', 'التصوير السينمائي · المونتاج', 'حملة اجتماعية · 9:16', 2025, 'cyan', null, '2ouTbDrYWRw', 'https://www.youtube.com/watch?v=2ouTbDrYWRw', 'https://i.ytimg.com/vi/2ouTbDrYWRw/maxresdefault.jpg', 1.7777777777777777, 2, 'published', 'اللي حصل في ليب', 'ليب · تغطية إبداعية'),
('04', 'identity-campaign', 'حملة تعزيز الهوية', 'الصندوق الصناعي · حملة مؤسسية', 'صندوق التنمية الصناعية السعودي', 'التوجيه الإبداعي · الموشن جرافيك', 'فيلم علامة تجارية · 16:9', 2025, 'crimson', null, 'JEqH-iUKIZo', 'https://www.youtube.com/watch?v=JEqH-iUKIZo', 'https://i.ytimg.com/vi/JEqH-iUKIZo/maxresdefault.jpg', 1.7777777777777777, 3, 'published', 'حملة تعزيز الهوية', 'الصندوق الصناعي · حملة مؤسسية'),
('05', 'identity-campaign-chapter-two', 'تعزيز الهوية — الفصل الثاني', 'الصندوق الصناعي · فيلم علامة', 'صندوق التنمية الصناعية السعودي', 'الإنتاج · تصحيح الألوان', 'فيلم علامة تجارية · 4K', 2025, 'silver', null, null, null, null, 1.7777777777777777, 4, 'published', 'تعزيز الهوية — الفصل الثاني', 'الصندوق الصناعي · فيلم علامة')
on conflict (project_code) do nothing;
insert into public.website_clients (client_code, name, abbreviation, logo_url, sort_order, status) values
('01', 'الخطوط السعودية', 'SAUDIA', '/media/clients/saudia.svg', 0, 'published'),
('02', 'ديوان المظالم', 'BOG', '/media/clients/board-of-grievances.svg', 1, 'published'),
('03', 'LEAP', 'LEAP', '/media/clients/leap.svg', 2, 'published'),
('04', 'صدى', 'SADA', '/media/clients/sada.png', 3, 'published'),
('05', 'شركة علم', 'ELM', '/media/clients/elm.svg', 4, 'published'),
('06', 'وزارة الثقافة', 'MINISTRY OF CULTURE', '/media/clients/ministry-of-culture.svg', 5, 'published'),
('07', 'بيت الثقافة', 'CULTURE HOUSE', '/media/clients/culture-house.svg', 6, 'published'),
('08', 'وزارة الصحة', 'MINISTRY OF HEALTH', '/media/clients/ministry-of-health.png', 7, 'published'),
('09', 'وزارة العدل', 'MINISTRY OF JUSTICE', '/media/clients/ministry-of-justice.webp', 8, 'published'),
('10', 'الاتحاد السعودي لكرة القدم', 'SAFF', '/media/clients/saudi-football-federation.png', 9, 'published'),
('11', 'البنك العربي الوطني anb', 'ANB', '/media/clients/anb.png', 10, 'published'),
('12', 'SABB', 'SABB', '/media/clients/sabb.png', 11, 'published'),
('13', 'وزارة النقل', 'MINISTRY OF TRANSPORT', '/media/clients/ministry-of-transport.svg', 12, 'published'),
('14', 'وزارة الإعلام', 'MINISTRY OF MEDIA', '/media/clients/ministry-of-media.svg', 13, 'published'),
('15', 'نادي الهلال السعودي', 'AL HILAL', '/media/clients/al-hilal.png', 14, 'published'),
('16', 'مؤسسة محمد بن سلمان مسك', 'MISK', '/media/clients/misk.png', 15, 'published'),
('17', 'وزارة الاتصالات وتقنية المعلومات', 'MCIT', '/media/clients/mcit.png', 16, 'published'),
('18', 'وزارة الإسكان', 'MINISTRY OF HOUSING', '/media/clients/ministry-of-housing.svg', 17, 'published'),
('19', 'وزارة الرياضة', 'MINISTRY OF SPORT', '/media/clients/ministry-of-sport.svg', 18, 'published'),
('20', 'هيئة الزكاة والضريبة والجمارك', 'ZATCA', '/media/clients/zatca.svg', 19, 'published'),
('21', 'الهيئة السعودية للملكية الفكرية', 'SAIP', '/media/clients/saip.svg', 20, 'published'),
('22', 'البنك السعودي الفرنسي', 'BSF', '/media/clients/bsf.svg', 21, 'published'),
('23', 'صندوق التنمية الصناعية السعودي', 'SIDF', '/media/clients/sidf.png', 22, 'published'),
('24', 'وزارة الموارد البشرية والتنمية الاجتماعية', 'HRSD', '/media/clients/hrsd.svg', 23, 'published'),
('25', 'وزارة الطاقة', 'MINISTRY OF ENERGY', '/media/clients/ministry-of-energy.svg', 24, 'published'),
('26', 'سنابل للاستثمار', 'SANABIL INVESTMENTS', '/media/clients/sanabil.svg', 25, 'published'),
('27', 'نادي الصقور السعودي', 'SAUDI FALCONS CLUB', '/media/clients/saudi-falcons-club.svg', 26, 'published'),
('28', 'العمل المرن', 'MRN', '/media/clients/mrn.svg', 27, 'published'),
('29', 'مجموعة بودل للضيافة', 'BOUDL HOSPITALITY GROUP', '/media/clients/boudl.png', 28, 'published'),
('30', 'الاتحاد السعودي للأمن السيبراني والبرمجة والدرونز', 'SAFCSP', '/media/clients/safcsp.png', 29, 'published'),
('31', 'stc pay', 'STC PAY', '/media/clients/stc-pay.svg', 30, 'published'),
('32', 'شركة لين لخدمات الأعمال', 'LEAN', '/media/clients/lean.svg', 31, 'published'),
('33', 'عوائد', 'AWAED', '/media/clients/awaed.png', 32, 'published'),
('34', 'تداول السعودية', 'TADAWUL', '/media/clients/tadawul.svg', 33, 'published')
on conflict (client_code) do nothing;
insert into public.website_sections (section_key, label, content, sort_order, status) values
('contact', 'بيانات التواصل', '{"channels":[{"label":"تطوير الأعمال","value":"bd@h-lens.co","href":"mailto:bd@h-lens.co"},{"label":"الموارد البشرية","value":"hr@h-lens.co","href":"mailto:hr@h-lens.co"},{"label":"الهاتف","value":"+966 54 844 9704","href":"tel:+966548449704"},{"label":"هاتف إضافي","value":"+966 57 977 7981","href":"tel:+966579777981"}]}', 5, 'published')
on conflict (section_key) do nothing;
insert into public.website_archive_works (id, work_type, title, client, project_year, link_url, sort_order, status) values
('00000000-0000-4000-8000-000000000001', 'cinematic-ads', 'حملة الوالدية الفاعلة', 'مجلس شؤون الأسرة', 2026, 'https://www.youtube.com/watch?v=ZlY0tDv5sSY', 0, 'published'),
('00000000-0000-4000-8000-000000000002', 'media-coverage', 'الفيديو الختامي', 'كأس السعودية', 2026, 'https://www.youtube.com/watch?v=eNBa3qMzcsI', 1, 'published'),
('00000000-0000-4000-8000-000000000003', 'media-coverage', 'اللي حصل في ليب', 'ليب', 2025, 'https://www.youtube.com/watch?v=2ouTbDrYWRw', 2, 'published'),
('00000000-0000-4000-8000-000000000004', 'motion-graphics', 'حملة تعزيز الهوية', 'صندوق التنمية الصناعية السعودي', 2025, 'https://www.youtube.com/watch?v=JEqH-iUKIZo', 3, 'published'),
('00000000-0000-4000-8000-000000000005', 'creative-films', 'تعزيز الهوية — الفصل الثاني', 'صندوق التنمية الصناعية السعودي', 2025, 'https://h-lens.co/work/identity-campaign-chapter-two/', 4, 'published')
on conflict (id) do nothing;
commit;
