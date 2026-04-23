import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, UserPlus, Users } from "lucide-react";

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
  const [isVisitorPanelOpen, setIsVisitorPanelOpen] = useState(false);
  const isMobile = useIsMobile();

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
            <p className="text-sm text-muted-foreground">최근 3개월 달력에서 날짜를 누르면 해당 일자의 출석부가 열립니다.</p>
            {loading && <p className="text-xs text-muted-foreground">출석 현황을 불러오는 중...</p>}
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border bg-card/40 px-1 py-3 md:px-3">
            <Button
              variant="outline"
              size="icon"
              className="absolute left-[22%] top-1/2 z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 border-border bg-background/95 shadow-sm md:left-[34%]"
              onClick={() => setFocusedMonth(monthOffset(focusedMonth, -1))}
              aria-label="이전 달 보기"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-[22%] top-1/2 z-20 h-9 w-9 translate-x-1/2 -translate-y-1/2 border-border bg-background/95 shadow-sm md:right-[34%]"
              onClick={() => setFocusedMonth(monthOffset(focusedMonth, 1))}
              aria-label="다음 달 보기"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-[0.26fr_0.48fr_0.26fr] items-stretch gap-1 md:grid-cols-[0.28fr_0.44fr_0.28fr] md:gap-3">
              {calendarMonths.map((monthDate, index) => {
                const isCenter = index === 1;

                return (
                  <Card
                    key={monthDate.toISOString()}
                    className={`overflow-hidden border-border p-2 transition-all md:p-3 ${
                      isCenter
                        ? "scale-100 bg-card opacity-100 shadow-sm"
                        : "scale-[0.94] bg-card/70 opacity-55"
                    }`}
                  >
                    <div className={`mb-2 text-center font-semibold text-foreground ${isCenter ? "text-sm md:text-base" : "text-xs md:text-sm"}`}>
                      {format(monthDate, "yyyy년 M월", { locale: ko })}
                    </div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleSelectDate}
                      month={monthDate}
                      fromMonth={monthDate}
                      toMonth={monthDate}
                      showOutsideDays
                      className="w-full"
                      classNames={{
                        months: "block w-full",
                        month: "w-full space-y-2 md:space-y-3",
                        caption: "justify-center",
                        nav: "hidden",
                        table: "w-full table-fixed border-collapse",
                        head_row: "grid grid-cols-7 gap-0.5 md:gap-1 [&>th:first-child]:text-destructive [&>th:last-child]:text-primary",
                        row: "mt-1 grid grid-cols-7 gap-0.5 md:gap-1",
                        head_cell: `w-full rounded-md py-1 text-center font-normal ${isCenter ? "text-[0.72rem] md:text-[0.8rem]" : "text-[0.62rem] md:text-[0.72rem]"}`,
                        cell: `aspect-square w-full p-0 text-center align-top [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-md last:[&:has([aria-selected])]:rounded-md ${
                          isCenter ? "min-h-[4.95rem] md:min-h-[5.35rem]" : "min-h-[3.1rem] md:min-h-[4.2rem]"
                        }`,
                        day:
                          "h-full w-full rounded-md px-0.5 py-1 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:bg-primary aria-selected:text-primary-foreground md:px-1 md:py-1.5",
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
                            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 leading-none md:gap-1">
                              <span className={`${dateTone} tabular-nums ${isCenter ? "text-sm md:text-base" : "text-[0.68rem] md:text-sm"}`}>
                                {date.getDate()}
                              </span>
                              <span className={`${count > 0 ? "font-semibold text-foreground" : "text-muted-foreground/0"} ${isCenter ? "text-xs md:text-sm" : "text-[0.6rem] md:text-xs"}`}>
                                {count > 0 ? `${count}명` : "0명"}
                              </span>
                            </div>
                          );
                        },
                      }}
                    />
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background md:overflow-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-4 py-5 md:h-full md:px-6 md:py-6">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(undefined)} aria-label="달력으로 돌아가기">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{formatSelectedDate(selectedDate)}</h1>
                <p className="text-sm text-muted-foreground">전체 출석 {selectedPresentCount}명 · 방문자 {selectedVisitors.length}명</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSelectedDate(undefined)}>다른 날짜 선택</Button>
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

          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:overflow-hidden">
          <Card className="flex min-h-[44vh] flex-col overflow-hidden border-border md:min-h-0">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{selectedGroup.label}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">회원마다 체크박스 한 칸만 표시됩니다.</p>
                <div className="mt-3">
                  <Input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="이름 검색"
                    aria-label="회원 이름 검색"
                  />
                </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-0 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
              <div>이름</div>
              <div className="text-center">출석</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">해당 그룹에 회원이 없습니다.</div>
              ) : (
                filteredMembers.map((member) => {
                  const checked = selectedDateStr ? attendance[member.id]?.[selectedDateStr] === true : false;
                  return (
                    <div key={member.id} className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-0 px-4 py-3 hover:bg-accent/40">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedGroup.description}</div>
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

            <Card className="border-border md:sticky md:top-4 md:self-start">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">방문자</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">이름, 연락처, 메모를 기록할 수 있습니다.</p>
            </div>

            <div className="space-y-3 p-3 md:space-y-4 md:p-4">
              <div className="space-y-2 rounded-lg border border-border bg-background p-2.5 md:space-y-3 md:p-3">
                <Input className="h-9 md:h-10" placeholder="이름" value={visitorDraft.name} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <Input className="h-9 md:h-10" placeholder="연락처" value={visitorDraft.phone} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                <Textarea className="min-h-[68px] resize-none md:min-h-[96px]" rows={2} placeholder="메모" value={visitorDraft.notes} onChange={(event) => setVisitorDraft((prev) => ({ ...prev, notes: event.target.value }))} />
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
