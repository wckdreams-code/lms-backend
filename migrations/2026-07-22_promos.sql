-- ============================================================
--  Landing Page — Task 3: Promo Section
--  Jalankan di Supabase SQL Editor.
-- ============================================================

create table if not exists public.promos (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text        default '',
  image_url   text        default '',
  cta_text    text        default 'Lihat Promo',
  cta_link    text        default '#kursus',
  start_date  date,
  end_date    date,
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_promos_active_order
  on public.promos (is_active, sort_order, created_at desc);

-- Contoh seed (opsional — boleh dihapus).
insert into public.promos (title, description, cta_text, cta_link, end_date, sort_order)
values (
  'Promo Spesial Siswa Baru',
  'Nikmati potongan biaya pendaftaran untuk pendaftar bulan ini. Kuota terbatas, daftar sekarang!',
  'Daftar Sekarang',
  '/login',
  (now() + interval '30 days')::date,
  1
)
on conflict do nothing;
