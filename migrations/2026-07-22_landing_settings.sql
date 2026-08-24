-- ============================================================
--  Landing Page Management — Base setup (Task 1: Hero Section)
--  Jalankan di Supabase SQL Editor.
-- ============================================================

-- 1) Tabel key-value untuk section landing yang bersifat "singleton"
--    (hero, trust, cta, branch, dll). Tiap section = 1 baris JSONB.
create table if not exists public.landing_settings (
  section     text primary key,
  content     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Bucket storage publik untuk semua aset landing
--    (banner hero, gambar promo, foto alumni, dsb).
insert into storage.buckets (id, name, public)
values ('landing-assets', 'landing-assets', true)
on conflict (id) do update set public = true;

-- 3) Seed konten default Hero Section (agar landing tetap tampil
--    walau admin belum pernah menyunting).
insert into public.landing_settings (section, content)
values (
  'hero',
  jsonb_build_object(
    'badge',          'Platform Kursus Terpercaya',
    'title',          'Tingkatkan Kompetensi Anda di LPIA Wisma Asri',
    'subtitle',       'Kursus Bahasa Inggris, Bahasa Jepang, Komputer, dan keterampilan profesional untuk masa depan yang lebih baik.',
    'primary_text',   'Mulai Belajar',
    'primary_link',   '#kursus',
    'secondary_text', 'Lihat Program',
    'secondary_link', '/courses',
    'banner_url',     ''
  )
)
on conflict (section) do nothing;
