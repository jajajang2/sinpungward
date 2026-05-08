
CREATE OR REPLACE FUNCTION public.sync_member_relation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reverse_type public.family_relation_type;
BEGIN
  reverse_type := public.reverse_relation_type(NEW.relation_type);

  -- 1) 역방향 행 보장
  INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
  VALUES (NEW.related_member_id, NEW.member_id, reverse_type)
  ON CONFLICT (member_id, related_member_id, relation_type) DO NOTHING;

  -- 2) parent 관계 추가 시 형제 자동 생성
  IF NEW.relation_type = 'parent' THEN
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

    -- 2-b) child의 다른 부모(=NEW.related_member_id의 배우자)도 부모로 연결
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT NEW.member_id, sp.related_member_id, 'parent'
    FROM public.member_relations sp
    WHERE sp.member_id = NEW.related_member_id
      AND sp.relation_type = 'spouse'
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.relation_type = 'child' THEN
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

    -- 2-c) parent의 배우자도 child로 연결
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT sp.related_member_id, NEW.related_member_id, 'child'
    FROM public.member_relations sp
    WHERE sp.member_id = NEW.member_id
      AND sp.relation_type = 'spouse'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3) spouse 관계 추가 시: 한쪽의 자녀를 배우자에게도 연결
  IF NEW.relation_type = 'spouse' THEN
    -- A의 자녀를 B(=NEW.related_member_id)에게 child로 연결
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT NEW.related_member_id, ch.related_member_id, 'child'
    FROM public.member_relations ch
    WHERE ch.member_id = NEW.member_id
      AND ch.relation_type = 'child'
    ON CONFLICT DO NOTHING;
    -- B의 자녀를 A(=NEW.member_id)에게 child로 연결
    INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
    SELECT NEW.member_id, ch.related_member_id, 'child'
    FROM public.member_relations ch
    WHERE ch.member_id = NEW.related_member_id
      AND ch.relation_type = 'child'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $function$;

-- 기존 데이터 보정: 모든 spouse + child 조합으로 누락된 부모-자녀 관계 채우기
INSERT INTO public.member_relations (member_id, related_member_id, relation_type)
SELECT sp.related_member_id, ch.related_member_id, 'child'
FROM public.member_relations sp
JOIN public.member_relations ch
  ON ch.member_id = sp.member_id AND ch.relation_type = 'child'
WHERE sp.relation_type = 'spouse'
ON CONFLICT DO NOTHING;
