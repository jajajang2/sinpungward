import { useState, useRef, useCallback, useEffect } from "react";
import { useCallingMembers } from "@/hooks/useCallingMembers";

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────

interface OrgEntry {
  role: string;
  callingKey?: string;
}

interface OrgSection {
  title: string;
  color: string;
  entries: OrgEntry[];
}

// ───────────────────────────────────────────────────────────
// Static data
// ───────────────────────────────────────────────────────────

const TOP_SECTION: OrgEntry[] = [
  { role: "감 독",    callingKey: "감독" },
  { role: "건물 대표", callingKey: "건물대표" },
];

const BISHOP_ROW: OrgEntry[] = [
  { role: "1 보 좌",  callingKey: "감독단 1보좌" },
  { role: "2 보 좌",  callingKey: "감독단 2보좌" },
  { role: "집행 서기", callingKey: "와드 집행 서기" },
  { role: "와드 서기", callingKey: "와드 서기" },
  { role: "보조 서기", callingKey: "와드 보조 서기" },
];

// Sections grouped by row
const SECTIONS_ROW1: OrgSection[] = [
  {
    title: "장 로 정 원 회",
    color: "#2563EB",
    entries: [
      { role: "회장",          callingKey: "장로정원회 회장" },
      { role: "제1보좌",       callingKey: "장로정원회 회장 제1보좌" },
      { role: "제2보좌",       callingKey: "장로정원회 회장 제2보좌" },
      { role: "서기",          callingKey: "장로정원회 서기" },
      { role: "보조 서기",     callingKey: "장로정원회 보조 서기" },
      { role: "교사 1",        callingKey: "장로정원회 교사 1" },
      { role: "교사 2",        callingKey: "장로정원회 교사 2" },
      { role: "교사 3",        callingKey: "장로정원회 교사 3" },
      { role: "교사 4",        callingKey: "장로정원회 교사 4" },
      { role: "교사 5",        callingKey: "장로정원회 교사 5" },
    ],
  },
  {
    title: "상 호 부 조 회",
    color: "#0D9488",
    entries: [
      { role: "회장",      callingKey: "상호부조회 회장" },
      { role: "제1보좌",   callingKey: "상호부조회 회장 제1보좌" },
      { role: "제2보좌",   callingKey: "상호부조회 회장 제2보좌" },
      { role: "서기",      callingKey: "상호부조회 서기" },
      { role: "보조 서기", callingKey: "상호부조회 보조 서기" },
      { role: "교사 1",    callingKey: "상호부조회 교사 1" },
      { role: "교사 2",    callingKey: "상호부조회 교사 2" },
      { role: "교사 3",    callingKey: "상호부조회 교사 3" },
      { role: "교사 4",    callingKey: "상호부조회 교사 4" },
      { role: "교사 5",    callingKey: "상호부조회 교사 5" },
    ],
  },
  {
    title: "아론신권정원회",
    color: "#16A34A",
    entries: [
      { role: "정원회 회장",        callingKey: "아론신권 정원회 회장" },
      { role: "정원회 제1보좌",     callingKey: "아론신권 정원회 제1보좌" },
      { role: "정원회 제2보좌",     callingKey: "아론신권 정원회 제2보좌" },
      { role: "제사 정원회 회장",   callingKey: "제사 정원회 회장" },
      { role: "제사 정원회 제1보조", callingKey: "제사 정원회 제1보조" },
      { role: "제사 정원회 제2보조", callingKey: "제사 정원회 제2보조" },
      { role: "제사 정원회 서기",   callingKey: "제사 정원회 서기" },
      { role: "교사 정원회 회장",   callingKey: "교사 정원회 회장" },
      { role: "교사 정원회 제1보조", callingKey: "교사 정원회 제1보조" },
      { role: "교사 정원회 제2보조", callingKey: "교사 정원회 제2보조" },
      { role: "교사 정원회 서기",   callingKey: "교사 정원회 서기" },
      { role: "집사 정원회 회장",   callingKey: "집사 정원회 회장" },
      { role: "집사 정원회 제1보조", callingKey: "집사 정원회 제1보조" },
      { role: "집사 정원회 제2보조", callingKey: "집사 정원회 제2보조" },
      { role: "집사 정원회 서기",   callingKey: "집사 정원회 서기" },
    ],
  },
  {
    title: "청 녀",
    color: "#DB2777",
    entries: [
      { role: "회장",     callingKey: "청녀 회장" },
      { role: "제1보좌",  callingKey: "청녀 제1보좌" },
      { role: "제2보좌",  callingKey: "청녀 제2보좌" },
      { role: "서기",     callingKey: "청녀 서기" },
      { role: "반 회장",  callingKey: "청녀 반 회장" },
      { role: "반 제1보좌", callingKey: "청녀 반 제1보좌" },
      { role: "반 제2보좌", callingKey: "청녀 반 제2보좌" },
      { role: "반 서기",  callingKey: "청녀 반 서기" },
    ],
  },
  {
    title: "주 일 학 교",
    color: "#0891B2",
    entries: [
      { role: "회장",              callingKey: "주일학교 회장" },
      { role: "회장단 제1보좌",    callingKey: "주일학교 회장단 제1보좌" },
      { role: "회장단 제2보좌",    callingKey: "주일학교 회장단 제2보좌" },
      { role: "회장단 서기",       callingKey: "주일학교 회장단 서기" },
      { role: "회장단 보조서기",   callingKey: "주일학교 회장단 보조서기" },
      { role: "독신성인 교사 1",   callingKey: "독신성인 교사 1" },
      { role: "독신성인 교사 2",   callingKey: "독신성인 교사 2" },
      { role: "독신성인 교사 3",   callingKey: "독신성인 교사 3" },
      { role: "독신성인 교사 4",   callingKey: "독신성인 교사 4" },
      { role: "독신성인 교사 5",   callingKey: "독신성인 교사 5" },
      { role: "복음교리 교사 1",   callingKey: "복음교리 교사 1" },
      { role: "복음교리 교사 2",   callingKey: "복음교리 교사 2" },
      { role: "복음교리 교사 3",   callingKey: "복음교리 교사 3" },
      { role: "복음교리 교사 4",   callingKey: "복음교리 교사 4" },
      { role: "복음교리 교사 5",   callingKey: "복음교리 교사 5" },
      { role: "복음교리 A반 교사 1", callingKey: "복음교리 A반 교사 1" },
      { role: "복음교리 A반 교사 2", callingKey: "복음교리 A반 교사 2" },
      { role: "복음교리 A반 교사 3", callingKey: "복음교리 A반 교사 3" },
      { role: "복음교리 B반 교사 1", callingKey: "복음교리 B반 교사 1" },
      { role: "복음교리 B반 교사 2", callingKey: "복음교리 B반 교사 2" },
      { role: "복음교리 B반 교사 3", callingKey: "복음교리 B반 교사 3" },
      { role: "복음교리 C반 교사 1", callingKey: "복음교리 C반 교사 1" },
      { role: "복음교리 C반 교사 2", callingKey: "복음교리 C반 교사 2" },
      { role: "복음교리 C반 교사 3", callingKey: "복음교리 C반 교사 3" },
      { role: "청소년 교사 1",     callingKey: "청소년 교사 1" },
      { role: "청소년 교사 2",     callingKey: "청소년 교사 2" },
      { role: "청소년 교사 3",     callingKey: "청소년 교사 3" },
    ],
  },
];

