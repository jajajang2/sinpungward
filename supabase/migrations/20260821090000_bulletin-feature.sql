-- 주보(공지용) 주별 필드
CREATE TABLE public.bulletin_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL UNIQUE,
  image_url text,
  scripture_text text NOT NULL DEFAULT '',
  address_text text NOT NULL DEFAULT '',
  arrival_note_text text NOT NULL DEFAULT '경건한 모임을 위해 모임 10분 전 도착',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bulletin_notices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_notices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_notices TO authenticated;
GRANT ALL ON public.bulletin_notices TO service_role;
CREATE POLICY "Public access bulletin_notices" ON public.bulletin_notices FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_bulletin_notices_updated_at BEFORE UPDATE ON public.bulletin_notices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 주보(공지용) 광고 목록
CREATE TABLE public.bulletin_notice_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.bulletin_notices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bulletin_notice_announcements_notice ON public.bulletin_notice_announcements(notice_id, sort_order);
ALTER TABLE public.bulletin_notice_announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_notice_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_notice_announcements TO authenticated;
GRANT ALL ON public.bulletin_notice_announcements TO service_role;
CREATE POLICY "Public access bulletin_notice_announcements" ON public.bulletin_notice_announcements FOR ALL USING (true) WITH CHECK (true);

-- 주보(감독단용) 주차 앵커
CREATE TABLE public.bulletin_bishopric (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bulletin_bishopric ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_bishopric TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_bishopric TO authenticated;
GRANT ALL ON public.bulletin_bishopric TO service_role;
CREATE POLICY "Public access bulletin_bishopric" ON public.bulletin_bishopric FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_bulletin_bishopric_updated_at BEFORE UPDATE ON public.bulletin_bishopric
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 주보(감독단용) 광고 목록 (공지용과 독립)
CREATE TABLE public.bulletin_bishopric_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bishopric_id uuid NOT NULL REFERENCES public.bulletin_bishopric(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bulletin_bishopric_announcements_bishopric ON public.bulletin_bishopric_announcements(bishopric_id, sort_order);
ALTER TABLE public.bulletin_bishopric_announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_bishopric_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_bishopric_announcements TO authenticated;
GRANT ALL ON public.bulletin_bishopric_announcements TO service_role;
CREATE POLICY "Public access bulletin_bishopric_announcements" ON public.bulletin_bishopric_announcements FOR ALL USING (true) WITH CHECK (true);

-- 주보(감독단용) 와드행사: 해임/부름/기타
CREATE TABLE public.bulletin_ward_business (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bishopric_id uuid NOT NULL REFERENCES public.bulletin_bishopric(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('해임','부름','기타')),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  custom_name text,
  note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bulletin_ward_business_bishopric ON public.bulletin_ward_business(bishopric_id, category, sort_order);
ALTER TABLE public.bulletin_ward_business ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_ward_business TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_ward_business TO authenticated;
GRANT ALL ON public.bulletin_ward_business TO service_role;
CREATE POLICY "Public access bulletin_ward_business" ON public.bulletin_ward_business FOR ALL USING (true) WITH CHECK (true);

-- 주보(공지용) 사진 업로드용 스토리지 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletin-photos', 'bulletin-photos', true);

CREATE POLICY "Public read for bulletin photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bulletin-photos');

CREATE POLICY "Allow upload for bulletin photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bulletin-photos');

CREATE POLICY "Allow update for bulletin photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bulletin-photos');

CREATE POLICY "Allow delete for bulletin photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'bulletin-photos');
