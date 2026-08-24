-- ============================================================
--  Landing Page — Task 7: CTA Section
--  Prasyarat: tabel public.landing_settings sudah dibuat.
--  Jalankan di Supabase SQL Editor.
-- ============================================================

insert into public.landing_settings (section, content)
values (
  'cta',
  jsonb_build_object(
    'title',          'Siap Mulai Belajar Bersama LPIA?',
    'subtitle',       'Daftar sekarang dan raih kemampuan terbaik untuk masa depan Anda!',
    'primary_text',   'Daftar Sekarang',
    'primary_link',   '/login',
    'secondary_text', 'Konsultasi Gratis',
    'secondary_link', '#bantuan'
  )
)
on conflict (section) do nothing;
