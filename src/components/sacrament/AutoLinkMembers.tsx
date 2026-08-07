import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onChanged: () => void;
}

type Assign = { id: string; custom_name: string; meeting_id: string; role: string; slot: number };
type Member = { id: string; name: string };

type Plan = {
  toLink: { assign: Assign; member: Member; normalized: boolean }[];
  duplicates: { assign: Assign; candidates: Member[] }[];
  unmatched: Assign[];
  totalMembers: number;
};

const norm = (s: string) => (s || "").replace(/\s+/g, "").trim();

export default function AutoLinkMembers({ onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  const buildPlan = async () => {
    setLoading(true);
    setPlan(null);
    try {
      // Load ALL members (force large range to bypass default 1000 cap)
      const { data: members, error: me } = await supabase
        .from("members")
        .select("id, name")
        .range(0, 99999);
      if (me) throw me;

      // Load all assignments needing linking
      const { data: assigns, error: ae } = await supabase
        .from("sacrament_assignments")
        .select("id, custom_name, meeting_id, role, slot")
        .is("member_id", null)
        .not("custom_name", "is", null)
        .range(0, 99999);
      if (ae) throw ae;

      // Build name maps
      const exact = new Map<string, Member[]>();
      const stripped = new Map<string, Member[]>();
      (members || []).forEach((m: any) => {
        const n1 = (m.name || "").trim();
        if (!n1) return;
        if (!exact.has(n1)) exact.set(n1, []);
        exact.get(n1)!.push(m);
        const n2 = norm(m.name);
        if (!n2) return;
        if (!stripped.has(n2)) stripped.set(n2, []);
        stripped.get(n2)!.push(m);
      });

      const toLink: Plan["toLink"] = [];
      const duplicates: Plan["duplicates"] = [];
      const unmatched: Assign[] = [];

      (assigns || []).forEach((a: any) => {
        const raw = (a.custom_name || "").trim();
        if (!raw) return;
        let cands = exact.get(raw) || [];
        let normalized = false;
        if (cands.length === 0) {
          cands = stripped.get(norm(raw)) || [];
          normalized = true;
        }
        // dedupe by id
        const uniq = Array.from(new Map(cands.map((c) => [c.id, c])).values());
        if (uniq.length === 1) toLink.push({ assign: a, member: uniq[0], normalized });
        else if (uniq.length > 1) duplicates.push({ assign: a, candidates: uniq });
        else unmatched.push(a);
      });

      setPlan({ toLink, duplicates, unmatched, totalMembers: (members || []).length });
    } catch (e: any) {
      toast.error("미리보기 실패: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const openDialog = async () => {
    setOpen(true);
    await buildPlan();
  };

  const run = async () => {
    if (!plan) return;
    setRunning(true);
    try {
      const chunks: typeof plan.toLink[] = [];
      for (let i = 0; i < plan.toLink.length; i += 500) chunks.push(plan.toLink.slice(i, i + 500));
      let done = 0;
      for (const batch of chunks) {
        // Update individually (different ids/values) — use Promise.all per batch
        await Promise.all(
          batch.map((b) =>
            supabase
              .from("sacrament_assignments")
              .update({ member_id: b.member.id, custom_name: null })
              .eq("id", b.assign.id)
          )
        );
        done += batch.length;
      }
      toast.success(`회원 연결 완료: ${done}건`);
      onChanged();
      await buildPlan(); // refresh remaining issues
    } catch (e: any) {
      toast.error("연결 실패: " + (e?.message || ""));
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openDialog}>
        <Link2 className="h-3 w-3 mr-1" /> 회원 자동 연결
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>직접입력 이름 → 회원 자동 연결</DialogTitle>
          </DialogHeader>

          {loading && <div className="text-sm text-muted-foreground py-4">분석 중…</div>}

          {plan && (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Card label="로드된 회원" value={plan.totalMembers} />
                <Card label="연결 가능" value={plan.toLink.length} tone="success" />
                <Card label="동명이인 보류" value={plan.duplicates.length} tone="warn" />
                <Card label="미등록 유지" value={plan.unmatched.length} tone="error" />
              </div>

              <div className="overflow-auto border rounded mt-2 flex-1">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">구분</th>
                      <th className="px-2 py-1 text-left">이름(입력)</th>
                      <th className="px-2 py-1 text-left">연결할 회원 / 후보</th>
                      <th className="px-2 py-1 text-left">역할</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.toLink.map((r, i) => (
                      <tr key={"l" + i} className="border-t">
                        <td className="px-2 py-1"><Badge variant="secondary">연결</Badge></td>
                        <td className="px-2 py-1">{r.assign.custom_name}{r.normalized && <span className="ml-1 text-muted-foreground">(공백흡수)</span>}</td>
                        <td className="px-2 py-1">→ {r.member.name}</td>
                        <td className="px-2 py-1 text-muted-foreground">{r.assign.role}/{r.assign.slot}</td>
                      </tr>
                    ))}
                    {plan.duplicates.map((r, i) => (
                      <tr key={"d" + i} className="border-t bg-amber-50/40">
                        <td className="px-2 py-1"><Badge className="bg-amber-100 text-amber-900">동명이인</Badge></td>
                        <td className="px-2 py-1">{r.assign.custom_name}</td>
                        <td className="px-2 py-1">{r.candidates.length}명 후보 (수동 확인)</td>
                        <td className="px-2 py-1 text-muted-foreground">{r.assign.role}/{r.assign.slot}</td>
                      </tr>
                    ))}
                    {plan.unmatched.map((r, i) => (
                      <tr key={"u" + i} className="border-t bg-rose-50/30">
                        <td className="px-2 py-1"><Badge variant="destructive">미등록</Badge></td>
                        <td className="px-2 py-1">{r.custom_name}</td>
                        <td className="px-2 py-1">—</td>
                        <td className="px-2 py-1 text-muted-foreground">{r.role}/{r.slot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>닫기</Button>
            <Button onClick={run} disabled={!plan || running || plan.toLink.length === 0}>
              {running ? "연결 중…" : `연결 실행 (${plan?.toLink.length || 0}건)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Card({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" | "error" }) {
  const cls =
    tone === "success" ? "bg-emerald-50 text-emerald-900" :
    tone === "warn" ? "bg-amber-50 text-amber-900" :
    tone === "error" ? "bg-rose-50 text-rose-900" :
    "bg-muted";
  return (
    <div className={`rounded p-2 ${cls}`}>
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
