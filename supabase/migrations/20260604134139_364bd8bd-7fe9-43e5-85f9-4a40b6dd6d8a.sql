
-- Enums
CREATE TYPE public.family_role AS ENUM ('head','spouse','child','single');
CREATE TYPE public.team_assign_method AS ENUM ('auto','manual');

-- families
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  display_name_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT ON public.families TO anon;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "families all" ON public.families FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- family_members
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id uuid NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  family_role public.family_role NOT NULL DEFAULT 'child',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX family_members_family_id_idx ON public.family_members(family_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT ON public.family_members TO anon;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members all" ON public.family_members FOR ALL USING (true) WITH CHECK (true);

-- teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_fixed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT ON public.teams TO anon;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams all" ON public.teams FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.teams (code, name, is_fixed, sort_order) VALUES
  ('A','감독단', true, 0),
  ('B','B조', false, 1),
  ('C','C조', false, 2),
  ('D','D조', false, 3),
  ('E','E조', false, 4);

-- team_assignments
CREATE TABLE public.team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  family_id uuid NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  assigned_method public.team_assign_method NOT NULL DEFAULT 'manual',
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_assignments_team_id_idx ON public.team_assignments(team_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_assignments TO authenticated;
GRANT SELECT ON public.team_assignments TO anon;
GRANT ALL ON public.team_assignments TO service_role;
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_assignments all" ON public.team_assignments FOR ALL USING (true) WITH CHECK (true);

-- cleaning_schedule
CREATE TABLE public.cleaning_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clean_date date NOT NULL UNIQUE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- enforce Saturday via trigger (CHECK must be immutable; EXTRACT is fine but use trigger per project guidance)
CREATE OR REPLACE FUNCTION public.validate_saturday() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXTRACT(DOW FROM NEW.clean_date) <> 6 THEN
    RAISE EXCEPTION '청소 일정은 토요일만 가능합니다 (got %)', NEW.clean_date;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cleaning_schedule_saturday BEFORE INSERT OR UPDATE ON public.cleaning_schedule
  FOR EACH ROW EXECUTE FUNCTION public.validate_saturday();
CREATE TRIGGER cleaning_schedule_updated_at BEFORE UPDATE ON public.cleaning_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_schedule TO authenticated;
GRANT SELECT ON public.cleaning_schedule TO anon;
GRANT ALL ON public.cleaning_schedule TO service_role;
ALTER TABLE public.cleaning_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_schedule all" ON public.cleaning_schedule FOR ALL USING (true) WITH CHECK (true);
