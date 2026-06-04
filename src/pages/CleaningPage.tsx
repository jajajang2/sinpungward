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
import { Sparkles, RotateCcw, Wand2, Users, Trash2, Printer, Loader2 } from "lucide-react";
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
import { formatFamilyName } from "@/lib/familyName";
import { buildScheduleAssignments, listSaturdays } from "@/lib/cleaningSchedule";
import { rebuildFamilies } from "@/lib/familyAutoBuild";

type Member = {
  id: string;
  name: string;
  gender: string | null;
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

const DEFAULT_CYCLE = ["B", "C", "D", "E"];

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
      supabase.from("members").select("id, name, gender"),
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

    const sortedDates = Array.from(allServiceDates).sort();

    return families.map((fam) => {
      const fms = fmByFamily.get(fam.id) ?? [];
      const ms = fms.map((x) => memberById.get(x.member_id)).filter(Boolean) as Member[];
      const headFm = fms.find((x) => x.family_role === "head" || x.family_role === "single");
      const spouseFm = fms.find((x) => x.family_role === "spouse");
      const head = headFm ? memberById.get(headFm.member_id) ?? null : null;
      const spouse = spouseFm ? memberById.get(spouseFm.member_id) ?? null : null;

      // 점수: 가족 멤버 중 가장 이른 출석일 ~ 오늘 사이의 예배일 중,
      // 가족이 1명이라도 출석한 날 / 전체 예배일
      const familyDates = new Set<string>();
      let earliest: string | null = null;
      for (const mem of ms) {
        const dates = attendanceDates.get(mem.id);
        if (!dates) continue;
        for (const d of dates) {
          familyDates.add(d);
          if (!earliest || d < earliest) earliest = d;
        }
      }
      let score = 0;
      if (earliest) {
        const today = new Date().toISOString().slice(0, 10);
        const denom = sortedDates.filter((d) => d >= earliest! && d <= today).length;
        const numer = Array.from(familyDates).filter((d) => d <= today).length;
        score = denom > 0 ? numer / denom : 0;
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
  }, [families, familyMembers, members, attendanceDates, allServiceDates]);

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

    const candidates = [...familyViews].sort((x, y) => y.score - x.score);

    // 스네이크 드래프트
    const buckets: string[][] = targetTeams.map(() => []);
    let dir = 1;
    let idx = 0;
    for (const fam of candidates) {
      buckets[idx].push(fam.id);
      if (dir === 1) {
        if (idx === buckets.length - 1) dir = -1;
        else idx++;
      } else {
        if (idx === 0) dir = 1;
        else idx--;
      }
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
        <TabsList>
          <TabsTrigger value="schedule">청소 일정</TabsTrigger>
          <TabsTrigger value="teams">조 편성</TabsTrigger>
          <TabsTrigger value="roster">명단</TabsTrigger>
        </TabsList>

        {/* ===== 일정 ===== */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">토요일 일정 생성</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
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
                <Input value={genCycle} onChange={(e) => setGenCycle(e.target.value)} placeholder="B,C,D,E,A" />
              </div>
              <Button onClick={generateSchedule}>일정 생성</Button>
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
                        className="flex items-center gap-3 p-2 rounded-md border bg-card"
                      >
                        <div className="text-sm font-medium w-32 shrink-0">
                          {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}.
                          {String(d.getDate()).padStart(2, "0")} (토)
                        </div>
                        <Select value={s.team_id} onValueChange={(v) => updateScheduleTeam(s.id, v)}>
                          <SelectTrigger className="w-32">
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
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {team ? `${team.code}조 (${team.name})` : "-"}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={autoAssign}>
              <Wand2 className="w-4 h-4" /> 자동 배분
            </Button>
            <Button size="sm" variant="outline" onClick={fillBishopric}>
              <Sparkles className="w-4 h-4" /> 감독단 자동 채우기
            </Button>
            <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}>
              <RotateCcw className="w-4 h-4" /> 전체 초기화
            </Button>
            <span className="text-xs text-muted-foreground self-center ml-2">
              총 {familyViews.length}가족 · 미배정 {unassignedFamilies.length}
            </span>
          </div>

          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              {/* 미배정 */}
              <DropColumn id="unassigned" title="미배정" subtitle={`${unassignedFamilies.length}가족`}>
                {unassignedFamilies.map((f) => (
                  <FamilyChip key={f.id} family={f} />
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
                      <FamilyChip key={f.id} family={f} />
                    ))}
                  </DropColumn>
                );
              })}
            </div>
            <DragOverlay>
              {draggingId && familyById.get(draggingId) ? (
                <div className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs shadow-lg">
                  {formatFamilyName(familyById.get(draggingId)!)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* ===== 명단 ===== */}
        <TabsContent value="roster" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> 인쇄
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((t) => {
              const list = familiesByTeam(t.id);
              return (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        {t.code}조 · {t.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{list.length}가족</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground">배정된 가족 없음</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {list.map((f) => (
                          <li key={f.id}>• {formatFamilyName(f)}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
      className={`rounded-lg border bg-card p-2 min-h-[160px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      } ${accent ? "border-[hsl(var(--gold))]" : ""}`}
    >
      <div className="px-1 py-1 mb-2 border-b">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FamilyChip({ family }: { family: FamilyView }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: family.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-2 py-1.5 rounded-md border bg-background text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
      title={`출석 점수: ${(family.score * 100).toFixed(0)}%`}
    >
      <div className="font-medium truncate">{formatFamilyName(family)}</div>
      <div className="text-[10px] text-muted-foreground">
        {family.members.length}명 · {Math.round(family.score * 100)}%
      </div>
    </div>
  );
}
