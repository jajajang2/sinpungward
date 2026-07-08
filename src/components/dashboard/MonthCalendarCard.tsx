import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import EventDialog from "./EventDialog";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const MonthCalendarCard = () => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<Record<string, { id: string; title: string }[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const { data } = await supabase
      .from("calendar_events")
      .select("id, event_date, title")
      .gte("event_date", fmt(start))
      .lte("event_date", fmt(end))
      .order("created_at");
    const map: Record<string, { id: string; title: string }[]> = {};
    (data || []).forEach((r: any) => {
      (map[r.event_date] ||= []).push({ id: r.id, title: r.title });
    });
    setEvents(map);
  }, [cursor]);

  useEffect(() => {
    load();
  }, [load]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = fmt(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="w-4 h-4 text-primary" />
          {year}년 {month + 1}월 일정
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCursor(new Date(year, month - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
              오늘
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCursor(new Date(year, month + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium py-1 ${i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-muted-foreground"}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
            const count = counts[dateStr] || 0;
            const isToday = dateStr === today;
            const dow = i % 7;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-md border text-xs flex flex-col items-center justify-start p-1 transition-colors hover:bg-accent ${
                  isToday ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span className={`font-medium ${dow === 0 ? "text-destructive" : dow === 6 ? "text-primary" : "text-foreground"}`}>{d}</span>
                {count > 0 && (
                  <span className="mt-auto text-[10px] px-1.5 rounded-full bg-primary text-primary-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>

      {selectedDate && (
        <EventDialog
          open={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          onChanged={load}
        />
      )}
    </Card>
  );
};

export default MonthCalendarCard;
