-- ============================================================
--  Landing Page — Task 5: Testimonial Alumni
--  Jalankan di Supabase SQL Editor.
-- ============================================================

create table if not exists public.alumni_testimonials (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  photo_url   text        default '',
  course_name text        default '',
  rating      integer     not null default 5 check (rating between 1 and 5),
  testimonial text        default '',
  year        integer,
  is_visible  boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_alumni_visible_order
  on public.alumni_testimonials (is_visible, sort_order, created_at desc);

-- Contoh seed (opsional — boleh dihapus / diedit lewat dashboard admin).
insert into public.alumni_testimonials (name, course_name, rating, testimonial, year, sort_order)
values
  ('Nadia Putri',  'Kursus Bahasa Inggris', 5, 'Belajar di LPIA sangat membantu meningkatkan kemampuan speaking saya. Pengajarnya ramah dan materi mudah dipahami.', 2025, 1),
  ('Ricky Pratama','TOEFL Preparation',      5, 'Nilai TOEFL saya meningkat signifikan setelah kursus di sini. Fasilitas nyaman dan lokasinya strategis.',            2024, 2),
  ('Siti Aisyah',  'Kursus Komputer',        5, 'Kursus komputer di LPIA membantu saya lebih percaya diri saat bekerja. Rekomendasi banget!',                          2025, 3)
on conflict do nothing;
