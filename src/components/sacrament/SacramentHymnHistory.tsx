import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HYMNS, formatHymn } from "@/data/hymns";

const HYMN_ROLES = ["개회찬송", "성찬찬송", "중간찬송", "폐회찬송"];

interface Row {
  id: string;
  hymn_number: string;
  meeting_date: string;
}

interface Group {
  key: string;
  count: number;
  dates: string[];
}

type SortKey = "count_desc" | "count_asc" | "key_asc";

interface Props {
  refreshKey: number;
}

export default function SacramentHymnHistory({ refreshKey }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("count_desc");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sacrament_assignments")
        .select("id, hymn_number, sacrament_meetings!inner(meeting_date)")
        .in("role", HYMN_ROLES)
        .not("hymn_number", "is", null);
      const parsed: Row[] = (data || [])
        .map((r: any) => ({
          id: r.id,
          hymn_number: (r.hymn_number || "").trim(),
          meeting_date: r.sacrament_meetings.meeting_date,
        }))
        .filter((r) => r.hymn_number);
      setRows(parsed);
    })();
  }, [refreshKey]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    // 성찬식 순서에서 쓰는 찬송가·가정과 교회 음악 전체를 0회로 먼저 채워, 안 불린 곡도 항상 표시되게 한다.
    HYMNS.filter((h) => h.book !== "children").forEach((h) => {
      const key = formatHymn(h);
      map.set(key, { key, count: 0, dates: [] });
    });
    rows.forEach((r) => {
      if (!map.has(r.hymn_number)) map.set(r.hymn_number, { key: r.hymn_number, count: 0, dates: [] });
      const g = map.get(r.hymn_number)!;
      g.count++;
      g.dates.push(r.meeting_date);
    });
    const arr = Array.from(map.values());
    arr.forEach((g) => g.dates.sort((a, b) => b.localeCompare(a)));
    arr.sort((a, b) => {
      if (sortKey === "count_asc") return a.count - b.count;
      if (sortKey === "key_asc") return a.key.localeCompare(b.key, "ko");
      return b.count - a.count;
    });
    return arr;
  }, [rows, sortKey]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="text-sm font-semibold">찬송가 히스토리</div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count_desc">많이 부른순</SelectItem>
            <SelectItem value="count_asc">적게 부른순</SelectItem>
            <SelectItem value="key_asc">이름/번호순</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">전체 기록 기준 · 총 {groups.length}곡</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card">
        <ul className="divide-y">
          {groups.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">기록이 없습니다</li>
          ) : (
            groups.map((g, i) => (
              <li key={g.key} className="flex items-start gap-2 px-2 py-1.5">
                <div className="w-8 shrink-0 pt-0.5 text-xs font-semibold text-muted-foreground">{i + 1}</div>
                <div className="w-48 shrink-0">
                  <div className="truncate text-xs font-medium">{g.key}</div>
                  <div className="text-[10px] text-muted-foreground">{g.count}회</div>
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto pb-0.5">
                  <div className="flex gap-1">
                    {g.dates.map((d) => (
                      <span
                        key={d}
                        className="shrink-0 whitespace-nowrap rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary"
                      >
                        {d.slice(2).replace(/-/g, ".")}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
