import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, RotateCcw, Wand2, Users, Trash2, Printer, Loader2, Download, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import * as XLSX from "xlsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { buildScheduleAssignments, listSaturdays } from "@/lib/cleaningSchedule";
import { rebuildFamilies } from "@/lib/familyAutoBuild";

type Member = {
  id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
};
type Team = {
  id: string;
  code: string;
  name: string;
  is_fixed: boolean;
  sort_order: number;
};
type FamilyRow = {
  id: string;
  head_member_id: string | null;
  display_name_override: string | null;
};
type FMRow = {
  id: string;
  family_id: string;
  member_id: string;
  family_role: "head" | "spouse" | "child" | "single";
};
type Assignment = {
  id: string;
  family_id: string;
  team_id: string;
  assigned_method: "auto" | "manual";
};
type ScheduleRow = {
  id: string;
  clean_date: string;
  team_id: string;
  note: string | null;
};

interface FamilyView {
  id: string;
  display_name_override: string | null;
  head: Member | null;
  spouse: Member | null;
  members: Member[];
  isSingle: boolean;
  score: number; // 0~1
}

const DEFAULT_CYCLE = ["A", "B", "C", "D"];

const calcAge = (bd?: string | null): number | null => {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};
const nameWithAge = (m: { name: string; birth_date?: string | null }) => {
  const a = calcAge(m.birth_date ?? null);
  return a === null ? m.name : `${m.name}(${a}세)`;
};

