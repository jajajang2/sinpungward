import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { computeStatus } from "@/lib/templeRecommendStatus";

interface ExpiringMember {
  id: string;
  memberId: string | null;
  name: string;
  expiryDate: Date;
  daysLeft: number;
  status: string;
}

const TempleRecommendCard = () => {
  const [list, setList] = useState<ExpiringMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("temple_recommends")
        .select("id, member_id, lcr_name, expiry_month");

      const result: ExpiringMember[] = [];
      (data || []).forEach((row: any) => {
        const info = computeStatus(row.expiry_month);
        if (!info.expiryEnd || info.dday === null) return;
        // 3개월(92일) 이내 만료 예정 또는 이미 만료됨
        if (info.dday > 92) return;
        result.push({
          id: row.id,
          memberId: row.member_id,
          name: row.lcr_name,
          expiryDate: info.expiryEnd,
          daysLeft: info.dday,
          status: info.status,
        });
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
          성전추천서 만료 임박 (3개월 이내)
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
                    onClick={() => navigate(m.memberId ? `/members?memberId=${m.memberId}` : "/temple-recommend")}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        만료 {m.expiryDate.getFullYear()}-{String(m.expiryDate.getMonth() + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <Badge variant={expired ? "destructive" : m.daysLeft <= 60 ? "default" : "secondary"} className="shrink-0">
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
