-- Safe Rollback: Restore Courses Metadata from JSON Snapshot
-- File: BE/migrations/2026-07-23_hybrid_recommendation_safe_rollback.sql
-- Default safe recovery plan. Keeps columns and backup tables intact.

BEGIN;

-- 1) Drop trigger first, then function to prevent trigger interception
DROP TRIGGER IF EXISTS trg_sync_course_is_published ON public.courses;
DROP FUNCTION IF EXISTS public.fn_sync_course_is_published();

-- 2) Restore original course metadata based on immutable JSONB snapshot per ID
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

-- 3) Clean up constraints added to Courses
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS chk_courses_level_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_delivery_mode_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_status_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_published_metadata_minimum;

-- 4) Clean up constraint on user_content_events
ALTER TABLE public.user_content_events
  DROP CONSTRAINT IF EXISTS chk_uce_duration_nonnegative;

-- Note: Safe rollback retains columns and backup tables to avoid breaking
-- running code that expects these schema fields.

COMMIT;
