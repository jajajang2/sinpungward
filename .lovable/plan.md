## Goal
업로드한 PDF "성전 추천서 상태 (만료회원 포함)" 154행을 `temple_recommends` 테이블에 넣고, 가능한 한 기존 `members` 회원과 자동 연결한다. 현재 `temple_recommends`는 비어 있으므로 새로 삽입한다.

## Data mapping (PDF → temple_recommends 컬럼)
- 이름 → `lcr_name` (PDF 원문 그대로, 예: "김 백희")
- 성별 → `gender` ("남성"/"여성")
- 나이 → `age_at_import`
- 추천서 유형 → `recommend_type` ("성전 추천서" — 전원 정규, 청소년(제한사용) 명단은 이 PDF에 없음)
- 상태 → `lcr_status_raw` (원문: 활동적 / 만료됨 / 만료 예정 / 발급됨)
- 만료 YYYY-MM → `expiry_month` (해당 월 1일 date, 빈 값은 NULL)
- `last_imported_at` = now()

앱에서 표시되는 상태/색상은 이미 `templeRecommendStatus.ts`가 오늘 날짜와 `expiry_month`로 재계산하므로 원본 상태 문자열은 참고용으로만 저장한다.

## Member 자동 매칭 규칙
1. `lcr_name`을 공백 제거·소문자로 정규화한 값이 `members.name` 정규화 값과 정확히 일치.
2. 후보가 1명이면 그대로 `member_id`에 연결.
3. 후보가 여러 명(예: "김 병현" 2명)이면 `gender`가 같고 `members.birth_date`로 계산한 만 나이(2026-07-01 기준)가 PDF `age`와 ±1년 이내인 유일한 회원에 연결. 그래도 유일하지 않으면 `member_id`는 NULL로 두고 NonHoldersView "매칭 필요" 목록에 뜨게 한다.
4. 영문 이름·외국인 이름(예: Heo Abby, Palomera Sandoval Leon Felipe, 엘레나 주바산, 타노 알렉스 리) 등 매칭 실패 건도 NULL로 두고 수동 매칭에 맡긴다.

## 실행 방식
- 154행을 단일 SQL 마이그레이션 대신 `supabase--insert` 한 번으로 `INSERT INTO public.temple_recommends (...) VALUES (...), (...);` 벌크 삽입.
- 매칭은 서브쿼리로: `member_id = (SELECT id FROM members m WHERE regexp_replace(m.name,'\s','','g') = '김백희' AND ...)` 형태. 단순화를 위해 CTE로 후보 목록을 만들고 `LEFT JOIN LATERAL`로 유일 후보만 채운다.

## 검증
- 삽입 후 `SELECT count(*) FROM temple_recommends` = 154 확인.
- `SELECT count(*) FROM temple_recommends WHERE member_id IS NOT NULL` 로 자동 매칭 성공 수 확인.
- 앱에서:
  - "김 원석 2026-07" → 긴급
  - "김 용기 2026-08" → 긴급
  - "최 민석 28 2027-11" → 활동적
  - "김 백희 2027-11" → 활동적, member_id 매칭됨
  - "김 병현" 2명 → 나이로 각각 30세/61세 회원에 매칭
  - 미소지자 명단 탭에서 대상이 정상 필터되는지 확인.

## 확인 요청
1. PDF에 청소년(제한사용) 추천서는 없다. 전부 `recommend_type = "성전 추천서"`(정규)로 저장하면 되는지?
2. 원본 "발급됨"(권 영민)·"만료 예정" 상태 문자열은 `lcr_status_raw`에만 저장하고, 화면 표시는 앱의 오늘 날짜 기준 재계산 로직을 그대로 사용해도 되는지?

이 두 가지가 OK면 위 방식대로 154행을 넣는다.
