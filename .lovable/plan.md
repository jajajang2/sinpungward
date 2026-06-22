# BlockNote 0.15.11 → 0.51.4 업그레이드 계획

## 1. 대상 버전 결정

- `@blocknote/core` / `@blocknote/react` / `@blocknote/mantine` → **0.51.4** (현재 최신 안정, 세 패키지 모두 동일 버전)
- 신규 peer 의존성: `@mantine/core`, `@mantine/hooks` `^8.3.11`
- React 18은 그대로 호환 (peer: `^18.0 || ^19.0`)
- 0.15 → 0.51 사이에 표 기능이 대폭 확장됨: `tableContent.headerRows`, `headerCols`, 셀별 `backgroundColor`/`textColor`, `colspan`/`rowspan`, splitCells 메뉴 모두 지원.

## 2. 백업 / 안전장치 (코드 베이스 차원)

Lovable 환경에는 git 브랜치를 직접 다루지 않으므로 동일 효과를 다음으로 대체합니다.

- 현재 상태에서 "Publish" 또는 채팅 히스토리 revert 포인트가 자연스러운 백업 지점이 됩니다. 작업 시작 직전 메시지의 revert 버튼을 백업 포인트로 안내.
- 실제 DB(회의록 `content` 컬럼)는 **건드리지 않음**. 마이그레이션 없이 신구 JSON 모두 읽기/쓰기 호환되도록 코드 레벨에서만 처리.
- 작업은 다음 3가지 검증을 통과한 뒤에만 사용자에게 완료 보고:
  1. `npm run build` (또는 자동 빌드)에서 타입/빌드 에러 없음
  2. 기존 0.15 JSON 회의록이 새 에디터에서 그대로 열리고 저장됨
  3. `BlockNoteReadOnly`가 신/구 표 JSON을 모두 정상 렌더링

## 3. 패키지 변경

`package.json`:

```
"@blocknote/core": "0.51.4",
"@blocknote/react": "0.51.4",
"@blocknote/mantine": "0.51.4",
"@mantine/core": "^8.3.11",
"@mantine/hooks": "^8.3.11",
```

설치는 `bun add`로 한 번에 처리.

## 4. `BlockNoteEditor.tsx` 수정

- CSS import 경로 변경
  - `@blocknote/core/fonts/inter.css` → `@blocknote/core/fonts/inter.css` (유지)
  - `@blocknote/mantine/style.css` → 0.51에서도 `./style.css` export가 살아있어 **그대로 사용 가능**. 변경 불필요.
- `useCreateBlockNote` 옵션
  - 0.51에서도 `initialContent` 시그니처 동일. 단 내부 스키마가 엄격해져 빈 배열이면 에러 → 현재 `parseInitialContent`가 이미 `undefined` 반환하므로 안전.
  - `dictionary: undefined` 옵션은 그대로 두되, 한국어 UI가 필요하면 `locales.ko`로 교체 가능 (이번 작업 범위 외).
- `editor.onChange` 콜백: 0.51부터 시그니처가 `(editor, { getChanges }) => void`로 바뀜. 현재 사용 방식(`editor.document` 직접 읽기)은 그대로 동작하지만, 반환값이 unsubscribe 함수가 아니라 `{ unsubscribe }` 객체로 변경되었을 가능성 → 빌드/런타임에서 확인 후 다음과 같이 안전 처리:

```ts
const sub = editor.onChange(() => onChange(JSON.stringify(editor.document)));
return () => {
  if (typeof sub === "function") sub();
  else if (sub && typeof (sub as any).unsubscribe === "function") (sub as any).unsubscribe();
};
```

- 표 기능을 켜기 위한 에디터 옵션:

```ts
useCreateBlockNote({
  initialContent,
  tables: {
    headers: true,
    splitCells: true,
    cellBackgroundColor: true,
    cellTextColor: true,
  },
});
```

## 5. `BlockNoteReadOnly.tsx` 수정

0.15의 표 JSON은 `block.children`에 row/cell 블록이 들어있는 구조였지만, **0.51의 표는 다른 구조**입니다.

- 0.51 표 블록 형태:

