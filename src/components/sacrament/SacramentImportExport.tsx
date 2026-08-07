import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  onChanged: () => void;
}

// 항목(파일) → {role, slot, kind} (컴포넌트 내부 규칙)
type Kind = "person" | "hymn" | "talk";
interface InternalRef {
  role: string;
  slot: number;
  kind: Kind;
}

function itemToInternal(item: string, fileSlot: number): InternalRef | null {
  const s = item.trim();
  switch (s) {
    case "감리자":
    case "사회자":
    case "지휘자":
    case "반주자":
    case "개회기도":
    case "폐회기도":
      return { role: s, slot: 0, kind: "person" };
    case "개회찬송":
    case "성찬찬송":
    case "중간찬송":
    case "폐회찬송":
      return { role: s, slot: 0, kind: "hymn" };
    case "성찬축복1":
      return { role: "성찬축복_1", slot: 0, kind: "person" };
    case "성찬축복2":
      return { role: "성찬축복_2", slot: 0, kind: "person" };
    case "성찬전달":
      return { role: "성찬전달", slot: Math.max(0, fileSlot - 1), kind: "person" };
    case "말씀_3분":
      return { role: "말씀_3분", slot: 0, kind: "talk" };
    case "말씀_7분":
      return { role: "말씀_7분", slot: 0, kind: "talk" };
    case "말씀_10분":
      return { role: "말씀_10분", slot: 0, kind: "talk" };
    case "마지막연사":
      return { role: "마지막연사", slot: 0, kind: "talk" };
  }
  return null;
}

// 내부 role → {항목, 값유형, 표시순서}
const EXPORT_ROW_ORDER = [
  "감리자", "사회자", "지휘자", "반주자",
  "개회찬송", "개회기도",
  "성찬찬송", "성찬축복_1", "성찬축복_2", "성찬전달",
  "말씀_3분", "말씀_7분", "말씀_10분",
  "중간찬송", "마지막연사",
  "폐회찬송", "폐회기도",
];
function roleToItem(role: string, slot: number): { item: string; fileSlot: number; valueType: "사람" | "찬송" } {
  switch (role) {
    case "성찬축복_1": return { item: "성찬축복1", fileSlot: 1, valueType: "사람" };
    case "성찬축복_2": return { item: "성찬축복2", fileSlot: 2, valueType: "사람" };
    case "성찬전달": return { item: "성찬전달", fileSlot: slot + 1, valueType: "사람" };
    case "개회찬송":
    case "성찬찬송":
    case "중간찬송":
    case "폐회찬송":
      return { item: role, fileSlot: 1, valueType: "찬송" };
    default:
      return { item: role, fileSlot: 1, valueType: "사람" };
  }
}

const NORMAL_EVENTS = new Set(["일반", "금식간증", "연차대회", "부활절"]);

type ImportRow = {
  meeting_date: string;
  event_type: string;
  event_custom_name: string | null;
  item: string;
  fileSlot: number;
  valueType: string;
  value: string;
  topic: string;
  content: string;
  internal: InternalRef | null;
  matchKind: "member" | "custom" | "duplicate" | "hymn" | "ignored";
  matched_member_id: string | null;
  matched_name: string | null;
  duplicate_names?: string[];
};