export default function CleaningPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FMRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<Map<string, Set<string>>>(new Map()); // memberId -> Set<date>
  const [allServiceDates, setAllServiceDates] = useState<Set<string>>(new Set());
  const [memberCallings, setMemberCallings] = useState<Map<string, string[]>>(new Map());

  // Build dialog
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);

  // Reset dialog
  const [resetOpen, setResetOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [m, t, f, fm, a, s, att, ci] = await Promise.all([
      supabase.from("members").select("id, name, gender, birth_date"),
      supabase.from("teams").select("*").order("sort_order"),
      supabase.from("families").select("*"),
      supabase.from("family_members").select("*"),
      supabase.from("team_assignments").select("*"),
      supabase.from("cleaning_schedule").select("*").order("clean_date"),
      supabase.from("attendance").select("member_id, attendance_date, is_present"),
      supabase.from("member_church_info").select("member_id, current_calling"),
    ]);

    setMembers((m.data ?? []) as Member[]);
    setTeams((t.data ?? []) as Team[]);
    setFamilies((f.data ?? []) as FamilyRow[]);
    setFamilyMembers((fm.data ?? []) as FMRow[]);
    setAssignments((a.data ?? []) as Assignment[]);
    setSchedule((s.data ?? []) as ScheduleRow[]);

    const dateMap = new Map<string, Set<string>>();
    const all = new Set<string>();
    for (const row of att.data ?? []) {
      if (!row.is_present) continue;
      all.add(row.attendance_date);
      if (!dateMap.has(row.member_id)) dateMap.set(row.member_id, new Set());
      dateMap.get(row.member_id)!.add(row.attendance_date);
    }
    setAttendanceDates(dateMap);
    setAllServiceDates(all);

    const cmap = new Map<string, string[]>();
    for (const row of ci.data ?? []) {
      cmap.set(row.member_id, (row.current_calling as string[]) ?? []);
    }
    setMemberCallings(cmap);

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /** 가족 뷰 모델 + 출석 점수 계산 */
  const familyViews: FamilyView[] = useMemo(() => {
    const memberById = new Map(members.map((m) => [m.id, m]));
    const fmByFamily = new Map<string, FMRow[]>();
    for (const fm of familyMembers) {
      if (!fmByFamily.has(fm.family_id)) fmByFamily.set(fm.family_id, []);
      fmByFamily.get(fm.family_id)!.push(fm);
    }

    // 최근 3개월 일요일 목록 (개인별 출석률과 동일 기준)
    const today = new Date();
    const start = new Date(today); start.setMonth(start.getMonth() - 3);
    const sundays: string[] = [];
    const cur = new Date(start);
    while (cur.getDay() !== 0) cur.setDate(cur.getDate() + 1);
    while (cur <= today) {
      sundays.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 7);
    }

    return families.map((fam) => {
      const fms = fmByFamily.get(fam.id) ?? [];
      const ms = fms.map((x) => memberById.get(x.member_id)).filter(Boolean) as Member[];
      const headFm = fms.find((x) => x.family_role === "head" || x.family_role === "single");
      const spouseFm = fms.find((x) => x.family_role === "spouse");
      const head = headFm ? memberById.get(headFm.member_id) ?? null : null;
      const spouse = spouseFm ? memberById.get(spouseFm.member_id) ?? null : null;

      // 점수: 가족 멤버들의 최근 3개월 개인 출석률 평균 (0~1)
      let score = 0;
      if (ms.length > 0 && sundays.length > 0) {
        let sum = 0;
        for (const mem of ms) {
          const dates = attendanceDates.get(mem.id);
          const present = dates ? sundays.filter((d) => dates.has(d)).length : 0;
          sum += present / sundays.length;
        }
        score = sum / ms.length;
      }

      return {
        id: fam.id,
        display_name_override: fam.display_name_override,
        head,
        spouse,
        members: ms,
        isSingle: ms.length === 1,
        score,
      };
    });
  }, [families, familyMembers, members, attendanceDates]);

  const teamByCode = useMemo(() => {
    const m = new Map<string, Team>();
    teams.forEach((t) => m.set(t.code, t));
    return m;
  }, [teams]);

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    teams.forEach((t) => m.set(t.id, t));
    return m;
  }, [teams]);

  const familyById = useMemo(() => {
    const m = new Map<string, FamilyView>();
    familyViews.forEach((f) => m.set(f.id, f));
    return m;
  }, [familyViews]);

  const assignmentByFamily = useMemo(() => {
    const m = new Map<string, Assignment>();
    assignments.forEach((a) => m.set(a.family_id, a));
    return m;
  }, [assignments]);

  // ===== 액션 =====
  const handleRebuildFamilies = async () => {
    try {
      setRebuildBusy(true);
      const r = await rebuildFamilies();
      toast({ title: "가족 재구성 완료", description: `가족 ${r.familiesCreated}개 · 회원 ${r.membersAssigned}명` });
      setRebuildOpen(false);
      await loadAll();
    } catch (e: any) {
      toast({ title: "오류", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setRebuildBusy(false);
    }
  };

  const moveFamilyToTeam = async (familyId: string, teamId: string | null, method: "auto" | "manual" = "manual") => {
    const existing = assignmentByFamily.get(familyId);
    if (!teamId) {
      if (existing) {
        await supabase.from("team_assignments").delete().eq("id", existing.id);
      }
    } else if (existing) {
      if (existing.team_id === teamId) return;
      await supabase.from("team_assignments").update({ team_id: teamId, assigned_method: method }).eq("id", existing.id);
    } else {
      await supabase.from("team_assignments").insert({ family_id: familyId, team_id: teamId, assigned_method: method });
    }
    const { data } = await supabase.from("team_assignments").select("*");
    setAssignments((data ?? []) as Assignment[]);
  };

  const autoAssign = async () => {
    if (familyViews.length === 0) {
      toast({
        title: "가족이 없습니다",
        description: "먼저 우상단의 '가족 재구성' 버튼을 눌러 회원 관계로부터 가족을 생성해주세요.",
        variant: "destructive",
      });
      return;
    }
    const targetTeams = [...teams].sort((a, b) => a.sort_order - b.sort_order);
    if (targetTeams.length === 0) return;
    const T = targetTeams.length;

    // 출석률 내림차순 정렬
    const sorted = [...familyViews].sort((x, y) => y.score - x.score);

    // T개씩 밴드로 묶어 각 밴드를 랜덤 셔플 → 각 팀에 하나씩 → 팀 순서도 랜덤
    // 이렇게 하면 각 조가 고/중/저 출석률을 균등히 가지면서 매번 랜덤 배정됨
    const shuffle = <U,>(arr: U[]): U[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const buckets: string[][] = targetTeams.map(() => []);
    for (let i = 0; i < sorted.length; i += T) {
      const band = shuffle(sorted.slice(i, i + T));
      const teamOrder = shuffle(targetTeams.map((_, idx) => idx));
      band.forEach((fam, k) => {
        buckets[teamOrder[k]].push(fam.id);
      });
    }

    // 기존 모든 배정 삭제 후 새로 삽입
    await supabase.from("team_assignments").delete().not("id", "is", null);

    const rows: any[] = [];
    buckets.forEach((famIds, i) => {
      famIds.forEach((fid) =>
        rows.push({ family_id: fid, team_id: targetTeams[i].id, assigned_method: "auto" })
      );
    });
    if (rows.length > 0) {
      const { error } = await supabase.from("team_assignments").insert(rows);
      if (error) {
        toast({ title: "자동 배분 실패", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "자동 배분 완료", description: `${rows.length}개 가족 배정` });
    const { data } = await supabase.from("team_assignments").select("*");
    setAssignments((data ?? []) as Assignment[]);
  };

  const resetAll = async () => {
    await supabase.from("team_assignments").delete().not("id", "is", null);
    setAssignments([]);
    setResetOpen(false);
    toast({ title: "초기화 완료", description: "모든 조 배정이 해제되었습니다." });
  };


  // ===== Schedule generation =====
  const [genStart, setGenStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [genEnd, setGenEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [genWeeks, setGenWeeks] = useState(2);
  const [genCycle, setGenCycle] = useState(DEFAULT_CYCLE.join(","));

  const generateSchedule = async () => {
    const order = genCycle.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
    const invalid = order.filter((c) => !teamByCode.has(c));
    if (invalid.length > 0) {
      toast({ title: "잘못된 순서", description: `존재하지 않는 조: ${invalid.join(", ")}`, variant: "destructive" });
      return;
    }
    const saturdays = listSaturdays(genStart, genEnd);
    if (saturdays.length === 0) {
      toast({ title: "토요일 없음", description: "선택한 기간에 토요일이 없습니다.", variant: "destructive" });
      return;
    }
    const built = buildScheduleAssignments(saturdays, order, genWeeks);
    const rows = built.map((b) => ({
      clean_date: b.date,
      team_id: teamByCode.get(b.teamCode)!.id,
    }));
    const { error } = await supabase.from("cleaning_schedule").upsert(rows, { onConflict: "clean_date" });
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "일정 생성 완료", description: `${rows.length}개 토요일 편성` });
    const { data } = await supabase.from("cleaning_schedule").select("*").order("clean_date");
    setSchedule((data ?? []) as ScheduleRow[]);
  };

  const updateScheduleTeam = async (id: string, teamId: string) => {
    await supabase.from("cleaning_schedule").update({ team_id: teamId }).eq("id", id);
    setSchedule((s) => s.map((x) => (x.id === id ? { ...x, team_id: teamId } : x)));
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("cleaning_schedule").delete().eq("id", id);
    setSchedule((s) => s.filter((x) => x.id !== id));
  };

  // ===== DnD =====
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const familyId = String(e.active.id);
    const overId = String(e.over.id);
    if (overId === "unassigned") {
      await moveFamilyToTeam(familyId, null);
    } else {
      // overId is `team-<id>`
      const teamId = overId.replace(/^team-/, "");
      await moveFamilyToTeam(familyId, teamId);
    }
  };

  const unassignedFamilies = familyViews.filter((f) => !assignmentByFamily.get(f.id));
  const familiesByTeam = (teamId: string) =>
    assignments.filter((a) => a.team_id === teamId).map((a) => familyById.get(a.family_id)).filter(Boolean) as FamilyView[];

  // 팀 박스용 라벨: 가족이면 "{head}의 가족", 독신이면 이름만
  const teamBoxLabel = (f: FamilyView) => {
    const headName = f.head?.name ?? "(미지정)";
    return f.isSingle ? headName : `${headName}의 가족`;
  };

  // 가족 멤버 보기 다이얼로그
  const [memberDialogFamily, setMemberDialogFamily] = useState<FamilyView | null>(null);
  const [assignSheetFamily, setAssignSheetFamily] = useState<FamilyView | null>(null);
  const isMobile = useIsMobile();

  // ===== 명단(Roster) =====
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.sort_order - b.sort_order),
    [teams]
  );

  /** 가족 구성원 정렬: 대표 → 배우자 → 자녀 */
  const orderedMembers = (f: FamilyView): Member[] => {
    const headId = f.head?.id;
    const spouseId = f.spouse?.id;
    const out: Member[] = [];
    if (f.head) out.push(f.head);
    if (f.spouse) out.push(f.spouse);
    for (const m of f.members) {
      if (m.id !== headId && m.id !== spouseId) out.push(m);
    }
    return out;
  };

  /** 조별 명단 — 대표자 이름 가나다순 */
  const rosterList = (teamId: string) =>
    [...familiesByTeam(teamId)].sort((a, b) =>
      (a.head?.name ?? "").replace(/\s/g, "").localeCompare((b.head?.name ?? "").replace(/\s/g, ""), "ko")
    );

  const rosterTotals = useMemo(() => {
    let fams = 0;
    let ppl = 0;
    for (const t of teams) {
      const list = familiesByTeam(t.id);
      fams += list.length;
      ppl += list.reduce((s, f) => s + f.members.length, 0);
    }
    return { fams, ppl };
  }, [teams, assignments, familyById]);

  /** PDF 내보내기 — 명단 형식 그대로 인쇄(브라우저 PDF 저장) */
  const exportRosterPdf = () => {
    const cols = sortedTeams
      .map((t) => {
        const list = rosterList(t.id);
        const ppl = list.reduce((s, f) => s + f.members.length, 0);
        const rows = list
          .map((f, i) => {
            const ms = orderedMembers(f);
            const rest = ms
              .slice(1)
              .map((m) => `<span class="sub">${m.name}</span>`)
              .join('<span class="dot">·</span>');
            return `<li><span class="num">${i + 1}</span><span class="nm"><b>${
              ms[0]?.name ?? "-"
            }</b>${rest ? '<span class="dot">·</span>' + rest : ""}</span></li>`;
          })
          .join("");
        return `<div class="col"><div class="hd"><div class="t">${t.code}조</div><div class="s">${list.length}세대 · ${ppl}명</div></div><ul>${rows}</ul></div>`;
      })
      .join("");

    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>신풍와드 청소 봉사 조 명단</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: 'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif; color:#1b2a4e; margin:0; }
h1 { text-align:center; font-size:24px; margin:0 0 6px; letter-spacing:-0.5px; }
.sub-title { text-align:center; font-size:11px; color:#6b7280; margin-bottom:10px; }
.rule { height:3px; background:#1b2a4e; border-radius:2px; margin-bottom:14px; }
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.col { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.hd { background:#1b2a4e; color:#fff; text-align:center; padding:8px 4px; }
.hd .t { font-weight:800; font-size:14px; }
.hd .s { font-size:10px; opacity:.8; margin-top:2px; }
ul { list-style:none; margin:0; padding:0; }
li { display:flex; gap:6px; padding:5px 8px; border-bottom:1px solid #f1f2f5; font-size:11px; align-items:baseline; }
li:last-child { border-bottom:0; }
.num { color:#9ca3af; font-size:9px; width:14px; text-align:right; flex:0 0 auto; }
.nm b { color:#1b2a4e; }
.sub { color:#8a90a2; }
.dot { color:#c9cddb; margin:0 4px; }
footer { text-align:center; font-size:10px; color:#9ca3af; margin-top:12px; }
</style></head><body>
<h1>신풍와드 청소 봉사 조 명단</h1>
<div class="sub-title">청소 봉사는 매주 <b>토요일</b>에 진행됩니다</div>
<div class="rule"></div>
<div class="grid">${cols}</div>
<footer>전체 ${rosterTotals.fams}세대 · ${rosterTotals.ppl}명 &nbsp;|&nbsp; 각 세대의 첫 번째 이름이 대표입니다. 문의는 감독단에게 말씀해 주세요.</footer>
<script>window.onload=()=>{window.focus();window.print();}<\/script>
</body></html>`;

    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) {
      toast({ title: "팝업 차단", description: "팝업을 허용한 뒤 다시 시도해 주세요.", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  // Excel export — 조별 시트, [조][구성원] 컬럼, 구성원 줄바꿈

  const exportRoster = () => {
    const wb = XLSX.utils.book_new();
    const sortedTeams = [...teams].sort((a, b) => a.sort_order - b.sort_order);
    let totalRows = 0;

    sortedTeams.forEach((t) => {
      const teamName = t.name || `${t.code}조`;
      const list = familiesByTeam(t.id);
      const rows: Record<string, string>[] = [];

      if (list.length === 0) {
        rows.push({ 조: teamName, 구성원: "" });
      } else {
        list.forEach((f) => {
          // 구성원 정렬: head → spouse → child
          const headId = f.head?.id;
          const spouseId = f.spouse?.id;
          const ordered: Member[] = [];
          if (f.head) ordered.push(f.head);
          if (f.spouse) ordered.push(f.spouse);
          for (const m of f.members) {
            if (m.id !== headId && m.id !== spouseId) ordered.push(m);
          }
          rows.push({
            조: teamName,
            구성원: ordered.map((m) => m.name).join("\n"),
          });
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 40 }];
      // 줄바꿈이 표시되도록 wrapText 적용
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell) {
            cell.s = { alignment: { wrapText: true, vertical: "top" } };
          }
        }
      }
      // 시트명 안전화 (Excel 시트명 제한 문자 제거, 31자 이내)
      const safeName = teamName.replace(/[\\/?*:[\]]/g, "").slice(0, 31) || `조${t.sort_order}`;
      XLSX.utils.book_append_sheet(wb, ws, safeName);
      totalRows += rows.length;
    });

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `청소조_명단_${today}.xlsx`);
    toast({ title: "내보내기 완료", description: `${sortedTeams.length}개 시트, ${totalRows}행 내보냈습니다.` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> 청소조 배정
          </h1>
          <p className="text-sm text-muted-foreground mt-1">가족 단위로 청소조를 편성하고 토요일 일정을 만듭니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRebuildOpen(true)}>
            <Users className="w-4 h-4" /> 가족 재구성
          </Button>
        </div>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList className="grid grid-cols-3 w-full md:inline-flex md:w-auto">
          <TabsTrigger value="schedule">청소 일정</TabsTrigger>
          <TabsTrigger value="teams">조 편성</TabsTrigger>
          <TabsTrigger value="roster">명단</TabsTrigger>
        </TabsList>

        {/* ===== 일정 ===== */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="md:sticky md:top-0 z-10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">토요일 일정 생성</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <Label className="text-xs">시작일</Label>
                <Input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">종료일</Label>
                <Input type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">연속 주 수</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={genWeeks}
                  onChange={(e) => setGenWeeks(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">순환 순서 (콤마)</Label>
                <Input value={genCycle} onChange={(e) => setGenCycle(e.target.value)} placeholder="A,B,C,D" />
              </div>
              <Button onClick={generateSchedule} className="col-span-2 md:col-span-1 w-full">
                일정 생성
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">편성표 ({schedule.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 생성된 일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schedule.map((s) => {
                    const team = teamById.get(s.team_id);
                    const d = new Date(s.clean_date + "T00:00:00");
                    return (
                      <div
                        key={s.id}
                        className="rounded-lg border bg-card p-3 flex flex-col gap-2 md:flex-row md:items-center md:gap-3"
                      >
                        <div className="flex items-start justify-between gap-2 md:contents">
                          <div className="min-w-0">
                            <div className="text-sm font-medium md:w-32 md:shrink-0">
                              {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}.
                              {String(d.getDate()).padStart(2, "0")} (토)
                            </div>
                            <span className="text-xs text-muted-foreground md:hidden">
                              {team ? `${team.code}조 (${team.name})` : "-"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 md:order-last"
                            onClick={() => deleteSchedule(s.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Select value={s.team_id} onValueChange={(v) => updateScheduleTeam(s.id, v)}>
                          <SelectTrigger className="w-full md:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.code}조 · {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="hidden md:block text-xs text-muted-foreground flex-1 truncate">
                          {team ? `${team.code}조 (${team.name})` : "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 조 편성 ===== */}
        <TabsContent value="teams" className="space-y-4">
          {familyViews.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center">
              <p className="text-sm font-medium mb-2">아직 가족이 등록되지 않았습니다</p>
              <p className="text-xs text-muted-foreground mb-3">
                회원 관계(부부·부모·자녀)로부터 가족 그룹을 자동 생성한 뒤 조 편성을 시작하세요.
              </p>
              <Button size="sm" onClick={() => setRebuildOpen(true)}>
                <Users className="w-4 h-4" /> 가족 재구성 실행
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <Button className="h-11 md:h-9 w-full md:w-auto" onClick={autoAssign}>
                <Wand2 className="w-4 h-4" /> 자동 배분
              </Button>
              <Button
                variant="outline"
                className="h-11 md:h-9 w-full md:w-auto"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="w-4 h-4" /> 전체 초기화
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              총 {familyViews.length}가족 · 미배정 {unassignedFamilies.length}
              <span className="md:hidden"> · 가족 칩을 탭하면 조를 변경할 수 있습니다</span>
            </p>
          </div>

          {/* 모바일: 탭 배정 */}
          <div className="md:hidden space-y-3">
            {[{ id: "unassigned", title: "미배정", list: unassignedFamilies, sub: `${unassignedFamilies.length}가족`, accent: false },
              ...teams.map((t) => ({
                id: t.id,
                title: `${t.code}조 ${t.is_fixed ? "★" : ""}`,
                list: familiesByTeam(t.id),
                sub: `${t.name}`,
                accent: t.is_fixed,
              }))].map((sec) => (
              <div
                key={sec.id}
                className={`rounded-lg border bg-card p-3 flex flex-col ${sec.accent ? "border-[hsl(var(--gold))]" : ""}`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b shrink-0">
                  <span className="text-sm font-semibold">{sec.title}</span>
                  <span className="text-xs text-muted-foreground">{sec.sub} · {sec.list.length}가족</span>
                </div>
                {sec.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">없음</p>
                ) : (
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {sec.list.map((f) => (
                      <div key={f.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAssignSheetFamily(f)}
                          className="flex-1 min-h-[44px] text-left px-3 py-2 rounded-md border bg-background"
                        >
                          <div className="text-sm font-medium truncate">{teamBoxLabel(f)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {f.members.length}명 · {Math.round(f.score * 100)}%
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          aria-label="가족 구성원 보기"
                          onClick={() => setMemberDialogFamily(f)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 데스크톱: 드래그 앤 드롭 */}
          <div className="hidden md:block">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 md:h-[calc(100vh-260px)]">
              {/* 미배정 */}
              <DropColumn id="unassigned" title="미배정" subtitle={`${unassignedFamilies.length}가족`}>
                {unassignedFamilies.map((f) => (
                  <FamilyChip key={f.id} family={f} label={teamBoxLabel(f)} onOpen={() => setMemberDialogFamily(f)} />
                ))}
              </DropColumn>

              {/* 조 */}
              {teams.map((t) => {
                const list = familiesByTeam(t.id);
                return (
                  <DropColumn
                    key={t.id}
                    id={`team-${t.id}`}
                    title={`${t.code}조 ${t.is_fixed ? "★" : ""}`}
                    subtitle={`${t.name} · ${list.length}가족`}
                    accent={t.is_fixed}
                  >
                    {list.map((f) => (
                      <FamilyChip key={f.id} family={f} label={teamBoxLabel(f)} onOpen={() => setMemberDialogFamily(f)} />
                    ))}
                  </DropColumn>
                );
              })}
            </div>
            <DragOverlay>
              {draggingId && familyById.get(draggingId) ? (
                <div className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs shadow-lg">
                  {teamBoxLabel(familyById.get(draggingId)!)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </div>
        </TabsContent>

        {/* ===== 명단 ===== */}
        <TabsContent value="roster" className="space-y-3">
          <Card className="md:sticky md:top-0 z-10">
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row md:justify-end gap-2">
                <Button className="h-11 md:h-9 w-full md:w-auto" variant="outline" onClick={exportRoster}>
                  <Download className="w-4 h-4" /> Excel 내보내기
                </Button>
                <Button className="h-11 md:h-9 w-full md:w-auto" onClick={exportRosterPdf}>
                  <Printer className="w-4 h-4" /> PDF 내보내기
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border bg-card px-4 py-6 md:px-8 md:py-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#1b2a4e]">
                신풍와드 청소 봉사 조 명단
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                청소 봉사는 매주 <span className="font-semibold text-foreground">토요일</span>에 진행됩니다
              </p>
              <div className="h-[3px] bg-[#1b2a4e] rounded-full mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {sortedTeams.map((t) => {
                const list = rosterList(t.id);
                const ppl = list.reduce((s, f) => s + f.members.length, 0);
                return (
                  <div key={t.id} className="rounded-lg border border-border overflow-hidden bg-background">
                    <div className="bg-[#1b2a4e] text-white text-center py-3">
                      <div className="font-bold text-base">{t.code}조</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {list.length}세대 · {ppl}명
                      </div>
                    </div>
                    <ul>
                      {list.length === 0 && (
                        <li className="px-3 py-3 text-sm text-muted-foreground">배정된 가족 없음</li>
                      )}
                      {list.map((f, i) => {
                        const ordered = orderedMembers(f);
                        return (
                          <li
                            key={f.id}
                            className="flex gap-2 px-3 py-2 border-b border-border/60 last:border-0 items-baseline"
                          >
                            <span className="text-[11px] text-muted-foreground w-5 shrink-0 text-right">
                              {i + 1}
                            </span>
                            <span className="text-sm leading-relaxed">
                              <span className="font-bold text-[#1b2a4e]">{ordered[0]?.name ?? "-"}</span>
                              {ordered.slice(1).map((m) => (
                                <span key={m.id} className="text-muted-foreground">
                                  <span className="mx-1 opacity-50">·</span>
                                  {m.name}
                                </span>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[11px] text-muted-foreground mt-5">
              전체 <span className="font-semibold text-foreground">{rosterTotals.fams}세대 · {rosterTotals.ppl}명</span>
              <span className="mx-2 opacity-40">|</span>
              각 세대의 첫 번째 이름이 대표입니다. 문의는 감독단에게 말씀해 주세요.
            </p>
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={rebuildOpen} onOpenChange={setRebuildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가족 재구성</DialogTitle>
            <DialogDescription>
              회원의 가족관계(부부·부모·자녀)로부터 가족 그룹을 다시 만듭니다.
              기존 가족·조 배정이 모두 삭제되고 새로 생성됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRebuildOpen(false)} disabled={rebuildBusy}>
              취소
            </Button>
            <Button onClick={handleRebuildFamilies} disabled={rebuildBusy}>
              {rebuildBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              재구성 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전체 초기화</DialogTitle>
            <DialogDescription>모든 조 배정이 해제됩니다. 계속하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={resetAll}>
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!assignSheetFamily} onOpenChange={(o) => !o && setAssignSheetFamily(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{assignSheetFamily ? teamBoxLabel(assignSheetFamily) : ""}</SheetTitle>
            <SheetDescription>배정할 조를 선택하세요</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {teams.map((t) => (
              <Button
                key={t.id}
                variant={assignmentByFamily.get(assignSheetFamily?.id ?? "")?.team_id === t.id ? "default" : "outline"}
                className="w-full h-12 justify-start"
                onClick={async () => {
                  const f = assignSheetFamily;
                  setAssignSheetFamily(null);
                  if (f) await moveFamilyToTeam(f.id, t.id);
                }}
              >
                {t.code}조 · {t.name}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full h-12 justify-start text-muted-foreground"
              onClick={async () => {
                const f = assignSheetFamily;
                setAssignSheetFamily(null);
                if (f) await moveFamilyToTeam(f.id, null);
              }}
            >
              미배정으로 이동
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!memberDialogFamily} onOpenChange={(o) => !o && setMemberDialogFamily(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {memberDialogFamily ? teamBoxLabel(memberDialogFamily) : ""}
            </DialogTitle>
            <DialogDescription>가족 구성원 ({memberDialogFamily?.members.length ?? 0}명)</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {memberDialogFamily?.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="font-medium">{m.name}</span>
                {(() => { const a = calcAge(m.birth_date); return a !== null && <span className="text-xs text-muted-foreground">({a}세)</span>; })()}
                {m.gender && <span className="text-xs text-muted-foreground">· {m.gender}</span>}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogFamily(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DropColumn({
  id,
  title,
  subtitle,
  accent,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-card p-2 min-h-[160px] md:h-full flex flex-col overflow-hidden transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      } ${accent ? "border-[hsl(var(--gold))]" : ""}`}
    >
      <div className="px-1 py-1 mb-2 border-b shrink-0">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 pr-0.5">{children}</div>
    </div>
  );
}

function FamilyChip({ family, label, onOpen }: { family: FamilyView; label: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: family.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={onOpen}
      className={`px-2 py-1.5 rounded-md border bg-background text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
      title={`더블클릭: 가족 보기 · 출석 점수: ${(family.score * 100).toFixed(0)}%`}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{label}</div>
          <div className="text-[10px] text-muted-foreground">
            {family.members.length}명 · {Math.round(family.score * 100)}%
          </div>
        </div>
        <button
          type="button"
          aria-label="가족 구성원 보기"
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
