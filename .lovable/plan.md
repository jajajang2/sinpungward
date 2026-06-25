# 누락된 부모 관계 보정

`member_relations` 테이블에 아래 `child` 관계 4건을 INSERT 합니다. 트리거(`sync_member_relation`)가 자동으로 역방향 `parent`, 형제(sibling), 배우자→자녀 연결까지 처리해 주므로 한 줄씩만 넣으면 충분합니다.

## 추가할 관계

| 부모 | → 자녀 | 비고 |
|---|---|---|
| 박호형 | 박이린 | 배우자(강세희)에게도 자동으로 child 연결됨 |
| 이인주 | 최연후 | 엄마만 (아빠 없음) |
| 구슬아 | 김우찬 | 엄마만 (아빠 없음) |

박호형↔강세희가 이미 spouse로 연결돼 있다는 전제 — 트리거가 강세희에게도 박이린을 자녀로 자동 추가합니다. 만약 spouse 관계가 없다면 박이린 ↔ 강세희도 별도로 한 줄 추가해야 합니다 (확인 후 처리).

## 실행 SQL (insert 도구 사용)

```sql
INSERT INTO public.member_relations (member_id, related_member_id, relation_type) VALUES
  ('f0df4d36-6dc1-45e9-a3fa-9f861c0173de', '2c9dd393-c911-4d2b-9ce2-cc0b980cfea0', 'child'), -- 박호형 → 박이린
  ('97c76201-6ff3-4bd6-8be7-9953da3fd9a6', '85efbeae-76c0-4c0b-941e-84a74b35c5e2', 'child'), -- 이인주 → 최연후
  ('4581c578-a05c-4d36-aa79-cb4cc9ec13d3', '0919dadd-2452-4e3a-bd6e-ed1a1447199e', 'child')  -- 구슬아  → 김우찬
ON CONFLICT (member_id, related_member_id, relation_type) DO NOTHING;
```

## 사후 처리

1. INSERT 후 박호형-강세희 spouse 관계 유무 확인. 없으면 박이린에 대해 강세희 child 관계도 추가.
2. `/cleaning` 페이지에서 **"가족 재구성"** 버튼을 눌러 `rebuildFamilies()` 재실행 → 박이린/최연후/김우찬이 부모 가족으로 합쳐지는지 확인.
