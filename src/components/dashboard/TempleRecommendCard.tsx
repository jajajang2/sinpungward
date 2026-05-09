import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExpiringMember {
  id: string;
  name: string;
  expiryDate: Date;
  daysLeft: number;
}

const TempleRecommendCard = () => {
  const [list, setList] = useState<ExpiringMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("member_church_info")
        .select("member_id, bishop_interview_date, stake_president_interview_date, temple_recommend, members(id, name)")
        .eq("temple_recommend", true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sixMonths = new Date(today);
      sixMonths.setMonth(sixMonths.getMonth() + 6);

      const result: ExpiringMember[] = [];
      (data || []).forEach((row: any) => {
        const m = row.members;
        if (!m) return;
        const dates = [row.bishop_interview_date, row.stake_president_interview_date].filter(Boolean);
        if (dates.length === 0) return;
        const latest = new Date(Math.max(...dates.map((d: string) => new Date(d).getTime())));
        const expiry = new Date(latest);
        expiry.setFullYear(expiry.getFullYear() + 2);
        if (expiry <= sixMonths) {
          const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000);
          result.push({ id: m.id, name: m.name, expiryDate: expiry, daysLeft });
        }
      });
      result.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
      setList(result);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="w-4 h-4 text-primary" />
          성전추천서 만료 임박 (6개월 이내)
          <span className="ml-auto text-xs font-normal text-muted-foreground">{list.length}명</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-72 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">만료 임박자가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((m) => {
              const expired = m.daysLeft < 0;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => navigate(`/members?memberId=${m.id}`)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        만료 {m.expiryDate.getFullYear()}-{String(m.expiryDate.getMonth() + 1).padStart(2, "0")}-{String(m.expiryDate.getDate()).padStart(2, "0")}
                      </span>
                    </div>
                    <Badge variant={expired ? "destructive" : m.daysLeft <= 30 ? "default" : "secondary"} className="shrink-0">
                      {expired ? "만료됨" : `D-${m.daysLeft}`}
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

export default TempleRecommendCard;
