import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Download, Users, CalendarX } from "lucide-react";

interface ExcelExportDialogProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "all" | "absent";

const ABSENCE_PERIODS = [
  { value: "1w", label: "1주" },
  { value: "2w", label: "2주" },
  { value: "3w", label: "3주" },
  { value: "4w", label: "4주" },
  { value: "3m", label: "3개월" },
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "5y", label: "5년" },
];

const getAge = (birth?: string | null): string => {
  if (!birth) return "-";
  const today = new Date();
  const b = new Date(birth);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return `${age} (${birth})`;
};

const koreanCompare = (a: string, b: string) => a.localeCompare(b, "ko");

/** 기준일의 가장 최근 일요일(같은날이면 그 날) */
function lastSundayOnOrBefore(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function computeStart(period: string, refDate: Date): Date {
  const sun = lastSundayOnOrBefore(refDate);
  if (period.endsWith("w")) {
    const n = parseInt(period);
    const r = new Date(sun);
    r.setDate(r.getDate() - (n - 1) * 7);
    return r;
  }
  const r = new Date(refDate);
  r.setHours(0, 0, 0, 0);
  if (period === "3m") r.setMonth(r.getMonth() - 3);
  else if (period === "1y") r.setFullYear(r.getFullYear() - 1);
  else if (period === "3y") r.setFullYear(r.getFullYear() - 3);
  else if (period === "5y") r.setFullYear(r.getFullYear() - 5);
  return r;
}

const fmt = (d: Date) => d.toISOString().split("T")[0];

const ExcelExportDialog = ({ open, onClose }: ExcelExportDialogProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("all");
  const [period, setPeriod] = useState("1w");
  const [refDate, setRefDate] = useState(fmt(new Date()));
  const [busy, setBusy] = useState(false);

  const buildRows = (members: Array<{
    name: string;
    gender: string | null;
    birth_date: string | null;
    phone: string | null;
    marital_status: string | null;
    callings: string[];
  }>) => {
    return members
      .sort((a, b) => koreanCompare(a.name, b.name))
      .map((m) => ({
        이름: m.name,
        성별: m.gender || "-",
        "나이(생년월일)": getAge(m.birth_date),
        연락처: m.phone || "-",
        혼인여부: m.marital_status || "-",
        "현재 부름": m.callings.join(", ") || "-",
      }));
  };

  const downloadXlsx = (rows: Record<string, string>[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "회원");
    // column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 28 },
    ];
    XLSX.writeFile(wb, filename);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const { data: members, error: mErr } = await supabase
        .from("members")
        .select("id, name, gender, birth_date, phone, marital_status");
      if (mErr) throw mErr;
      const { data: church, error: cErr } = await supabase
        .from("member_church_info")
        .select("member_id, current_calling");
      if (cErr) throw cErr;

      const callingMap = new Map<string, string[]>();
      (church || []).forEach((c) => {
        callingMap.set(c.member_id, (c.current_calling as string[]) || []);
      });

      const enriched = (members || []).map((m) => ({
        ...m,
        callings: callingMap.get(m.id) || [],
      }));

      if (mode === "all") {
        const rows = buildRows(enriched);
        downloadXlsx(rows, `전체회원_${fmt(new Date())}.xlsx`);
        toast({ title: "내보내기 완료", description: `${rows.length}명을 내보냈습니다.` });
      } else {
        const ref = new Date(refDate);
        const start = computeStart(period, ref);
        const end = new Date(ref);
        end.setHours(0, 0, 0, 0);

        const { data: att, error: aErr } = await supabase
          .from("attendance")
          .select("member_id, attendance_date, is_present")
          .gte("attendance_date", fmt(start))
          .lte("attendance_date", fmt(end))
          .eq("is_present", true);
        if (aErr) throw aErr;

        const presentSet = new Set((att || []).map((a) => a.member_id));
        const absent = enriched.filter((m) => !presentSet.has(m.id));
        const rows = buildRows(absent);

        const label = ABSENCE_PERIODS.find((p) => p.value === period)?.label || period;
        downloadXlsx(rows, `미출석_${label}_${fmt(start)}~${fmt(end)}.xlsx`);
        toast({
          title: "내보내기 완료",
          description: `${label} 기간(${fmt(start)} ~ ${fmt(end)}) 미출석 ${rows.length}명을 내보냈습니다.`,
        });
      }
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      toast({ title: "내보내기 실패", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excel 내보내기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode select */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === "all"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <Users className="w-4 h-4 mb-1.5 text-primary" />
              <p className="text-sm font-semibold text-foreground">전체 회원</p>
              <p className="text-xs text-muted-foreground mt-0.5">이름순 전체 목록</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("absent")}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === "absent"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <CalendarX className="w-4 h-4 mb-1.5 text-primary" />
              <p className="text-sm font-semibold text-foreground">기간별 미출석</p>
              <p className="text-xs text-muted-foreground mt-0.5">출석 없는 회원</p>
            </button>
          </div>

          {mode === "absent" && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">기준 날짜</label>
                <Input
                  type="date"
                  value={refDate}
                  onChange={(e) => setRefDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">기간</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ABSENCE_PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                기준일의 직전 일요일부터 1주 단위로 계산되며, 해당 기간 내에 한 번이라도 출석한
                회원은 제외됩니다.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              취소
            </Button>
            <Button onClick={handleExport} disabled={busy}>
              <Download className="w-4 h-4 mr-1.5" />
              {busy ? "내보내는 중..." : "내보내기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelExportDialog;