const SECTIONS_ROW2: OrgSection[] = [
  {
    title: "초 등 회",
    color: "#D97706",
    entries: [
      { role: "회장",           callingKey: "초등회 회장" },
      { role: "회장단 제1보좌", callingKey: "초등회 회장단 제1보좌" },
      { role: "회장단 제2보좌", callingKey: "초등회 회장단 제2보좌" },
      { role: "회장단 서기",    callingKey: "초등회 회장단 서기" },
      { role: "유아반 교사 1",  callingKey: "유아반 교사 1" },
      { role: "유아반 교사 2",  callingKey: "유아반 교사 2" },
      { role: "유아반 교사 3",  callingKey: "유아반 교사 3" },
      { role: "해님반 교사 1",  callingKey: "해님반 교사 1" },
      { role: "해님반 교사 2",  callingKey: "해님반 교사 2" },
      { role: "해님반 교사 3",  callingKey: "해님반 교사 3" },
      { role: "정의반 교사 1",  callingKey: "정의반 교사 1" },
      { role: "정의반 교사 2",  callingKey: "정의반 교사 2" },
      { role: "정의반 교사 3",  callingKey: "정의반 교사 3" },
      { role: "용기반 교사 1",  callingKey: "용기반 교사 1" },
      { role: "용기반 교사 2",  callingKey: "용기반 교사 2" },
      { role: "용기반 교사 3",  callingKey: "용기반 교사 3" },
    ],
  },
  {
    title: "와드 선교",
    color: "#DC2626",
    entries: [
      { role: "선교 담당자", callingKey: "와드 선교 담당자" },
      ...Array.from({ length: 10 }, (_, i) => ({
        role: `선교사 ${i + 1}`,
        callingKey: `와드 선교사 ${i + 1}`,
      })),
    ],
  },
  {
    title: "성전·가족 역사",
    color: "#7C3AED",
    entries: [
      { role: "지도자",   callingKey: "성전 및 가족 역사 지도자" },
      { role: "상담자 1", callingKey: "성전 및 가족 역사 상담자 1" },
      { role: "상담자 2", callingKey: "성전 및 가족 역사 상담자 2" },
      { role: "상담자 3", callingKey: "성전 및 가족 역사 상담자 3" },
      { role: "상담자 4", callingKey: "성전 및 가족 역사 상담자 4" },
      { role: "상담자 5", callingKey: "성전 및 가족 역사 상담자 5" },
    ],
  },
  {
    title: "와드 독신 대표",
    color: "#475569",
    entries: [
      { role: "독신 형제대표", callingKey: "와드 독신 형제대표" },
      { role: "독신 자매대표", callingKey: "와드 독신 자매대표" },
    ],
  },
  {
    title: "음 악 위 원 회",
    color: "#64748B",
    entries: [
      { role: "음악 위원장",   callingKey: "음악 위원장" },
      { role: "지휘자 1",      callingKey: "지휘자 1" },
      { role: "지휘자 2",      callingKey: "지휘자 2" },
      { role: "지휘자 3",      callingKey: "지휘자 3" },
      { role: "지휘자 4",      callingKey: "지휘자 4" },
      { role: "지휘자 5",      callingKey: "지휘자 5" },
      { role: "반주자 1",      callingKey: "반주자 1" },
      { role: "반주자 2",      callingKey: "반주자 2" },
      { role: "반주자 3",      callingKey: "반주자 3" },
      { role: "반주자 4",      callingKey: "반주자 4" },
      { role: "반주자 5",      callingKey: "반주자 5" },
    ],
  },
];

