-- Migration: Setup Hybrid Recommendation (Layer 1 CBF)
-- File: BE/migrations/2026-07-23_hybrid_recommendation_setup.sql
-- Type: Transactional, Re-run Protected, Immutable Backup, Fail-fast

BEGIN;

-- =============================================================================
-- 0. Internal migration schema for immutable backups
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS internal_migrations;

REVOKE ALL ON SCHEMA internal_migrations FROM PUBLIC;
REVOKE ALL ON SCHEMA internal_migrations FROM anon;
REVOKE ALL ON SCHEMA internal_migrations FROM authenticated;

-- =============================================================================
-- 1. Immutable backup tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS internal_migrations.backup_courses_hybrid_rec_v1 (
  course_id uuid PRIMARY KEY,
  snapshot jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_migrations.backup_uce_defaults_hybrid_rec_v1 (
  table_name text NOT NULL,
  column_name text NOT NULL,
  column_default text,
  is_nullable text NOT NULL,
  data_type text NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_uce_defaults_hybrid_rec_v1_pk
    PRIMARY KEY (table_name, column_name)
);

-- Fail-fast if backups already contain data (immutable guard)
DO $$
DECLARE
  cb integer;
  db integer;
BEGIN
  SELECT count(*) INTO cb FROM internal_migrations.backup_courses_hybrid_rec_v1;
  IF cb > 0 THEN
    RAISE EXCEPTION 'Migration aborted: backup_courses_hybrid_rec_v1 already contains % rows. This migration has already been applied.', cb;
  END IF;

  SELECT count(*) INTO db FROM internal_migrations.backup_uce_defaults_hybrid_rec_v1;
  IF db > 0 THEN
    RAISE EXCEPTION 'Migration aborted: backup_uce_defaults_hybrid_rec_v1 already contains % rows.', db;
  END IF;
END $$;

-- =============================================================================
-- 2. Preflight validation
-- =============================================================================
DO $$
DECLARE
  found_targets integer;
  total_courses integer;
  existing_statuses text;
  existing_categories text;
BEGIN
  -- 2a. Required tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='courses') THEN
    RAISE EXCEPTION 'Preflight failed: public.courses does not exist.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_content_events') THEN
    RAISE EXCEPTION 'Preflight failed: public.user_content_events does not exist.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_learning_profiles') THEN
    RAISE EXCEPTION 'Preflight failed: public.user_learning_profiles does not exist.';
  END IF;

  -- 2b. JOIN target IDs against live courses — must find exactly 7
  WITH target_ids(id) AS (
    VALUES
      ('45d44154-2a05-48a6-b9a2-2fcf0dab4abe'::uuid),
      ('e047cbd5-953b-417a-a1bd-7abde174b9b5'::uuid),
      ('2d7e20b0-7592-4fa7-b27f-41acddecfefc'::uuid),
      ('3bac14bc-2af2-4ec8-a60d-8de108f6142f'::uuid),
      ('7ae37933-5482-42be-bde9-7a99260fc20f'::uuid),
      ('11111111-1111-1111-1111-111111111111'::uuid),
      ('c4a802df-87a0-4bd7-8aeb-d146a52d4f4e'::uuid)
  )
  SELECT count(*) INTO found_targets
  FROM target_ids t
  JOIN public.courses c ON c.id = t.id;

  IF found_targets <> 7 THEN
    RAISE EXCEPTION 'Preflight failed: expected 7 target courses in DB, found %.', found_targets;
  END IF;

  -- 2c. Record total and current values for audit
  SELECT count(*) INTO total_courses FROM public.courses;
  RAISE NOTICE 'Preflight: total courses = %', total_courses;

  SELECT string_agg(DISTINCT COALESCE(status, '(null)'), ', ' ORDER BY COALESCE(status, '(null)'))
    INTO existing_statuses FROM public.courses;
  RAISE NOTICE 'Preflight: existing statuses = %', existing_statuses;

  SELECT string_agg(DISTINCT COALESCE(category, '(null)'), ', ' ORDER BY COALESCE(category, '(null)'))
    INTO existing_categories FROM public.courses;
  RAISE NOTICE 'Preflight: existing categories = %', existing_categories;
END $$;

-- =============================================================================
-- 3. Take JSONB snapshot BEFORE any structural changes
-- =============================================================================
INSERT INTO internal_migrations.backup_courses_hybrid_rec_v1 (course_id, snapshot)
SELECT c.id, to_jsonb(c)
FROM public.courses c;

INSERT INTO internal_migrations.backup_uce_defaults_hybrid_rec_v1
  (table_name, column_name, column_default, is_nullable, data_type)
SELECT
  cols.table_name, cols.column_name, cols.column_default, cols.is_nullable, cols.data_type
FROM information_schema.columns cols
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'user_content_events'
  AND cols.column_name IN ('duration_seconds', 'metadata')
