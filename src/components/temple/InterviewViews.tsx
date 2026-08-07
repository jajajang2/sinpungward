import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { computeStatus, colorFor, RecommendStatus } from "@/lib/templeRecommendStatus";

interface RecommendRow {
  id: string;
  lcr_name: string;
  gender: string | null;
  age_at_import: number | null;
  recommend_type: "REGULAR" | "LIMITED_USE";
  expiry_month: string | null;
}

export interface InterviewRow {
  id: string;
  recommend_id: string;
  interview_type: "갱신" | "신규" | null;
  assigned_to: "감독" | "제1보좌" | "제2보좌" | null;
  status: "미배정" | "배정됨" | "완료" | "보류";
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

const ASSIGNEES = ["감독", "제1보좌", "제2보좌"] as const;
const typeLabel = (t: string) => (t === "REGULAR" ? "정규" : "제한사용");

/* ---------- 접견 배정 모달 ---------- */
const AssignDialog = ({
  open, onClose, recommend, existing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  recommend: RecommendRow | null;
  existing: InterviewRow | null;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [interviewType, setInterviewType] = useState<"갱신" | "신규">("갱신");
  const [assignedTo, setAssignedTo] = useState<typeof ASSIGNEES[number]>("감독");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setInterviewType(existing?.interview_type ?? "갱신");
      setAssignedTo((existing?.assigned_to as any) ?? "감독");
      setScheduledAt(existing?.scheduled_at ? existing.scheduled_at.slice(0, 16) : "");
      setNotes(existing?.notes ?? "");
    }
  }, [open, existing]);

  const save = async () => {
    if (!recommend) return;
    setSaving(true);
    const payload = {
      recommend_id: recommend.id,
      interview_type: interviewType,
      assigned_to: assignedTo,
      status: "배정됨" as const,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      notes: notes || null,
    };
    const q = existing
      ? supabase.from("recommend_interviews").update(payload).eq("id", existing.id)
      : supabase.from("recommend_interviews").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "접견 배정 완료" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent mobileVariant="fullscreen">
        <DialogHeader>
          <DialogTitle>접견 배정 — {recommend?.lcr_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">접견 유형</label>
            <Select value={interviewType} onValueChange={(v) => setInterviewType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="갱신">갱신</SelectItem>
                <SelectItem value="신규">신규</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">접견자</label>
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNEES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">예정일시</label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">메모</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={save} disabled={saving}>{saving ? "저장중..." : "배정 저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- 만료 관리 뷰 ---------- */
export const ExpiryManagementView = ({
  rows, interviews, reload,
}: {
  rows: RecommendRow[];
  interviews: InterviewRow[];
  reload: () => void;
}) => {
  const [dialogRow, setDialogRow] = useState<RecommendRow | null>(null);

  const interviewByRec = useMemo(() => {
    const m = new Map<string, InterviewRow>();
    for (const it of interviews) {
      const prev = m.get(it.recommend_id);
      // 가장 최근 (created 최신) 하나만 표시 — 정렬 없으므로 마지막 유지
      if (!prev) m.set(it.recommend_id, it);
    }
    return m;
  }, [interviews]);

  const enriched = useMemo(() => {
    return rows
      .map((r) => ({ ...r, ...computeStatus(r.expiry_month) }))
      .filter((r) => r.status !== "활동적")
      .sort((a, b) => (a.expiry_month ?? "9").localeCompare(b.expiry_month ?? "9"));
  }, [rows]);

  return (
    <>
      <div className="border rounded-lg table-scroll table-sticky-first">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">유형</th>
              <th className="px-3 py-2 text-left">만료월</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">D-day</th>
              <th className="px-3 py-2 text-left">접견</th>
              <th className="px-3 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((r) => {
              const iv = interviewByRec.get(r.id);
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-1.5 font-medium">{r.lcr_name}</td>
                  <td className="px-3 py-1.5">{typeLabel(r.recommend_type)}</td>
                  <td className="px-3 py-1.5">{r.expiry_month?.slice(0, 7) ?? "-"}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded border text-xs ${r.colorClass}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-1.5">{r.dday === null ? "-" : r.dday >= 0 ? `D-${r.dday}` : `D+${-r.dday}`}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {iv ? `${iv.status}${iv.assigned_to ? ` · ${iv.assigned_to}` : ""}` : "-"}
                  </td>
                  <td className="px-3 py-1.5">
                    <Button size="sm" variant="outline" onClick={() => setDialogRow(r)}>
                      {iv ? "재배정" : "접견 배정"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {enriched.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">관리 대상이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AssignDialog
        open={!!dialogRow}
        onClose={() => setDialogRow(null)}
        recommend={dialogRow}
        existing={dialogRow ? interviewByRec.get(dialogRow.id) ?? null : null}
        onSaved={reload}
      />
    </>
  );
};

/* ---------- 접견 관리 (칸반) ---------- */
const KANBAN_STATUSES: InterviewRow["status"][] = ["미배정", "배정됨", "완료", "보류"];
const kanbanBg: Record<InterviewRow["status"], string> = {
  미배정: "bg-slate-50 border-slate-200",
  배정됨: "bg-blue-50 border-blue-200",
  완료: "bg-green-50 border-green-200",
  보류: "bg-amber-50 border-amber-200",
};

export const InterviewKanbanView = ({
  rows, interviews, reload,
}: {
  rows: RecommendRow[];
  interviews: InterviewRow[];
  reload: () => void;
}) => {
  const { toast } = useToast();
  const [assigneeFilter, setAssigneeFilter] = useState<"ALL" | typeof ASSIGNEES[number]>("ALL");

  const recMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const filtered = useMemo(
    () => interviews.filter((i) => (assigneeFilter === "ALL" ? true : i.assigned_to === assigneeFilter)),
    [interviews, assigneeFilter]
  );

  const grouped = useMemo(() => {
    const g: Record<InterviewRow["status"], InterviewRow[]> = { 미배정: [], 배정됨: [], 완료: [], 보류: [] };
    for (const it of filtered) g[it.status].push(it);
    return g;
  }, [filtered]);

  const [mobileStatus, setMobileStatus] = useState<InterviewRow["status"]>(KANBAN_STATUSES[0]);

  const updateStatus = async (id: string, status: InterviewRow["status"]) => {
    const patch: any = { status };
    if (status === "완료") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("recommend_interviews").update(patch).eq("id", id);
    if (error) {
      toast({ title: "업데이트 실패", description: error.message, variant: "destructive" });
      return;
    }
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">접견자 필터:</span>
        <div className="inline-flex rounded-md border overflow-hidden">
          {(["ALL", ...ASSIGNEES] as const).map((v) => (
            <button
              key={v}
              onClick={() => setAssigneeFilter(v as any)}
              className={`px-3 py-1.5 text-sm min-h-11 md:min-h-0 ${assigneeFilter === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              {v === "ALL" ? "전체" : v}
            </button>
          ))}
        </div>
      </div>

      {/* 모바일: 상태 탭 (가로 스크롤 칩) */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {KANBAN_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setMobileStatus(s)}
            className={`shrink-0 rounded-full border px-4 min-h-11 text-sm ${mobileStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
          >
            {s} ({grouped[s].length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {KANBAN_STATUSES.map((s) => (
          <div key={s} className={`rounded-lg border p-3 ${kanbanBg[s]} md:min-h-[400px] ${mobileStatus === s ? "" : "hidden md:block"}`}>
            <div className="hidden md:flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{s}</div>
              <div className="text-xs text-muted-foreground">{grouped[s].length}</div>
            </div>
            <div className="space-y-2">
              {grouped[s].map((it) => {
                const rec = recMap.get(it.recommend_id);
                return (
                  <div key={it.id} className="bg-white rounded border p-2 text-xs space-y-1">
                    <div className="font-semibold text-sm">{rec?.lcr_name ?? "(?)"}</div>
                    <div className="text-muted-foreground">
                      {rec ? typeLabel(rec.recommend_type) : "-"} · 만료 {rec?.expiry_month?.slice(0, 7) ?? "-"}
                    </div>
                    <div>접견자: <span className="font-medium">{it.assigned_to ?? "-"}</span> · {it.interview_type ?? "-"}</div>
                    {it.scheduled_at && (
                      <div className="text-muted-foreground">예정: {new Date(it.scheduled_at).toLocaleString("ko-KR")}</div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 md:gap-1">
                      {s !== "완료" && (
                        <Button size="sm" variant="outline" className="h-11 px-3 text-xs md:h-6 md:px-2 md:text-[11px]" onClick={() => updateStatus(it.id, "완료")}>완료</Button>
                      )}
                      {s !== "보류" && s !== "완료" && (
                        <Button size="sm" variant="outline" className="h-11 px-3 text-xs md:h-6 md:px-2 md:text-[11px]" onClick={() => updateStatus(it.id, "보류")}>보류</Button>
                      )}
                      {s !== "배정됨" && s !== "완료" && (
                        <Button size="sm" variant="outline" className="h-11 px-3 text-xs md:h-6 md:px-2 md:text-[11px]" onClick={() => updateStatus(it.id, "배정됨")}>배정됨</Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {grouped[s].length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">없음</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
