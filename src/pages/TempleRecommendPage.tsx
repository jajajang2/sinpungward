import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type RecommendType = "REGULAR" | "LIMITED_USE";

interface ParsedRow {
  lcr_name: string;
  gender: string | null;
  age_at_import: number | null;
  recommend_type: RecommendType;
  lcr_status_raw: string | null;
  expiry_month: string | null; // YYYY-MM-01
}

// YYYY-MM 또는 YYYY.MM 형태 찾기
const expiryRegex = /(\d{4})[-./](\d{1,2})/;

function parseLine(line: string, type: RecommendType): ParsedRow | null {
  const raw = line.replace(/\s+/g, " ").trim();
  if (!raw) return null;

  // 만료 (YYYY-MM)
  const expMatch = raw.match(expiryRegex);
  const expiry_month = expMatch
    ? `${expMatch[1]}-${expMatch[2].padStart(2, "0")}-01`
    : null;

  // 나이
  const ageMatch = raw.match(/\b(\d{1,3})\b/);
  const age_at_import = ageMatch ? parseInt(ageMatch[1], 10) : null;

  // 성별
  const genderMatch = raw.match(/(남성|여성|남|여|Male|Female|M|F)/i);
  let gender: string | null = null;
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender = g.startsWith("남") || g === "male" || g === "m" ? "남성" : "여성";
  }

  // 이름 추출: 성별 앞의 모든 텍스트를 이름으로.
  // 탭/여러 공백으로 분리된 원본 형태를 고려하여, 성별 등장 위치 이전을 이름으로.
  let lcr_name = "";
  if (genderMatch && genderMatch.index !== undefined) {
    lcr_name = raw.slice(0, genderMatch.index).trim();
  } else {
    // 성별을 못 찾으면 첫 토큰들 (숫자 나오기 전까지)
    const parts = raw.split(" ");
    const nameParts: string[] = [];
    for (const p of parts) {
      if (/^\d+$/.test(p)) break;
      nameParts.push(p);
    }
    lcr_name = nameParts.join(" ").trim();
  }

  if (!lcr_name) return null;

  // 상태 (raw): 성별과 나이 사이 또는 나이와 만료 사이의 텍스트
  let lcr_status_raw: string | null = null;
  if (ageMatch && expMatch) {
    const ageEnd = (ageMatch.index ?? 0) + ageMatch[0].length;
    const expStart = expMatch.index ?? raw.length;
    const between = raw.slice(ageEnd, expStart).trim();
    if (between) lcr_status_raw = between;
  }

  return {
    lcr_name,
    gender,
    age_at_import,
    recommend_type: type,
    lcr_status_raw,
    expiry_month,
  };
}

function parseText(text: string, type: RecommendType): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => parseLine(l, type))
    .filter((r): r is ParsedRow => r !== null && !!r.lcr_name);
}

