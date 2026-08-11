// BlockNote 0.51 스키마용 감독단 회의록 표준 양식
// 원본 워드 양식(노란색 음영 = 필수 고정 항목)을 최대한 그대로 재현한다.
// heading / paragraph / bulletListItem / numberedListItem / table 만 사용 (BlockNoteReadOnly 호환)

type Styles = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
};

type Inline = { type: "text"; text: string; styles?: Styles };

type TableCellBlock = {
  type: "tableCell";
  content: Inline[];
  props?: { backgroundColor?: string; colspan?: number; rowspan?: number };
};

type TableRow = { cells: (Inline[] | TableCellBlock)[] };

type TableContentBlock = {
  type: "tableContent";
  rows: TableRow[];
  columnWidths?: (number | undefined)[];
};

type Block = {
  type: "heading" | "paragraph" | "bulletListItem" | "numberedListItem" | "table";
  props?: Record<string, unknown>;
  content?: Inline[] | TableContentBlock;
  children?: Block[];
};

/** 필수 고정 항목(원본 노란색 음영) 표시용 스타일 */
const YELLOW = "yellow";
const required = (bold = true, underline = true): Styles => ({
  bold,
  underline,
  backgroundColor: YELLOW,
});

const run = (text: string, styles: Styles = {}): Inline => ({ type: "text", text, styles });
const t = (text: string, styles: Styles = {}): Inline[] => [run(text, styles)];

/** 노란색 음영 필수 라벨 */
const req = (text: string, extra: Styles = {}): Inline[] => t(text, { ...required(), ...extra });
/** 일반 볼드 라벨(음영 없음) */
const bold = (text: string): Inline[] => t(text, { bold: true });

const h = (level: 1 | 2 | 3, content: Inline[]): Block => ({ type: "heading", props: { level }, content });
const p = (content: Inline[]): Block => ({ type: "paragraph", content });
const li = (content: Inline[], children?: Block[]): Block => ({
  type: "bulletListItem",
  content,
  ...(children && children.length ? { children } : {}),
});
const nli = (content: Inline[], children?: Block[]): Block => ({
  type: "numberedListItem",
  content,
  ...(children && children.length ? { children } : {}),
});

/** 표 셀 — 필수 라벨 셀은 노란 배경 + 볼드 */
const cell = (
  text: string,
  opts: { req?: boolean; bold?: boolean; colspan?: number; rowspan?: number } = {}
): TableCellBlock => ({
  type: "tableCell",
  content: text ? t(text, { bold: opts.bold ?? opts.req }) : [],
  props: {
    ...(opts.req ? { backgroundColor: YELLOW } : {}),
    ...(opts.colspan ? { colspan: opts.colspan } : {}),
    ...(opts.rowspan ? { rowspan: opts.rowspan } : {}),
  },
});
const labelCell = (text: string, opts: { colspan?: number; rowspan?: number } = {}) =>
  cell(text, { req: true, ...opts });
const blankCell = (opts: { colspan?: number; rowspan?: number } = {}) => cell("", opts);

/** 라벨 칸 기본 너비(px) — 나머지 칸은 undefined로 두어 남은 공간을 채우게 한다 */
const LABEL_COL = 150;

const table = (rows: TableRow[], columnWidths?: (number | undefined)[]): Block => ({
  type: "table",
  content: { type: "tableContent", rows, columnWidths },
});

