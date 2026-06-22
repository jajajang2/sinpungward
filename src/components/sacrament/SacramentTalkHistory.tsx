import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import TalkDetailModal from "./TalkDetailModal";
import { TALK_ROLES, type MemberLite } from "./types";

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

export default function SacramentTalkHistory({ members, refreshKey, onChanged }: Props) {
  const [rows, setRows] = useState<TalkRow[]>([]);
  const [editing, setEditing] = useState<TalkRow | null>(null);

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

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name)), [members]);

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
          <div className="sticky top-0 z-10 shrink-0 border-b bg-muted/50 px-3 py-2 text-sm font-semibold">
            회원 말씀 히스토리
          </div>
          <ul className="flex-1 divide-y overflow-x-hidden overflow-y-auto">
            {sortedMembers.map((m) => {
              const list = memberGroups.get(m.id) || [];
              return (
                <li key={m.id} className="flex items-start gap-3 px-3 py-2">
                  <div className="w-24 shrink-0 text-sm font-medium">{m.name}</div>
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
          <div className="sticky top-0 z-10 shrink-0 border-b bg-muted/50 px-3 py-2 text-sm font-semibold">
            비회원 (직접 입력)
          </div>
          <ul className="flex-1 divide-y overflow-x-hidden overflow-y-auto">
            {customGroups.size === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">직접 입력된 항목이 없습니다.</li>
            )}
            {[...customGroups.entries()].map(([name, list]) => (
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
