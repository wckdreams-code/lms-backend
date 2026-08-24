-- Phase C: Simulasi pembayaran untuk akun dummy.
-- Jalankan sekali di Supabase SQL Editor.
--
-- Desain: Option A (kolom di profiles), dipilih karena relasi 1:1 dengan user,
-- dicek sekali saat checkout tanpa join tabel terpisah, konsisten dengan pola
-- kolom lain di profiles (role, avatar_url, current_level).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_dummy_account boolean NOT NULL DEFAULT false;

-- Contoh menandai satu akun sebagai dummy (ganti email sesuai kebutuhan):
-- UPDATE public.profiles p
-- SET is_dummy_account = true
-- FROM auth.users u
-- WHERE u.id = p.id AND u.email = 'dummy@student.com';
