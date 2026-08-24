-- Migration: create_offline_class_schedules
-- Table untuk jadwal kelas offline (1 registrasi = 1 jadwal aktif)

CREATE TABLE IF NOT EXISTS offline_class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offline_registration_id uuid NOT NULL REFERENCES offline_registrations(id) ON DELETE CASCADE,
  teacher_id uuid NULL,
  day text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text NOT NULL DEFAULT 'LPIA Wisma Asri',
  notes text NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint: satu offline_registration hanya boleh punya satu jadwal aktif
CREATE UNIQUE INDEX uq_offline_schedule_active
  ON offline_class_schedules (offline_registration_id)
  WHERE status = 'confirmed';
