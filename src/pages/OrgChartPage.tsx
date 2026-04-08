import { useState, useRef, useCallback, useEffect } from "react";
import { useCallingMembers } from "@/hooks/useCallingMembers";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────
interface OrgEntry { role: string; callingKey?: string; }
interface OrgSection { id: string; title: string; color: string; entries: OrgEntry[]; }

// ───────────────────────────────────────────────────────────
// All sections
// ───────────────────────────────────────────────────────────
const ALL_SECTIONS: OrgSection[] = [
  { id: "bishop", title: "감 독 단", color: "#f97316", entries: [
    { role: "감 독",     callingKey: "감독" },
    { role: "1 보 좌",   callingKey: "감독단 1보좌" },
    { role: "2 보 좌",   callingKey: "감독단 2보좌" },
    { role: "집행 서기", callingKey: "와드 집행 서기" },
    { role: "와드 서기", callingKey: "와드 서기" },
    { role: "보조 서기", callingKey: "와드 보조 서기" },
    { role: "건물 대표", callingKey: "건물대표" },
  ]},
  { id: "elders", title: "장로정원회", color: "#2563EB", entries: [
    { role: "회장",         callingKey: "장로정원회 회장" },
    { role: "제1보좌",      callingKey: "장로정원회 회장 제1보좌" },
    { role: "제2보좌",      callingKey: "장로정원회 회장 제2보좌" },
    { role: "서기",         callingKey: "장로정원회 서기" },
    { role: "보조 서기",    callingKey: "장로정원회 보조 서기" },
    { role: "교사 1",       callingKey: "장로정원회 교사 1" },
    { role: "교사 2",       callingKey: "장로정원회 교사 2" },
    { role: "교사 3",       callingKey: "장로정원회 교사 3" },
    { role: "교사 4",       callingKey: "장로정원회 교사 4" },
    { role: "교사 5",       callingKey: "장로정원회 교사 5" },
  ]},
  { id: "rs", title: "상호부조회", color: "#0D9488", entries: [
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
  ]},
  { id: "aaronic", title: "아론신권정원회", color: "#16A34A", entries: [
    { role: "정원회 회장",         callingKey: "아론신권 정원회 회장" },
    { role: "정원회 제1보좌",      callingKey: "아론신권 정원회 제1보좌" },
    { role: "정원회 제2보좌",      callingKey: "아론신권 정원회 제2보좌" },
    { role: "제사 정원회 회장",    callingKey: "제사 정원회 회장" },
    { role: "제사 제1보조",        callingKey: "제사 정원회 제1보조" },
    { role: "제사 제2보조",        callingKey: "제사 정원회 제2보조" },
    { role: "제사 서기",           callingKey: "제사 정원회 서기" },
    { role: "교사 정원회 회장",    callingKey: "교사 정원회 회장" },
    { role: "교사 제1보조",        callingKey: "교사 정원회 제1보조" },
    { role: "교사 제2보조",        callingKey: "교사 정원회 제2보조" },
    { role: "교사 서기",           callingKey: "교사 정원회 서기" },
    { role: "집사 정원회 회장",    callingKey: "집사 정원회 회장" },
    { role: "집사 제1보조",        callingKey: "집사 정원회 제1보조" },
    { role: "집사 제2보조",        callingKey: "집사 정원회 제2보조" },
    { role: "집사 서기",           callingKey: "집사 정원회 서기" },
  ]},
  { id: "yw", title: "청녀", color: "#DB2777", entries: [
    { role: "회장",       callingKey: "청녀 회장" },
    { role: "제1보좌",    callingKey: "청녀 제1보좌" },
    { role: "제2보좌",    callingKey: "청녀 제2보좌" },
    { role: "서기",       callingKey: "청녀 서기" },
    { role: "반 회장",    callingKey: "청녀 반 회장" },
    { role: "반 제1보좌", callingKey: "청녀 반 제1보좌" },
    { role: "반 제2보좌", callingKey: "청녀 반 제2보좌" },
    { role: "반 서기",    callingKey: "청녀 반 서기" },
  ]},
  { id: "primary", title: "초등회", color: "#D97706", entries: [
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
  ]},
  { id: "ss", title: "주일학교", color: "#0891B2", entries: [
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
    { role: "복음교리 A반 1",    callingKey: "복음교리 A반 교사 1" },
    { role: "복음교리 A반 2",    callingKey: "복음교리 A반 교사 2" },
    { role: "복음교리 A반 3",    callingKey: "복음교리 A반 교사 3" },
    { role: "복음교리 B반 1",    callingKey: "복음교리 B반 교사 1" },
    { role: "복음교리 B반 2",    callingKey: "복음교리 B반 교사 2" },
    { role: "복음교리 B반 3",    callingKey: "복음교리 B반 교사 3" },
    { role: "복음교리 C반 1",    callingKey: "복음교리 C반 교사 1" },
    { role: "복음교리 C반 2",    callingKey: "복음교리 C반 교사 2" },
    { role: "복음교리 C반 3",    callingKey: "복음교리 C반 교사 3" },
    { role: "청소년 교사 1",     callingKey: "청소년 교사 1" },
    { role: "청소년 교사 2",     callingKey: "청소년 교사 2" },
    { role: "청소년 교사 3",     callingKey: "청소년 교사 3" },
  ]},
  { id: "singles", title: "와드 독신 대표", color: "#475569", entries: [
    { role: "독신 형제대표", callingKey: "와드 독신 형제대표" },
    { role: "독신 자매대표", callingKey: "와드 독신 자매대표" },
  ]},
  { id: "mission", title: "와드 선교", color: "#DC2626", entries: [
    { role: "선교 담당자", callingKey: "와드 선교 담당자" },
    ...Array.from({ length: 10 }, (_, i) => ({ role: `선교사 ${i + 1}`, callingKey: `와드 선교사 ${i + 1}` })),
  ]},
  { id: "seminary", title: "세미나리", color: "#7C3AED", entries:
    Array.from({ length: 5 }, (_, i) => ({ role: `세미나리 교사 ${i + 1}`, callingKey: `세미나리 교사 ${i + 1}` }))
  },
  { id: "other", title: "기타 부름", color: "#94A3B8", entries: [
    { role: "취업 전문가",  callingKey: "와드 취업 전문가" },
    { role: "방역 책임자",  callingKey: "와드 방역 책임자" },
    { role: "건물대표",     callingKey: "건물대표" },
    { role: "통역 담당자",  callingKey: "와드 통역 담당자" },
  ]},
];

