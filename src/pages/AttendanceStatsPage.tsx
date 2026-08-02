import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Member, AttendanceRecord } from "@/types/church";
import { AttendanceStats } from "@/components/attendance/AttendanceStats";

const AttendanceStatsPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const fetchAllAttendance = async () => {
        const size = 1000;
        const all: AttendanceRecord[] = [];
        for (let from = 0; ; from += size) {
          const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .order("attendance_date", { ascending: true })
            .range(from, from + size - 1);
          if (error) break;
          const page = (data as AttendanceRecord[]) || [];
          all.push(...page);
          if (page.length < size) break;
        }
        return { data: all };
      };
      const [mRes, aRes] = await Promise.all([
        supabase.from("members").select("id, name, gender, birth_date, phone, marital_status, created_at, updated_at").order("name"),
        fetchAllAttendance(),
      ]);
      if (mRes.data) setMembers(mRes.data as Member[]);
      if (aRes.data) {
        const recs = aRes.data as AttendanceRecord[];
        setRecords(recs);
        const map: Record<string, Record<string, boolean>> = {};
        recs.forEach(r => {
          if (!map[r.member_id]) map[r.member_id] = {};
          map[r.member_id][r.attendance_date] = r.is_present;
        });
        setAttendance(map);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-8">불러오는 중...</div>;
  }

  return (
    <div className="h-screen overflow-y-auto p-4 md:p-6">
      <AttendanceStats members={members} attendance={attendance} records={records} />
    </div>
  );
};

export default AttendanceStatsPage;
