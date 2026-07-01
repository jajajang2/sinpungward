import { useState } from "react";
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
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
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

const TempleRecommendPage = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">성전 추천서 관리</h1>
        <p className="text-sm text-muted-foreground">LCR 명단을 붙여넣어 임포트하세요.</p>
      </div>
      <Tabs defaultValue="adult">
        <TabsList>
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
    </div>
  );
};

export default TempleRecommendPage;