const SECTIONS_ROW3: OrgSection[] = [
  {
    title: "기 타 부 름",
    color: "#94A3B8",
    entries: [
      { role: "취업 전문가",  callingKey: "와드 취업 전문가" },
      { role: "방역 책임자",  callingKey: "와드 방역 책임자" },
      { role: "건물대표",     callingKey: "건물대표" },
      { role: "통역 담당자",  callingKey: "와드 통역 담당자" },
    ],
  },
];

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

// ───────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────

const OrgChartPage = () => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fittedRef = useRef(false);

  const { data: callingMap = {}, isLoading } = useCallingMembers();

  // Fit content to container once data is loaded
  useEffect(() => {
    if (isLoading || fittedRef.current) return;
    const fit = () => {
      if (!containerRef.current || !contentRef.current) return;
      const cw = containerRef.current.clientWidth - 48;
      const ch = containerRef.current.clientHeight - 48;
      const nw = contentRef.current.scrollWidth;
      const nh = contentRef.current.scrollHeight;
      const s = Math.min(cw / nw, ch / nh, 1);
      setScale(Math.max(s, MIN_SCALE));
      setOffset({ x: 24, y: 24 });
      fittedRef.current = true;
    };
    const t = setTimeout(fit, 200);
    return () => clearTimeout(t);
  }, [isLoading]);

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

  const filterEntries = (entries: OrgEntry[]) =>
    hideEmpty ? entries.filter(e => e.callingKey && callingMap[e.callingKey]) : entries;

  const filterSection = (sec: OrgSection): OrgSection => ({
    ...sec,
    entries: filterEntries(sec.entries),
  });

  const visibleRow1 = SECTIONS_ROW1.map(filterSection).filter(s => !hideEmpty || s.entries.length > 0);
  const visibleRow2 = SECTIONS_ROW2.map(filterSection).filter(s => !hideEmpty || s.entries.length > 0);
  const visibleRow3 = SECTIONS_ROW3.map(filterSection).filter(s => !hideEmpty || s.entries.length > 0);

  const topVisible = hideEmpty
    ? TOP_SECTION.filter(e => e.callingKey && callingMap[e.callingKey])
    : TOP_SECTION;
  const bishopVisible = hideEmpty
    ? BISHOP_ROW.filter(e => e.callingKey && callingMap[e.callingKey])
    : BISHOP_ROW;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">조직도</h1>
          <p className="text-xs text-muted-foreground">
            마우스 휠: 확대/축소 · 드래그: 이동
            {isLoading && <span className="ml-2 text-primary">회원 데이터 로딩 중...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Hide empty toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={e => setHideEmpty(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary"
            />
            미배정 숨김
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.2))}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >＋</button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.max(MIN_SCALE, s * 0.8))}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >－</button>
            <button
              onClick={() => { fittedRef.current = false; setScale(1); setOffset({ x: 0, y: 0 }); }}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted ml-1"
            >초기화</button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-muted/30"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
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
          {topVisible.length > 0 && (
            <div className="flex justify-center gap-6 mb-3">
              {topVisible.map((e) => (
                <TopCard
                  key={e.role}
                  role={e.role}
                  name={e.callingKey ? (callingMap[e.callingKey] ?? "") : ""}
                />
              ))}
            </div>
          )}

          {/* ── 감독단 보좌 row ── */}
          {bishopVisible.length > 0 && (
            <div className="flex justify-center gap-3 mb-6">
              {bishopVisible.map((e) => (
                <BishopCard
                  key={e.role}
                  role={e.role}
                  name={e.callingKey ? (callingMap[e.callingKey] ?? "") : ""}
                />
              ))}
            </div>
          )}

          {/* ── Row 1: 장로/상호부조/아론/청녀/주일학교 ── */}
          {visibleRow1.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
              {visibleRow1.map((sec) => (
                <SectionColumn key={sec.title} sec={sec} callingMap={callingMap} hideEmpty={hideEmpty} />
              ))}
            </div>
          )}

          {/* ── Row 2: 초등회/와드선교/성전/독신/음악 ── */}
          {visibleRow2.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
              {visibleRow2.map((sec) => (
                <SectionColumn key={sec.title} sec={sec} callingMap={callingMap} hideEmpty={hideEmpty} />
              ))}
            </div>
          )}

          {/* ── Row 3: 기타부름 ── */}
          {visibleRow3.length > 0 && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {visibleRow3.map((sec) => (
                <SectionColumn key={sec.title} sec={sec} callingMap={callingMap} hideEmpty={hideEmpty} />
              ))}
            </div>
          )}
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
    <span style={{ padding: "4px 12px", color: "#1e293b", minWidth: 64, textAlign: "center" }}>
      {name || <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 11 }}>미배정</span>}
    </span>
  </div>
);

