import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Member, AttendanceRecord } from "@/types/church";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, Users, Percent, UserX, CalendarDays, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnouncementsCard } from "./AnnouncementsCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const RELATION_LABEL: Record<string, string> = {
  spouse: "배우자",
  parent: "부모",
  child: "자녀",
  sibling: "형제자매",
};

interface Props {
  members: Member[];
  attendance: Record<string, Record<string, boolean>>;
  records: AttendanceRecord[];
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getSundays = (from: Date, to: Date): Date[] => {
  const out: Date[] = [];
  const d = new Date(from);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d <= to) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
};

export const AttendanceStats = ({ members, attendance, records }: Props) => {
  const [absentRange, setAbsentRange] = useState<"2w" | "4w" | "3m">("4w");

  const totalMembers = members.length;
  const today = new Date();

  // ── 최근 1개월 출석 일별 ──
  const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthSundays = getSundays(oneMonthAgo, today);

  const monthData = useMemo(() => monthSundays.map(s => {
    const ds = toDateStr(s);
    const count = members.filter(m => attendance[m.id]?.[ds]).length;
    return {
      date: `${s.getMonth() + 1}/${s.getDate()}`,
      count,
      ratio: totalMembers > 0 ? Math.round((count / totalMembers) * 1000) / 10 : 0,
    };
  }), [members, attendance, monthSundays.map(s => s.getTime()).join(",")]);

  const monthTotal = monthData.reduce((s, d) => s + d.count, 0);
  const monthAvg = monthData.length > 0 ? Math.round(monthTotal / monthData.length) : 0;
  const monthAvgRatio = totalMembers > 0 ? Math.round((monthAvg / totalMembers) * 1000) / 10 : 0;

  // ── 월간 그래프: 최근 6개월 평균 ──
  const monthlyData = useMemo(() => {
    const out: { label: string; count: number; ratio: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const sundays = getSundays(start, end);
      let sum = 0;
      sundays.forEach(s => {
        const ds = toDateStr(s);
        sum += members.filter(m => attendance[m.id]?.[ds]).length;
      });
      const avg = sundays.length > 0 ? Math.round(sum / sundays.length) : 0;
      out.push({
        label: `${start.getMonth() + 1}월`,
        count: avg,
        ratio: totalMembers > 0 ? Math.round((avg / totalMembers) * 1000) / 10 : 0,
      });
    }
    return out;
  }, [members, attendance, totalMembers, today.getMonth(), today.getFullYear()]);

  // ── 개인별 출석률 (최근 3개월) ──
  const personalRates = useMemo(() => {
    const start = new Date(today); start.setMonth(start.getMonth() - 3);
    const sundays = getSundays(start, today);
    return members
      .map(m => {
        const present = sundays.filter(s => attendance[m.id]?.[toDateStr(s)]).length;
        const rate = sundays.length > 0 ? (present / sundays.length) * 100 : 0;
        return { id: m.id, name: m.name, present, total: sundays.length, rate };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [members, attendance]);

  // ── 불참석자 (해당 기간 내내 0회 출석) ──
  const absentees = useMemo(() => {
    const start = new Date(today);
    if (absentRange === "2w") start.setDate(start.getDate() - 14);
    else if (absentRange === "4w") start.setDate(start.getDate() - 28);
    else start.setMonth(start.getMonth() - 3);
    const sundays = getSundays(start, today);
    return members.filter(m => {
      return sundays.every(s => !attendance[m.id]?.[toDateStr(s)]);
    });
  }, [members, attendance, absentRange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">출석 통계</h2>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="w-4 h-4" /> 등록인원
          </div>
          <p className="text-2xl font-bold">{totalMembers}</p>
          <p className="text-xs text-muted-foreground mt-1">명</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CalendarDays className="w-4 h-4" /> 1개월 평균
          </div>
          <p className="text-2xl font-bold">{monthAvg}</p>
          <p className="text-xs text-muted-foreground mt-1">명 / 주</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Percent className="w-4 h-4" /> 평균 출석률
          </div>
          <p className="text-2xl font-bold">{monthAvgRatio}%</p>
          <p className="text-xs text-muted-foreground mt-1">최근 1개월</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <UserX className="w-4 h-4" /> 4주 불참
          </div>
          <p className="text-2xl font-bold">{members.filter(m => {
            const sd = new Date(today); sd.setDate(sd.getDate() - 28);
            const ss = getSundays(sd, today);
            return ss.every(s => !attendance[m.id]?.[toDateStr(s)]);
          }).length}</p>
          <p className="text-xs text-muted-foreground mt-1">명</p>
        </Card>
      </div>

      {/* ── 그래프 ── */}
      <Card className="p-5">
        <Tabs defaultValue="weekly">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-base font-semibold">출석 추이</h3>
            <TabsList>
              <TabsTrigger value="weekly">주간 (1개월)</TabsTrigger>
              <TabsTrigger value="monthly">월간 (6개월)</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="weekly">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [name === "count" ? `${v}명` : `${v}%`, name === "count" ? "출석" : "비율"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="monthly">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}명`, "평균 출석"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* ── 공지 + 불참석자 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnnouncementsCard />

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              <h3 className="text-base font-semibold">불참석자</h3>
            </div>
            <Tabs value={absentRange} onValueChange={v => setAbsentRange(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="2w" className="text-xs px-2">2주</TabsTrigger>
                <TabsTrigger value="4w" className="text-xs px-2">4주</TabsTrigger>
                <TabsTrigger value="3m" className="text-xs px-2">3개월</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            해당 기간 동안 한 번도 출석하지 않은 회원 ({absentees.length}명)
          </p>
          {absentees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">없습니다 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
              {absentees.map(m => (
                <span
                  key={m.id}
                  className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 개인별 출석률 ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">개인별 출석률</h3>
          <span className="text-xs text-muted-foreground">최근 3개월</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 font-medium">이름</th>
                <th className="text-right py-2 font-medium w-24">출석/전체</th>
                <th className="text-right py-2 font-medium w-40">출석률</th>
              </tr>
            </thead>
            <tbody>
              {personalRates.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-right text-muted-foreground tabular-nums">
                    {p.present} / {p.total}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                      <span className="tabular-nums w-12 text-right text-xs font-medium">
                        {p.rate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
