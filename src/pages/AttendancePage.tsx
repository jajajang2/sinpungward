import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Member, AttendanceRecord } from "@/types/church";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronRight, ChevronLeft, Users } from "lucide-react";

function getSundays(from: Date, to: Date): Date[] {
  const sundays: Date[] = [];
  const d = new Date(from);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d <= to) {
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface AttendanceGroup {
  id: string;
  label: string;
  description: string;
  filter: (m: Member & { church_info?: { current_calling?: string[] } }) => boolean;
}

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const GROUPS: AttendanceGroup[] = [
  {
    id: "all",
    label: "전체회원",
    description: "모든 회원",
    filter: () => true,
  },
  {
    id: "elders",
    label: "장로정원회",
    description: "19세 이상 남성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "남" && age !== null && age >= 19;
    },
  },
  {
    id: "rs",
    label: "상호부조회",
    description: "19세 이상 여성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "여" && age !== null && age >= 19;
    },
  },
  {
    id: "singles",
    label: "독신 (미혼)",
    description: "미혼 성인",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return age !== null && age >= 19 && m.marital_status === "미혼";
    },
  },
  {
    id: "ym",
    label: "청남",
    description: "11세 ~ 19세 남성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "남" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "yw",
    label: "청녀",
    description: "11세 ~ 19세 여성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "여" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "primary",
    label: "초등회",
    description: "0세 ~ 11세",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return age !== null && age < 11;
    },
  },
];

interface AttendanceTableProps {
  members: Member[];
  sundays: Date[];
  attendance: Record<string, Record<string, boolean>>;
  currentWeekIdx: number;
  onToggle: (memberId: string, dateStr: string) => void;
}

