-- ============================================================
--  Landing Page — Task 4: Section "Kenapa Belajar di LPIA?"
--  Prasyarat: tabel public.landing_settings sudah dibuat.
--  Jalankan di Supabase SQL Editor.
-- ============================================================

insert into public.landing_settings (section, content)
values (
  'features',
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object('icon', 'fa-chalkboard-user', 'title', 'Mentor Profesional', 'description', 'Diampu pengajar berpengalaman dan tersertifikasi di bidangnya.'),
      jsonb_build_object('icon', 'fa-layer-group',     'title', 'Materi Terstruktur', 'description', 'Kurikulum runtut dan mudah diikuti dari dasar hingga mahir.'),
      jsonb_build_object('icon', 'fa-certificate',     'title', 'Sertifikat Resmi',   'description', 'Dapatkan sertifikat resmi setelah menyelesaikan program.'),
      jsonb_build_object('icon', 'fa-calendar-check',  'title', 'Jadwal Fleksibel',   'description', 'Pilih jadwal belajar yang sesuai dengan rutinitas Anda.'),
      jsonb_build_object('icon', 'fa-building',        'title', 'Fasilitas Nyaman',   'description', 'Ruang belajar nyaman dengan fasilitas modern dan lengkap.'),
      jsonb_build_object('icon', 'fa-headset',         'title', 'Support Belajar',    'description', 'Bimbingan dan konsultasi belajar kapan saja Anda butuhkan.')
    )
  )
)
on conflict (section) do nothing;
