-- Add primary key to class_configs (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.class_configs'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.class_configs ADD PRIMARY KEY (class_id);
  END IF;
END $$;

-- Enable RLS (no-op if already enabled)
ALTER TABLE public.class_configs ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth in this app yet)
DROP POLICY IF EXISTS "Anyone can read class configs" ON public.class_configs;
CREATE POLICY "Anyone can read class configs"
  ON public.class_configs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert class configs" ON public.class_configs;
CREATE POLICY "Anyone can insert class configs"
  ON public.class_configs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update class configs" ON public.class_configs;
CREATE POLICY "Anyone can update class configs"
  ON public.class_configs FOR UPDATE
  USING (true)
  WITH CHECK (true);