export const BISHOPRIC_TEMPLATE: Block[] = [
  h(2, req("감독단모임 (와드 주제 성구: )")),
  p(req("일시: ")),
  p(req("참석: ")),
  p(req("개회기도: ")),
  p(req("폐회기도: ")),

  h(3, req("1. 경전, 교회 지도자 및 본 지침서의 가르침 검토 - 5분씩 진행", { italic: true })),
  li(bold("담당: ")),

  h(3, req("와드에서 행하는 하나님의 구원 및 승영 사업 조율", { italic: true })),

  p(bold("1) 성찬식 모임 준비")),
  table(
    [
      { cells: [labelCell("사회"), blankCell()] },
      { cells: [labelCell("개회기도"), blankCell()] },
      { cells: [labelCell("말씀"), blankCell()] },
      { cells: [labelCell("폐회기도"), blankCell()] },
    ],
    [LABEL_COL, undefined]
  ),
  p(req("***와드행사***")),
  table(
    [
      { cells: [labelCell("지지"), blankCell()] },
      { cells: [labelCell("해임"), blankCell()] },
      { cells: [labelCell("부름"), blankCell()] },
      { cells: [labelCell("기타"), blankCell()] },
    ],
    [LABEL_COL, undefined]
  ),

  p(bold("2) 광고")),
  nli([]),

  p(req("3) 선교사업")),
  li([]),

  p(req("4) 와드선교사")),
  li([]),

  h(3, req("3. 청소년과 어린이를 중심으로 한 와드 내의 개인 및 가족 강화", { italic: true })),
  li(req("a. 초등회: ")),
  li(req("b. 청소년: ")),
  li(req("c. 독신: ")),
  li(req("d. 회원동정(방문): ")),

  h(3, req("4. 신권 의식을 비롯한 의식을 받도록 준비할 수 있는 회원 파악", { italic: true })),
  li(req("1) 신권 승진 · 수련장로 준비시키기: ")),
  li(req("2) 성전추천서 접견 - 3개월 (청소년 것도 확인)"), [
    li(bold("접견자: ")),
  ]),
  table(
    [
      { cells: [labelCell("만료예정자 (3개월 내)", { colspan: 2 }), blankCell()] },
      { cells: [labelCell("최근만료", { rowspan: 3 }), labelCell("3개월"), blankCell()] },
      { cells: [labelCell("6개월"), blankCell()] },
      { cells: [labelCell("12개월"), blankCell()] },
      { cells: [labelCell("1년 경과", { colspan: 2 }), blankCell()] },
      { cells: [labelCell("대리 침례 및 확인", { colspan: 2 }), blankCell()] },
    ],
    [LABEL_COL, 110, undefined]
  ),
  li(req("3) 축복사의 축복 접견: ")),
  li(req("4) 일반 접견: "), [li([])]),

  h(3, req("5. 와드 직책에 부를 수 있는 회원 파악", { italic: true })),
  p(req("1) 부름 및 해임")),
  li(req("부름: ")),
  li(bold("부름을 고려해야 할 사람: ")),
  li(req("해임: ")),
  p(req("2) 선교사로 봉사하도록 스테이크 회장에게 추천할 수 있는 회원 파악", { italic: true })),
  li([]),

  h(3, req("6. 그 외 의제 (조직 및 프로그램, 예산, 임무 지명 보고서, 모임 및 활동 계획 등)", { italic: true })),
  p(req("기타의제")),
  nli([]),
  p(req("7월")),
  nli([]),
  p(req("8월")),
  nli([]),
  li(req("와드 및 스테이크 일정")),
  p(req("와드")),
  nli([]),
  p(req("스테이크")),
  nli([]),

  h(3, req("7. 기타", { italic: true })),
  li(bold("스테이크 전달사항: ")),
];

export function getBishopricTemplateJSON(): string {
  return JSON.stringify(BISHOPRIC_TEMPLATE);
}

export function isEditorEmpty(content: string): boolean {
  if (!content || !content.trim()) return true;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) return true;
    // 텍스트 없는 단일 paragraph
    if (parsed.length === 1 && parsed[0]?.type === "paragraph") {
      const c = parsed[0].content;
      if (!c || (Array.isArray(c) && c.every((n: any) => !n?.text?.trim()))) return true;
    }
    return false;
  } catch {
    return !content.replace(/<[^>]+>/g, "").trim();
  }
}
