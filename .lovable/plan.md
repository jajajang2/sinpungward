## 청소조 배정 모듈 추가 계획

기존 회원/출석/조직도 기능은 그대로 두고, "청소조" 도메인을 새 페이지(`/cleaning`)와 새 테이블 4종으로 추가합니다.

---

### 1. DB 스키마 (마이그레이션 1회)

새 테이블:

- `families`
  - `id`, `head_member_id`(uuid, members FK, nullable), `display_name_override`(text, nullable), `created_at`, `updated_at`
- `family_members` (members ↔ families 매핑)
  - `family_id`, `member_id`(unique), `family_role` enum: `head | spouse | child | single`
  - 한 회원은 한 가족에만 속함 (member_id UNIQUE)
- `teams`
  - `id`, `code`(A~E, unique), `name`, `is_fixed`(bool), `sort_order`
  - 시드: A(감독단, is_fixed=true), B/C/D/E 가족조
- `team_assignments`
  - `id`, `team_id`, `family_id`(unique), `assigned_method` enum: `auto | manual`, `assigned_at`
  - family_id UNIQUE → 가족은 동시에 한 조에만 속함
- `cleaning_schedule`
  - `id`, `clean_date`(date, unique, CHECK: 토요일만), `team_id`, `note`, `created_at`, `updated_at`

전부 RLS 활성화 + `authenticated`에 CRUD GRANT, `service_role` ALL, 공개 읽기는 `anon SELECT`로 허용(현재 앱 패턴과 동일하게).

`members.family_id`는 추가하지 않고 `family_members` 조인 테이블로 분리 — 이미 존재하는 `member_relations`와 충돌 없이 청소조 전용 그룹핑을 유지.

### 2. 가족 자동 시딩(1회 마이그레이션 후 UI에서 "가족 재계산" 버튼)

`member_relations`(spouse/parent/child) 그래프의 연결 컴포넌트별로 1개 family 생성:

- 남성 spouse가 있으면 그를 head, 여성 배우자는 spouse
- 남성 단독 성인 → head(single 가족 아님: 단독 형제)
- 여성 단독 성인 → head, role=single
- 자녀(birth_date 기준 미성년 또는 marriage_date 없는 자녀)는 부모 가족에 child
- 결혼한 자녀는 자기 가족으로 분리

마이그레이션은 스키마만 만들고, 실제 시딩은 화면의 "가족 자동 구성" 버튼에서 위 로직을 실행해 `families`/`family_members`에 upsert.

### 3. 화면 (`/cleaning`, 사이드바 "청소조" 항목 추가)

탭 3개:

#### 탭 A — 청소 일정
- 월간 토요일 캘린더 + 리스트 뷰 토글
- 상단 생성 폼: `시작일`, `종료일`, `연속 주 수 N`(기본 2), `순환 순서`(기본 B,C,D,E,A — 드래그 정렬, A 포함 토글)
- "일정 생성" 버튼 → 클라이언트에서 토요일 enumerate 후 패턴 [t0×N, t1×N, …] 순환 적용해 `cleaning_schedule`에 upsert(기존 같은 날짜는 덮어쓸지 확인 다이얼로그)
- 각 토요일 셀에서 담당 조 드롭다운으로 수동 변경 가능
- 모바일에서는 리스트가 기본

#### 탭 B — 조 편성 (드래그&드롭)
- 상단 액션: `[자동 배분]` `[전체 초기화]` `[감독단 칼링 자동 채우기]`
- 좌측 컬럼: "미배정 가족" 검색 가능 리스트
- 우측: A/B/C/D/E 5개 조 컬럼(@dnd-kit/core 사용, 모바일 터치 지원)
- A조는 `is_fixed` 표시. 자동 배분 버튼은 B~E만 다룸
- "감독단 칼링 자동 채우기": `member_church_info.current_calling`에 감독/1상담/2상담/서기 포함된 회원의 family를 A로 이동(수동으로도 옮길 수 있음)

자동 배분 로직(클라이언트):
1. 출석 기준 날짜 범위 = 가족 내 가장 이른 `first_attended_at` (= attendance에서 해당 가족 멤버들의 가장 이른 출석일) → 오늘
2. 분모 = 같은 범위 attendance 테이블의 distinct 날짜 수 (전 회원 기준)
3. 분자 = 그 범위에서 가족 중 누구든 1명이라도 present였던 distinct 날짜 수
4. 점수 = 분자/분모, 내림차순 정렬
5. A조에 이미 들어간 가족 제외 → B,C,D,E에 스네이크 드래프트 (B,C,D,E,E,D,C,B,B,C,…) 로 `team_assignments` 일괄 upsert (method='auto')

#### 탭 C — 명단 미리보기 / 인쇄
- 조별 카드. 각 가족은 `formatFamilyName(family)` 규칙으로 표기:
  - `display_name_override` 있으면 그대로
  - head=남성 + spouse 있음 → `{head} 형제 가족 ({spouse} 자매)`
  - head=남성 + spouse 없음 → `{head} 형제 가족`
  - head=남성, role=single 단독 → `{head} 형제`
  - head=여성 단독 → `{name} 자매`
- 인쇄용 print CSS 포함

### 4. 표기 유틸 (`src/lib/familyName.ts`)
순수 함수로 위 규칙 구현 + 단위 테스트 추가.

### 5. 라우팅 / 사이드바
- `src/App.tsx`에 `/cleaning` 라우트 추가
- `src/components/AppSidebar.tsx` `extraNavItems`에 "청소조" (icon: Sparkles) 추가

### 6. 건드리지 않는 것
대시보드, 출석부, 출석통계, 회원기록양식, 조직도, 회의록 페이지의 기존 동작 — 사이드바에 항목 1개 추가만.

---

### 기술 메모
- 드래그&드롭: `@dnd-kit/core` + `@dnd-kit/sortable` (touch 지원)
- 캘린더: 기존 `react-day-picker`(shadcn Calendar) 재사용, 토요일만 selectable
- 타입: 새 테이블은 마이그레이션 승인 후 `src/integrations/supabase/types.ts` 자동 재생성 → 그 후 페이지/훅 구현
- 빈 옵션 필드는 null로 저장(프로젝트 규칙 준수)

### 작업 순서
1. 마이그레이션(테이블 5종 + RLS + GRANT + teams 시드)
2. 라이브러리 설치(`@dnd-kit/core`, `@dnd-kit/sortable`)
3. `src/lib/familyName.ts` + 테스트
4. `src/pages/CleaningPage.tsx` + 하위 컴포넌트(`ScheduleTab`, `TeamsTab`, `RosterTab`)
5. `src/hooks/useCleaning.ts` (families, teams, assignments, schedule fetch/mutate)
6. App.tsx / AppSidebar.tsx 연결
7. 메모리 업데이트(`mem://features/cleaning-teams`)
