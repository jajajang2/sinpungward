
CREATE TABLE public.temple_recommends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  lcr_name TEXT NOT NULL UNIQUE,
  gender TEXT,
  age_at_import INT,
  recommend_type TEXT NOT NULL CHECK (recommend_type IN ('REGULAR','LIMITED_USE')),
  expiry_month DATE,
  lcr_status_raw TEXT,
  last_imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temple_recommends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temple_recommends TO anon;
GRANT ALL ON public.temple_recommends TO service_role;
ALTER TABLE public.temple_recommends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage temple_recommends" ON public.temple_recommends FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_temple_recommends_updated BEFORE UPDATE ON public.temple_recommends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recommend_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommend_id UUID NOT NULL REFERENCES public.temple_recommends(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  interview_type TEXT CHECK (interview_type IN ('갱신','신규')),
  assigned_to TEXT CHECK (assigned_to IN ('감독','제1보좌','제2보좌')),
  assigned_by TEXT,
  status TEXT NOT NULL DEFAULT '미배정' CHECK (status IN ('미배정','배정됨','완료','보류')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommend_interviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommend_interviews TO anon;
GRANT ALL ON public.recommend_interviews TO service_role;
ALTER TABLE public.recommend_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage recommend_interviews" ON public.recommend_interviews FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_recommend_interviews_updated BEFORE UPDATE ON public.recommend_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_temple_recommends_expiry ON public.temple_recommends(expiry_month);
CREATE INDEX idx_recommend_interviews_recommend ON public.recommend_interviews(recommend_id);
