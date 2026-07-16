
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['families','family_members','recommend_interviews','sacrament_meetings','sacrament_assignments','teams','team_assignments','cleaning_schedule','temple_recommends']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can access %I" ON public.%I', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY "Public access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
