
-- Restrict access to sensitive tables to authenticated users only.

-- families
DROP POLICY IF EXISTS "Public access families" ON public.families;
REVOKE ALL ON public.families FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
CREATE POLICY "Authenticated users can access families"
  ON public.families FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- family_members
DROP POLICY IF EXISTS "Public access family_members" ON public.family_members;
REVOKE ALL ON public.family_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
CREATE POLICY "Authenticated users can access family_members"
  ON public.family_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- recommend_interviews
DROP POLICY IF EXISTS "Public access recommend_interviews" ON public.recommend_interviews;
REVOKE ALL ON public.recommend_interviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommend_interviews TO authenticated;
GRANT ALL ON public.recommend_interviews TO service_role;
CREATE POLICY "Authenticated users can access recommend_interviews"
  ON public.recommend_interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sacrament_meetings
DROP POLICY IF EXISTS "Public access sacrament_meetings" ON public.sacrament_meetings;
REVOKE ALL ON public.sacrament_meetings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_meetings TO authenticated;
GRANT ALL ON public.sacrament_meetings TO service_role;
CREATE POLICY "Authenticated users can access sacrament_meetings"
  ON public.sacrament_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sacrament_assignments
DROP POLICY IF EXISTS "Public access sacrament_assignments" ON public.sacrament_assignments;
REVOKE ALL ON public.sacrament_assignments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_assignments TO authenticated;
GRANT ALL ON public.sacrament_assignments TO service_role;
CREATE POLICY "Authenticated users can access sacrament_assignments"
  ON public.sacrament_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- teams
DROP POLICY IF EXISTS "Public access teams" ON public.teams;
REVOKE ALL ON public.teams FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
CREATE POLICY "Authenticated users can access teams"
  ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- team_assignments
DROP POLICY IF EXISTS "Public access team_assignments" ON public.team_assignments;
REVOKE ALL ON public.team_assignments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_assignments TO authenticated;
GRANT ALL ON public.team_assignments TO service_role;
CREATE POLICY "Authenticated users can access team_assignments"
  ON public.team_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cleaning_schedule
DROP POLICY IF EXISTS "Public access cleaning_schedule" ON public.cleaning_schedule;
REVOKE ALL ON public.cleaning_schedule FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_schedule TO authenticated;
GRANT ALL ON public.cleaning_schedule TO service_role;
CREATE POLICY "Authenticated users can access cleaning_schedule"
  ON public.cleaning_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- temple_recommends
DROP POLICY IF EXISTS "Public access temple_recommends" ON public.temple_recommends;
REVOKE ALL ON public.temple_recommends FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temple_recommends TO authenticated;
GRANT ALL ON public.temple_recommends TO service_role;
CREATE POLICY "Authenticated users can access temple_recommends"
  ON public.temple_recommends FOR ALL TO authenticated USING (true) WITH CHECK (true);
