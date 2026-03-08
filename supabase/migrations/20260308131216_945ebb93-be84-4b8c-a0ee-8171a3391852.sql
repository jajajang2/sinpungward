
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Members table (회원 기본정보)
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('남', '여')),
  birth_date DATE,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for members" ON public.members FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Member family table (가족 정보)
CREATE TABLE public.member_family (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  name TEXT,
  relationship TEXT,
  phone TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_family ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for member_family" ON public.member_family FOR ALL USING (true) WITH CHECK (true);

-- Member church info (교회 정보)
CREATE TABLE public.member_church_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  record_number TEXT,
  baptism_date DATE,
  priesthood TEXT,
  current_calling TEXT,
  previous_callings TEXT,
  ministry_target TEXT,
  temple_recommend BOOLEAN DEFAULT false,
  sunday_school_class TEXT,
  missionary_work TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_church_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for member_church_info" ON public.member_church_info FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_member_church_info_updated_at
  BEFORE UPDATE ON public.member_church_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Member notes (구체적 기재 내용)
CREATE TABLE public.member_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for member_notes" ON public.member_notes FOR ALL USING (true) WITH CHECK (true);

-- Attendance table (출석 기록)
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, attendance_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Org positions (조직도 직책)
CREATE TABLE public.org_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  role TEXT NOT NULL,
  calling_keyword TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for org_positions" ON public.org_positions FOR ALL USING (true) WITH CHECK (true);

-- Insert default org structure (신풍와드 조직도)
INSERT INTO public.org_positions (section, role, calling_keyword, sort_order) VALUES
('감독단', '감독', '감독', 1),
('감독단', '1보좌', '1보좌', 2),
('감독단', '2보좌', '2보좌', 3),
('서기', '집행 서기', '집행 서기', 1),
('서기', '와드 서기', '와드 서기', 2),
('서기', '보조 서기', '보조 서기', 3),
('장로정원회', '회장', '장로정원회 회장', 1),
('장로정원회', '1보좌', '장로정원회 1보좌', 2),
('장로정원회', '2보좌', '장로정원회 2보좌', 3),
('장로정원회', '서기', '장로정원회 서기', 4),
('상호부조회', '회장', '상호부조회 회장', 1),
('상호부조회', '1보좌', '상호부조회 1보좌', 2),
('상호부조회', '2보좌', '상호부조회 2보좌', 3),
('상호부조회', '서기', '상호부조회 서기', 4),
('아론신권정원회', '회장', '아론신권정원회 회장', 1),
('아론신권정원회', '1보좌', '아론신권정원회 1보좌', 2),
('아론신권정원회', '2보좌', '아론신권정원회 2보좌', 3),
('청녀회', '회장', '청녀회 회장', 1),
('청녀회', '1보좌', '청녀회 1보좌', 2),
('청녀회', '2보좌', '청녀회 2보좌', 3),
('초등회', '회장', '초등회 회장', 1),
('초등회', '1보좌', '초등회 1보좌', 2),
('초등회', '2보좌', '초등회 2보좌', 3),
('주일학교', '회장', '주일학교 회장', 1),
('주일학교', '1보좌', '주일학교 1보좌', 2),
('주일학교', '2보좌', '주일학교 2보좌', 3),
('와드청년독신성인', '형제 지도자', '와드청년독신성인 형제 지도자', 1),
('와드청년독신성인', '자매 지도자', '와드청년독신성인 자매 지도자', 2);
