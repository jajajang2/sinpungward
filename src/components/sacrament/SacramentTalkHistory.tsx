import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TalkDetailModal from "./TalkDetailModal";
import { TALK_ROLES, calcAge, type MemberLite } from "./types";

interface Props {
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
}

interface TalkRow {
  assignment_id: string;
  meeting_date: string;
  role: string;
  member_id: string | null;
  custom_name: string | null;
  talk_topic: string | null;
  talk_content: string | null;
}

type SortKey = "name_asc" | "name_desc" | "talks_desc" | "talks_asc" | "att_desc" | "att_asc";

export default function SacramentTalkHistory({ members, refreshKey, onChanged }: Props) {
  const [rows, setRows] = useState<TalkRow[]>([]);
  const [editing, setEditing] = useState<TalkRow | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [attendance, setAttendance] = useState<Map<string, { present: number; total: number }>>(new Map());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sacrament_assignments")
        .select("id, role, member_id, custom_name, talk_topic, talk_content, sacrament_meetings!inner(meeting_date)")
        .in("role", TALK_ROLES);
      const parsed: TalkRow[] = (data || []).map((r: any) => ({
        assignment_id: r.id,
        role: r.role,
        member_id: r.member_id,
        custom_name: r.custom_name,
        talk_topic: r.talk_topic,
        talk_content: r.talk_content,
        meeting_date: r.sacrament_meetings.meeting_date,
      }));
      setRows(parsed);
    })();
  }, [refreshKey]);

  useEffect(() => {
    (async () => {
      // page through attendance
      const map = new Map<string, { present: number; total: number }>();
      let from = 0;
      const size = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("attendance")
          .select("member_id, is_present")
          .range(from, from + size - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data as any[]) {
          if (!r.member_id) continue;
          const cur = map.get(r.member_id) || { present: 0, total: 0 };
          cur.total += 1;
          if (r.is_present) cur.present += 1;
          map.set(r.member_id, cur);
        }
        if (data.length < size) break;
        from += size;
      }
      setAttendance(map);
    })();
  }, []);

  const memberGroups = useMemo(() => {
    const byMember = new Map<string, TalkRow[]>();
    rows.forEach((r) => {
      if (!r.member_id) return;
      if (!byMember.has(r.member_id)) byMember.set(r.member_id, []);
      byMember.get(r.member_id)!.push(r);
    });
    byMember.forEach((arr) => arr.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)));
    return byMember;
  }, [rows]);

  const customGroups = useMemo(() => {
    const map = new Map<string, TalkRow[]>();
    rows.forEach((r) => {
      if (r.member_id || !r.custom_name) return;
      const k = r.custom_name.trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    map.forEach((arr) => arr.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)));
    return map;
  }, [rows]);

  const attRate = (id: string) => {
    const a = attendance.get(id);
    if (!a || a.total === 0) return -1;
    return a.present / a.total;
  };

  const sortedMembers = useMemo(() => {
    const q = memberSearch.trim().replace(/\s+/g, "");
    const filtered = members.filter((m) => !q || m.name.replace(/\s+/g, "").includes(q));
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "talks_desc": return (memberGroups.get(b.id)?.length || 0) - (memberGroups.get(a.id)?.length || 0);
        case "talks_asc": return (memberGroups.get(a.id)?.length || 0) - (memberGroups.get(b.id)?.length || 0);
        case "att_desc": return attRate(b.id) - attRate(a.id);
        case "att_asc": {
          const ra = attRate(a.id), rb = attRate(b.id);
          if (ra < 0 && rb < 0) return 0;
          if (ra < 0) return 1;
          if (rb < 0) return -1;
          return ra - rb;
        }
      }
    });
    return arr;
  }, [members, memberSearch, sortKey, memberGroups, attendance]);

  const filteredCustom = useMemo(() => {
    const q = customSearch.trim().replace(/\s+/g, "");
    return [...customGroups.entries()].filter(([name]) => !q || name.replace(/\s+/g, "").includes(q));
  }, [customGroups, customSearch]);

  const saveEdit = async (topic: string, content: string) => {
    if (!editing) return;
    await supabase
      .from("sacrament_assignments")
      .update({ talk_topic: topic, talk_content: content })
      .eq("id", editing.assignment_id);
    setRows((p) => p.map((r) => (r.assignment_id === editing.assignment_id ? { ...r, talk_topic: topic, talk_content: content } : r)));
    onChanged();
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:gap-3" style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card md:w-[60%]">
          <div className="sticky top-0 z-10 shrink-0 border-b bg-muted/50 px-3 py-2">
            <div className="text-sm font-semibold mb-2">회원 말씀 히스토리</div>
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
                  <SelectItem value="talks_desc">말씀 많은순</SelectItem>
                  <SelectItem value="talks_asc">말씀 적은순</SelectItem>
                  <SelectItem value="att_desc">출석률 높은순</SelectItem>
                  <SelectItem value="att_asc">출석률 낮은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ul className="flex-1 divide-y overflow-x-hidden overflow-y-auto">
            {sortedMembers.map((m) => {
              const list = memberGroups.get(m.id) || [];
              const age = calcAge(m.birth_date);
              const a = attendance.get(m.id);
              const rateStr = a && a.total > 0 ? `${Math.round((a.present / a.total) * 100)}%` : "-";
              return (
                <li key={m.id} className="flex items-start gap-3 px-3 py-2">
                  <div className="w-28 shrink-0 text-sm font-medium">
                    {m.name}
                    {age !== null && <span className="ml-1 text-xs text-muted-foreground">({age})</span>}
                    <div className="text-[10px] text-muted-foreground">말씀 {list.length} · 출석 {rateStr}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {list.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                    {list.map((r) => (
                      <button
                        key={r.assignment_id}
                        onClick={() => setEditing(r)}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20"
                      >
                        {format(new Date(r.meeting_date), "yyyy.MM.dd")}
                        {r.talk_topic && <span className="ml-1 text-muted-foreground">· {r.talk_topic}</span>}
                      </button>
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
                    <button
                      key={r.assignment_id}
                      onClick={() => setEditing(r)}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-200"
                    >
                      {format(new Date(r.meeting_date), "yyyy.MM.dd")}
                      {r.talk_topic && <span className="ml-1 text-amber-800/70">· {r.talk_topic}</span>}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {editing && (
        <TalkDetailModal
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={`${editing.role.replace("_", " ")} · ${editing.meeting_date}`}
          initialTopic={editing.talk_topic || ""}
          initialContent={editing.talk_content || ""}
          onSave={saveEdit}
        />
      )}
    </>
  );
}
