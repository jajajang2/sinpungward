import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper } from "lucide-react";
import NoticeBulletin from "@/components/bulletin/NoticeBulletin";
import BishopricBulletin from "@/components/bulletin/BishopricBulletin";
import type { MemberLite } from "@/components/sacrament/types";

function thisWeekSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return format(d, "yyyy-MM-dd");
}

export default function BulletinPage() {
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [meetingDate, setMeetingDate] = useState(thisWeekSunday());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("members").select("id, name, birth_date, gender").order("name");
      setMembers((data as MemberLite[]) ?? []);
    })();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">주보</h1>
      </div>

      <Tabs defaultValue="notice">
        <TabsList>
          <TabsTrigger value="notice">주보(공지용)</TabsTrigger>
          <TabsTrigger value="bishopric">주보(감독단용)</TabsTrigger>
        </TabsList>
        <TabsContent value="notice">
          <NoticeBulletin meetingDate={meetingDate} onDateChange={setMeetingDate} members={members} />
        </TabsContent>
        <TabsContent value="bishopric">
          <BishopricBulletin meetingDate={meetingDate} onDateChange={setMeetingDate} members={members} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
