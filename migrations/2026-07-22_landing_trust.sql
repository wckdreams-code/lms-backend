-- ============================================================
--  Landing Page — Task 2: Trust / Statistik Section
--  Prasyarat: tabel public.landing_settings sudah dibuat
--  (2026-07-22_landing_settings.sql). Jalankan di Supabase SQL Editor.
-- ============================================================

-- Seed statistik trust default (angka + label + ikon Font Awesome).
insert into public.landing_settings (section, content)
values (
  'trust',
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object('icon', 'fa-medal',        'value', '40+',      'label', 'Tahun Pengalaman'),
      jsonb_build_object('icon', 'fa-user-graduate', 'value', '100.000+', 'label', 'Alumni'),
      jsonb_build_object('icon', 'fa-book-open',     'value', '50+',      'label', 'Program Pembelajaran'),
      jsonb_build_object('icon', 'fa-star',          'value', '4.9/5',    'label', 'Rating Siswa')
    )
  )
)
on conflict (section) do nothing;
