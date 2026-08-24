-- Exam attempts table for tracking student exam history and cooldown
-- Creates exam_attempts table to store all exam submissions
-- Enables retry cooldown (1 hour after failed attempt)

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score integer NOT NULL,
  is_passed boolean NOT NULL DEFAULT false,
  attempt_number integer NOT NULL DEFAULT 1,
  duration_seconds integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone DEFAULT now(),
  next_attempt_at timestamp with time zone,
  CONSTRAINT exam_attempts_pkey PRIMARY KEY (id)
);

-- Index for fast lookups: get latest attempt per user per course
CREATE INDEX IF NOT EXISTS exam_attempts_user_course_idx
  ON public.exam_attempts (user_id, course_id, finished_at DESC);