const AttendanceTable = ({ members, sundays, attendance, currentWeekIdx, onToggle }: AttendanceTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current?.scrollLeft || 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = scrollStartLeft.current - (e.clientX - dragStartX.current);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const formatDate = (d: Date) => ({ month: d.getMonth() + 1, day: d.getDate() });

  const getCountForDate = (dateStr: string) =>
    members.filter((m) => attendance[m.id]?.[dateStr] === true).length;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto attendance-scroll select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <table className="border-collapse text-sm" style={{ minWidth: "max-content" }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]">
            <th className="sticky left-0 z-20 bg-[hsl(var(--sidebar-bg))] text-left px-4 py-3 font-semibold text-sm min-w-[140px] border-r border-[hsl(var(--sidebar-border))]">
              이름
            </th>
            {sundays.map((s, i) => {
              const { month, day } = formatDate(s);
              const dateStr = toDateStr(s);
              const isCurrentWeek = i === currentWeekIdx;
              return (
                <th
                  key={dateStr}
                  className={`w-16 px-1 py-2 text-center text-xs font-medium border-r border-[hsl(var(--sidebar-border))/30] ${isCurrentWeek ? "bg-[hsl(var(--gold))] text-white" : ""}`}
                >
                  <div className="font-semibold">{month}/{day}</div>
                  <div className="text-[10px] opacity-70 font-normal">{getCountForDate(dateStr)}명</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((member, mi) => (
            <tr
              key={member.id}
              className={`border-b border-border ${mi % 2 === 0 ? "bg-card" : "bg-[hsl(var(--table-row-hover))]"} hover:bg-accent/40`}
            >
              <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-medium text-foreground min-w-[140px] border-r border-border">
                {member.name}
              </td>
              {sundays.map((s, i) => {
                const dateStr = toDateStr(s);
                const isPresent = attendance[member.id]?.[dateStr] === true;
                const isCurrentWeek = i === currentWeekIdx;
                return (
                  <td
                    key={dateStr}
                    className={`w-16 px-1 py-2 text-center border-r border-border/50 ${isCurrentWeek ? "bg-[hsl(var(--gold-light))]" : ""}`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isPresent}
                      onChange={() => onToggle(member.id, dateStr)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={sundays.length + 1} className="text-center py-12 text-muted-foreground">
                해당 그룹에 회원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const AttendancePage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 1);
  const sundays = getSundays(from, today);

  const todaySundayIdx = sundays.findIndex((s) => {
    const next = new Date(s);
    next.setDate(next.getDate() + 7);
    return s <= today && today < next;
  });
  const currentWeekIdx = todaySundayIdx >= 0 ? todaySundayIdx : sundays.length - 1;

  const fetchData = async () => {
    setLoading(true);
    const [mRes, aRes] = await Promise.all([
      supabase.from("members").select("id, name, gender, birth_date, marital_status, created_at, updated_at").order("name"),
      supabase.from("attendance").select("*"),
    ]);
    if (mRes.data) setMembers(mRes.data as Member[]);
    if (aRes.data) {
      const recs = aRes.data as AttendanceRecord[];
      setRecords(recs);
      const map: Record<string, Record<string, boolean>> = {};
      recs.forEach((r) => {
        if (!map[r.member_id]) map[r.member_id] = {};
        map[r.member_id][r.attendance_date] = r.is_present;
      });
      setAttendance(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleAttendance = async (memberId: string, dateStr: string) => {
    const current = attendance[memberId]?.[dateStr] ?? false;
    const newVal = !current;

    setAttendance((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [dateStr]: newVal },
    }));

    setRecords((prev) => {
      const existingIndex = prev.findIndex(
        (record) => record.member_id === memberId && record.attendance_date === dateStr,
      );

      if (existingIndex >= 0) {
        return prev.map((record, index) =>
          index === existingIndex ? { ...record, is_present: newVal } : record,
        );
      }

      return [
        ...prev,
        {
          id: `${memberId}-${dateStr}`,
          member_id: memberId,
          attendance_date: dateStr,
          is_present: newVal,
        },
      ];
    });

    const { error } = await supabase.from("attendance").upsert(
      { member_id: memberId, attendance_date: dateStr, is_present: newVal },
      { onConflict: "member_id,attendance_date" },
    );

    if (error) {
      toast({ title: "저장 오류", description: error.message, variant: "destructive" });
      setAttendance((prev) => ({
        ...prev,
        [memberId]: { ...(prev[memberId] || {}), [dateStr]: current },
      }));
      setRecords((prev) =>
        prev.map((record) =>
          record.member_id === memberId && record.attendance_date === dateStr
            ? { ...record, is_present: current }
            : record,
        ),
      );
    }
  };

  const selectedGroup = GROUPS.find((g) => g.id === selectedGroupId) ?? null;
  const filteredMembers = selectedGroup ? members.filter(selectedGroup.filter) : [];

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-8">불러오는 중...</div>;
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="min-h-full">
        {isMobile ? (
          <section className="border-b border-border bg-card">
            {!selectedGroupId ? (
              <div className="flex flex-col min-h-[60vh]">
                <div className="px-4 py-4 border-b border-border shrink-0">
                  <h1 className="text-lg font-bold text-foreground">출석부</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">총 {members.length}명</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {GROUPS.map((group) => {
                    const count = members.filter(group.filter).length;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors active:bg-accent border-b border-border/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-muted">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-medium truncate text-foreground">{group.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.description} · {count}명
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-[70vh] max-h-[75vh]">
                <div className="px-2 py-3 border-b border-border bg-card shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className="p-2 -ml-1 rounded-md active:bg-accent"
                    aria-label="뒤로"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-foreground truncate">{selectedGroup?.label}</h2>
                    <p className="text-xs text-muted-foreground">{filteredMembers.length}명 · 최근 1개월</p>
                  </div>
                </div>
                <AttendanceTable
                  members={filteredMembers}
                  sundays={sundays}
                  attendance={attendance}
                  currentWeekIdx={currentWeekIdx}
                  onToggle={toggleAttendance}
                />
              </div>
            )}
          </section>
        ) : (
          <section className="flex h-[68vh] min-h-[560px] overflow-hidden border-b border-border bg-background">
            <div className={`flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200 ${selectedGroupId ? "w-52" : "flex-1 max-w-xs"}`}>
              <div className="px-4 py-4 border-b border-border">
                <h1 className="text-lg font-bold text-foreground">출석부</h1>
                <p className="text-xs text-muted-foreground mt-0.5">총 {members.length}명</p>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {GROUPS.map((group) => {
                  const count = members.filter(group.filter).length;
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(isSelected ? null : group.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50 border-b border-border/50 ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{group.label}</p>
                          <p className="text-xs text-muted-foreground">{group.description} · {count}명</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedGroupId ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-card shrink-0 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="text-sm font-semibold text-foreground">{selectedGroup?.label}</h2>
                  <span className="text-xs text-muted-foreground">· {filteredMembers.length}명 · 최근 1개월</span>
                </div>
                <AttendanceTable
                  members={filteredMembers}
                  sundays={sundays}
                  attendance={attendance}
                  currentWeekIdx={currentWeekIdx}
                  onToggle={toggleAttendance}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Users className="w-12 h-12 opacity-20" />
                <p className="text-sm">왼쪽에서 그룹을 선택하세요</p>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
};

export default AttendancePage;
