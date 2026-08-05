import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRAYER_ROLES, calcAge, type MemberLite } from "./types";

interface Props {
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
}

interface PrayerRow {
  assignment_id: string;
  meeting_date: string;
  role: string;
  member_id: string | null;
  custom_name: string | null;
}

type SortKey = "name_asc" | "name_desc" | "prayers_desc" | "prayers_asc";
type PrayerFilter = "all" | "개회기도" | "폐회기도";

const PRAYER_FILTERS: { label: string; value: PrayerFilter }[] = [
  { label: "전체", value: "all" },
  { label: "개회기도", value: "개회기도" },
  { label: "폐회기도", value: "폐회기도" },
];

export default function SacramentPrayerHistory({ members, refreshKey }: Props) {
  const [rows, setRows] = useState<PrayerRow[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [prayerFilter, setPrayerFilter] = useState<PrayerFilter>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sacrament_assignments")
        .select("id, role, member_id, custom_name, sacrament_meetings!inner(meeting_date)")
        .in("role", PRAYER_ROLES);
      const parsed: PrayerRow[] = (data || []).map((r: any) => ({
        assignment_id: r.id,
        role: r.role,
        member_id: r.member_id,
        custom_name: r.custom_name,
        meeting_date: r.sacrament_meetings.meeting_date,
      })).filter((r: PrayerRow) => r.meeting_date >= "2025-01-01");
      setRows(parsed);
    })();
  }, [refreshKey]);

  const filteredRows = useMemo(
    () => (prayerFilter === "all" ? rows : rows.filter((r) => r.role === prayerFilter)),
    [rows, prayerFilter]
  );

  const memberGroups = useMemo(() => {
    const byMember = new Map<string, PrayerRow[]>();
    filteredRows.forEach((r) => {
      if (!r.member_id) return;
      if (!byMember.has(r.member_id)) byMember.set(r.member_id, []);
      byMember.get(r.member_id)!.push(r);
    });
    byMember.forEach((arr) => arr.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)));
    return byMember;
  }, [filteredRows]);

  const customGroups = useMemo(() => {
    const map = new Map<string, PrayerRow[]>();
    filteredRows.forEach((r) => {
      if (r.member_id || !r.custom_name) return;
      const k = r.custom_name.trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    map.forEach((arr) => arr.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)));
    return map;
  }, [filteredRows]);

  const sortedMembers = useMemo(() => {
    const q = memberSearch.trim().replace(/\s+/g, "");
    const arr = members.filter((m) => !q || m.name.replace(/\s+/g, "").includes(q));
    return [...arr].sort((a, b) => {
      switch (sortKey) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "prayers_desc": return (memberGroups.get(b.id)?.length || 0) - (memberGroups.get(a.id)?.length || 0);
        case "prayers_asc": return (memberGroups.get(a.id)?.length || 0) - (memberGroups.get(b.id)?.length || 0);
      }
    });
  }, [members, memberSearch, sortKey, memberGroups]);

  const filteredCustom = useMemo(() => {
    const q = customSearch.trim().replace(/\s+/g, "");
    return [...customGroups.entries()].filter(([name]) => !q || name.replace(/\s+/g, "").includes(q));
  }, [customGroups, customSearch]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-3" style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card md:w-[60%]">
        <div className="sticky top-0 z-10 shrink-0 border-b bg-muted/50 px-3 py-2">
          <div className="text-sm font-semibold mb-2">회원 기도 히스토리</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {PRAYER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setPrayerFilter(f.value)}
                className={
                  "rounded-full px-2.5 py-0.5 text-xs " +
                  (prayerFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="이름 검색"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-8 flex-1 min-w-[120px] text-xs"
            />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">이름 ↑</SelectItem>
                <SelectItem value="name_desc">이름 ↓</SelectItem>
                <SelectItem value="prayers_desc">기도 많은순</SelectItem>
                <SelectItem value="prayers_asc">기도 적은순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ul className="flex-1 divide-y overflow-x-hidden overflow-y-auto">
          {sortedMembers.map((m) => {
            const list = memberGroups.get(m.id) || [];
            const age = calcAge(m.birth_date);
            return (
              <li key={m.id} className="flex items-start gap-3 px-3 py-2">
                <div className="w-28 shrink-0 text-sm font-medium">
                  {m.name}
                  {age !== null && <span className="ml-1 text-xs text-muted-foreground">({age})</span>}
                  <div className="text-[10px] text-muted-foreground">기도 {list.length}</div>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {list.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                  {list.map((r) => (
                    <span
                      key={r.assignment_id}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {format(new Date(r.meeting_date), "yyyy.MM.dd")}
                      <span className="ml-1 text-muted-foreground">· {r.role}</span>
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card md:w-[40%]">
        <div className="sticky top-0 z-10 shrink-0 border-b bg-muted/50 px-3 py-2">
          <div className="text-sm font-semibold mb-2">비회원 (직접 입력)</div>
          <Input
            placeholder="이름 검색"
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            className="h-8 w-full text-xs"
          />
        </div>
        <ul className="flex-1 divide-y overflow-x-hidden overflow-y-auto">
          {filteredCustom.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">직접 입력된 항목이 없습니다.</li>
          )}
          {filteredCustom.map(([name, list]) => (
            <li key={name} className="flex items-start gap-3 px-3 py-2">
              <div className="w-24 shrink-0 text-sm font-medium">{name}</div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {list.map((r) => (
                  <span
                    key={r.assignment_id}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                  >
                    {format(new Date(r.meeting_date), "yyyy.MM.dd")}
                    <span className="ml-1 text-amber-800/70">· {r.role}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