const BishopCard = ({ role, name }: { role: string; name: string }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", border: "1.5px solid #e2e8f0",
    borderRadius: 4, overflow: "hidden", fontSize: 12, background: "#fff",
  }}>
    <span style={{ background: "#1e40af", color: "#fff", padding: "3px 8px", fontWeight: 700 }}>{role}</span>
    <span style={{ padding: "3px 10px", color: "#1e293b", fontWeight: name ? 600 : 400, minWidth: 52, textAlign: "center" }}>
      {name || <span style={{ color: "#94a3b8", fontSize: 11 }}>미배정</span>}
    </span>
  </div>
);

const SectionColumn = ({
  sec,
  callingMap,
  hideEmpty,
}: {
  sec: OrgSection;
  callingMap: Record<string, string>;
  hideEmpty: boolean;
}) => {
  const rows = hideEmpty
    ? sec.entries.filter(e => e.callingKey && callingMap[e.callingKey])
    : sec.entries;

  if (rows.length === 0) return null;

  return (
    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 6, overflow: "hidden", background: "#fff", fontSize: 11, width: 200, flexShrink: 0 }}>
      <div style={{
        background: sec.color, color: "#fff", textAlign: "center",
        padding: "5px 4px", fontWeight: 800, fontSize: 12, letterSpacing: "0.05em",
      }}>
        {sec.title}
      </div>
      {rows.map((e, i) => {
        const memberName = e.callingKey ? (callingMap[e.callingKey] ?? "") : "";
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center",
            borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
            padding: "3px 6px", gap: 4,
          }}>
            <span style={{ color: "#64748b", flexShrink: 0, minWidth: 90, fontSize: 10 }}>{e.role}</span>
            <span style={{ fontWeight: memberName ? 600 : 400, color: memberName ? "#1e293b" : "#cbd5e1", fontSize: 11 }}>
              {memberName || "미배정"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OrgChartPage;
