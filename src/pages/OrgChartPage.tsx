import { useState, useRef, useCallback, useEffect } from "react";
import { useCallingMembers } from "@/hooks/useCallingMembers";
import { Pencil, Save, RotateCcw } from "lucide-react";

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────

interface OrgEntry { role: string; callingKey?: string; }
interface OrgSection { id: string; title: string; color: string; entries: OrgEntry[]; }
type PositionMap = { [id: string]: { x: number; y: number } };

// ───────────────────────────────────────────────────────────
// Section definitions
// ───────────────────────────────────────────────────────────

const ALL_SECTIONS: OrgSection[] = [
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
  { id: "seminary", title: "세미나리", color: "#7C3AED", entries: Array.from({ length: 5 }, (_, i) => ({ role: `세미나리 교사 ${i + 1}`, callingKey: `세미나리 교사 ${i + 1}` })) },
  { id: "other", title: "기타 부름", color: "#94A3B8", entries: [
    { role: "취업 전문가",  callingKey: "와드 취업 전문가" },
    { role: "방역 책임자",  callingKey: "와드 방역 책임자" },
    { role: "건물대표",     callingKey: "건물대표" },
    { role: "통역 담당자",  callingKey: "와드 통역 담당자" },
  ]},
];

const SECTION_W = 182;
const TOP_OFFSET_Y = 150; // space below fixed top section

function defaultPositions(): PositionMap {
  const pos: PositionMap = {};
  const perRow = 5;
  ALL_SECTIONS.forEach((sec, i) => {
    pos[sec.id] = {
      x: (i % perRow) * (SECTION_W + 12),
      y: TOP_OFFSET_Y + Math.floor(i / perRow) * 320,
    };
  });
  return pos;
}

