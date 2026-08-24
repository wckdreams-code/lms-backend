-- Immediate Full Rollback: Full Reversion including Column Deletions
-- File: BE/migrations/2026-07-23_hybrid_recommendation_immediate_full_rollback.sql
-- Warning: Only run directly after migration failed and BEFORE new code runs!

BEGIN;

-- 1) Drop trigger first, then function
DROP TRIGGER IF EXISTS trg_sync_course_is_published ON public.courses;
DROP FUNCTION IF EXISTS public.fn_sync_course_is_published();

-- 2) Restore course metadata from JSONB snapshot
UPDATE public.courses c
SET
  title = (b.snapshot->>'title'),
  description = (b.snapshot->>'description'),
  category = (b.snapshot->>'category'),
  price = (b.snapshot->>'price')::numeric,
  is_placement_test = (b.snapshot->>'is_placement_test')::boolean,
  thumbnail_url = (b.snapshot->>'thumbnail_url'),
  created_by = NULLIF(b.snapshot->>'created_by', '')::uuid,
  teacher_id = NULLIF(b.snapshot->>'teacher_id', '')::uuid,
  certificate_template_url = NULLIF(b.snapshot->>'certificate_template_url', ''),
  status = (b.snapshot->>'status'),
  is_published = (b.snapshot->>'is_published')::boolean,
  deleted_at = NULLIF(b.snapshot->>'deleted_at', '')::timestamptz,
  level = NULLIF(b.snapshot->>'level', ''),
  tags = COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(b.snapshot->'tags')
    ),
    '{}'::text[]
  ),
  difficulty_score = COALESCE((b.snapshot->>'difficulty_score')::integer, 1)
FROM internal_migrations.backup_courses_hybrid_rec_v1 b
WHERE c.id = b.course_id;

-- 3) Restore defaults for user_content_events based on original columns snapshot backup
DO $$
DECLARE
  d_duration text;
  d_metadata text;
BEGIN
  SELECT column_default INTO d_duration
  FROM internal_migrations.backup_uce_defaults_hybrid_rec_v1
  WHERE table_name = 'user_content_events' AND column_name = 'duration_seconds';

  SELECT column_default INTO d_metadata
  FROM internal_migrations.backup_uce_defaults_hybrid_rec_v1
  WHERE table_name = 'user_content_events' AND column_name = 'metadata';

  IF d_duration IS NULL THEN
    ALTER TABLE public.user_content_events ALTER COLUMN duration_seconds DROP DEFAULT;
  ELSE
    EXECUTE format('ALTER TABLE public.user_content_events ALTER COLUMN duration_seconds SET DEFAULT %s', d_duration);
  END IF;

  IF d_metadata IS NULL THEN
    ALTER TABLE public.user_content_events ALTER COLUMN metadata DROP DEFAULT;
  ELSE
    EXECUTE format('ALTER TABLE public.user_content_events ALTER COLUMN metadata SET DEFAULT %s', d_metadata);
  END IF;
END $$;

-- 4) Clean up constraints added to Courses and user_content_events
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS chk_courses_level_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_delivery_mode_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_status_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_published_metadata_minimum;

ALTER TABLE public.user_content_events
  DROP CONSTRAINT IF EXISTS chk_uce_duration_nonnegative;

-- 5) Drop added columns (ONLY safe if no new code is running!)
ALTER TABLE public.courses DROP COLUMN IF EXISTS target_goals;
ALTER TABLE public.courses DROP COLUMN IF EXISTS delivery_mode;
ALTER TABLE public.user_learning_profiles DROP COLUMN IF EXISTS preferred_goals;

-- 6) Drop backup tables & schema to revert completely
DROP TABLE IF EXISTS internal_migrations.backup_courses_hybrid_rec_v1;
DROP TABLE IF EXISTS internal_migrations.backup_uce_defaults_hybrid_rec_v1;
DROP SCHEMA IF EXISTS internal_migrations;

COMMIT;
