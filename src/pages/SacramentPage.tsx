import { useEffect, useMemo, useState } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MonthSacramentTable from "@/components/sacrament/MonthSacramentTable";
import SacramentTalkHistory from "@/components/sacrament/SacramentTalkHistory";
import SacramentImportExport from "@/components/sacrament/SacramentImportExport";
import AutoLinkMembers from "@/components/sacrament/AutoLinkMembers";
import type { MemberLite } from "@/components/sacrament/types";

export default function SacramentPage() {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("members").select("id, name").order("name");
      setMembers((data as MemberLite[]) || []);
    })();
  }, []);

  const second = useMemo(() => addMonths(anchor, 1), [anchor]);

  return (
    <div className="space-y-2 p-2 md:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold md:text-lg leading-tight">성찬식 순서</h1>
        <SacramentImportExport onChanged={() => setRefreshKey((k) => k + 1)} />
      </div>

      <Tabs defaultValue="schedule">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-8">
            <TabsTrigger value="schedule" className="text-xs py-1">순서표</TabsTrigger>
            <TabsTrigger value="history" className="text-xs py-1">말씀 히스토리</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAnchor((p) => addMonths(p, -2))}>
              <ChevronLeft className="h-3 w-3" /> 이전
            </Button>
            <div className="min-w-[160px] text-center text-xs font-medium">
              {anchor.getFullYear()}년 {anchor.getMonth() + 1}월 · {second.getFullYear()}년 {second.getMonth() + 1}월
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAnchor((p) => addMonths(p, 2))}>
              다음 <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <TabsContent value="schedule" className="space-y-2 mt-2">
          <div className="grid gap-2 lg:grid-cols-2">

            <MonthSacramentTable
              year={anchor.getFullYear()}
              month={anchor.getMonth() + 1}
              members={members}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
            <MonthSacramentTable
              year={second.getFullYear()}
              month={second.getMonth() + 1}
              members={members}
              refreshKey={refreshKey}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <SacramentTalkHistory members={members} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
