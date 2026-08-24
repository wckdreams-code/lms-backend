-- Offline class schedules table
-- Creates offline_class_schedules table to manage routine class schedules for offline registrations
-- Enforces 1 active schedule per offline registration

CREATE TABLE IF NOT EXISTS public.offline_class_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  offline_registration_id uuid NOT NULL REFERENCES public.offline_registrations(id) ON DELETE CASCADE,
  teacher_id uuid,
  day text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text NOT NULL DEFAULT 'LPIA Wisma Asri',
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT offline_class_schedules_pkey PRIMARY KEY (id)
);

-- Constraint: One offline_registration can only have one active schedule
CREATE UNIQUE INDEX IF NOT EXISTS offline_class_schedules_registration_active_idx
  ON public.offline_class_schedules (offline_registration_id)
  WHERE status = 'confirmed';

-- Index for fast lookups by registration id
CREATE INDEX IF NOT EXISTS offline_class_schedules_registration_idx
  ON public.offline_class_schedules (offline_registration_id);

-- Index for finding schedules by teacher
CREATE INDEX IF NOT EXISTS offline_class_schedules_teacher_idx
  ON public.offline_class_schedules (teacher_id);

-- Index for finding schedules by day
CREATE INDEX IF NOT EXISTS offline_class_schedules_day_idx
  ON public.offline_class_schedules (day);
