
CREATE TABLE public.curriculum_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  fact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum facts"
  ON public.curriculum_facts
  FOR SELECT
  USING (true);