// Row layout: bishop alone on row 0, then 5 columns per row
const ROW_LAYOUT: string[][] = [
  ["bishop"],
  ["elders", "rs", "aaronic", "yw", "primary"],
  ["ss", "singles", "mission", "seminary", "other"],
];

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

// ───────────────────────────────────────────────────────────
// Section Card Component
// ───────────────────────────────────────────────────────────
function SectionCard({ sec, hideEmpty, callingMap }: {
  sec: OrgSection;
  hideEmpty: boolean;
  callingMap: Record<string, string>;
}) {
  const visibleEntries = hideEmpty
    ? sec.entries.filter(e => e.callingKey && callingMap[e.callingKey])
    : sec.entries;

  return (
    <div style={{
      border: "1.5px solid #e2e8f0",
      borderRadius: 6,
      overflow: "hidden",
      background: "#fff",
      fontSize: 11,
      width: 182,
      flexShrink: 0,
    }}>
      <div style={{
        background: sec.color,
        color: "#fff",
        textAlign: "center",
        padding: "6px 4px",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.05em",
      }}>
        {sec.title}
      </div>
      {visibleEntries.length === 0 ? (
        <div style={{ padding: "8px", color: "#cbd5e1", fontSize: 10, textAlign: "center" }}>
          배정된 부름 없음
        </div>
      ) : visibleEntries.map((e, i) => {
        const name = e.callingKey ? callingMap[e.callingKey] : undefined;
        return (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
            padding: "3px 8px",
            gap: 4,
          }}>
            <span style={{ color: "#64748b", flexShrink: 0, minWidth: 86, fontSize: 10 }}>{e.role}</span>
            <span style={{ fontWeight: name ? 600 : 400, color: name ? "#1e293b" : "#cbd5e1", fontSize: 11 }}>
              {name ?? "미배정"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [hideEmpty, setHideEmpty] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const { data: callingMap = {}, isLoading } = useCallingMembers();

  // ── Zoom ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setScale(s => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
      setOffset(o => ({
        x: mx - (mx - o.x) * (ns / s),
        y: my - (my - o.y) * (ns / s),
      }));
      return ns;
    });
  }, []);

  // ── Pan ──
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setOffset({
        x: panStart.current.ox + e.clientX - panStart.current.x,
        y: panStart.current.oy + e.clientY - panStart.current.y,
      });
    }
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = () => {
    setScale(0.7);
    setOffset({ x: 40, y: 40 });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">조직도</h1>
          <p className="text-xs text-muted-foreground">
            마우스 휠: 확대/축소 · 드래그: 이동
            {isLoading && <span className="ml-2 text-primary">로딩 중...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!hideEmpty}
              onChange={e => setHideEmpty(!e.target.checked)}
              className="w-3.5 h-3.5 accent-primary"
            />
            미배정 숨김 해제
          </label>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.2))}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.max(MIN_SCALE, s * 0.8))}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              <RotateCcw className="w-3 h-3" />초기화
            </button>
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-muted/30"
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Transformed content */}
        <div style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          userSelect: "none",
        }}>
          {/* Title */}
          <div style={{ textAlign: "center", width: 1060, marginBottom: 20, pointerEvents: "none" }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.3em", color: "#1e293b" }}>
              신 풍 와 드 조 직 도
            </h2>
          </div>

          {/* Flow layout: rows of sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ROW_LAYOUT.map((rowIds, rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  // Center the bishop row
                  justifyContent: rowIds.length === 1 ? "center" : "flex-start",
                }}
              >
                {rowIds.map(id => {
                  const sec = ALL_SECTIONS.find(s => s.id === id);
                  if (!sec) return null;
                  return (
                    <SectionCard
                      key={sec.id}
                      sec={sec}
                      hideEmpty={hideEmpty}
                      callingMap={callingMap}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
