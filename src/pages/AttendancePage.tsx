import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, Plus, Users, UserPlus } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { AttendanceRecord, AttendanceVisitor, Member } from "@/types/church";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AttendanceGroup {
  id: string;
  label: string;
  description: string;
  filter: (m: Member & { church_info?: { current_calling?: string[] } }) => boolean;
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
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const GROUPS: AttendanceGroup[] = [
  { id: "all", label: "전체회원", description: "모든 회원", filter: () => true },
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

const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthOffset = (baseDate: Date, offset: number) => new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);

const formatSelectedDate = (date: Date) => format(date, "M월 d일 (EEE)", { locale: ko });

const AttendancePage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [visitors, setVisitors] = useState<AttendanceVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [visitorDraft, setVisitorDraft] = useState<VisitorDraft>(emptyVisitorDraft);

  const calendarMonths = useMemo(() => {
    const today = new Date();
    return [monthOffset(today, -1), monthOffset(today, 0), monthOffset(today, 1)];
  }, []);

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : null;

  const fetchData = async () => {
    setLoading(true);
    const [memberRes, attendanceRes, visitorRes] = await Promise.all([
      supabase.from("members").select("id, name, gender, birth_date, marital_status, created_at, updated_at").order("name"),
      supabase.from("attendance").select("*") ,
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

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedGroup = GROUPS.find((group) => group.id === selectedGroupId) ?? GROUPS[0];
  const filteredMembers = useMemo(
    () => members.filter(selectedGroup.filter),
    [members, selectedGroup],
  );

  const selectedVisitors = useMemo(() => {
    if (!selectedDateStr) return [];
    return visitors.filter((visitor) => visitor.attendance_date === selectedDateStr);
  }, [selectedDateStr, visitors]);

  const presentCount = useMemo(() => {
    if (!selectedDateStr) return 0;
    return filteredMembers.filter((member) => attendance[member.id]?.[selectedDateStr] === true).length;
  }, [attendance, filteredMembers, selectedDateStr]);

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

  if (loading) {
    return <div className="flex h-full items-center justify-center p-8 text-muted-foreground">불러오는 중...</div>;
  }

  if (!selectedDate) {
    return (
      <div className="h-screen overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">출석부</h1>
            <p className="text-sm text-muted-foreground">이전 달, 현재 달, 다음 달 중 날짜를 선택하면 해당 일자의 출석 체크 화면이 열립니다.</p>
          </div>

          <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {calendarMonths.map((monthDate) => (
              <Card key={monthDate.toISOString()} className="overflow-hidden border-border p-3">
                <div className="mb-2 px-2 text-sm font-semibold text-foreground">{format(monthDate, "yyyy년 M월", { locale: ko })}</div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={monthDate}
                  fromMonth={monthDate}
                  toMonth={monthDate}
                  showOutsideDays={false}
                  className="w-full"
                />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate(undefined)} aria-label="날짜 선택으로 돌아가기">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{formatSelectedDate(selectedDate)}</h1>
                <p className="text-sm text-muted-foreground">회원 {presentCount}명 출석 · 방문자 {selectedVisitors.length}명</p>
              </div>
            </div>

            <Button variant="outline" onClick={() => setSelectedDate(undefined)}>
              다른 날짜 선택
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {GROUPS.map((group) => {
              const count = members.filter(group.filter).length;
              const isSelected = selectedGroupId === group.id;
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

        <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"}`}>
          <Card className="border-border">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{selectedGroup.label}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">이름 오른쪽에서 바로 출석 체크할 수 있습니다.</p>
            </div>

            <div className="divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">해당 그룹에 회원이 없습니다.</div>
              ) : (
                filteredMembers.map((member) => {
                  const checked = selectedDateStr ? attendance[member.id]?.[selectedDateStr] === true : false;
                  return (
                    <label key={member.id} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedGroup.description}</div>
                      </div>
                      <Checkbox checked={checked} onCheckedChange={() => toggleAttendance(member.id)} aria-label={`${member.name} 출석 체크`} />
                    </label>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-border">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">방문자</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">회원이 아닌 방문자의 이름, 연락처, 메모를 함께 기록합니다.</p>
            </div>

            <div className="space-y-4 p-4">
              <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                <Input
                  placeholder="이름"
                  value={visitorDraft.name}
                  onChange={(event) => setVisitorDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
                <Input
                  placeholder="연락처"
                  value={visitorDraft.phone}
                  onChange={(event) => setVisitorDraft((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <Textarea
                  placeholder="메모"
                  value={visitorDraft.notes}
                  onChange={(event) => setVisitorDraft((prev) => ({ ...prev, notes: event.target.value }))}
                />
                <Button onClick={handleSaveVisitor} disabled={savingVisitor} className="w-full">
                  <Plus className="mr-1 h-4 w-4" />
                  방문자 추가
                </Button>
              </div>

              <div className="space-y-2">
                {selectedVisitors.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    아직 기록된 방문자가 없습니다.
                  </div>
                ) : (
                  selectedVisitors.map((visitor) => (
                    <div key={visitor.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium text-foreground">{visitor.name}</div>
                          <div className="text-sm text-muted-foreground">{visitor.phone || "연락처 없음"}</div>
                          {visitor.notes && <p className="text-sm text-foreground/80">{visitor.notes}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVisitor(visitor.id)}>
                          삭제
                        </Button>
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
