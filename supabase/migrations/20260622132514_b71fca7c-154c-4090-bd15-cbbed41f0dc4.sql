
CREATE TABLE public.sacrament_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL UNIQUE,
  event_type text NOT NULL DEFAULT '일반',
  event_custom_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_meetings TO anon;
GRANT ALL ON public.sacrament_meetings TO service_role;
ALTER TABLE public.sacrament_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sacrament_meetings all" ON public.sacrament_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sacrament_meetings_updated
  BEFORE UPDATE ON public.sacrament_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sacrament_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.sacrament_meetings(id) ON DELETE CASCADE,
  role text NOT NULL,
  slot int NOT NULL DEFAULT 0,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  custom_name text,
  hymn_number text,
  talk_topic text,
  talk_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, role, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacrament_assignments TO anon;
GRANT ALL ON public.sacrament_assignments TO service_role;
ALTER TABLE public.sacrament_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sacrament_assignments all" ON public.sacrament_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sacrament_assignments_updated
  BEFORE UPDATE ON public.sacrament_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sacrament_assignments_meeting ON public.sacrament_assignments(meeting_id);
CREATE INDEX idx_sacrament_assignments_member ON public.sacrament_assignments(member_id);
