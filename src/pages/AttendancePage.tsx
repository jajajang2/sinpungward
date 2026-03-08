import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Member, AttendanceRecord } from "@/types/church";
import { useToast } from "@/hooks/use-toast";

// Get all Sundays from a start date (2 months back) to 3 months forward
function getSundays(from: Date, to: Date): Date[] {
  const sundays: Date[] = [];
  const d = new Date(from);
  // Find the first Sunday on or after `from`
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d <= to) {
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const AttendancePage = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const today = new Date();
  const from = new Date(today); from.setMonth(from.getMonth() - 2);
  const to = new Date(today); to.setMonth(to.getMonth() + 1);
  const sundays = getSundays(from, to);

  // Find index of this week's Sunday (nearest past or today)
  const todaySundayIdx = sundays.findIndex(s => {
    const next = new Date(s); next.setDate(next.getDate() + 7);
    return s <= today && today < next;
  });
  const currentWeekIdx = todaySundayIdx >= 0 ? todaySundayIdx : sundays.length - 1;

  const fetchData = async () => {
    setLoading(true);
    const [mRes, aRes] = await Promise.all([
      supabase.from('members').select('id, name, created_at, updated_at').order('name'),
      supabase.from('attendance').select('*'),
    ]);
    if (mRes.data) setMembers(mRes.data as Member[]);
    if (aRes.data) {
      const map: Record<string, Record<string, boolean>> = {};
      (aRes.data as AttendanceRecord[]).forEach(r => {
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

  // Scroll to current week on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const cellWidth = 64; // px
      const nameColWidth = 140;
      const scrollTo = nameColWidth + currentWeekIdx * cellWidth - 200;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [loading, currentWeekIdx]);

  const toggleAttendance = async (memberId: string, dateStr: string) => {
    const current = attendance[memberId]?.[dateStr] ?? false;
    const newVal = !current;

    setAttendance(prev => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [dateStr]: newVal }
    }));

    const { error } = await supabase.from('attendance').upsert(
      { member_id: memberId, attendance_date: dateStr, is_present: newVal },
      { onConflict: 'member_id,attendance_date' }
    );
    if (error) {
      toast({ title: '저장 오류', description: error.message, variant: 'destructive' });
      setAttendance(prev => ({
        ...prev,
        [memberId]: { ...(prev[memberId] || {}), [dateStr]: current }
      }));
    }
  };

  // Mouse drag scroll
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current?.scrollLeft || 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStartX.current;
    scrollRef.current.scrollLeft = scrollStartLeft.current - dx;
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const formatDate = (d: Date) => {
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return { month, day };
  };

  // Count attendance per Sunday
  const getCountForDate = (dateStr: string) => {
    return members.filter(m => attendance[m.id]?.[dateStr] === true).length;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-8">불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">출석부</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          마우스로 드래그하거나 터치로 좌우 스크롤하세요 · 총 {members.length}명
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex">
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto attendance-scroll select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <table className="border-collapse text-sm" style={{ minWidth: 'max-content' }}>
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
                      className={`w-16 px-1 py-2 text-center text-xs font-medium border-r border-[hsl(var(--sidebar-border))/30] ${
                        isCurrentWeek ? 'bg-[hsl(var(--gold))] text-white' : ''
                      }`}
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
                  className={`border-b border-border ${mi % 2 === 0 ? 'bg-card' : 'bg-[hsl(var(--table-row-hover))]'} hover:bg-accent/40`}
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
                        className={`w-16 px-1 py-2 text-center border-r border-border/50 ${isCurrentWeek ? 'bg-[hsl(var(--gold-light))]' : ''}`}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() => toggleAttendance(member.id, dateStr)}
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
                    회원기록양식에서 먼저 회원을 추가해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
