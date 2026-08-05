import { useEffect, useMemo, useState, useCallback } from "react";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import PersonPicker from "./PersonPicker";
import TalkDetailModal from "./TalkDetailModal";
import { ROWS, SPECIAL_MERGE_ROLES, calcAge, type AssignStatus, type EventType, type MemberLite, type SacramentAssignment, type SacramentMeeting } from "./types";

const statusBg = (s?: AssignStatus | null) => {
  if (s === "승인") return "bg-sky-100";
  if (s === "부탁") return "bg-yellow-100";
  if (s === "거절") return "bg-red-100";
  return "";
};

interface Props {
  year: number;
  month: number; // 1-12
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
  bishopricCandidates: MemberLite[];
  musicCandidates: MemberLite[];
}

function sundaysOf(year: number, month: number): string[] {
  const result: string[] = [];
  const first = startOfMonth(new Date(year, month - 1, 1));
  const total = getDaysInMonth(first);
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 0) result.push(format(date, "yyyy-MM-dd"));
  }
  return result;
}

const EVENT_OPTIONS: EventType[] = ["일반", "금식간증", "연차대회", "부활절", "와드대회", "스테이크대회", "크리스마스모임", "기타"];

const DISPLAY_LABELS: Record<EventType, string> = {
  "일반": "일반",
  "금식간증": "금식간증",
  "연차대회": "연차대회",
  "부활절": "부활절",
  "와드대회": "와드 대회",
  "스테이크대회": "스테이크 대회",
  "크리스마스모임": "크리스마스 모임",
  "기타": "기타",
};
const displayLabel = (t: EventType) => DISPLAY_LABELS[t] || t;

type AssignKey = string; // `${meeting_id}|${role}|${slot}`
const keyOf = (m: string, r: string, s: number) => `${m}|${r}|${s}`;

