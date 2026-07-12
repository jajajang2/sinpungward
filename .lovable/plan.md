## 문제

출석 체크 시 실제로 롤백되지 않지만(오늘 111건 모두 `is_present=true`로 저장됨), 체크할 때마다 **가족 그룹 순서가 실시간 재정렬**되어 클릭한 회원이 위로 튀어 올라감. 스크롤 위치는 유지되므로 원래 자리에 다른 회원 행이 들어오고, 사용자는 "내가 체크한 게 풀렸다"고 인식.

## 원인

`src/pages/AttendancePage.tsx`에서
- `attendanceRates`가 오늘 날짜 포함 최근 8주 출석을 사용
- 체크박스 토글 → `attendance` state 변경 → `attendanceRates` 재계산 → `familyGroups.topRate` 변경 → 정렬 순서 변경

## 수정

**정렬 기준을 "현재 편집 중인 날짜"에 흔들리지 않게 고정.**

1. `attendanceRates` 계산에서 `selectedDateStr`(현재 선택된 날짜)을 `meetingDates`에서 제외.
   - 표시용 개인 출석률(`ratePct`)과 가족 정렬용 `topRate` 모두 이 값 사용
   - 오늘 체크 여부와 무관하게 지난 8주(오늘 제외) 기준이므로 토글해도 순서 안 바뀜
2. 이렇게 하면 오늘 체크/해제해도 가족 순서가 안정적으로 유지됨.

변경 파일: `src/pages/AttendancePage.tsx` (한 곳, `attendanceRates` useMemo 내부)

## 검증

- 오늘 날짜 선택 후 임의 회원 체크 → 가족 순서가 그대로 유지되는지 확인
- 다른 과거 일요일 선택했을 때도 순서가 안정적인지 확인
- DB의 오늘자 111건은 이미 저장되어 있어 손실 없음
