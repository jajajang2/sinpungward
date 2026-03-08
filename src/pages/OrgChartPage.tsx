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
      { role: "회장", name: "" },
      { role: "제1보좌", name: "" },
      { role: "제2보좌", name: "" },
      { role: "서기", name: "" },
      { role: "보조 서기", name: "" },
      { role: "교사 1", name: "" },
      { role: "교사 2", name: "" },
      { role: "교사 3", name: "" },
      { role: "교사 4", name: "" },
      { role: "교사 5", name: "" },
      { role: "와드 선교 담당자", name: "" },
    ],
  },
  {
    title: "상 호 부 조 회",
    color: "#0D9488",
    entries: [
      { role: "회장", name: "" },
      { role: "제1보좌", name: "" },
      { role: "제2보좌", name: "" },
      { role: "서기", name: "" },
      { role: "보조 서기", name: "" },
      { role: "교사 1", name: "" },
      { role: "교사 2", name: "" },
      { role: "교사 3", name: "" },
      { role: "교사 4", name: "" },
      { role: "교사 5", name: "" },
    ],
  },
  {
    title: "아론신권정원회",
    color: "#16A34A",
    entries: [
      { role: "정원회 회장", name: "" },
      { role: "정원회 제1보좌", name: "" },
      { role: "정원회 제2보좌", name: "" },
      { role: "제사 정원회 회장", name: "" },
      { role: "제사 정원회 제1보조", name: "" },
      { role: "제사 정원회 제2보조", name: "" },
      { role: "제사 정원회 서기", name: "" },
      { role: "교사 정원회 회장", name: "" },
      { role: "교사 정원회 제1보조", name: "" },
      { role: "교사 정원회 제2보조", name: "" },
      { role: "교사 정원회 서기", name: "" },
      { role: "집사 정원회 회장", name: "" },
      { role: "집사 정원회 제1보조", name: "" },
      { role: "집사 정원회 제2보조", name: "" },
      { role: "집사 정원회 서기", name: "" },
    ],
  },
  {
    title: "청 녀",
    color: "#DB2777",
    entries: [
      { role: "회장", name: "" },
      { role: "제1보좌", name: "" },
      { role: "제2보좌", name: "" },
      { role: "서기", name: "" },
      { role: "반 회장", name: "" },
      { role: "반 제1보좌", name: "" },
      { role: "반 제2보좌", name: "" },
      { role: "반 서기", name: "" },
    ],
  },
  {
    title: "주 일 학 교",
    color: "#0891B2",
    entries: [
      { role: "회장", name: "" },
      { role: "회장단 제1보좌", name: "" },
      { role: "회장단 제2보좌", name: "" },
      { role: "회장단 서기", name: "" },
      { role: "회장단 보조서기", name: "" },
      { role: "독신성인 교사 1", name: "" },
      { role: "독신성인 교사 2", name: "" },
      { role: "독신성인 교사 3", name: "" },
      { role: "독신성인 교사 4", name: "" },
      { role: "독신성인 교사 5", name: "" },
      { role: "복음교리 교사 1", name: "" },
      { role: "복음교리 교사 2", name: "" },
      { role: "복음교리 교사 3", name: "" },
      { role: "복음교리 교사 4", name: "" },
      { role: "복음교리 교사 5", name: "" },
      { role: "복음교리 A반 교사 1", name: "" },
      { role: "복음교리 A반 교사 2", name: "" },
      { role: "복음교리 A반 교사 3", name: "" },
      { role: "복음교리 B반 교사 1", name: "" },
      { role: "복음교리 B반 교사 2", name: "" },
      { role: "복음교리 B반 교사 3", name: "" },
      { role: "복음교리 C반 교사 1", name: "" },
      { role: "복음교리 C반 교사 2", name: "" },
      { role: "복음교리 C반 교사 3", name: "" },
      { role: "청소년 교사 1", name: "" },
      { role: "청소년 교사 2", name: "" },
      { role: "청소년 교사 3", name: "" },
    ],
  },
  {
    title: "초 등 회",
    color: "#D97706",
    entries: [
      { role: "회장", name: "" },
      { role: "회장단 제1보좌", name: "" },
      { role: "회장단 제2보좌", name: "" },
      { role: "회장단 서기", name: "" },
      { role: "유아반 교사 1", name: "" },
      { role: "유아반 교사 2", name: "" },
      { role: "유아반 교사 3", name: "" },
      { role: "해님반 교사 1", name: "" },
      { role: "해님반 교사 2", name: "" },
      { role: "해님반 교사 3", name: "" },
      { role: "정의반 교사 1", name: "" },
      { role: "정의반 교사 2", name: "" },
      { role: "정의반 교사 3", name: "" },
      { role: "용기반 교사 1", name: "" },
      { role: "용기반 교사 2", name: "" },
      { role: "용기반 교사 3", name: "" },
    ],
  },
  {
    title: "와 드 선 교 사",
    color: "#DC2626",
    entries: Array.from({ length: 10 }, (_, i) => ({ role: `선교사 ${i + 1}`, name: "" })),
  },
  {
    title: "성전·가족 역사",
    color: "#7C3AED",
    entries: [
      { role: "지도자", name: "" },
      { role: "상담자 1", name: "" },
      { role: "상담자 2", name: "" },
      { role: "상담자 3", name: "" },
      { role: "상담자 4", name: "" },
      { role: "상담자 5", name: "" },
    ],
  },
  {
    title: "독신 대표 · 음악",
    color: "#475569",
    entries: [
      { role: "독신 형제대표", name: "" },
      { role: "독신 자매대표", name: "" },
      { role: "음악 위원장", name: "" },
      { role: "지휘자 1", name: "" },
      { role: "지휘자 2", name: "" },
      { role: "지휘자 3", name: "" },
      { role: "지휘자 4", name: "" },
      { role: "지휘자 5", name: "" },
      { role: "반주자 1", name: "" },
      { role: "반주자 2", name: "" },
      { role: "반주자 3", name: "" },
      { role: "반주자 4", name: "" },
      { role: "반주자 5", name: "" },
    ],
  },
  {
    title: "기 타 부 름",
    color: "#64748B",
    entries: [
      { role: "와드 취업 전문가", name: "" },
      { role: "와드 방역 책임자", name: "" },
      { role: "건물대표", name: "" },
      { role: "와드 통역 담당자", name: "" },
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
