import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TalkDetailModal from "./TalkDetailModal";
import { TALK_ROLES, PRAYER_ROLES, calcAge, type MemberLite } from "./types";

export type BoardMode = "talk" | "prayer";

interface Props {
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
  mode: BoardMode;
}

interface Row {
  assignment_id: string;
  meeting_date: string;
  role: string;
  member_id: string | null;
  talk_topic: string | null;
  talk_content: string | null;
  kind: "talk" | "prayer";
}

type SortKey = "count_desc" | "count_asc" | "name_asc" | "name_desc";

function monthKey(d: string) {
  return d.slice(0, 7);
}

function since18Months() {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SacramentHistoryBoard({ members, refreshKey, onChanged, mode }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  
  const [sortKey, setSortKey] = useState<SortKey>("count_desc");

  useEffect(() => {
    (async () => {
      const from = since18Months();
      const { data } = await supabase
        .from("sacrament_assignments")
        .select("id, role, member_id, talk_topic, talk_content, sacrament_meetings!inner(meeting_date)")
        .in("role", [...TALK_ROLES, ...PRAYER_ROLES])
        .gte("sacrament_meetings.meeting_date", from);
      const parsed: Row[] = (data || [])
        .map((r: any) => ({
          assignment_id: r.id,
          role: r.role,
          member_id: r.member_id,
          talk_topic: r.talk_topic,
          talk_content: r.talk_content,
          meeting_date: r.sacrament_meetings.meeting_date,
          kind: (PRAYER_ROLES.includes(r.role) ? "prayer" : "talk") as "talk" | "prayer",
        }))
        .filter((r) => r.meeting_date >= from);
      setRows(parsed);
    })();
  }, [refreshKey]);

  const byMember = useMemo(() => {
    const map = new Map<string, { talk: Row[]; prayer: Row[] }>();
    rows.forEach((r) => {
      if (!r.member_id) return;
      if (!map.has(r.member_id)) map.set(r.member_id, { talk: [], prayer: [] });
      map.get(r.member_id)![r.kind].push(r);
    });
    map.forEach((v) => {
      v.talk.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
      v.prayer.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    });
    return map;
  }, [rows]);

  const countOf = (id: string) => (byMember.get(id)?.[mode].length || 0);

  const buildList = (gender: "남" | "여") => {
    const arr = members.filter((m) => {
      const g = (m as any).gender;
      return gender === "남" ? g === "남" : g === "여";
    });
    return [...arr].sort((a, b) => {
      switch (sortKey) {
        case "name_asc": return a.name.localeCompare(b.name, "ko");
        case "name_desc": return b.name.localeCompare(a.name, "ko");
        case "count_asc": return countOf(a.id) - countOf(b.id);
        default: return countOf(b.id) - countOf(a.id);
      }
    });
  };

  const brothers = useMemo(() => buildList("남"), [members, sortKey, byMember, mode]);
  const sisters = useMemo(() => buildList("여"), [members, sortKey, byMember, mode]);

  const saveEdit = async (topic: string, content: string) => {
    if (!editing) return;
    await supabase
      .from("sacrament_assignments")
      .update({ talk_topic: topic, talk_content: content })
      .eq("id", editing.assignment_id);
    setRows((p) => p.map((r) => (r.assignment_id === editing.assignment_id ? { ...r, talk_topic: topic, talk_content: content } : r)));
    setEditing(null);
    onChanged();
  };

  const renderChip = (r: Row) => {
    const isTalk = r.kind === "talk";
    const cls = isTalk
      ? "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25"
      : "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30";
    const label = r.meeting_date.slice(2).replace(/-/g, ".");
    return isTalk ? (
      <button key={r.assignment_id} onClick={() => setEditing(r)} className={`shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] leading-tight ${cls}`}>
        {label}
      </button>
    ) : (
      <span key={r.assignment_id} className={`shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] leading-tight ${cls}`}>
        {label}
      </span>
    );
  };

  const renderRow = (m: MemberLite) => {
    const g = byMember.get(m.id) || { talk: [], prayer: [] };
    const age = calcAge(m.birth_date);
    const topKind: "talk" | "prayer" = mode === "talk" ? "talk" : "prayer";
    const bottomKind: "talk" | "prayer" = mode === "talk" ? "prayer" : "talk";
    const top = g[topKind];
    const bottom = g[bottomKind];
    return (
      <li key={m.id} className="flex items-start gap-2 px-2 py-1.5">
        <div className="w-20 shrink-0">
          <div className="truncate text-xs font-medium">
            {m.name}
            {age !== null && <span className="ml-1 text-[10px] text-muted-foreground">({age})</span>}
          </div>
          <div className="text-[10px] text-muted-foreground">
            <span className="text-blue-600">말 {g.talk.length}</span>
            <span className="mx-1">·</span>
            <span className="text-yellow-700">기 {g.prayer.length}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pb-0.5">
          {top.length === 0 && bottom.length === 0 && <span className="text-[10px] text-muted-foreground">-</span>}
          {(top.length > 0 || bottom.length > 0) && (
            <>
              <div className="flex gap-1">
                {top.length ? top.map(renderChip) : <div className="h-[15px]" />}
              </div>
              <div className="mt-0.5 flex gap-1">
                {bottom.length ? bottom.map(renderChip) : <div className="h-[15px]" />}
              </div>
            </>
          )}
        </div>
      </li>
    );
  };
      </li>
    );
  };

  const column = (title: string, list: MemberLite[]) => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="shrink-0 border-b bg-muted/50 px-2 py-1 text-xs font-semibold">{title} ({list.length})</div>
      <ul className="flex-1 divide-y overflow-y-auto">{list.map(renderRow)}</ul>
    </div>
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">{mode === "talk" ? "회원 말씀 히스토리" : "회원 기도 히스토리"}</div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count_desc">{mode === "talk" ? "말씀 많은순" : "기도 많은순"}</SelectItem>
              <SelectItem value="count_asc">{mode === "talk" ? "말씀 적은순" : "기도 적은순"}</SelectItem>
              <SelectItem value="name_asc">이름 ↑</SelectItem>
              <SelectItem value="name_desc">이름 ↓</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-600">말씀</span>
            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-700">기도</span>
            <span>· 최근 18개월</span>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
          {column("형제", brothers)}
          {column("자매", sisters)}
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
