-- Verification Script: Hybrid Recommendation Setup Check
-- File: BE/migrations/2026-07-23_hybrid_recommendation_verify.sql

-- 1) Course publication state counts
SELECT
  COUNT(*) AS total_courses,
  COUNT(*) FILTER (WHERE status = 'published') AS published_courses,
  COUNT(*) FILTER (WHERE status = 'draft') AS draft_courses,
  COUNT(*) FILTER (WHERE is_published = true) AS is_published_true,
  COUNT(*) FILTER (WHERE is_published = false) AS is_published_false
FROM public.courses;

-- 2) Target ID details check
SELECT id, title, status, is_published, category, delivery_mode, level,
       cardinality(tags) AS tags_count,
       cardinality(target_goals) AS goals_count,
       deleted_at
FROM public.courses
WHERE id IN (
  '45d44154-2a05-48a6-b9a2-2fcf0dab4abe',
  'e047cbd5-953b-417a-a1bd-7abde174b9b5',
  '2d7e20b0-7592-4fa7-b27f-41acddecfefc',
  '3bac14bc-2af2-4ec8-a60d-8de108f6142f',
  '7ae37933-5482-42be-bde9-7a99260fc20f',
  '11111111-1111-1111-1111-111111111111',
  'c4a802df-87a0-4bd7-8aeb-d146a52d4f4e'
)
ORDER BY title;

-- 3) Backup presence check
SELECT COUNT(*) AS backup_rows
FROM internal_migrations.backup_courses_hybrid_rec_v1;

-- 4) Check for published course missing required metadata
-- Using exact conditions from the constraint
SELECT id, title
FROM public.courses
WHERE status = 'published'
  AND (
    deleted_at IS NOT NULL
    OR category IS NULL
    OR level IS NULL
    OR delivery_mode IS NULL
    OR tags IS NULL
    OR cardinality(tags) = 0
    OR target_goals IS NULL
    OR cardinality(target_goals) = 0
  );

-- 5) Trigger check simulation (inside a rolled-back transaction)
BEGIN;

  -- Test A: Set published -> should make is_published = true
  UPDATE public.courses SET status = 'published', deleted_at = NULL WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT 'Trigger Set Published Test:' AS test, is_published FROM public.courses WHERE id = '11111111-1111-1111-1111-111111111111';

  -- Test B: Set deleted_at timestamp -> should make is_published = false even if status is published
  UPDATE public.courses SET deleted_at = now() WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT 'Trigger Deleted_At Test:' AS test, is_published FROM public.courses WHERE id = '11111111-1111-1111-1111-111111111111';

ROLLBACK;

-- 6) Constraint check
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'courses'
  AND constraint_name IN (
    'chk_courses_level_allowed',
    'chk_courses_delivery_mode_allowed',
    'chk_courses_status_allowed',
    'chk_courses_published_metadata_minimum'
  );
