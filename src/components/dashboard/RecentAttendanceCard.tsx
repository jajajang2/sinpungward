import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid } from "recharts";

interface WeekData {
  label: string;
  count: number;
}

const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const RecentAttendanceCard = () => {
  const [data, setData] = useState<WeekData[]>([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Find last 4 Sundays
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - today.getDay());
      const sundays: Date[] = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(lastSunday);
        d.setDate(lastSunday.getDate() - i * 7);
        sundays.push(d);
      }
      const startDate = formatDate(sundays[0]);
      const endDate = formatDate(sundays[sundays.length - 1]);

      const { data: rows } = await supabase
        .from("attendance")
        .select("attendance_date, is_present")
        .eq("is_present", true)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      const counts: Record<string, number> = {};
      (rows || []).forEach((r: any) => {
        counts[r.attendance_date] = (counts[r.attendance_date] || 0) + 1;
      });

      const result = sundays.map((s) => {
        const key = formatDate(s);
        return {
          label: `${s.getMonth() + 1}/${s.getDate()}`,
          count: counts[key] || 0,
        };
      });
      setData(result);
      setAvg(Math.round(result.reduce((a, b) => a + b.count, 0) / result.length));
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4 text-primary" />
          최근 4주 출석 통계
          <span className="ml-auto text-xs font-normal text-muted-foreground">평균 {avg}명</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <ReferenceLine y={avg} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentAttendanceCard;
