## 작업

이전 응답 내용(청소 페이지 코드 구조 / Supabase 테이블 구조 / 쿼리 전수)을 마크다운 파일로 저장합니다.

## 산출물

- 경로: `/mnt/documents/cleaning-page-overview.md`
- 형식: 마크다운, 다음 3개 섹션 포함
  1. `/cleaning` 페이지 코드 구조 (state · effects · memos · actions · tabs · import 트리)
  2. 사용 Supabase 테이블 구조 (members, teams, families, family_members, team_assignments, cleaning_schedule, attendance, member_church_info, member_relations) + 관계 다이어그램
  3. Supabase 쿼리 전수 목록 (`CleaningPage.tsx`의 loadAll / moveFamilyToTeam / autoAssign / resetAll / generateSchedule / updateScheduleTeam / deleteSchedule + `familyAutoBuild.ts`의 rebuildFamilies)

## 비고

- 프로젝트 소스 파일은 수정하지 않습니다. `/mnt/documents/` 아래에 산출물 파일만 생성합니다.
- 저장 후 다운로드할 수 있는 경로를 알려드립니다.
