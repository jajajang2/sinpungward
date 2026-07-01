
## 목표
`/minutes` 새 회의록 작성 시 카테고리를 **감독단회의**로 선택하면 표준 감독단 회의록 양식이 BlockNote 에디터에 자동으로 채워지도록 한다.

## 구현 범위

### 1. 새 파일: `src/lib/bishopricTemplate.ts`
- BlockNote 0.51 스키마에 맞는 블록 배열 상수 `BISHOPRIC_TEMPLATE` 정의.
- `heading` (level 1/2/3), `paragraph`, `bulletListItem`만 사용. 하위 불릿은 `children`으로 중첩. 굵은 문단은 `paragraph` + `styles.bold`.
- 빈칸은 `"라벨: "`까지만 채움.
- 헬퍼 `getBishopricTemplateJSON()`: `JSON.stringify(BISHOPRIC_TEMPLATE)` 반환.
- 양식 내용은 업로드된 명령서의 [H1]/[H2]/[H3]/[P]/[•]/[•>]/[B] 표기 규칙 그대로 매핑 (와드 주제 성구 ~ 스테이크 전달사항까지 전 항목).

### 2. `src/pages/MeetingMinutesPage.tsx` 수정
- **에디터 비어있음 판정 헬퍼** `isEditorEmpty(content: string)` 추가 (빈 문자열, `[]`, 또는 텍스트가 없는 단일 paragraph만 있는 경우 true).
- `form.category` 변경을 감지하는 `useEffect`:
  - `isCreating === true` 이고
  - `form.category === "감독단회의"` 이고
  - `isEditorEmpty(form.content)` 일 때
  - → `form.content`를 `getBishopricTemplateJSON()`으로 세팅.
- 수정(`isEditing`) 모드에서는 절대 자동 삽입하지 않음 (조건에서 제외).
- **"감독단 양식 불러오기" 버튼**: 작성/수정 폼의 메타 행에 추가.
  - 현재 카테고리가 감독단회의일 때만 표시.
  - 클릭 시 `window.confirm("현재 내용을 감독단 양식으로 덮어씁니다. 계속할까요?")` 후 템플릿 재삽입.
- `BlockNoteEditorView`는 `initialContent`를 마운트 시 1회만 읽으므로, 자동 삽입 후 에디터가 새 값을 반영하도록 **컴포넌트 remount용 `key` prop**을 추가 (예: `templateVersion` 상태를 증가시켜 key로 전달).

### 3. 검증
- 새 회의록 → 카테고리 "감독단회의" 선택 시 양식이 뜨는지.
- 저장 후 목록에서 다시 열었을 때 `BlockNoteReadOnly`에서 heading/bullet 중첩/굵은 문단이 그대로 렌더되는지.
- 와드평의회로 새 회의록 만들 땐 빈 상태 유지되는지.
- 기존 회의록 수정 시 자동 삽입되지 않는지.

## 변경 파일 요약
- 신규: `src/lib/bishopricTemplate.ts`
- 수정: `src/pages/MeetingMinutesPage.tsx`
- DB 변경 없음, 신규 패키지 없음.
