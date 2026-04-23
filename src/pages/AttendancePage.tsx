import { KeyboardEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { format, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, Plus, UserPlus, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { AttendanceRecord, AttendanceVisitor, Member } from "@/types/church";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

interface AttendanceGroup {
  id: string;
  label: string;
  description: string;
  filter: (member: Member) => boolean;
}

interface VisitorDraft {
  name: string;
  phone: string;
  notes: string;
}

const visitorSchema = z.object({
  name: z.string().trim().min(1, "방문자 이름을 입력해주세요.").max(50, "이름은 50자 이하로 입력해주세요."),
  phone: z.string().trim().max(30, "연락처는 30자 이하로 입력해주세요.").optional().or(z.literal("")),
  notes: z.string().trim().max(300, "메모는 300자 이하로 입력해주세요.").optional().or(z.literal("")),
});

const emptyVisitorDraft: VisitorDraft = {
  name: "",
  phone: "",
  notes: "",
};

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

const GROUPS: AttendanceGroup[] = [
  { id: "all", label: "전체회원", description: "모든 회원", filter: () => true },
  {
    id: "elders",
    label: "장로정원회",
    description: "19세 이상 남성",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return member.gender === "남" && age !== null && age >= 19;
    },
  },
  {
    id: "rs",
    label: "상호부조회",
    description: "19세 이상 여성",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return member.gender === "여" && age !== null && age >= 19;
    },
  },
  {
    id: "singles",
    label: "독신 (미혼)",
    description: "미혼 성인",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return age !== null && age >= 19 && member.marital_status === "미혼";
    },
  },
  {
    id: "ym",
    label: "청남",
    description: "11세 ~ 18세 남성",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return member.gender === "남" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "yw",
    label: "청녀",
    description: "11세 ~ 18세 여성",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return member.gender === "여" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "primary",
    label: "초등회",
    description: "0세 ~ 10세",
    filter: (member) => {
      const age = getAge(member.birth_date);
      return age !== null && age < 11;
    },
  },
];

const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthOffset = (baseDate: Date, offset: number) => new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);

const formatSelectedDate = (date: Date) => format(date, "yyyy년 M월 d일 (EEE)", { locale: ko });

