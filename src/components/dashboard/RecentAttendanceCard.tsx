import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface WeekData {
  label: string;
  count: number;
}

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const RecentAttendanceCard = () => {
  const [data, setData] = useState<WeekData[]>([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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

      const result = sundays.map((s) => ({
        label: `${s.getMonth() + 1}/${s.getDate()}`,
        count: counts[formatDate(s)] || 0,
      }));
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
      <CardContent className="pb-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.map((w) => (
              <div
                key={w.label}
                className="flex flex-col items-center justify-center rounded-md border border-border bg-muted/30 py-2"
              >
                <span className="text-xs text-muted-foreground">{w.label}</span>
                <span className="text-lg font-semibold text-foreground leading-tight">{w.count}</span>
                <span className="text-[10px] text-muted-foreground">명</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentAttendanceCard;
