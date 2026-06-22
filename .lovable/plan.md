# 성찬식 순서 기능 추가 계획

## 1. 네비게이션
- `src/components/AppSidebar.tsx` `mainNavItems` 의 "출석통계" 바로 아래에 `{ to: "/sacrament", label: "성찬식 순서", icon: ListOrdered }` 추가.
- `src/App.tsx` 라우트 `/sacrament` → 새 페이지 `SacramentPage`.

## 2. 데이터베이스 (Lovable Cloud)

마이그레이션 1건으로 두 테이블 추가:

- `sacrament_meetings`
  - `id uuid pk default gen_random_uuid()`
  - `meeting_date date unique not null` (해당 주 일요일)
  - `event_type text not null default '일반'` (`일반|금식간증|연차대회|부활절|기타`)
  - `event_custom_name text`
  - `created_at`, `updated_at`
- `sacrament_assignments`
  - `id uuid pk`
  - `meeting_id uuid fk → sacrament_meetings on delete cascade`
  - `role text not null` (감리자/사회자/지휘자/반주자/개회기도/성찬축복1/성찬축복2/성찬전달/말씀_3분/말씀_7분/말씀_10분/마지막연사/폐회기도/개회찬송/성찬찬송/중간찬송/폐회찬송)
  - `slot int default 0` (성찬전달 멀티 입력용)
  - `member_id uuid` (members FK nullable, on delete set null)
  - `custom_name text`
  - `hymn_number text`
  - `talk_topic text`
  - `talk_content text`
  - unique(meeting_id, role, slot)
- 두 테이블 모두:
  - `GRANT SELECT,INSERT,UPDATE,DELETE … TO authenticated; GRANT ALL … TO service_role;`
  - RLS 활성화 + authenticated 전체 허용 정책(앱 다른 테이블 패턴과 동일).

## 3. 페이지 구조 — `src/pages/SacramentPage.tsx`

탭 2개: **순서표** / **말씀 히스토리**.

### 3-1. 순서표 탭
- 상단 컨트롤: `이전 2개월` / `현재 라벨` / `다음 2개월` 버튼.
- 화면에 2개월 (기본 이번 달 + 다음 달) `MonthSacramentTable` 카드 가로 배치 (모바일은 세로 스택, 가로 스크롤).
- `MonthSacramentTable`
  - 해당 달 일요일들을 `date-fns`로 계산 → 열.
  - 행은 명세 1-2 순서. 행 그룹:
    - 사람 선택 행 / 찬송가 번호 행 / 사람+주제 행 / 성찬전달(멀티) 행.
  - 한 달치 `meetings` + `assignments`를 한 번에 fetch, (date, role, slot) 키로 인덱싱.
  - 셀 클릭 → 셀 종류별 팝오버:
    - **PersonCellPopover**: 회원 검색 입력 + 결과 리스트(members 테이블) + "직접 입력" 입력란 + 삭제 버튼. 선택 시 upsert assignment.
    - **HymnCellPopover**: 숫자/텍스트 input, blur 시 upsert.
    - **TalkCellPopover**: 사람 선택 영역 + 주제 textarea (+ 내용은 히스토리 모달에서 편집). upsert.
    - **DeliverersCell**: 멀티 슬롯, 각 슬롯이 person cell처럼 동작 + "추가" 버튼.
  - 사람 칸 채워지면 연한 노랑(`bg-yellow-50`) 배경.
- 날짜 헤더 클릭 → `EventTypePopover` (일반/금식간증/연차대회/부활절/기타+이름). 선택 시 `sacrament_meetings` upsert.
  - **연차대회**: 그 열의 모든 데이터 셀을 단일 병합 셀(`rowSpan`)로 바꿔 세로 "연차대회" 표시.
  - **금식간증/부활절/기타**: 말씀3분~마지막연사(중간찬송 포함) 구간만 하나의 병합 셀로 → 행사명 표시. 나머지 행은 정상 입력.
- 모든 변경은 즉시 supabase upsert (자동 저장). 변경 후 로컬 캐시 업데이트.

### 3-2. 말씀 히스토리 탭 — `SacramentTalkHistory.tsx`
- 모든 members fetch + 말씀 관련 role(`말씀_3분|말씀_7분|말씀_10분|마지막연사`) assignments fetch.
- 회원별 행: 이름 / 오른쪽에 `YYYY.MM.DD` 칩 리스트 (해당 회원이 맡은 미팅 날짜).
- 하단 별도 섹션 "비회원(직접 입력)": custom_name 기준 그룹.
- 날짜 칩 클릭 → `TalkDetailModal`: `talk_topic`, `talk_content` 편집 후 `sacrament_assignments` 업데이트. 순서표와 동일 row 갱신.

## 4. 공통 컴포넌트 (신규, `src/components/sacrament/`)
- `MonthSacramentTable.tsx`
- `PersonCellPopover.tsx`
- `HymnCell.tsx`
- `TalkCell.tsx`
- `DeliverersCell.tsx`
- `EventTypePopover.tsx`
- `SacramentTalkHistory.tsx`
- `TalkDetailModal.tsx`

shadcn 의 Popover / Dialog / Command / Input / Button 재사용.

## 5. 디자인
- 기존 카드/사이드바 톤 유지. 표는 `border-collapse`, header `bg-muted`, 채워진 사람 셀 `bg-yellow-50`. 모바일에서는 표 `overflow-x-auto`.

## 6. 검증
- 빌드/타입 통과 확인.
- 사용자가 셀 입력 → 새로고침 후 유지.
- 연차대회/금식간증 선택 시 병합 표시 정상.
- 말씀 히스토리 탭에서 입력된 사람과 날짜가 정확히 매핑되는지.

## 7. 영향 파일
- 신규: `src/pages/SacramentPage.tsx`, `src/components/sacrament/*`, 마이그레이션 1건.
- 수정: `src/components/AppSidebar.tsx`, `src/App.tsx`.
- 다른 기능(회원/출석/회의록 등)에는 영향 없음.