const ImportTab = ({ type }: { type: RecommendType }) => {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleParse = () => {
    const rows = parseText(text, type);
    setPreview(rows);
    setResult(null);
  };

  const handleSave = async () => {
    const rows = preview.length ? preview : parseText(text, type);
    if (!rows.length) {
      toast({ title: "파싱된 데이터가 없습니다", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = rows.map((r) => ({
      ...r,
      last_imported_at: new Date().toISOString(),
    }));
    const { error, count } = await supabase
      .from("temple_recommends")
      .upsert(payload, { onConflict: "lcr_name", count: "exact" });
    setSaving(false);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    setResult(`${count ?? rows.length}건 처리됨`);
    toast({ title: `${count ?? rows.length}건 처리됨` });
  };

  const placeholder =
    type === "REGULAR"
      ? "예)\n김 기옥\t남성\t73\t성전 추천서 활동적\t2026-10"
      : "예)\n김 우찬\t남성\t11\t활동적\t2027-05";

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-[240px] font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleParse}>미리보기</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "저장중..." : "저장 (upsert)"}
        </Button>
        {result && <span className="self-center text-sm text-muted-foreground">{result}</span>}
      </div>
      {preview.length > 0 && (
        <div className="border rounded-lg table-scroll table-sticky-first">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-1.5 text-left">이름</th>
                <th className="px-2 py-1.5 text-left">성별</th>
                <th className="px-2 py-1.5 text-left">나이</th>
                <th className="px-2 py-1.5 text-left">유형</th>
                <th className="px-2 py-1.5 text-left">상태(raw)</th>
                <th className="px-2 py-1.5 text-left">만료월</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{r.lcr_name}</td>
                  <td className="px-2 py-1">{r.gender ?? "-"}</td>
                  <td className="px-2 py-1">{r.age_at_import ?? "-"}</td>
                  <td className="px-2 py-1">{r.recommend_type}</td>
                  <td className="px-2 py-1">{r.lcr_status_raw ?? "-"}</td>
                  <td className="px-2 py-1">{r.expiry_month ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeStatus, colorFor, STATUS_ORDER, RecommendStatus } from "@/lib/templeRecommendStatus";

interface RecommendRow {
  id: string;
  lcr_name: string;
  gender: string | null;
  age_at_import: number | null;
  recommend_type: "REGULAR" | "LIMITED_USE";
  expiry_month: string | null;
  lcr_status_raw: string | null;
}

const typeLabel = (t: string) => (t === "REGULAR" ? "정규" : "제한사용");

const Dashboard = ({ rows }: { rows: RecommendRow[] }) => {
  const [typeFilter, setTypeFilter] = useState<"ALL" | "REGULAR" | "LIMITED_USE">("ALL");

  const filtered = useMemo(
    () => (typeFilter === "ALL" ? rows : rows.filter((r) => r.recommend_type === typeFilter)),
    [rows, typeFilter]
  );

  const counts = useMemo(() => {
    const map: Record<RecommendStatus, number> = { 활동적: 0, 주의: 0, 긴급: 0, 만료됨: 0 };
    for (const r of filtered) {
      const { status } = computeStatus(r.expiry_month);
      map[status]++;
    }
    return map;
  }, [filtered]);

  const byType = useMemo(() => {
    const init = () => ({ 활동적: 0, 주의: 0, 긴급: 0, 만료됨: 0 } as Record<RecommendStatus, number>);
    const reg = init();
    const lim = init();
    for (const r of rows) {
      const { status } = computeStatus(r.expiry_month);
      (r.recommend_type === "REGULAR" ? reg : lim)[status]++;
    }
    return { REGULAR: reg, LIMITED_USE: lim };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">유형 필터:</span>
        <div className="inline-flex rounded-md border overflow-hidden">
          {(["ALL", "REGULAR", "LIMITED_USE"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 text-sm ${typeFilter === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              {v === "ALL" ? "전체" : typeLabel(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className={`rounded-lg border p-4 ${colorFor(s)}`}>
            <div className="text-xs opacity-70">{s}</div>
            <div className="text-3xl font-bold mt-1">{counts[s]}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(["REGULAR", "LIMITED_USE"] as const).map((t) => (
          <div key={t} className="rounded-lg border p-4 bg-card">
            <div className="text-sm font-semibold mb-2">{typeLabel(t)}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUS_ORDER.map((s) => (
                <div key={s} className={`rounded border p-2 text-center ${colorFor(s)}`}>
                  <div className="text-[10px]">{s}</div>
                  <div className="text-lg font-bold">{byType[t][s]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecommendList = ({ rows }: { rows: RecommendRow[] }) => {
  const [statusFilter, setStatusFilter] = useState<"ALL" | RecommendStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "REGULAR" | "LIMITED_USE">("ALL");
  const [search, setSearch] = useState("");

  const enriched = useMemo(() => {
    return rows
      .map((r) => ({ ...r, ...computeStatus(r.expiry_month) }))
      .filter((r) => (statusFilter === "ALL" ? true : r.status === statusFilter))
      .filter((r) => (typeFilter === "ALL" ? true : r.recommend_type === typeFilter))
      .filter((r) => (search ? r.lcr_name.includes(search.trim()) : true))
      .sort((a, b) => {
        const ax = a.expiry_month ?? "9999-12-01";
        const bx = b.expiry_month ?? "9999-12-01";
        return ax.localeCompare(bx);
      });
  }, [rows, statusFilter, typeFilter, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">상태: 전체</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="유형" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">유형: 전체</SelectItem>
            <SelectItem value="REGULAR">정규</SelectItem>
            <SelectItem value="LIMITED_USE">제한사용</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">총 {enriched.length}건</span>
      </div>

      <div className="border rounded-lg table-scroll table-sticky-first">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">성별</th>
              <th className="px-3 py-2 text-left">나이</th>
              <th className="px-3 py-2 text-left">유형</th>
              <th className="px-3 py-2 text-left">만료월</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">D-day</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-1.5 font-medium">{r.lcr_name}</td>
                <td className="px-3 py-1.5">{r.gender ?? "-"}</td>
                <td className="px-3 py-1.5">{r.age_at_import ?? "-"}</td>
                <td className="px-3 py-1.5">{typeLabel(r.recommend_type)}</td>
                <td className="px-3 py-1.5">{r.expiry_month ? r.expiry_month.slice(0, 7) : "-"}</td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs ${r.colorClass}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  {r.dday === null ? "-" : r.dday >= 0 ? `D-${r.dday}` : `D+${-r.dday}`}
                </td>
              </tr>
            ))}
            {enriched.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">데이터가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import { ExpiryManagementView, InterviewKanbanView, InterviewRow } from "@/components/temple/InterviewViews";
import { NonHoldersView, NonHolderMember, RecommendLite } from "@/components/temple/NonHoldersView";

const TempleRecommendPage = () => {
  const [rows, setRows] = useState<RecommendRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [members, setMembers] = useState<NonHolderMember[]>([]);
  const [recommendsLite, setRecommendsLite] = useState<RecommendLite[]>([]);
  const { toast } = useToast();

  const fetchAll = async () => {
    const [{ data: recs, error: e1 }, { data: ivs, error: e2 }, { data: mem, error: e3 }, { data: recLite, error: e4 }] = await Promise.all([
      supabase
        .from("temple_recommends")
        .select("id, lcr_name, gender, age_at_import, recommend_type, expiry_month, lcr_status_raw")
        .range(0, 9999),
      supabase
        .from("recommend_interviews")
        .select("id, recommend_id, interview_type, assigned_to, status, scheduled_at, completed_at, notes")
        .order("created_at", { ascending: false })
        .range(0, 9999),
      supabase
        .from("members")
        .select("id, name, gender, birth_date")
        .range(0, 9999),
      supabase
        .from("temple_recommends")
        .select("id, lcr_name, member_id, recommend_type")
        .range(0, 9999),
    ]);
    if (e1) { toast({ title: "추천서 로드 실패", description: e1.message, variant: "destructive" }); }
    else setRows((recs ?? []) as RecommendRow[]);
    if (e2) { toast({ title: "접견 로드 실패", description: e2.message, variant: "destructive" }); }
    else setInterviews((ivs ?? []) as InterviewRow[]);
    if (e3) { toast({ title: "회원 로드 실패", description: e3.message, variant: "destructive" }); }
    else setMembers((mem ?? []) as NonHolderMember[]);
    if (e4) { toast({ title: "매칭 데이터 로드 실패", description: e4.message, variant: "destructive" }); }
    else setRecommendsLite((recLite ?? []) as RecommendLite[]);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">성전 추천서 관리</h1>
        <p className="text-sm text-muted-foreground">상태는 오늘 날짜 기준으로 자동 계산됩니다.</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="dashboard">대시보드</TabsTrigger>
          <TabsTrigger value="list">추천서 목록</TabsTrigger>
          <TabsTrigger value="non-holders">미소지자 명단</TabsTrigger>
          <TabsTrigger value="expiry">만료 관리</TabsTrigger>
          <TabsTrigger value="interview">접견 관리</TabsTrigger>
          <TabsTrigger value="import">명단 임포트</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <Dashboard rows={rows} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <RecommendList rows={rows} />
        </TabsContent>
        <TabsContent value="non-holders" className="mt-4">
          <NonHoldersView members={members} recommends={recommendsLite} reload={fetchAll} />
        </TabsContent>
        <TabsContent value="expiry" className="mt-4">
          <ExpiryManagementView rows={rows} interviews={interviews} reload={fetchAll} />
        </TabsContent>
        <TabsContent value="interview" className="mt-4">
          <InterviewKanbanView rows={rows} interviews={interviews} reload={fetchAll} />
        </TabsContent>
        <TabsContent value="import" className="mt-4">
          <Tabs defaultValue="adult">
            <TabsList className="flex w-full justify-start overflow-x-auto md:w-auto">
              <TabsTrigger value="adult">성인 명단 (정규)</TabsTrigger>
              <TabsTrigger value="youth">청소년 명단 (제한사용)</TabsTrigger>
            </TabsList>
            <TabsContent value="adult" className="mt-4">
              <ImportTab type="REGULAR" />
            </TabsContent>
            <TabsContent value="youth" className="mt-4">
              <ImportTab type="LIMITED_USE" />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TempleRecommendPage;