ORDER BY cols.column_name;

-- =============================================================================
-- 4. Structural changes (idempotent ALTERs)
-- =============================================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS target_goals text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS delivery_mode text;

ALTER TABLE public.user_learning_profiles
  ADD COLUMN IF NOT EXISTS preferred_goals text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.user_content_events
  ALTER COLUMN duration_seconds SET DEFAULT 0,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- =============================================================================
-- 5. Publication compatibility trigger
--    Canonical source of truth: status + deleted_at
--    is_published is a compatibility mirror only
--    Fires on INSERT, UPDATE OF status, and UPDATE OF deleted_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_course_is_published()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.deleted_at IS NULL THEN
    NEW.is_published := true;
  ELSE
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_is_published ON public.courses;

CREATE TRIGGER trg_sync_course_is_published
BEFORE INSERT OR UPDATE OF status, deleted_at ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_course_is_published();

-- =============================================================================
-- 6. Targeted backfill per course ID using CTE VALUES
-- =============================================================================
WITH target_metadata AS (
  SELECT * FROM (VALUES
    ('45d44154-2a05-48a6-b9a2-2fcf0dab4abe'::uuid, 'komputer'::text, 'online'::text, 'intermediate'::text, ARRAY['social-media','marketing','tiktok']::text[], ARRAY['cari_kerja','freelance']::text[], 2::int, 'published'::text),
    ('e047cbd5-953b-417a-a1bd-7abde174b9b5'::uuid, 'bahasa',          'online',        'beginner',          ARRAY['bahasa','jepang','hiragana','katakana'],       ARRAY['hobi','persiapan_tes'],                       1,        'published'),
    ('2d7e20b0-7592-4fa7-b27f-41acddecfefc'::uuid, 'bahasa',          'offline',       'beginner',          ARRAY['bahasa','inggris','grammar'],                  ARRAY['cari_kerja','akademik'],                      1,        'published'),
    ('3bac14bc-2af2-4ec8-a60d-8de108f6142f'::uuid, 'komputer',        'offline',       'beginner',          ARRAY['komputer','programming','html','css','javascript'], ARRAY['cari_kerja','akademik'],                 1,        'published'),
    ('7ae37933-5482-42be-bde9-7a99260fc20f'::uuid, 'komputer',        'online',        'intermediate',      ARRAY['komputer','programming','code'],               ARRAY['cari_kerja','freelance'],                     2,        'published'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'komputer',        'online',        'beginner',          '{}'::text[],                                         '{}'::text[],                                        1,        'draft'),
    ('c4a802df-87a0-4bd7-8aeb-d146a52d4f4e'::uuid, 'pengembangan_diri','online',       'beginner',          '{}'::text[],                                         '{}'::text[],                                        1,        'draft')
  ) AS v(id, category, delivery_mode, level, tags, target_goals, difficulty_score, status)
)
UPDATE public.courses c
SET
  category         = t.category,
  delivery_mode    = t.delivery_mode,
  level            = t.level,
  tags             = t.tags,
  target_goals     = t.target_goals,
  difficulty_score = t.difficulty_score,
  status           = t.status
  -- is_published is set automatically by the trigger
FROM target_metadata t
WHERE c.id = t.id;

-- =============================================================================
-- 7. Controlled-value constraints
--    Category is intentionally left unconstrained (dynamic taxonomy).
--    event_type and content_type constraints deferred to Behavior Tracking task.
-- =============================================================================
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS chk_courses_level_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_delivery_mode_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_status_allowed,
  DROP CONSTRAINT IF EXISTS chk_courses_published_metadata_minimum;

ALTER TABLE public.courses
  ADD CONSTRAINT chk_courses_level_allowed
    CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.courses
  ADD CONSTRAINT chk_courses_delivery_mode_allowed
    CHECK (delivery_mode IS NULL OR delivery_mode IN ('online', 'offline', 'hybrid'));

ALTER TABLE public.courses
  ADD CONSTRAINT chk_courses_status_allowed
    CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.courses
  ADD CONSTRAINT chk_courses_published_metadata_minimum
    CHECK (
      status <> 'published'
      OR (
        deleted_at IS NULL
        AND category IS NOT NULL
        AND level IS NOT NULL
        AND delivery_mode IS NOT NULL
        AND tags IS NOT NULL AND cardinality(tags) > 0
        AND target_goals IS NOT NULL AND cardinality(target_goals) > 0
      )
    );

ALTER TABLE public.user_content_events
  DROP CONSTRAINT IF EXISTS chk_uce_duration_nonnegative;

ALTER TABLE public.user_content_events
  ADD CONSTRAINT chk_uce_duration_nonnegative
    CHECK (duration_seconds >= 0);

