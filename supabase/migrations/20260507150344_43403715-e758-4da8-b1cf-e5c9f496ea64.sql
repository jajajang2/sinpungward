
-- 1. 관계 타입 enum
DO $$ BEGIN
  CREATE TYPE public.family_relation_type AS ENUM ('spouse', 'parent', 'child', 'sibling');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. member_relations 테이블
CREATE TABLE IF NOT EXISTS public.member_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  related_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation_type public.family_relation_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_relations_no_self CHECK (member_id <> related_member_id),
  CONSTRAINT member_relations_unique UNIQUE (member_id, related_member_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_member_relations_member ON public.member_relations(member_id);
CREATE INDEX IF NOT EXISTS idx_member_relations_related ON public.member_relations(related_member_id);

ALTER TABLE public.member_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for member_relations" ON public.member_relations;
CREATE POLICY "Allow all for member_relations" ON public.member_relations FOR ALL USING (true) WITH CHECK (true);

-- 3. 역방향 타입 매핑 함수
CREATE OR REPLACE FUNCTION public.reverse_relation_type(t public.family_relation_type)
RETURNS public.family_relation_type
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'spouse' THEN 'spouse'::public.family_relation_type
    WHEN 'sibling' THEN 'sibling'::public.family_relation_type
    WHEN 'parent' THEN 'child'::public.family_relation_type
    WHEN 'child' THEN 'parent'::public.family_relation_type
  END
$$;

-- 4. 양방향 동기화 + 형제 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.sync_member_relation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reverse_type public.family_relation_type;
BEGIN
  reverse_type := public.reverse_relation_type(NEW.relation_type);

  -- 1) 역방향 행 보장
  INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
  VALUES (NEW.related_member_id, NEW.member_id, reverse_type)
  ON CONFLICT (member_id, related_member_id, relation_type) DO NOTHING;

  -- 2) parent 관계 추가 시 형제 자동 생성
  --    NEW: A is parent of B  → B와 (A의 다른 child들)이 sibling
  IF NEW.relation_type = 'parent' THEN
    -- NEW.member_id 는 child, NEW.related_member_id 는 parent
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT NEW.member_id, mr.member_id, 'sibling'
    FROM public.member_relations mr
    WHERE mr.related_member_id = NEW.related_member_id
      AND mr.relation_type = 'parent'
      AND mr.member_id <> NEW.member_id
    ON CONFLICT DO NOTHING;
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT mr.member_id, NEW.member_id, 'sibling'
    FROM public.member_relations mr
    WHERE mr.related_member_id = NEW.related_member_id
      AND mr.relation_type = 'parent'
      AND mr.member_id <> NEW.member_id
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.relation_type = 'child' THEN
    -- NEW.member_id 는 parent, NEW.related_member_id 는 child
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT NEW.related_member_id, mr.related_member_id, 'sibling'
    FROM public.member_relations mr
    WHERE mr.member_id = NEW.member_id
      AND mr.relation_type = 'child'
      AND mr.related_member_id <> NEW.related_member_id
    ON CONFLICT DO NOTHING;
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT mr.related_member_id, NEW.related_member_id, 'sibling'
    FROM public.member_relations mr
    WHERE mr.member_id = NEW.member_id
      AND mr.relation_type = 'child'
      AND mr.related_member_id <> NEW.related_member_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_member_relation ON public.member_relations;
CREATE TRIGGER trg_sync_member_relation
AFTER INSERT ON public.member_relations
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation();

-- 5) 삭제 시 역방향도 같이 제거
CREATE OR REPLACE FUNCTION public.sync_member_relation_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.member_relations
  WHERE member_id = OLD.related_member_id
    AND related_member_id = OLD.member_id
    AND relation_type = public.reverse_relation_type(OLD.relation_type);
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_sync_member_relation_delete ON public.member_relations;
CREATE TRIGGER trg_sync_member_relation_delete
AFTER DELETE ON public.member_relations
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_delete();

-- 6) 기존 member_family 데이터를 회원 매칭 기준으로 백필
DO $$
DECLARE
  r RECORD;
  rel_norm public.family_relation_type;
BEGIN
  FOR r IN
    SELECT mf.member_id, mf.name, mf.relationship, m2.id AS related_id
    FROM public.member_family mf
    JOIN public.members m2 ON m2.name = mf.name
    WHERE mf.member_id <> m2.id
  LOOP
    rel_norm := NULL;
    IF r.relationship ILIKE '배우자%' OR r.relationship IN ('남편','아내') THEN
      rel_norm := 'spouse';
    ELSIF r.relationship IN ('아들','딸') THEN
      rel_norm := 'child';
    ELSIF r.relationship IN ('아버지','어머니') THEN
      rel_norm := 'parent';
    ELSIF r.relationship IN ('형','오빠','누나','언니','남동생','여동생','동생') THEN
      rel_norm := 'sibling';
    END IF;

    IF rel_norm IS NOT NULL THEN
      INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
      VALUES (r.member_id, r.related_id, rel_norm)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
