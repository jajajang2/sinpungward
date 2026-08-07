import { useEffect, useMemo, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MonthSacramentTable from "@/components/sacrament/MonthSacramentTable";
import SacramentTalkHistory from "@/components/sacrament/SacramentTalkHistory";
import SacramentPrayerHistory from "@/components/sacrament/SacramentPrayerHistory";
import SacramentImportExport from "@/components/sacrament/SacramentImportExport";
import AutoLinkMembers from "@/components/sacrament/AutoLinkMembers";
import { ROWS, type MemberLite } from "@/components/sacrament/types";
import { BISHOPRIC_MAIN_CALLINGS, MUSIC_COMMITTEE_CALLINGS } from "@/data/callings";

const SEARCH_ROLES = ["말씀_3분", "말씀_7분", "말씀_10분", "마지막연사", "개회기도", "폐회기도"];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROWS.map((r) => [r.role, r.label]));

interface SearchRow {
  id: string;
  role: string;
  member_id: string | null;
  custom_name: string | null;
  meeting_date: string;
}

export default function SacramentPage() {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [callingMap, setCallingMap] = useState<Record<string, string[]>>({});
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);
  const [nameQuery, setNameQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("members").select("id, name, birth_date, gender").order("name");
      const mlist = (data as MemberLite[]) || [];
      setMembers(mlist);
      const { data: ci } = await supabase.from("member_church_info").select("member_id, current_calling");
      const cmap: Record<string, string[]> = {};
      (ci || []).forEach((r: any) => {
        if (r.member_id) cmap[r.member_id] = (r.current_calling as string[]) || [];
      });
      setCallingMap(cmap);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sacrament_assignments")
        .select("id, role, member_id, custom_name, sacrament_meetings!inner(meeting_date)")
        .in("role", SEARCH_ROLES);
      const parsed: SearchRow[] = (data || []).map((r: any) => ({
        id: r.id,
        role: r.role,
        member_id: r.member_id,
        custom_name: r.custom_name,
        meeting_date: r.sacrament_meetings.meeting_date,
      })).filter((r) => r.meeting_date >= "2025-01-01");
      setSearchRows(parsed);
    })();
  }, [refreshKey]);

  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach((mem) => m.set(mem.id, mem.name));
    return m;
  }, [members]);

  const searchResults = useMemo(() => {
    const q = nameQuery.trim().replace(/\s+/g, "");
    if (!q) return [];
    return searchRows
      .map((r) => ({
        id: r.id,
        role: r.role,
        meeting_date: r.meeting_date,
        name: r.member_id ? (memberNameById.get(r.member_id) || r.custom_name || "") : (r.custom_name || ""),
      }))
      .filter((r) => r.name && r.name.replace(/\s+/g, "").includes(q))
      .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
  }, [searchRows, nameQuery, memberNameById]);

  const bishopricCandidates = useMemo(() => {
    return members
      .filter((m) => {
        const cs = callingMap[m.id] || [];
        return cs.some((c) => BISHOPRIC_MAIN_CALLINGS.includes(c));
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [members, callingMap]);

  const musicCandidates = useMemo(() => {
    return members
      .filter((m) => {
        const cs = callingMap[m.id] || [];
        return cs.some((c) => MUSIC_COMMITTEE_CALLINGS.includes(c));
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [members, callingMap]);

  const second = useMemo(() => addMonths(anchor, 1), [anchor]);

  return (
    <div className="flex min-h-dvh flex-col md:h-screen md:overflow-hidden p-2 md:p-3 gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold md:text-lg leading-tight">성찬식 순서</h1>
        <div className="flex items-center gap-1">
          <AutoLinkMembers onChanged={() => setRefreshKey((k) => k + 1)} />
          <SacramentImportExport onChanged={() => setRefreshKey((k) => k + 1)} />
        </div>
      </div>

      <Tabs defaultValue="schedule" className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="h-8">
              <TabsTrigger value="schedule" className="text-xs py-1">순서표</TabsTrigger>
              <TabsTrigger value="history" className="text-xs py-1">말씀 히스토리</TabsTrigger>
              <TabsTrigger value="prayer" className="text-xs py-1">기도 히스토리</TabsTrigger>
            </TabsList>
            <div className="relative">
              <Input
                placeholder="이름 검색"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="h-8 w-full sm:w-[160px] text-xs"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 top-9 z-50 w-[min(90vw,280px)] overflow-y-auto rounded-md border bg-popover p-1 shadow-md" style={{ maxHeight: 5 * 28 + 8 }}>
                  <ul className="divide-y">
                    {searchResults.map((r) => (
                      <li key={r.id} className="flex h-7 items-center gap-2 px-1 text-xs">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(r.meeting_date), "yyyy.MM.dd")} · {ROLE_LABEL[r.role] || r.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAnchor((p) => addMonths(p, -2))}>
              <ChevronLeft className="h-3 w-3" /> 이전
            </Button>
            <div className="min-w-[160px] text-center text-xs font-medium">
              {anchor.getFullYear()}년 {anchor.getMonth() + 1}월 · {second.getFullYear()}년 {second.getMonth() + 1}월
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAnchor((p) => addMonths(p, 2))}>
              다음 <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <TabsContent value="schedule" className="mt-2 min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full gap-2 lg:grid-cols-2">
            <MonthSacramentTable
              className="h-full"
              year={anchor.getFullYear()}
              month={anchor.getMonth() + 1}
              members={members}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
              bishopricCandidates={bishopricCandidates}
              musicCandidates={musicCandidates}
            />
            <MonthSacramentTable
              className="h-full"
              year={second.getFullYear()}
              month={second.getMonth() + 1}
              members={members}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
              bishopricCandidates={bishopricCandidates}
              musicCandidates={musicCandidates}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-2 min-h-0 flex-1 overflow-hidden">
          <SacramentTalkHistory members={members} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>

        <TabsContent value="prayer" className="mt-2 min-h-0 flex-1 overflow-hidden">
          <SacramentPrayerHistory members={members} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

