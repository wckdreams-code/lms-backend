-- ============================================================
--  Landing Page — Task 6: Info Cabang + FAQ Dinamis
--  Prasyarat: tabel public.landing_settings sudah dibuat.
--  Jalankan di Supabase SQL Editor.
-- ============================================================

-- 1) Seed info cabang (settings singleton).
insert into public.landing_settings (section, content)
values (
  'branch',
  jsonb_build_object(
    'name',        'LPIA Wisma Asri',
    'address',     'Wisma Asri Building, Jl. Letjen S. Parman Kav. 79, Slipi, Jakarta Barat 11420',
    'hours',       'Senin – Sabtu, 08.00 – 20.00 WIB',
    'phone',       '(021) 5366 4444',
    'whatsapp',    '0812 3456 7890',
    'maps_link',   '',
    'photo_url',   '',
    'tagline',     'Mudah dijangkau, nyaman untuk belajar!',
    'description', 'Lokasi strategis, dekat transportasi umum dan area perkantoran.'
  )
)
on conflict (section) do nothing;

-- 2) Tabel FAQ dinamis.
create table if not exists public.faqs (
  id          uuid        primary key default gen_random_uuid(),
  question    text        not null,
  answer      text        default '',
  is_visible  boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_faqs_visible_order
  on public.faqs (is_visible, sort_order, created_at desc);

-- 3) Seed FAQ dari konten yang sebelumnya hardcode di landing.
insert into public.faqs (question, answer, sort_order)
values
  ('Apa itu Platform LPIA LMS?',
   'LPIA LMS adalah platform pembelajaran digital resmi dari Lembaga Pendidikan Indonesia Amerika yang dirancang untuk memberikan pengalaman belajar interaktif dan terstruktur bagi siswa maupun profesional.',
   1),
  ('Bagaimana prosedur mendapatkan sertifikat?',
   'Sertifikat resmi akan diterbitkan secara otomatis setelah Anda menyelesaikan seluruh modul pembelajaran dan berhasil melewati ambang batas nilai kelulusan pada kuis akhir. Sertifikat dapat diunduh dalam format PDF.',
   2),
  ('Bagaimana cara mendaftar kursus?',
   'Klik tombol "Mulai Belajar", pilih program yang Anda inginkan, lakukan pendaftaran akun, lalu selesaikan pembayaran melalui sistem yang aman dan terverifikasi.',
   3)
on conflict do nothing;
