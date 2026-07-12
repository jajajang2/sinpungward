
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'families','family_members','recommend_interviews',
    'sacrament_meetings','sacrament_assignments',
    'teams','team_assignments','cleaning_schedule','temple_recommends'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format($f$CREATE POLICY "Authenticated users can manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)$f$, t);
  END LOOP;
END $$;