```jsonc
{
  "type": "table",
  "content": {
    "type": "tableContent",
    "columnWidths": [null, null],
    "headerRows": 1,
    "headerCols": 0,
    "rows": [
      { "cells": [ { "type": "tableCell", "content": [...], "props": { "colspan": 1, "rowspan": 1, "backgroundColor": "default", "textColor": "default" } }, ... ] }
    ]
  }
}
```

readonly 렌더러를 두 형태 모두 지원하도록 확장:

1. `Block` 타입을 `content?: InlineContent[] | TableContent`로 일반화.
2. `case "table"`에서:
   - `block.content`가 객체이고 `rows`를 가지면 **새 포맷**으로 렌더 (아래 a).
   - 아니면 기존 `block.children` 기반 **레거시 포맷**으로 렌더 (현재 코드 유지).
3. 새 포맷 렌더링 a):
   - `headerRows` / `headerCols` 값을 보고 `<thead>` 행과 `<th>` 셀 분리.
   - 각 cell에 대해 `props.colspan`, `props.rowspan`, `props.backgroundColor`, `props.textColor` 적용.
   - cell `content`(InlineContent[])는 기존 `renderInline`로 재사용.
   - `columnWidths` 배열은 `<colgroup><col style="width">`로 매핑.
4. 표 외 블록은 변경 없음. 신/구 회의록 모두 동일하게 동작 확인.

## 6. 마이그레이션 / 호환성

- DB 저장 포맷은 BlockNote가 알아서 호환 처리합니다. 0.15에서 저장된 JSON을 0.51 `useCreateBlockNote({ initialContent })`에 그대로 넣으면 내부적으로 새 스키마로 정규화. 첫 편집·저장 시점에 새 포맷 JSON이 DB에 덮어쓰기됨 → 자연스러운 점진적 마이그레이션.
- 별도 일괄 마이그레이션 스크립트는 **만들지 않음** (요청 범위 외, 위험만 추가).

## 7. 검증 절차

순서대로 수행하고 각 단계 통과 후에만 다음 단계 진행:

1. 의존성 설치 후 빌드 통과 확인 (TS/Vite 에러 0).
2. 새 회의록을 만들어 표를 삽입 → header rows, split cells, 셀 배경/글자색이 동작.
3. 0.15에서 저장된 기존 회의록 열기:
   - 본문이 깨지지 않는다.
   - 표가 있는 회의록은 표가 그대로 보인다(레거시 readonly 분기에서 렌더).
   - 한 번 편집 후 저장 → 신 포맷으로 저장되고 다시 열어도 정상.
4. `BlockNoteReadOnly`로 신/구 회의록 모두 렌더 확인 (목록·체크리스트·이미지 회귀 없음).

위 1·2·3이 모두 통과하면 사용자에게 완료 보고.

## 8. 영향 범위 (파일)

- `package.json` (의존성)
- `src/components/meeting/BlockNoteEditor.tsx` (옵션·구독 정리, tables 옵션 추가)
- `src/components/meeting/BlockNoteReadOnly.tsx` (신 표 포맷 렌더 분기 추가)
- 기타 파일 변경 없음. 사용 안 하는 Tiptap 관련 파일은 이번 작업에서 손대지 않음.

## 9. 롤백 전략

문제 발생 시:
- 패키지 3개 + `@mantine/*` 2개를 0.15.11 / 제거로 되돌리고
- 위 두 컴포넌트 파일을 이전 상태로 복구
- 또는 작업 시작 메시지의 revert 버튼으로 일괄 복구

## 기술 요약 (개발자 참고)

| 영역 | 0.15.11 | 0.51.4 |
|---|---|---|
| 표 JSON | `children: row[] -> children: cell[]` | `content: { rows, headerRows, headerCols, columnWidths }` |
| 셀 스타일 | 미지원 | `props.backgroundColor`, `props.textColor`, `colspan`, `rowspan` |
| 에디터 옵션 | 표 관련 옵션 없음 | `tables: { headers, splitCells, cellBackgroundColor, cellTextColor }` |
| peer deps | 없음(추가) | `@mantine/core@^8`, `@mantine/hooks@^8` |
| CSS import | `@blocknote/mantine/style.css` | 동일 (변경 없음) |
| `onChange` 반환 | 함수 | 객체일 수 있음 → 양쪽 처리 |
