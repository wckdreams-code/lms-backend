ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS offline_registration_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_offline_registration_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_offline_registration_id_fkey
    FOREIGN KEY (offline_registration_id)
    REFERENCES public.offline_registrations(id)
    ON DELETE SET NULL;
  END IF;
END $$;