export default function MonthSacramentTable({ year, month, members, refreshKey, onChanged, bishopricCandidates, musicCandidates }: Props) {
  const sundays = useMemo(() => sundaysOf(year, month), [year, month]);
  const [meetings, setMeetings] = useState<Record<string, SacramentMeeting>>({});
  const [assigns, setAssigns] = useState<Record<AssignKey, SacramentAssignment>>({});
  const [loading, setLoading] = useState(false);
  const [talkModal, setTalkModal] = useState<{ open: boolean; date: string; role: string; title: string } | null>(null);

  const load = useCallback(async () => {
    if (sundays.length === 0) {
      setMeetings({});
      setAssigns({});
      return;
    }
    setLoading(true);
    const { data: ms } = await supabase
      .from("sacrament_meetings")
      .select("*")
      .in("meeting_date", sundays);
    const mMap: Record<string, SacramentMeeting> = {};
    (ms || []).forEach((m: any) => (mMap[m.meeting_date] = m));
    setMeetings(mMap);

    const ids = (ms || []).map((m: any) => m.id);
    if (ids.length > 0) {
      const { data: as } = await supabase.from("sacrament_assignments").select("*").in("meeting_id", ids);
      const aMap: Record<AssignKey, SacramentAssignment> = {};
      (as || []).forEach((a: any) => (aMap[keyOf(a.meeting_id, a.role, a.slot)] = a));
      setAssigns(aMap);
    } else {
      setAssigns({});
    }
    setLoading(false);
  }, [sundays]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const defaultPresider = useMemo(() => {
    const m = members.find((x) => x.name === "정준우");
    return m ? { member_id: m.id, custom_name: null as string | null } : { member_id: null as string | null, custom_name: "정준우" };
  }, [members]);

  const ensureMeeting = async (date: string): Promise<string> => {
    if (meetings[date]) return meetings[date].id;
    const { data, error } = await supabase
      .from("sacrament_meetings")
      .insert({ meeting_date: date })
      .select()
      .single();
    if (error || !data) {
      toast.error("저장 실패: " + (error?.message || ""));
      throw error;
    }
    const meeting = data as SacramentMeeting;
    setMeetings((p) => ({ ...p, [date]: meeting }));
    // 새 미팅 생성 직후에만 감리자 기본값 자동 생성
    const { data: pres } = await supabase
      .from("sacrament_assignments")
      .insert({ meeting_id: meeting.id, role: "감리자", slot: 0, ...defaultPresider, status: "승인" })
      .select()
      .single();
    if (pres) {
      setAssigns((p) => ({ ...p, [keyOf(meeting.id, "감리자", 0)]: pres as SacramentAssignment }));
    }
    return meeting.id;
  };


  const upsertAssign = async (date: string, role: string, slot: number, patch: Partial<SacramentAssignment>) => {
    const meeting_id = await ensureMeeting(date);
    const existing = assigns[keyOf(meeting_id, role, slot)];
    if (existing) {
      const { data, error } = await supabase
        .from("sacrament_assignments")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        toast.error("저장 실패");
        return;
      }
      setAssigns((p) => ({ ...p, [keyOf(meeting_id, role, slot)]: data as SacramentAssignment }));
    } else {
      const { data, error } = await supabase
        .from("sacrament_assignments")
        .insert({ meeting_id, role, slot, ...patch })
        .select()
        .single();
      if (error) {
        toast.error("저장 실패");
        return;
      }
      setAssigns((p) => ({ ...p, [keyOf(meeting_id, role, slot)]: data as SacramentAssignment }));
    }
    onChanged();
  };

  const deleteAssign = async (date: string, role: string, slot: number) => {
    const meeting = meetings[date];
    if (!meeting) return;
    const existing = assigns[keyOf(meeting.id, role, slot)];
    if (!existing) return;
    await supabase.from("sacrament_assignments").delete().eq("id", existing.id);
    setAssigns((p) => {
      const n = { ...p };
      delete n[keyOf(meeting.id, role, slot)];
      return n;
    });
    onChanged();
  };

  const setEventType = async (date: string, type: EventType, customName?: string) => {
    const meeting_id = await ensureMeeting(date);
    const { data, error } = await supabase
      .from("sacrament_meetings")
      .update({ event_type: type, event_custom_name: customName ?? null })
      .eq("id", meeting_id)
      .select()
      .single();
    if (error) {
      toast.error("저장 실패");
      return;
    }
    setMeetings((p) => ({ ...p, [date]: data as SacramentMeeting }));
  };

  const nameOf = (a?: SacramentAssignment) => {
    if (!a) return "";
    if (a.member_id) {
      const m = members.find((x) => x.id === a.member_id);
      if (!m) return "(삭제된 회원)";
      const age = calcAge(m.birth_date);
      return age !== null ? `${m.name} (${age})` : m.name;
    }
    return a.custom_name || "";
  };

  const deliverersFor = (date: string): SacramentAssignment[] => {
    const m = meetings[date];
    if (!m) return [];
    return Object.values(assigns)
      .filter((a) => a.meeting_id === m.id && a.role === "성찬전달")
      .sort((a, b) => a.slot - b.slot);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b bg-muted/50 px-2 py-1 text-xs font-semibold">
        {year}년 {month}월 성찬식 계획표
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="border bg-muted px-1.5 py-0.5 text-left font-medium w-20 sticky left-0 z-10">항목</th>
              {sundays.map((d) => {
                const dayNum = parseInt(d.split("-")[2], 10);
                const m = meetings[d];
                const label = m && m.event_type !== "일반"
                  ? (m.event_type === "기타" ? (m.event_custom_name || "기타") : displayLabel(m.event_type as EventType))
                  : null;
                return (
                  <th key={d} className="border bg-muted px-1 py-0.5 text-center font-medium">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full hover:underline">
                          {dayNum}일
                          {label && <div className="text-[10px] font-normal text-primary">{label}</div>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2">
                        <div className="mb-1 text-xs font-semibold">행사 유형</div>
                        {EVENT_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => t !== "기타" && setEventType(d, t)}
                            className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${m?.event_type === t ? "bg-muted font-semibold" : ""}`}
                          >
                            {displayLabel(t)}
                          </button>
                        ))}
                        <div className="mt-2 border-t pt-2">
                          <div className="mb-1 text-[10px] text-muted-foreground">기타 (직접 입력)</div>
                          <div className="flex gap-1">
                            <Input
                              defaultValue={m?.event_type === "기타" ? m.event_custom_name || "" : ""}
                              placeholder="행사 이름"
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = (e.target as HTMLInputElement).value.trim();
                                  if (v) setEventType(d, "기타", v);
                                }
                              }}
                              id={`custom-${d}`}
                            />
                            <Button
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                const el = document.getElementById(`custom-${d}`) as HTMLInputElement | null;
                                if (el?.value.trim()) setEventType(d, "기타", el.value.trim());
                              }}
                            >
                              적용
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              // Track skip cells due to rowSpan merges from prior rows
              return (
                <tr key={row.role}>
                  <td className="border bg-muted/30 px-1.5 py-0.5 font-medium sticky left-0 z-10">{row.label}</td>
                  {sundays.map((d) => {
                    const m = meetings[d];
                    const evt: EventType = (m?.event_type as EventType) || "일반";

                    // 연차대회 / 스테이크대회: cover all rows
                    if (evt === "연차대회" || evt === "스테이크대회") {
                      if (row === ROWS[0]) {
                        return (
                          <td
                            key={d}
                            rowSpan={ROWS.length}
                            className="border bg-amber-50 text-center align-middle font-semibold text-amber-900"
                            style={{ writingMode: "vertical-rl" as any, textOrientation: "upright" as any }}
                          >
                            {displayLabel(evt)}
                          </td>
                        );
                      }
                      return null;
                    }

                    // 금식간증/부활절/크리스마스모임/기타: merge SPECIAL_MERGE_ROLES rows.
                    // 와드대회 behaves like 일반 (no merging).
                    const mergesTalkRows =
                      evt === "금식간증" || evt === "부활절" || evt === "크리스마스모임" || evt === "기타";
                    if (mergesTalkRows && SPECIAL_MERGE_ROLES.includes(row.role)) {
                      if (row.role === SPECIAL_MERGE_ROLES[0]) {
                        const label = evt === "기타" ? (m?.event_custom_name || "기타") : displayLabel(evt);
                        return (
                          <td
                            key={d}
                            rowSpan={SPECIAL_MERGE_ROLES.length}
                            className="border bg-amber-50 text-center align-middle font-semibold text-amber-900"
                            style={{ writingMode: "vertical-rl" as any, textOrientation: "upright" as any }}
                          >
                            {label}
                          </td>
                        );
                      }
                      return null;
                    }

                    // Normal cell
                    return (
                      <td key={d} className="border p-0.5">
                        {renderCell(row, d, m)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <div className="px-3 py-1 text-[10px] text-muted-foreground">불러오는 중…</div>}

      {talkModal && (
        <TalkDetailModal
          open={talkModal.open}
          onOpenChange={(o) => setTalkModal((p) => (p ? { ...p, open: o } : null))}
          title={talkModal.title}
          initialTopic={(() => {
            const m = meetings[talkModal.date];
            if (!m) return "";
            const a = assigns[keyOf(m.id, talkModal.role, 0)];
            return a?.talk_topic || "";
          })()}
          initialContent={(() => {
            const m = meetings[talkModal.date];
            if (!m) return "";
            const a = assigns[keyOf(m.id, talkModal.role, 0)];
            return a?.talk_content || "";
          })()}
          onSave={async (topic, content) => {
            await upsertAssign(talkModal.date, talkModal.role, 0, { talk_topic: topic, talk_content: content });
          }}
        />
      )}
    </div>
  );

  function renderCell(row: (typeof ROWS)[number], date: string, meeting?: SacramentMeeting) {
    const a = meeting ? assigns[keyOf(meeting.id, row.role, 0)] : undefined;

    if (row.kind === "hymn") {
      return (
        <Input
          defaultValue={a?.hymn_number || ""}
          placeholder="번호"
          className="h-6 border-0 text-[11px] px-1"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if ((a?.hymn_number || "") === v) return;
            if (!v && a) {
              deleteAssign(date, row.role, 0);
            } else if (v) {
              upsertAssign(date, row.role, 0, { hymn_number: v });
            }
          }}
        />
      );
    }

    if (row.kind === "person") {
      const filled = !!(a?.member_id || a?.custom_name);
      const isPresiderDefault = row.role === "감리자" && !a;
      const displayName = nameOf(a) || (isPresiderDefault ? "정준우" : "");
      const bgClass = statusBg(a?.status ?? (isPresiderDefault ? "승인" : null));
      const candidates =
        row.role === "사회자"
          ? bishopricCandidates
          : row.role === "지휘자" || row.role === "반주자"
            ? musicCandidates
            : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`h-6 w-full px-1 text-left text-[11px] hover:bg-muted ${bgClass}`}
            >
              {displayName || <span className="text-muted-foreground">+</span>}
            </button>

          </PopoverTrigger>
          <PopoverContent className="p-0">
            <PersonPicker
              members={members}
              candidates={candidates}
              currentMemberId={a?.member_id ?? null}
              currentCustomName={a?.custom_name ?? null}
              onPick={(mid, cn) => upsertAssign(date, row.role, 0, { member_id: mid, custom_name: cn })}
              showClear={filled}
              onClear={() => deleteAssign(date, row.role, 0)}
              showStatus={filled}
              currentStatus={a?.status ?? null}
              onStatus={(s) => upsertAssign(date, row.role, 0, { status: s })}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (row.kind === "talk") {
      const filled = !!(a?.member_id || a?.custom_name);
      return (
        <div className={`flex flex-col gap-0.5 p-0.5 ${statusBg(a?.status)}`}>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="h-6 w-full px-1 text-left text-xs hover:bg-muted">
                {nameOf(a) || <span className="text-muted-foreground">+ 사람</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <PersonPicker
                members={members}
                currentMemberId={a?.member_id ?? null}
                currentCustomName={a?.custom_name ?? null}
                onPick={(mid, cn) => upsertAssign(date, row.role, 0, { member_id: mid, custom_name: cn })}
                showClear={filled}
                onClear={() => deleteAssign(date, row.role, 0)}
                showStatus={filled}
                currentStatus={a?.status ?? null}
                onStatus={(s) => upsertAssign(date, row.role, 0, { status: s })}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="truncate rounded bg-background px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:bg-muted"
            onClick={() =>
              setTalkModal({
                open: true,
                date,
                role: row.role,
                title: `${row.label} · ${date}`,
              })
            }
          >
            {a?.talk_topic ? `주제: ${a.talk_topic}` : "+ 주제/내용"}
          </button>
        </div>
      );
    }

    if (row.kind === "deliverers") {
      const list = meeting ? deliverersFor(date) : [];
      const nextSlot = list.length > 0 ? Math.max(...list.map((x) => x.slot)) + 1 : 0;
      return (
        <div className="flex flex-col gap-0.5 p-0.5">
          {list.map((a) => {
            const filled = !!(a.member_id || a.custom_name);
            return (
              <div key={a.id} className={`flex items-center gap-0.5 ${statusBg(a.status)}`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="h-6 flex-1 px-1 text-left text-xs hover:bg-muted">
                      {nameOf(a) || <span className="text-muted-foreground">선택</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <PersonPicker
                      members={members}
                      currentMemberId={a.member_id}
                      currentCustomName={a.custom_name}
                      onPick={(mid, cn) => upsertAssign(date, "성찬전달", a.slot, { member_id: mid, custom_name: cn })}
                      showStatus={filled}
                      currentStatus={a.status ?? null}
                      onStatus={(s) => upsertAssign(date, "성찬전달", a.slot, { status: s })}
                      showClear={filled}
                      onClear={() => deleteAssign(date, "성찬전달", a.slot)}
                    />
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteAssign(date, "성찬전달", a.slot)}
                  aria-label="삭제"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="flex items-center justify-center gap-0.5 rounded border border-dashed py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            onClick={() => upsertAssign(date, "성찬전달", nextSlot, { member_id: null, custom_name: null })}
          >
            <Plus className="h-3 w-3" /> 추가
          </button>
        </div>
      );
    }


    return null;
  }
}
