import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BirthdayMember {
  id: string;
  name: string;
  birth_date: string;
  daysUntil: number;
  upcomingAge: number;
}

const UpcomingBirthdaysCard = () => {
  const [list, setList] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("id, name, birth_date")
        .not("birth_date", "is", null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result: BirthdayMember[] = [];
      (data || []).forEach((m: any) => {
        if (!m.birth_date) return;
        const b = new Date(m.birth_date);
        const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
        if (diff <= 28) {
          result.push({
            id: m.id,
            name: m.name,
            birth_date: m.birth_date,
            daysUntil: diff,
            upcomingAge: next.getFullYear() - b.getFullYear(),
          });
        }
      });
      result.sort((a, b) => a.daysUntil - b.daysUntil);
      setList(result);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="w-4 h-4 text-primary" />
          다가오는 생일자 (4주 이내)
          <span className="ml-auto text-xs font-normal text-muted-foreground">{list.length}명</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[13rem] overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">해당 기간 생일자가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((m) => {
              const d = new Date(m.birth_date);
              return (
                <li key={m.id}>
                  <button
                    onClick={() => navigate(`/members?memberId=${m.id}`)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {d.getMonth() + 1}/{d.getDate()} · 만 {m.upcomingAge}세
                      </span>
                    </div>
                    <Badge variant={m.daysUntil <= 7 ? "default" : "secondary"} className="shrink-0">
                      {m.daysUntil === 0 ? "오늘" : `D-${m.daysUntil}`}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingBirthdaysCard;