-- =============================================================================
-- 8. Postflight validation
-- =============================================================================
DO $$
DECLARE
  total_courses    integer;
  backup_courses   integer;
  target_count     integer;
  pub_count        integer;
  dummy_count      integer;
  sync_violations  integer;
  meta_violations  integer;
  constraint_count integer;
  pg_present       integer;
BEGIN
  -- 8a. Total course count unchanged
  SELECT count(*) INTO total_courses FROM public.courses;
  SELECT count(*) INTO backup_courses FROM internal_migrations.backup_courses_hybrid_rec_v1;
  IF total_courses <> backup_courses THEN
    RAISE EXCEPTION 'Postflight failed: course count changed (now=% / backup=%).', total_courses, backup_courses;
  END IF;

  -- 8b. All seven target IDs remain present exactly once
  WITH target_ids(id) AS (
    VALUES
      ('45d44154-2a05-48a6-b9a2-2fcf0dab4abe'::uuid),
      ('e047cbd5-953b-417a-a1bd-7abde174b9b5'::uuid),
      ('2d7e20b0-7592-4fa7-b27f-41acddecfefc'::uuid),
      ('3bac14bc-2af2-4ec8-a60d-8de108f6142f'::uuid),
      ('7ae37933-5482-42be-bde9-7a99260fc20f'::uuid),
      ('11111111-1111-1111-1111-111111111111'::uuid),
      ('c4a802df-87a0-4bd7-8aeb-d146a52d4f4e'::uuid)
  )
  SELECT count(*) INTO target_count
  FROM target_ids t
  JOIN public.courses c ON c.id = t.id;

  IF target_count <> 7 THEN
    RAISE EXCEPTION 'Postflight failed: expected all 7 target courses, found %.', target_count;
  END IF;

  -- 8c. Exactly 5 production courses published
  SELECT count(*) INTO pub_count
  FROM public.courses
  WHERE id IN (
    '45d44154-2a05-48a6-b9a2-2fcf0dab4abe',
    'e047cbd5-953b-417a-a1bd-7abde174b9b5',
    '2d7e20b0-7592-4fa7-b27f-41acddecfefc',
    '3bac14bc-2af2-4ec8-a60d-8de108f6142f',
    '7ae37933-5482-42be-bde9-7a99260fc20f'
  ) AND status = 'published' AND is_published = true;
  IF pub_count <> 5 THEN
    RAISE EXCEPTION 'Postflight failed: expected 5 published courses, got %.', pub_count;
  END IF;

  -- 8d. Exactly 2 dummy courses draft/unpublished
  SELECT count(*) INTO dummy_count
  FROM public.courses
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    'c4a802df-87a0-4bd7-8aeb-d146a52d4f4e'
  ) AND status = 'draft' AND is_published = false;
  IF dummy_count <> 2 THEN
    RAISE EXCEPTION 'Postflight failed: expected 2 dummy draft courses, got %.', dummy_count;
  END IF;

  -- 8e. status <-> is_published sync
  SELECT count(*) INTO sync_violations
  FROM public.courses
  WHERE (status = 'published' AND deleted_at IS NULL AND is_published IS DISTINCT FROM true)
     OR (NOT (status = 'published' AND deleted_at IS NULL) AND is_published IS DISTINCT FROM false);
  IF sync_violations > 0 THEN
    RAISE EXCEPTION 'Postflight failed: % courses have status/is_published out of sync.', sync_violations;
  END IF;

  -- 8f. Published courses have minimum metadata (tags/target_goals NOT NULL and non-empty)
  SELECT count(*) INTO meta_violations
  FROM public.courses
  WHERE status = 'published' AND (
    deleted_at IS NOT NULL
    OR category IS NULL
    OR level IS NULL
    OR delivery_mode IS NULL
    OR tags IS NULL OR cardinality(tags) = 0
    OR target_goals IS NULL OR cardinality(target_goals) = 0
  );
  IF meta_violations > 0 THEN
    RAISE EXCEPTION 'Postflight failed: % published courses missing minimum metadata.', meta_violations;
  END IF;

  -- 8g. preferred_goals column exists
  SELECT count(*) INTO pg_present
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_learning_profiles' AND column_name = 'preferred_goals';
  IF pg_present <> 1 THEN
    RAISE EXCEPTION 'Postflight failed: preferred_goals column missing from user_learning_profiles.';
  END IF;

  -- 8g. Constraints created
  SELECT count(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'courses'
    AND constraint_name IN (
      'chk_courses_level_allowed',
      'chk_courses_delivery_mode_allowed',
      'chk_courses_status_allowed',
      'chk_courses_published_metadata_minimum'
    );
  IF constraint_count < 4 THEN
    RAISE EXCEPTION 'Postflight failed: expected 4 course constraints, found %.', constraint_count;
  END IF;

  RAISE NOTICE 'Postflight validation PASSED. All checks succeeded.';
END $$;

COMMIT;
