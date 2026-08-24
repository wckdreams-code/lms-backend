-- Fitur upload sertifikat oleh admin + antrian penerbitan.
-- Jalankan sekali di Supabase SQL Editor.
--
-- Desain: murid lulus ujian -> baris certificates dibuat status 'pending'
-- (tanpa URL dummy lagi) -> admin upload PDF asli -> status 'issued'.
-- Tabel certificate_templates disiapkan untuk auto-generate PDF di masa depan.
--
-- JANGAN LUPA (manual): buat bucket Storage public bernama 'certificates'
-- di Supabase Dashboard, seperti bucket course-materials / course-banners.

-- 1. Kolom tambahan pada certificates.
--    certificate_url dipertahankan (dipakai banyak read path), tapi sekarang
--    boleh NULL selama sertifikat masih pending.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'issued')),
  ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- issued_at sekarang bermakna "tanggal diterbitkan admin", boleh NULL saat pending.
ALTER TABLE public.certificates
  ALTER COLUMN issued_at DROP DEFAULT,
  ALTER COLUMN issued_at DROP NOT NULL,
  ALTER COLUMN certificate_url DROP NOT NULL;

-- Data lama dengan URL dummy dianggap pending ulang: kosongkan URL-nya.
UPDATE public.certificates
SET certificate_url = NULL, status = 'pending', issued_at = NULL
WHERE certificate_url LIKE 'https://lpia.edu/certificates/%';

-- Sertifikat lama yang punya URL asli (bukan dummy) dianggap sudah terbit.
UPDATE public.certificates
SET status = 'issued'
WHERE certificate_url IS NOT NULL;

-- 2. Tabel template sertifikat per course (untuk auto-generate PDF nanti).
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  template_file text NOT NULL,
  file_name text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT certificate_templates_pkey PRIMARY KEY (id),
  CONSTRAINT certificate_templates_course_unique UNIQUE (course_id)
);

-- 3. Satu siswa hanya punya satu sertifikat per course.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_unique
  ON public.certificates (user_id, course_id);
