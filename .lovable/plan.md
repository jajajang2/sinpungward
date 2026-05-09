## 새 `/dashboard` 페이지 추가

`/members` 안이 아니라 **별도의 `/dashboard` 라우트**로 대시보드 페이지를 만듭니다. 사이드바에 "대시보드" 메뉴를 추가하고 4개 위젯을 한 페이지에 배치합니다.

---

### 라우팅 & 네비게이션

- `src/App.tsx` — `<Route path="/dashboard" element={<DashboardPage />} />` 추가 (Layout 하위)
- `src/components/AppSidebar.tsx` — `mainNavItems` 최상단에 "대시보드" (`LayoutDashboard` 아이콘, `/dashboard`) 추가
- `src/pages/Index.tsx` 또는 루트 진입 시 `/dashboard`로 리다이렉트할지 여부는 현 동작 유지 (별도 변경 없음)

### 페이지 구성 (`src/pages/DashboardPage.tsx`)

데스크톱: 2x2 그리드(`grid-cols-2`), 모바일: 세로 스택. 각 카드는 shadcn `Card` 사용, semantic 디자인 토큰만 사용.

#### 1. 다가오는 생일자 (향후 4주)
- 오늘부터 28일 이내 생일자 (월/일 기준, 연도 무시)
- 표시: 이름 · D-day · 만 나이(생일 후) · 가까운 순
- 클릭 시 `/members`로 이동하며 해당 회원 자동 선택 (router state 또는 query param `?memberId=…`로 전달, `MembersPage`에서 읽어 `setSelectedMember` 호출)

#### 2. 성전추천서 만료 임박자 (6개월 이내)
- `member_church_info.temple_recommend = true` 회원 중
- 만료일 = `max(bishop_interview_date, stake_president_interview_date)` + **2년**
- 오늘 ~ 6개월 후 사이 만료 예정자 + 이미 만료된 회원 모두 표시 (만료됨/만료임박 배지 구분)
- 만료일 빠른 순으로 정렬, 클릭 시 회원 상세 이동

#### 3. 최근 1달 출석 통계 그래프
- 직전 4주(일요일 4번) 출석 인원 수 막대그래프 (recharts `BarChart`)
- X축: 일요일 날짜(M/D), Y축: 출석 인원 수
- 4주 평균 표시
- 데이터: `attendance` 테이블에서 `is_present = true` 카운트

#### 4. 해당월 달력 + 일정 추가
- 현재 월 달력 (이전/다음 월 이동)
- 일정 등록된 날짜에 점 표시 + 갯수 배지
- 날짜 클릭 → 사이드 패널 또는 다이얼로그로 해당 일자 일정 목록, 추가/수정/삭제
- "일정 추가" 폼: 제목, 설명, 날짜

### DB 변경

새 테이블 `calendar_events`:
- `id` uuid pk
- `event_date` date NOT NULL
- `title` text NOT NULL
- `description` text
- `created_at`, `updated_at` (트리거)
- 인덱스: `event_date`
- RLS: 기존 다른 테이블과 동일 패턴(public read/write — 인증 없는 앱 구조 유지)

### 새 컴포넌트 (모두 `src/components/dashboard/` 하위)

- `UpcomingBirthdaysCard.tsx`
- `TempleRecommendCard.tsx`
- `RecentAttendanceCard.tsx`
- `MonthCalendarCard.tsx` + `EventDialog.tsx`

### MembersPage 연동 (최소 수정)

- `useSearchParams`로 `?memberId=…` 읽어 자동 선택 처리하는 코드 추가 (대시보드 카드에서 회원 클릭 시 사용)

---

### 확인 필요

성전추천서 만료 기간을 **2년** (LDS 표준 유효기간)으로 계산할 예정입니다. 다른 기간이라면 알려주세요. 그 외엔 위 계획대로 진행합니다.