const STORAGE_KEY = "orgchart-freepos-v1";
function loadPositions(): PositionMap {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : defaultPositions(); }
  catch { return defaultPositions(); }
}
function savePositions(p: PositionMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

// ───────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [editMode, setEditMode] = useState(false);
  const [positions, setPositions] = useState<PositionMap>(loadPositions);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const dragStart = useRef({ mouseX: 0, mouseY: 0, secX: 0, secY: 0 });

  const { data: callingMap = {}, isLoading } = useCallingMembers();

  // ── helpers ──
  const clientToCanvas = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (cx - rect.left - offset.x) / scale, y: (cy - rect.top - offset.y) / scale };
  }, [offset, scale]);

  // ── wheel zoom ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setScale(s => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
      setOffset(o => ({
        x: mouseX - (mouseX - o.x) * (ns / s),
        y: mouseY - (mouseY - o.y) * (ns / s),
      }));
      return ns;
    });
  }, []);

  // ── canvas pan (background) ──
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  // ── section drag start ──
  const onSectionMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!editMode) return;
    e.stopPropagation();
    const cp = clientToCanvas(e.clientX, e.clientY);
    dragStart.current = { mouseX: cp.x, mouseY: cp.y, secX: positions[id]?.x ?? 0, secY: positions[id]?.y ?? 0 };
    setDraggingId(id);
  }, [editMode, clientToCanvas, positions]);

  // ── global mouse move ──
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingId) {
      const cp = clientToCanvas(e.clientX, e.clientY);
      const dx = cp.x - dragStart.current.mouseX;
      const dy = cp.y - dragStart.current.mouseY;
      setPositions(p => ({
        ...p,
        [draggingId]: { x: dragStart.current.secX + dx, y: dragStart.current.secY + dy },
      }));
    } else if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
    }
  }, [draggingId, clientToCanvas]);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    setDraggingId(null);
  }, []);

  const handleSave = () => {
    savePositions(positions);
    setEditMode(false);
  };

  const handleReset = () => {
    const d = defaultPositions();
    setPositions(d);
    savePositions(d);
  };

  const assignedEntries = (sec: OrgSection) =>
    sec.entries.filter(e => e.callingKey && callingMap[e.callingKey]);

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">조직도</h1>
          <p className="text-xs text-muted-foreground">
            {editMode ? "섹션을 드래그하여 원하는 위치로 이동 후 저장하세요" : "마우스 휠: 확대/축소 · 드래그: 이동"}
            {isLoading && <span className="ml-2 text-primary">로딩 중...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border text-xs hover:bg-muted text-muted-foreground">
                <RotateCcw className="w-3 h-3" />초기화
              </button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                <Save className="w-3.5 h-3.5" />저장
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs hover:bg-muted">
                <Pencil className="w-3.5 h-3.5" />편집
              </button>
              <div className="flex items-center gap-1 ml-1">
                <button onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.2))} className="px-2 py-1 rounded border border-border text-xs hover:bg-muted">＋</button>
                <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.max(MIN_SCALE, s * 0.8))} className="px-2 py-1 rounded border border-border text-xs hover:bg-muted">－</button>
                <button onClick={() => { setScale(0.7); setOffset({ x: 40, y: 40 }); }} className="px-2 py-1 rounded border border-border text-xs hover:bg-muted">초기화</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-muted/30"
        style={{ cursor: draggingId ? "grabbing" : isPanning.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Grid dots in edit mode */}
        {editMode && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: `${24 * scale}px ${24 * scale}px`,
              backgroundPosition: `${offset.x % (24 * scale)}px ${offset.y % (24 * scale)}px`,
            }}
          />
        )}

        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0, left: 0,
            userSelect: "none",
          }}
        >
          {/* ── 제목 ── */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 1000, textAlign: "center", pointerEvents: "none" }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.3em", color: "#1e293b" }}>
              신 풍 와 드 조 직 도
            </h2>
          </div>

          {/* ── 고정 감독단 (image-3 layout) ── */}
          <FixedTopSection callingMap={callingMap} />

          {/* ── Free sections ── */}
          {ALL_SECTIONS.map(sec => {
            const pos = positions[sec.id] ?? { x: 0, y: 0 };
            const entries = assignedEntries(sec);
            return (
              <div
                key={sec.id}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: SECTION_W,
                  cursor: editMode ? (draggingId === sec.id ? "grabbing" : "grab") : "default",
                  zIndex: draggingId === sec.id ? 100 : 1,
                  filter: editMode && draggingId === sec.id ? "drop-shadow(0 8px 16px rgba(0,0,0,0.25))" : undefined,
                  transition: draggingId === sec.id ? "none" : "filter 0.15s",
                }}
                onMouseDown={(e) => onSectionMouseDown(e, sec.id)}
              >
                {/* Edit mode drag indicator */}
                {editMode && (
                  <div style={{
                    position: "absolute", top: -20, left: 0, right: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#64748b", gap: 3,
                  }}>
                    <span>⠿</span><span>드래그</span>
                  </div>
                )}
                <div style={{
                  border: editMode ? `2px dashed ${sec.color}` : "1.5px solid #e2e8f0",
                  borderRadius: 6, overflow: "hidden", background: "#fff", fontSize: 11,
                }}>
                  <div style={{ background: sec.color, color: "#fff", textAlign: "center", padding: "6px 4px", fontWeight: 800, fontSize: 12, letterSpacing: "0.05em" }}>
                    {sec.title}
                  </div>
                  {entries.length === 0 ? (
                    <div style={{ padding: "8px", color: "#cbd5e1", fontSize: 10, textAlign: "center" }}>배정된 부름 없음</div>
                  ) : entries.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", borderTop: i === 0 ? "none" : "1px solid #f1f5f9", padding: "3px 8px", gap: 4 }}>
                      <span style={{ color: "#64748b", flexShrink: 0, minWidth: 86, fontSize: 10 }}>{e.role}</span>
                      <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 11 }}>{e.callingKey ? callingMap[e.callingKey] ?? "" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Fixed top section — matches image-3 layout
// ───────────────────────────────────────────────────────────

function FixedTopSection({ callingMap }: { callingMap: Record<string, string> }) {
  const bishop = callingMap["감독"] ?? "";
  const c1 = callingMap["감독단 1보좌"] ?? "";
  const c2 = callingMap["감독단 2보좌"] ?? "";
  const exec = callingMap["와드 집행 서기"] ?? "";
  const ward = callingMap["와드 서기"] ?? "";
  const asst = callingMap["와드 보조 서기"] ?? "";
  const bldg = callingMap["건물대표"] ?? "";

  const labelStyle = (bg: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", border: `2px solid ${bg}`,
    borderRadius: 3, overflow: "hidden", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
  });
  const tag = (bg: string) => ({ background: bg, color: "#fff", padding: "3px 8px" });
  const val = (w = 60): React.CSSProperties => ({ padding: "3px 10px", color: "#1e293b", minWidth: w, textAlign: "center" as const });
  const small = (bg: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", border: `1.5px solid #e2e8f0`,
    borderRadius: 3, overflow: "hidden", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
  });
  const stag = (bg: string) => ({ background: bg, color: "#fff", padding: "2px 7px", fontSize: 11, fontWeight: 700 });

  return (
    <div style={{ position: "absolute", top: 36, left: 0, pointerEvents: "none" }}>
      {/* 감독 — centered */}
      <div style={{ display: "flex", justifyContent: "center", width: 960, marginBottom: 16 }}>
        <div style={labelStyle("#f97316")}>
          <span style={tag("#f97316")}>감 독</span>
          <span style={val(80)}>{bishop || <span style={{ color: "#cbd5e1", fontWeight: 400, fontSize: 11 }}>미배정</span>}</span>
        </div>
      </div>

      {/* Row: 1보좌 / 2보좌 / [spacer] / 집행서기~보조서기+건물대표 */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, width: 960 }}>
        {/* 1보좌 */}
        <div style={{ width: 170 }}>
          <div style={small("#1e40af")}>
            <span style={stag("#1e40af")}>1 보 좌</span>
            <span style={val(64)}>{c1 || <span style={{ color: "#cbd5e1", fontWeight: 400 }}>미배정</span>}</span>
          </div>
        </div>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* 2보좌 */}
        <div style={{ width: 170, display: "flex", justifyContent: "center" }}>
          <div style={small("#1e40af")}>
            <span style={stag("#1e40af")}>2 보 좌</span>
            <span style={val(64)}>{c2 || <span style={{ color: "#cbd5e1", fontWeight: 400 }}>미배정</span>}</span>
          </div>
        </div>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* 집행서기 / 와드서기 / 보조서기 stacked + 건물대표 */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {/* secretary stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "집행 서기", val: exec },
              { label: "와드 서기", val: ward },
              { label: "보조 서기", val: asst },
            ].map(item => (
              <div key={item.label} style={small("#475569")}>
                <span style={stag("#475569")}>{item.label}</span>
                <span style={val(60)}>{item.val || <span style={{ color: "#cbd5e1", fontWeight: 400 }}>미배정</span>}</span>
              </div>
            ))}
          </div>
          {/* 건물대표 */}
          <div style={small("#64748b")}>
            <span style={stag("#64748b")}>건물 대표</span>
            <span style={val(60)}>{bldg || <span style={{ color: "#cbd5e1", fontWeight: 400 }}>미배정</span>}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
