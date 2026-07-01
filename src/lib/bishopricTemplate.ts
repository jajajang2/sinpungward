// BlockNote 0.51 스키마용 감독단 회의록 표준 양식
// heading / paragraph / bulletListItem 만 사용 (BlockNoteReadOnly 호환)

type Inline = { type: "text"; text: string; styles?: Record<string, unknown> };
type Block = {
  type: "heading" | "paragraph" | "bulletListItem";
  props?: Record<string, unknown>;
  content: Inline[];
  children?: Block[];
};

const t = (text: string, bold = false): Inline[] => [
  { type: "text", text, styles: bold ? { bold: true } : {} },
];

const h = (level: 1 | 2 | 3, text: string): Block => ({
  type: "heading",
  props: { level },
  content: t(text),
});

const p = (text: string, bold = false): Block => ({
  type: "paragraph",
  content: text ? t(text, bold) : [],
});

const li = (text: string, children?: Block[]): Block => ({
  type: "bulletListItem",
  content: t(text),
  ...(children && children.length ? { children } : {}),
});

export const BISHOPRIC_TEMPLATE: Block[] = [
  h(1, "감독단 모임 회의록"),
  p("와드 주제 성구: "),
  p("일시: "),
  p("참석: "),
  p("개회기도: "),
  p("폐회기도: "),

  h(2, "1. 경전, 교회 지도자 및 본 지침서의 가르침 검토 (5분씩 진행)"),
  li("담당: "),

  h(2, "2. 와드에서 행하는 하나님의 구원 및 승영 사업 조율"),
  h(3, "01) 성찬식 모임 준비"),
  li("사회: "),
  p("〔와드 행사〕", true),
  li("지지: "),
  li("해임: "),
  li("부름: "),
  li("기타: "),
  li("개회기도: "),
  li("말씀 / 금식간증: "),
  li("폐회기도: "),
  h(3, "02) 광고"),
  li(""),
  h(3, "03) 선교사업"),
  li(""),
  h(3, "04) 와드선교사"),
  li(""),

  h(2, "3. 청소년과 어린이를 중심으로 한 와드 내의 개인 및 가족 강화"),
  li("a. 초등회: "),
  li("b. 청소년: "),
  li("c. 독신: "),
  li("d. 회원동정(방문): "),

  h(2, "4. 신권 의식을 비롯한 의식을 받도록 준비할 수 있는 회원 파악"),
  li("1) 신권 승진 · 수련장로 준비: "),
  li("2) 성전추천서 접견 (3개월):", [
    li("접견자: "),
    li("만료 예정자 (3개월 내): "),
    li("최근 만료 — 3개월: "),
    li("최근 만료 — 6개월: "),
    li("최근 만료 — 12개월: "),
    li("1년 경과: "),
    li("대리 침례 및 확인: "),
  ]),
  li("3) 축복사의 축복 접견: "),
  li("4) 일반 접견: "),
  li("5) 와드 직책에 부를 수 있는 회원 파악", [
    li("부름: "),
    li("부름 고려 대상: "),
    li("해임: "),
    li("선교사 추천 대상: "),
  ]),

  h(2, "6. 그 외 의제 (조직·프로그램, 예산, 임무 지명 보고서 등)"),
  p("〔기타 의제〕", true),
  li(""),
  p("〔월별 계획〕", true),
  li(""),
  p("〔와드·스테이크 일정〕", true),
  li(""),

  h(2, "7. 기타"),
  li("스테이크 전달사항: "),
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
