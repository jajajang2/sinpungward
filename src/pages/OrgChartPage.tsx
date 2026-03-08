import { useState, useRef, useCallback, useEffect } from "react";

// ───────────────────────────────────────────────────────────
// Static org-chart data (from 신풍 와드 조직도 2025)
// ───────────────────────────────────────────────────────────

interface OrgEntry {
  role: string;
  name: string;
}

interface OrgSection {
  title: string;
  color: string; // header bg (tailwind class)
  entries: OrgEntry[];
}

const TOP_SECTION: OrgEntry[] = [
  { role: "감 독", name: "정 준 우" },
  { role: "건물 대표", name: "김 영 태" },
];

const BISHOP_ROW: OrgEntry[] = [
  { role: "1 보 좌", name: "정 태 호" },
  { role: "2 보 좌", name: "양 우 리" },
  { role: "집행 서기", name: "최 민 석" },
  { role: "와드 서기", name: "성 민 호" },
  { role: "보조 서기", name: "" },
];

const SECTIONS: OrgSection[] = [
  {
    title: "장 로 정 원 회",
    color: "#2563EB",
    entries: [
      { role: "회 장", name: "안 재 혁" },
      { role: "1 보 좌", name: "김 용 기" },
      { role: "2 보 좌", name: "박 호 형" },
      { role: "서 기", name: "김 병 현B" },
      { role: "보조 서기", name: "" },
      { role: "성역담당 서기", name: "" },
      { role: "공과 교사", name: "이 창 명" },
      { role: "공과 교사", name: "성 용 헌" },
      { role: "공과 교사", name: "김 수 현" },
      { role: "공과 교사", name: "임 성 렬" },
      { role: "보 조 공과 교사", name: "이 재 현" },
      { role: "보 조 공과 교사", name: "박 병 규" },
      { role: "보 조 공과 교사", name: "" },
      { role: "정원회 활동책임자", name: "" },
      { role: "정원회 봉사책임자", name: "" },
    ],
  },
  {
    title: "상 호 부 조 회",
    color: "#0D9488",
    entries: [
      { role: "회 장", name: "송 영 심" },
      { role: "1 보 좌", name: "최 소 영" },
      { role: "2 보 좌", name: "허 효 진" },
      { role: "서 기", name: "김 지 선" },
      { role: "보조 서기", name: "김 미 현" },
      { role: "성역담당 서기", name: "" },
      { role: "공과 교사", name: "김 수 정" },
      { role: "공과 교사", name: "박 윤 희" },
      { role: "공과 교사", name: "" },
      { role: "공과 교사", name: "" },
      { role: "반 주 자", name: "이 햇 림" },
      { role: "활동 책임자", name: "정 명 순" },
      { role: "활동 책임자", name: "안 순 안" },
      { role: "봉사 책임자", name: "김 영 애" },
      { role: "봉사 책임자", name: "황 윤 주" },
    ],
  },
  {
    title: "아론신권정원회",
    color: "#16A34A",
    entries: [
      { role: "회 장", name: "박 성 식" },
      { role: "1 보 좌", name: "박 우 형" },
      { role: "2 보 좌", name: "강 인 경" },
      { role: "서 기", name: "김 지 선" },
      { role: "청남 고문", name: "" },
      { role: "청남 고문", name: "" },
      { role: "정원회 전문가", name: "" },
      { role: "제사정원회 회장", name: "정 준 우" },
      { role: "1 보 조", name: "한 능 유" },
      { role: "2 보 조", name: "김 태 원" },
      { role: "서 기", name: "안 호 연" },
      { role: "집사정원회 회장", name: "" },
      { role: "1 보 좌", name: "" },
      { role: "2 보 좌", name: "" },
      { role: "서 기", name: "" },
    ],
  },
  {
    title: "청 녀 회",
    color: "#DB2777",
    entries: [
      { role: "회 장", name: "장 미" },
      { role: "1 보 좌", name: "이 인 주" },
      { role: "2 보 좌", name: "김 서 진" },
      { role: "서 기", name: "임 예 지" },
      { role: "청녀 고문", name: "" },
      { role: "청녀 고문", name: "" },
      { role: "정원회 회장", name: "" },
      { role: "1 보 좌", name: "안 준" },
      { role: "2 보 좌", name: "" },
      { role: "서 기", name: "김 서 윤" },
    ],
  },
  {
    title: "초 등 회",
    color: "#D97706",
    entries: [
      { role: "회 장", name: "송 영 심" },
      { role: "형제 지도자", name: "남 윤 범" },
      { role: "자매 지도자", name: "" },
      { role: "1 보 좌", name: "최 소 영" },
      { role: "2 보 좌", name: "허 효 진" },
      { role: "서 기", name: "박 하 늘" },
      { role: "반 명 교 사 용 기 반", name: "구 영 원" },
      { role: "반 명 교 사 용 기 반", name: "안 민" },
      { role: "정 의 반", name: "이 은 미" },
      { role: "정 의 반", name: "김 미 숙" },
      { role: "햇 님 반", name: "" },
      { role: "햇 님 반", name: "" },
      { role: "유 아 반 지 도 자", name: "정 명 순" },
      { role: "유 아 반 지 도 자", name: "엘 레 나" },
      { role: "보조 지도자", name: "윤 채 경" },
      { role: "보조 교사", name: "김 태 순" },
      { role: "보조 교사", name: "최 양 선" },
      { role: "보 조 지 도 자", name: "" },
      { role: "활동 지도자", name: "" },
    ],
  },
  {
    title: "주 일 학 교",
    color: "#0891B2",
    entries: [
      { role: "회 장", name: "박 성 식" },
      { role: "1 보 좌", name: "박 우 형" },
      { role: "2 보 좌", name: "" },
      { role: "서 기", name: "김 원 석" },
      { role: "복음교리 성인반교사", name: "황 현 경" },
      { role: "복음교리 성인반교사", name: "강 세 희" },
      { role: "복음교리 성인반교사", name: "임 부 택" },
      { role: "복음교리 성인반교사", name: "이 서 정" },
      { role: "복음교리 성인반교사", name: "임 승 근" },
      { role: "복음교리 성인반교사", name: "허 선 희" },
      { role: "복음교리 성인반교사", name: "김 현 숙" },
      { role: "복음교리 독신반교사", name: "안 덕 현" },
      { role: "복음교리 기초반교사", name: "임 흥 식" },
      { role: "복음교리 기초반교사", name: "" },
      { role: "복음원리반 교사", name: "" },
      { role: "음악 지도자", name: "황 현 경" },
      { role: "반 주 자", name: "이 햇 림" },
      { role: "선교사 준비 과정 교사", name: "" },
      { role: "선교사 준비 과정 교사", name: "" },
      { role: "활동 지도자", name: "" },
    ],
  },
  {
    title: "와드청년독신성인",
    color: "#7C3AED",
    entries: [
      { role: "형제 지도자", name: "남 윤 범" },
      { role: "자매 지도자", name: "" },
      { role: "성전 및 가족 역사 지도자", name: "최 양 선" },
      { role: "성전 및 가족 역사 지도자", name: "황 윤 주" },
      { role: "성전 및 가족 역사 지도자", name: "정 동 기" },
      { role: "성전 및 가족 역사 지도자", name: "강 지 연" },
      { role: "역사 상담자", name: "" },
      { role: "역사 상담자", name: "" },
      { role: "통합반 회장", name: "이 라 온" },
      { role: "1 보 좌", name: "안 준" },
      { role: "2 보 좌", name: "" },
      { role: "서 기", name: "김 서 윤" },
    ],
  },
  {
    title: "와 드 선 교 담 당",
    color: "#DC2626",
    entries: [
      { role: "선교지도자", name: "임 흥 식" },
      { role: "와드선교사", name: "박 삼 곤" },
      { role: "와드선교사", name: "권 영 민" },
      { role: "와드선교사", name: "안 재 석" },
      { role: "와드선교사", name: "김 기 옥" },
      { role: "와드선교사", name: "" },
      { role: "와드선교사", name: "" },
      { role: "와드선교사", name: "" },
    ],
  },
  {
    title: "기 타 조 직 I",
    color: "#475569",
    entries: [
      { role: "세미나리 교사", name: "허 효 진" },
      { role: "세미나리 교사", name: "최 민 석" },
      { role: "세미나리 교사", name: "임 재 민" },
      { role: "세미나리 교사", name: "" },
      { role: "보조 반주자", name: "이 햇 림" },
      { role: "보조 반주자", name: "강 인 경" },
      { role: "보조 반주자", name: "최 은 영" },
      { role: "와드 통역사", name: "김 재 하" },
    ],
  },
  {
    title: "기 타 조 직 II",
    color: "#64748B",
    entries: [
      { role: "성전 및 가족 역사 지도자", name: "최 양 선" },
      { role: "성전 및 가족 역사 지도자", name: "황 윤 주" },
      { role: "성전 및 가족 역사 지도자", name: "정 동 기" },
      { role: "성전 및 가족 역사 지도자", name: "강 지 연" },
      { role: "와드 자립 전문가", name: "정 동 기" },
      { role: "와드 취업 전문가", name: "" },
      { role: "와드 방역 책임자", name: "안 재 석" },
      { role: "와드 기술 책임자", name: "" },
      { role: "와드 화단 관리자", name: "김 기 옥" },
      { role: "와드 안전 관리자", name: "박 성 우" },
      { role: "와드 비축 담당자", name: "" },
      { role: "음악위원장", name: "김 진 희" },
      { role: "코디네이터", name: "서 은 호" },
      { role: "영 어 회 화", name: "이 햇 림" },
      { role: "보조 지휘자", name: "김 서 진" },
      { role: "보조 지휘자", name: "박 새 봄" },
      { role: "반 주 자", name: "이 햇 림" },
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

const OrgChartPage = () => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fit content to container on mount
  useEffect(() => {
    const fit = () => {
      if (!containerRef.current || !contentRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const nw = contentRef.current.scrollWidth;
      const nh = contentRef.current.scrollHeight;
      const s = Math.min(cw / nw, ch / nh, 1);
      setScale(s);
      setOffset({ x: 0, y: 0 });
    };
    // slight delay so DOM has rendered
    const t = setTimeout(fit, 100);
    return () => clearTimeout(t);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta * s)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">조직도</h1>
          <p className="text-xs text-muted-foreground">마우스 휠: 확대/축소 · 드래그: 이동</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setScale(s => Math.min(MAX_SCALE, s * 1.2)); }}
            className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
          >＋</button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => { setScale(s => Math.max(MIN_SCALE, s * 0.8)); }}
            className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
          >－</button>
          <button
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            className="px-2 py-1 rounded border border-border text-xs hover:bg-muted ml-1"
          >초기화</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-muted/30"
        style={{ cursor: isPanning ? "grabbing" : scale > 0.99 ? "grab" : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            padding: "24px",
            userSelect: "none",
          }}
        >
          {/* ── 제목 ── */}
          <div className="text-center mb-6">
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.3em", color: "#1e293b" }}>
              신 풍 와 드 조 직 도
            </h2>
          </div>

          {/* ── 감독 + 건물 대표 ── */}
          <div className="flex justify-center gap-6 mb-3">
            {TOP_SECTION.map((e) => (
              <TopCard key={e.role} role={e.role} name={e.name} />
            ))}
          </div>

          {/* ── 1보좌 ~ 보조서기 row ── */}
          <div className="flex justify-center gap-3 mb-6">
            {BISHOP_ROW.map((e) => (
              <BishopCard key={e.role} role={e.role} name={e.name} />
            ))}
          </div>

          {/* ── 메인 섹션 그리드 ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 200px)", gap: 12 }}>
            {SECTIONS.slice(0, 5).map((sec) => (
              <SectionColumn key={sec.title} sec={sec} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 200px)", gap: 12, marginTop: 12 }}>
            {SECTIONS.slice(5).map((sec) => (
              <SectionColumn key={sec.title} sec={sec} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────

const TopCard = ({ role, name }: { role: string; name: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", border: "2px solid #f97316",
    borderRadius: 4, overflow: "hidden", fontSize: 13, fontWeight: 700,
  }}>
    <span style={{ background: "#f97316", color: "#fff", padding: "4px 10px" }}>{role}</span>
    <span style={{ padding: "4px 12px", color: "#1e293b" }}>{name}</span>
  </div>
);

const BishopCard = ({ role, name }: { role: string; name: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", border: "1.5px solid #e2e8f0",
    borderRadius: 4, overflow: "hidden", fontSize: 12, background: "#fff",
  }}>
    <span style={{ background: "#1e40af", color: "#fff", padding: "3px 8px", fontWeight: 700 }}>{role}</span>
    <span style={{ padding: "3px 10px", color: "#1e293b", fontWeight: name ? 600 : 400 }}>
      {name || <span style={{ color: "#94a3b8", fontSize: 11 }}>미배정</span>}
    </span>
  </div>
);

const SectionColumn = ({ sec }: { sec: OrgSection }) => (
  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 6, overflow: "hidden", background: "#fff", fontSize: 11 }}>
    {/* Header */}
    <div style={{
      background: sec.color, color: "#fff", textAlign: "center",
      padding: "5px 4px", fontWeight: 800, fontSize: 12, letterSpacing: "0.05em",
    }}>
      {sec.title}
    </div>
    {/* Rows */}
    {sec.entries.map((e, i) => (
      <div key={i} style={{
        display: "flex", alignItems: "center",
        borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
        padding: "3px 6px", gap: 4,
      }}>
        <span style={{ color: "#64748b", flexShrink: 0, minWidth: 80, fontSize: 10 }}>{e.role}</span>
        <span style={{ fontWeight: e.name ? 600 : 400, color: e.name ? "#1e293b" : "#cbd5e1", fontSize: 11 }}>
          {e.name || "미배정"}
        </span>
      </div>
    ))}
  </div>
);

export default OrgChartPage;