const AttendancePage = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [visitors, setVisitors] = useState<AttendanceVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [visitorDraft, setVisitorDraft] = useState<VisitorDraft>(emptyVisitorDraft);
  const [focusedMonth, setFocusedMonth] = useState(() => monthOffset(new Date(), 0));
  const [motionDirection, setMotionDirection] = useState<"prev" | "next">("next");
  const [isVisitorPanelOpen, setIsVisitorPanelOpen] = useState(false);
  const isMobile = useIsMobile();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const calendarMonths = useMemo(() => {
    return [monthOffset(focusedMonth, -1), monthOffset(focusedMonth, 0), monthOffset(focusedMonth, 1)];
  }, [focusedMonth]);

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : null;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memberRes, attendanceRes, visitorRes] = await Promise.all([
        supabase.from("members").select("id, name, gender, birth_date, marital_status, created_at, updated_at").order("name"),
        supabase.from("attendance").select("*"),
        supabase.from("attendance_visitors").select("*").order("attendance_date", { ascending: false }).order("sort_order"),
      ]);

      if (memberRes.error) {
        toast({ title: "오류", description: "회원 목록을 불러오지 못했습니다.", variant: "destructive" });
      } else {
        setMembers((memberRes.data as Member[]) || []);
      }

      if (attendanceRes.error) {
        toast({ title: "오류", description: "출석 데이터를 불러오지 못했습니다.", variant: "destructive" });
      } else {
        const records = (attendanceRes.data as AttendanceRecord[]) || [];
        const attendanceMap: Record<string, Record<string, boolean>> = {};
        records.forEach((record) => {
          if (!attendanceMap[record.member_id]) attendanceMap[record.member_id] = {};
          attendanceMap[record.member_id][record.attendance_date] = record.is_present;
        });
        setAttendance(attendanceMap);
      }

      if (visitorRes.error) {
        toast({ title: "오류", description: "방문자 기록을 불러오지 못했습니다.", variant: "destructive" });
      } else {
        setVisitors((visitorRes.data as AttendanceVisitor[]) || []);
      }
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "출석부를 불러오지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const attendanceCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(attendance).forEach((memberAttendance) => {
      Object.entries(memberAttendance).forEach(([dateStr, isPresent]) => {
        if (isPresent) {
          counts[dateStr] = (counts[dateStr] || 0) + 1;
        }
      });
    });
    return counts;
  }, [attendance]);

  const selectedGroup = GROUPS.find((group) => group.id === selectedGroupId) ?? GROUPS[0];
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return members.filter((member) => {
      if (!selectedGroup.filter(member)) return false;
      if (!query) return true;
      return member.name.toLowerCase().includes(query);
    });
  }, [memberSearch, members, selectedGroup]);

  const selectedVisitors = useMemo(() => {
    if (!selectedDateStr) return [];
    return visitors.filter((visitor) => visitor.attendance_date === selectedDateStr);
  }, [selectedDateStr, visitors]);

  const selectedPresentCount = selectedDateStr ? attendanceCountsByDate[selectedDateStr] || 0 : 0;

  useEffect(() => {
    setIsVisitorPanelOpen(!isMobile);
  }, [isMobile, selectedDateStr]);

  const handleSelectDate = (date?: Date) => {
    if (!date) return;
    setFocusedMonth(monthOffset(date, 0));
    setSelectedDate(date);
  };

  const navigateMonth = (offset: number) => {
    setMotionDirection(offset < 0 ? "prev" : "next");
    setFocusedMonth((currentMonth) => monthOffset(currentMonth, offset));
  };

  const focusSpecificMonth = (monthDate: Date) => {
    setMotionDirection(monthDate < focusedMonth ? "prev" : "next");
    setFocusedMonth(monthOffset(monthDate, 0));
  };

  const handleMonthPreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>, monthDate: Date) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusSpecificMonth(monthDate);
    }
  };

  const handleCalendarTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCalendarTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    navigateMonth(deltaX > 0 ? -1 : 1);
  };

  const toggleAttendance = async (memberId: string) => {
    if (!selectedDateStr) return;

    const current = attendance[memberId]?.[selectedDateStr] ?? false;
    const next = !current;

    setAttendance((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [selectedDateStr]: next },
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert({ member_id: memberId, attendance_date: selectedDateStr, is_present: next }, { onConflict: "member_id,attendance_date" });

    if (error) {
      setAttendance((prev) => ({
        ...prev,
        [memberId]: { ...(prev[memberId] || {}), [selectedDateStr]: current },
      }));
      toast({ title: "저장 오류", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveVisitor = async () => {
    if (!selectedDateStr) return;

    const parsed = visitorSchema.safeParse(visitorDraft);
    if (!parsed.success) {
      toast({ title: "입력 확인", description: parsed.error.issues[0]?.message ?? "방문자 정보를 확인해주세요.", variant: "destructive" });
      return;
    }

    setSavingVisitor(true);
    const payload = {
      attendance_date: selectedDateStr,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() ? parsed.data.phone.trim() : null,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      sort_order: selectedVisitors.length,
    };

    const { data, error } = await supabase.from("attendance_visitors").insert(payload).select().single();
    setSavingVisitor(false);

    if (error) {
      toast({ title: "저장 오류", description: error.message, variant: "destructive" });
      return;
    }

    setVisitors((prev) => [...prev, data as AttendanceVisitor]);
    setVisitorDraft(emptyVisitorDraft);
    toast({ title: "저장 완료", description: "방문자 정보가 추가되었습니다." });
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    const previousVisitors = visitors;
    setVisitors((prev) => prev.filter((visitor) => visitor.id !== visitorId));

    const { error } = await supabase.from("attendance_visitors").delete().eq("id", visitorId);

    if (error) {
      setVisitors(previousVisitors);
      toast({ title: "삭제 오류", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "삭제 완료", description: "방문자 기록을 삭제했습니다." });
  };

  if (!selectedDate) {
    return (
      <div className="h-screen overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">출석부</h1>
            <p className="text-sm text-muted-foreground">가운데 달력에서 날짜를 누르면 출석부가 열리고, 양옆 달력은 탭하거나 밀어서 가운데로 가져올 수 있습니다.</p>
            {loading && <p className="text-xs text-muted-foreground">출석 현황을 불러오는 중...</p>}
          </div>

          <div
            className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/10 px-1.5 py-3 sm:px-2 sm:py-4 md:px-4 md:py-4"
            onTouchStart={handleCalendarTouchStart}
            onTouchEnd={handleCalendarTouchEnd}
          >
            <div className="relative h-[27rem] sm:h-[30rem] md:h-[36rem]">
              {calendarMonths.map((monthDate, index) => {
                const isCenter = index === 1;
                const sideMotionClass = motionDirection === "next"
                  ? index === 0
                    ? "rotate-[-1.75deg]"
                    : "rotate-[1.75deg]"
                  : index === 0
                    ? "rotate-[-2.25deg]"
                    : "rotate-[2.25deg]";
                const slotClassName = isCenter
                  ? "z-30 -translate-x-1/2 scale-100 opacity-100"
                  : index === 0
                    ? `z-10 -translate-x-[88%] scale-[0.92] opacity-80 ${sideMotionClass}`
                    : `z-10 -translate-x-[12%] scale-[0.92] opacity-80 ${sideMotionClass}`;
                const weekdayGapClass = isCenter
                  ? "grid grid-cols-7 gap-0.75 md:gap-1.25"
                  : "grid grid-cols-7 gap-0.5 md:gap-0.75";
                const rowGapClass = isCenter
                  ? "mt-1 grid grid-cols-7 gap-x-0.75 gap-y-0.75 md:mt-1.25 md:gap-x-1.25 md:gap-y-1"
                  : "mt-0 grid grid-cols-7 gap-x-0.5 gap-y-0.5 md:mt-0.5 md:gap-x-0.75 md:gap-y-0.5";
                const cellHeightClass = isCenter
                  ? "min-h-[2.75rem] aspect-square w-full p-0 text-center align-top [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-md last:[&:has([aria-selected])]:rounded-md md:min-h-[4.35rem]"
                  : "min-h-[2.15rem] aspect-square w-full p-0 text-center align-top [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-md last:[&:has([aria-selected])]:rounded-md md:min-h-[3.35rem]";
                const dayClassName = isCenter
                  ? "h-full w-full rounded-lg px-1 py-1 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:bg-primary aria-selected:text-primary-foreground md:px-1 md:py-1.25"
                  : "h-full w-full rounded-lg px-0.5 py-0.5 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:bg-primary aria-selected:text-primary-foreground md:px-0.5 md:py-0.75";

                return (
                  <div
                    key={monthDate.toISOString()}
                    role={isCenter ? undefined : "button"}
                    tabIndex={isCenter ? -1 : 0}
                    aria-label={isCenter ? undefined : `${format(monthDate, "yyyy년 M월", { locale: ko })} 달력을 가운데로 이동`}
                    onClick={isCenter ? undefined : () => focusSpecificMonth(monthDate)}
                    onKeyDown={isCenter ? undefined : (event) => handleMonthPreviewKeyDown(event, monthDate)}
                    className={`absolute left-1/2 top-1.5 h-[25.5rem] w-[66%] max-w-[40rem] transform-gpu transition-all duration-500 ease-out sm:h-[28rem] md:top-2 md:h-[33.5rem] md:w-[58%] ${slotClassName}`}
                  >
                    <Card
                      className={`flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border/70 bg-card px-2.5 pb-2.5 pt-2 shadow-[0_24px_70px_hsl(var(--foreground)/0.08)] transition-all duration-500 ease-out md:px-4 md:pb-4 md:pt-3 ${
                        isCenter ? "ring-1 ring-border/50" : "bg-card/95 shadow-[0_20px_52px_hsl(var(--foreground)/0.05)]"
                      }`}
                    >
                      <div className={`mb-1.5 text-center font-bold text-foreground md:mb-2 ${isCenter ? "text-lg md:text-[2rem]" : "text-sm md:text-lg"}`}>
                        {format(monthDate, "yyyy년 M월", { locale: ko })}
                      </div>
                      <div className={`min-h-0 flex-1 ${isCenter ? "" : "pointer-events-none"}`}>
                        <Calendar
                          mode="single"
                          selected={isCenter ? selectedDate : undefined}
                          onSelect={isCenter ? handleSelectDate : undefined}
                          month={monthDate}
                          fromMonth={monthDate}
                          toMonth={monthDate}
                          showOutsideDays
                          className="h-full w-full p-1 md:p-1.5"
                          classNames={{
                            months: "block h-full w-full",
                            month: "flex h-full min-h-0 w-full flex-col space-y-1 md:space-y-1.5",
                            caption: "justify-center",
                            nav: "hidden",
                            table: "h-full w-full table-fixed border-collapse",
                            head_row: `${weekdayGapClass} [&>th:first-child]:text-destructive [&>th:last-child]:text-primary`,
                            tbody: "flex-1",
                            row: rowGapClass,
                            head_cell: `${isCenter ? "py-0.5 text-[0.62rem] md:py-1 md:text-[0.7rem]" : "py-0 text-[0.55rem] md:py-0.5 md:text-[0.62rem]"} w-full rounded-md text-center font-medium`,
                            cell: cellHeightClass,
                            day: dayClassName,
                            day_outside:
                              "day-outside text-muted-foreground/70 opacity-100 aria-selected:bg-accent aria-selected:text-accent-foreground",
                          }}
                          components={{
                            DayContent: ({ date }) => {
                              const dateStr = toDateStr(date);
                              const count = attendanceCountsByDate[dateStr] || 0;
                              const isSunday = date.getDay() === 0;
                              const isSaturday = date.getDay() === 6;
                              const isOutside = !isSameMonth(date, monthDate);
                              const dateTone = isOutside
                                ? "text-muted-foreground/70"
                                : isSunday
                                  ? "text-destructive"
                                  : isSaturday
                                    ? "text-primary"
                                    : "text-foreground";

                              return (
                                <div className={`flex h-full w-full flex-col items-center justify-center leading-none ${isCenter ? "gap-0.5 md:gap-0.75" : "gap-0 md:gap-0.25"}`}>
                                  <span className={`${isCenter ? "text-[0.82rem] md:text-[1.12rem]" : "text-[0.62rem] md:text-[0.9rem]"} tabular-nums ${dateTone}`}>
                                    {date.getDate()}
                                  </span>
                                  <span className={`${count > 0 ? "font-semibold text-foreground" : "text-muted-foreground/0"} ${isCenter ? "text-[0.48rem] md:text-[0.62rem]" : "text-[0.4rem] md:text-[0.52rem]"}`}>
                                    {count > 0 ? `${count}명` : "0명"}
                                  </span>
                                </div>
                              );
                            },
                          }}
                        />
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-3 px-3 pb-5 pt-16 sm:px-4 md:h-screen md:gap-4 md:px-6 md:py-6">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2 md:items-center">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(undefined)} aria-label="달력으로 돌아가기" className="mt-0.5 h-9 w-9 shrink-0 md:mt-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground md:text-xl">{formatSelectedDate(selectedDate)}</h1>
                <p className="text-xs text-muted-foreground md:text-sm">전체 출석 {selectedPresentCount}명 · 방문자 {selectedVisitors.length}명</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSelectedDate(undefined)} className="w-full md:w-auto">다른 날짜 선택</Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {GROUPS.map((group) => {
              const isSelected = selectedGroupId === group.id;
              const count = members.filter(group.filter).length;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <div className="text-sm font-medium">{group.label}</div>
                  <div className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{count}명</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:gap-4 md:overflow-hidden">
          <Card className="order-1 flex min-h-[56vh] flex-col overflow-hidden border-border md:min-h-0">
            <div className="border-b border-border p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{selectedGroup.label}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">회원마다 체크박스 한 칸만 표시됩니다.</p>
              <div className="mt-3">
                <Input
                  className="h-9 md:h-10"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="이름 검색"
                  aria-label="회원 이름 검색"
                />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-0 border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground md:px-4 sticky top-0 z-10">
              <div>이름</div>
              <div className="text-center">출석</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground md:p-6">해당 그룹에 회원이 없습니다.</div>
              ) : (
                filteredMembers.map((member) => {
                  const checked = selectedDateStr ? attendance[member.id]?.[selectedDateStr] === true : false;
                  return (
                    <div key={member.id} className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-0 px-3 py-3 hover:bg-accent/40 md:px-4 md:py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground md:text-base">{member.name}</div>
                        <div className="text-[11px] text-muted-foreground md:text-xs">{selectedGroup.description}</div>
                      </div>
                      <div className="flex justify-center">
                        <Checkbox checked={checked} onCheckedChange={() => toggleAttendance(member.id)} aria-label={`${member.name} 출석 체크`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="order-2 border-border md:sticky md:top-4 md:self-start">
            <div className="border-b border-border p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">방문자</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsVisitorPanelOpen((prev) => !prev)} className="h-8 px-3 md:hidden">
                  {isVisitorPanelOpen ? "접기" : "열기"}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground md:text-sm">이름, 연락처, 메모를 기록할 수 있습니다.</p>
            </div>

            <div className="space-y-3 p-3 md:space-y-4 md:p-4">
              <div className="rounded-lg border border-border bg-background p-2.5 md:p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">방문자 {selectedVisitors.length}명</div>
                    <div className="text-[11px] text-muted-foreground md:text-xs">모바일에서는 필요할 때만 입력창을 펼칠 수 있습니다.</div>
                  </div>
                  {!isVisitorPanelOpen && (
                    <Button onClick={() => setIsVisitorPanelOpen(true)} size="sm" className="h-8 px-3 md:hidden">
                      <Plus className="mr-1 h-4 w-4" />추가
                    </Button>
                  )}
                </div>
              </div>

              {isVisitorPanelOpen && (
                <div className="space-y-3">
                  <div className="space-y-2 rounded-lg border border-border bg-background p-2.5 md:space-y-3 md:p-3">
                    <Input className="h-8.5 md:h-10" placeholder="이름" value={visitorDraft.name} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, name: event.target.value }))} />
                    <Input className="h-8.5 md:h-10" placeholder="연락처" value={visitorDraft.phone} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                    <Textarea className="min-h-[60px] resize-none text-sm md:min-h-[96px]" rows={2} placeholder="메모" value={visitorDraft.notes} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, notes: event.target.value }))} />
                    <Button onClick={handleSaveVisitor} disabled={savingVisitor} className="w-full">
                      <Plus className="mr-1 h-4 w-4" />방문자 추가
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {selectedVisitors.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">아직 기록된 방문자가 없습니다.</div>
                    ) : (
                      selectedVisitors.map((visitor) => (
                        <div key={visitor.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="text-sm font-medium text-foreground">{visitor.name}</div>
                              <div className="text-xs text-muted-foreground md:text-sm">{visitor.phone || "연락처 없음"}</div>
                              {visitor.notes && <p className="text-xs text-foreground/80 md:text-sm">{visitor.notes}</p>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteVisitor(visitor.id)}>삭제</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!isVisitorPanelOpen && selectedVisitors.length > 0 && (
                <div className="space-y-2">
                  {selectedVisitors.map((visitor) => (
                    <div key={visitor.id} className="rounded-lg border border-border bg-background px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{visitor.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{visitor.phone || "연락처 없음"}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVisitor(visitor.id)}>삭제</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