export default function SacramentImportExport({ onChanged }: Props) {
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [resultIssues, setResultIssues] = useState<ImportRow[] | null>(null);

  // ---------- EXPORT ----------
  const doExport = async () => {
    setExporting(true);
    try {
      let mQuery = supabase.from("sacrament_meetings").select("*").order("meeting_date");
      if (exportFrom) mQuery = mQuery.gte("meeting_date", exportFrom);
      if (exportTo) mQuery = mQuery.lte("meeting_date", exportTo);
      const { data: meetings, error: me } = await mQuery;
      if (me) throw me;

      const mIds = (meetings || []).map((m: any) => m.id);
      const { data: assigns } = mIds.length
        ? await supabase.from("sacrament_assignments").select("*").in("meeting_id", mIds)
        : { data: [] as any[] };

      const { data: members } = await supabase.from("members").select("id, name");
      const memberMap = new Map<string, string>((members || []).map((m: any) => [m.id, m.name]));

      // Group assignments by meeting
      const byMeeting = new Map<string, any[]>();
      (assigns || []).forEach((a: any) => {
        if (!byMeeting.has(a.meeting_id)) byMeeting.set(a.meeting_id, []);
        byMeeting.get(a.meeting_id)!.push(a);
      });

      // === Sheet 1: 세로형 ===
      const vertical: any[] = [];
      (meetings || []).forEach((m: any) => {
        const date = m.meeting_date as string;
        const [y, mo, d] = date.split("-");
        const eventLabel = m.event_type === "기타" ? (m.event_custom_name || "기타") : m.event_type;
        const list = byMeeting.get(m.id) || [];
        // sort by EXPORT_ROW_ORDER then slot
        const order = (r: string) => {
          const i = EXPORT_ROW_ORDER.indexOf(r);
          return i < 0 ? 999 : i;
        };
        list.sort((a, b) => order(a.role) - order(b.role) || a.slot - b.slot);
        list.forEach((a: any) => {
          const { item, fileSlot, valueType } = roleToItem(a.role, a.slot);
          let value: string = "";
          if (valueType === "찬송") {
            value = a.hymn_number || "";
          } else {
            if (a.member_id) value = memberMap.get(a.member_id) || "";
            else if (a.custom_name) value = a.custom_name;
          }
          if (!value && !a.talk_topic && !a.talk_content) return;
          vertical.push({
            "날짜": date,
            "연": Number(y),
            "월": Number(mo),
            "일": Number(d),
            "행사유형": eventLabel,
            "항목": item,
            "role": item, // 항목과 동일 (import 시 항목 기준으로 변환)
            "slot": fileSlot,
            "값": value,
            "값유형": valueType,
            "확인필요": "",
            "주제": a.talk_topic || "",
            "내용": a.talk_content || "",
          });
        });
      });

      // === Sheet 2: 가로형 ===
      const horizCols = ["날짜", "행사유형", ...EXPORT_ROW_ORDER.map((r) => {
        if (r === "성찬축복_1") return "성찬축복1";
        if (r === "성찬축복_2") return "성찬축복2";
        return r;
      })];
      const horizontal = (meetings || []).map((m: any) => {
        const row: any = { 날짜: m.meeting_date, 행사유형: m.event_type === "기타" ? (m.event_custom_name || "기타") : m.event_type };
        const list = byMeeting.get(m.id) || [];
        EXPORT_ROW_ORDER.forEach((role) => {
          const col = role === "성찬축복_1" ? "성찬축복1" : role === "성찬축복_2" ? "성찬축복2" : role;
          if (role === "성찬전달") {
            const ds = list.filter((a) => a.role === "성찬전달").sort((a, b) => a.slot - b.slot)
              .map((a) => a.member_id ? memberMap.get(a.member_id) : a.custom_name).filter(Boolean);
            row[col] = ds.join(", ");
          } else {
            const a = list.find((x) => x.role === role && x.slot === 0);
            if (!a) { row[col] = ""; return; }
            if (["개회찬송", "성찬찬송", "중간찬송", "폐회찬송"].includes(role)) row[col] = a.hymn_number || "";
            else row[col] = a.member_id ? (memberMap.get(a.member_id) || "") : (a.custom_name || "");
          }
        });
        return row;
      });

      // === Sheet 3: 말씀 요약 ===
      const TALK_ROLES = new Set(["말씀_3분", "말씀_7분", "말씀_10분", "마지막연사"]);
      const talkByName = new Map<string, string[]>();
      (assigns || []).forEach((a: any) => {
        if (!TALK_ROLES.has(a.role)) return;
        const name = a.member_id ? memberMap.get(a.member_id) : a.custom_name;
        if (!name) return;
        const md = meetings?.find((m: any) => m.id === a.meeting_id)?.meeting_date;
        if (!md) return;
        if (!talkByName.has(name)) talkByName.set(name, []);
        talkByName.get(name)!.push(md);
      });
      const summary = [...talkByName.entries()].map(([name, dates]) => ({
        "이름": name,
        "말씀횟수": dates.length,
        "말씀한 날짜들": dates.sort().join(", "),
      })).sort((a, b) => b.말씀횟수 - a.말씀횟수);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vertical), "성찬식순서_세로형(Import)");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(horizontal, { header: horizCols }), "성찬식순서_가로형");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "말씀_이름별요약(참고)");

      const fn = `신풍와드_성찬식순서_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(wb, fn);
      toast.success(`내보내기 완료 (${vertical.length}건)`);
    } catch (e: any) {
      toast.error("내보내기 실패: " + (e?.message || ""));
    } finally {
      setExporting(false);
    }
  };

  // ---------- IMPORT ----------
  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let sheet = wb.Sheets["성찬식순서_세로형(Import)"];
      if (!sheet) {
        // fallback: pick first sheet with required columns (excluding 가로형/요약)
        const candidate = wb.SheetNames.find((n) => !/가로형|요약/.test(n));
        if (candidate) sheet = wb.Sheets[candidate];
      }
      if (!sheet) {
        toast.error("가져올 시트를 찾을 수 없습니다.");
        return;
      }
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const { data: members } = await supabase.from("members").select("id, name").range(0, 99999);
      const norm = (s: string) => (s || "").replace(/\s+/g, "").trim();
      const exactMap = new Map<string, { id: string }[]>();
      const normMap = new Map<string, { id: string }[]>();
      (members || []).forEach((m: any) => {
        const n1 = (m.name || "").trim();
        if (n1) {
          if (!exactMap.has(n1)) exactMap.set(n1, []);
          exactMap.get(n1)!.push({ id: m.id });
        }
        const n2 = norm(m.name);
        if (n2) {
          if (!normMap.has(n2)) normMap.set(n2, []);
          normMap.get(n2)!.push({ id: m.id });
        }
      });

      const rows: ImportRow[] = [];
      json.forEach((r) => {
        const dateRaw = r["날짜"];
        if (!dateRaw) return;
        let date = "";
        if (typeof dateRaw === "number") {
          const d = XLSX.SSF.parse_date_code(dateRaw);
          if (d) date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else {
          date = String(dateRaw).slice(0, 10);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

        const value = String(r["값"] ?? "").trim();
        if (!value && !r["주제"] && !r["내용"]) return;

        const itemRaw = String(r["항목"] ?? r["role"] ?? "").trim();
        const fileSlot = Number(r["slot"] ?? 1) || 1;
        const eventRaw = String(r["행사유형"] ?? "일반").trim() || "일반";
        const event_type = NORMAL_EVENTS.has(eventRaw) ? eventRaw : "기타";
        const event_custom_name = event_type === "기타" ? eventRaw : null;
        const valueType = String(r["값유형"] ?? "").trim();

        const internal = itemToInternal(itemRaw, fileSlot);

        let matchKind: ImportRow["matchKind"] = "ignored";
        let matched_member_id: string | null = null;
        let matched_name: string | null = null;
        let duplicate_names: string[] | undefined;

        if (internal) {
          if (internal.kind === "hymn" || valueType === "찬송") {
            matchKind = "hymn";
          } else {
            let candidates = exactMap.get(value) || [];
            if (candidates.length === 0) candidates = normMap.get(norm(value)) || [];
            const uniq = Array.from(new Map(candidates.map((c) => [c.id, c])).values());
            if (uniq.length === 1) {
              matchKind = "member";
              matched_member_id = uniq[0].id;
              matched_name = value;
            } else if (uniq.length > 1) {
              matchKind = "duplicate";
              duplicate_names = uniq.map(() => value);
            } else {
              matchKind = "custom";
            }
          }
        }

        rows.push({
          meeting_date: date,
          event_type,
          event_custom_name,
          item: itemRaw,
          fileSlot,
          valueType,
          value,
          topic: String(r["주제"] ?? "").trim(),
          content: String(r["내용"] ?? "").trim(),
          internal,
          matchKind,
          matched_member_id,
          matched_name,
          duplicate_names,
        });
      });

      setPreviewRows(rows);
      setResultIssues(null);
      setPreviewOpen(true);
    } catch (e: any) {
      toast.error("파일 읽기 실패: " + (e?.message || ""));
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      // Group by date for meetings upsert
      const meetingMap = new Map<string, { event_type: string; event_custom_name: string | null }>();
      previewRows.forEach((r) => {
        if (!meetingMap.has(r.meeting_date)) {
          meetingMap.set(r.meeting_date, { event_type: r.event_type, event_custom_name: r.event_custom_name });
        }
      });

      const meetingPayload = [...meetingMap.entries()].map(([meeting_date, v]) => ({
        meeting_date, event_type: v.event_type, event_custom_name: v.event_custom_name,
      }));

      // Upsert meetings in batches
      const chunked = <T,>(arr: T[], n: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };
      for (const batch of chunked(meetingPayload, 500)) {
        const { error } = await supabase.from("sacrament_meetings").upsert(batch, { onConflict: "meeting_date" });
        if (error) throw error;
      }

      // Fetch meeting ids
      const dates = [...meetingMap.keys()];
      const { data: meetings } = await supabase.from("sacrament_meetings").select("id, meeting_date").in("meeting_date", dates);
      const idMap = new Map<string, string>((meetings || []).map((m: any) => [m.meeting_date, m.id]));

      // Build assignments payload
      const assignPayload: any[] = [];
      previewRows.forEach((r) => {
        if (!r.internal) return;
        const meeting_id = idMap.get(r.meeting_date);
        if (!meeting_id) return;
        const base: any = {
          meeting_id,
          role: r.internal.role,
          slot: r.internal.slot,
          member_id: null,
          custom_name: null,
          hymn_number: null,
          talk_topic: null,
          talk_content: null,
        };
        if (r.internal.kind === "hymn") {
          base.hymn_number = r.value;
        } else if (r.matchKind === "member") {
          base.member_id = r.matched_member_id;
        } else {
          base.custom_name = r.value;
        }
        if (r.internal.kind === "talk") {
          base.talk_topic = r.topic || null;
          base.talk_content = r.content || null;
        }
        assignPayload.push(base);
      });

      for (const batch of chunked(assignPayload, 500)) {
        const { error } = await supabase.from("sacrament_assignments").upsert(batch, { onConflict: "meeting_id,role,slot" });
        if (error) throw error;
      }

      const issues = previewRows.filter((r) => r.matchKind === "custom" || r.matchKind === "duplicate");
      setResultIssues(issues);
      toast.success(`가져오기 완료 — 일요일 ${meetingMap.size}개 / 배정 ${assignPayload.length}건`);
      onChanged();
    } catch (e: any) {
      toast.error("가져오기 실패: " + (e?.message || ""));
    } finally {
      setImporting(false);
    }
  };

  const summary = {
    meetings: new Set(previewRows.map((r) => r.meeting_date)).size,
    total: previewRows.length,
    matched: previewRows.filter((r) => r.matchKind === "member").length,
    custom: previewRows.filter((r) => r.matchKind === "custom").length,
    duplicate: previewRows.filter((r) => r.matchKind === "duplicate").length,
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (e.target) e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-3 w-3 mr-1" /> 가져오기
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" /> 내보내기
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2 p-3">
          <div className="text-xs font-semibold">기간 (선택)</div>
          <div className="space-y-1">
            <Label className="text-[10px]">시작</Label>
            <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">종료</Label>
            <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="h-7 text-xs" />
          </div>
          <Button size="sm" className="w-full h-7 text-xs" onClick={doExport} disabled={exporting}>
            {exporting ? "내보내는 중…" : "엑셀 다운로드"}
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent mobileVariant="fullscreen" className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>가져오기 미리보기</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
            <SummaryCard label="처리 일요일" value={summary.meetings} />
            <SummaryCard label="총 배정" value={summary.total} />
            <SummaryCard label="회원 매칭" value={summary.matched} tone="success" />
            <SummaryCard label="직접입력" value={summary.custom} tone="warn" />
            <SummaryCard label="확인필요(동명이인)" value={summary.duplicate} tone="error" />
          </div>

          <div className="overflow-auto border rounded mt-2 flex-1">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">날짜</th>
                  <th className="px-2 py-1 text-left">행사</th>
                  <th className="px-2 py-1 text-left">항목</th>
                  <th className="px-2 py-1 text-left">값</th>
                  <th className="px-2 py-1 text-left">매칭</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{r.meeting_date}</td>
                    <td className="px-2 py-1">{r.event_custom_name || r.event_type}</td>
                    <td className="px-2 py-1">{r.item} <span className="text-muted-foreground">({r.internal?.role || "?"} / {r.internal?.slot ?? "?"})</span></td>
                    <td className="px-2 py-1">{r.value}{r.topic && <span className="text-muted-foreground"> · {r.topic}</span>}</td>
                    <td className="px-2 py-1">
                      {r.matchKind === "member" && <Badge variant="secondary">{r.matched_name}</Badge>}
                      {r.matchKind === "custom" && <Badge className="bg-amber-100 text-amber-900">직접입력</Badge>}
                      {r.matchKind === "duplicate" && <Badge variant="destructive">동명이인-확인</Badge>}
                      {r.matchKind === "hymn" && <Badge variant="outline">찬송</Badge>}
                      {r.matchKind === "ignored" && <Badge variant="outline">무시</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resultIssues && resultIssues.length > 0 && (
            <details className="border rounded p-2 text-xs">
              <summary className="cursor-pointer font-semibold">미매칭 · 동명이인 ({resultIssues.length}건)</summary>
              <ul className="mt-2 space-y-1">
                {resultIssues.map((r, i) => (
                  <li key={i}>{r.meeting_date} · {r.item} · {r.value} <span className="text-muted-foreground">({r.matchKind})</span></li>
                ))}
              </ul>
            </details>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>취소</Button>
            <Button onClick={runImport} disabled={importing || previewRows.length === 0}>
              {importing ? "반영 중…" : "가져오기 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" | "error" }) {
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
