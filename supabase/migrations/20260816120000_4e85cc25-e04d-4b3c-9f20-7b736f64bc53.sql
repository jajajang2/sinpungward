CREATE TABLE public.full_time_missionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('elder','sister')),
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_full_time_missionaries_type_sort ON public.full_time_missionaries(type, sort_order);

ALTER TABLE public.full_time_missionaries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.full_time_missionaries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.full_time_missionaries TO authenticated;
GRANT ALL ON public.full_time_missionaries TO service_role;

CREATE POLICY "Public access full_time_missionaries"
ON public.full_time_missionaries
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_full_time_missionaries_updated_at
BEFORE UPDATE ON public.full_time_missionaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
