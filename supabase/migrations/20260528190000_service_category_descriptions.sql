-- Add multilingual description columns to service_categories
alter table public.service_categories
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists description_tr text;

-- Backfill multilingual columns from the legacy single description column where present
update public.service_categories
  set description_ar = coalesce(description_ar, description)
  where description is not null and description_ar is null;

-- Seed reasonable descriptions for the default categories
update public.service_categories set
  description_ar = 'إصلاح التسريبات، تركيب الخلاطات والأدوات الصحية',
  description_en = 'Leak repairs, faucet and fixture installation',
  description_tr = 'Sızıntı onarımı, musluk ve tesisat montajı'
  where name_en = 'Plumbing';

update public.service_categories set
  description_ar = 'إصلاح الأعطال، تمديدات وتركيب الإنارة',
  description_en = 'Fault repair, wiring and lighting installation',
  description_tr = 'Arıza onarımı, kablolama ve aydınlatma montajı'
  where name_en = 'Electrical';

update public.service_categories set
  description_ar = 'تنظيف شامل للمنازل والمكاتب والشقق',
  description_en = 'Full cleaning for homes, offices and apartments',
  description_tr = 'Ev, ofis ve daire için kapsamlı temizlik'
  where name_en = 'Cleaning';

update public.service_categories set
  description_ar = 'تنظيف، تعبئة فريون، إصلاح الأعطال',
  description_en = 'Cleaning, refrigerant refill, fault repair',
  description_tr = 'Temizlik, soğutucu dolumu, arıza onarımı'
  where name_en = 'AC Maintenance';

update public.service_categories set
  description_ar = 'دهان داخلي وخارجي بأعلى جودة',
  description_en = 'Premium interior and exterior painting',
  description_tr = 'Yüksek kaliteli iç ve dış cephe boyama'
  where name_en = 'Painting';

update public.service_categories set
  description_ar = 'تفصيل، إصلاح وتركيب الأثاث الخشبي',
  description_en = 'Custom, repair and installation of wooden furniture',
  description_tr = 'Ahşap mobilya üretim, onarım ve montajı'
  where name_en = 'Carpentry';

update public.service_categories set
  description_ar = 'فك وتركيب جميع أنواع الأثاث المنزلي',
  description_en = 'Assembly and disassembly of all home furniture',
  description_tr = 'Tüm ev mobilyalarının montaj ve sökümü'
  where name_en = 'Furniture Assembly';

update public.service_categories set
  description_ar = 'صيانة الغسالات والثلاجات والأجهزة المنزلية',
  description_en = 'Maintenance for washers, fridges and home appliances',
  description_tr = 'Çamaşır makinesi, buzdolabı ve ev aletleri bakımı'
  where name_en = 'Appliance Repair';
