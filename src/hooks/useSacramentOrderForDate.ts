import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ROWS,
  calcAge,
  type MemberLite,
  type SacramentAssignment,
  type SacramentMeeting,
} from "@/components/sacrament/types";

export interface SacramentOrderRow {
  role: string;
  label: string;
  kind: "person" | "hymn" | "talk" | "deliverers";
  assignments: SacramentAssignment[]; // slot 순으로 정렬, deliverers 외에는 보통 0~1개
}

/** 특정 날짜의 성찬식 순서를 읽기 전용으로 조회 (주보에서 재사용) */
export function useSacramentOrderForDate(meetingDate: string, members: MemberLite[]) {
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<SacramentMeeting | null>(null);
  const [assignments, setAssignments] = useState<SacramentAssignment[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from("sacrament_meetings")
        .select("*")
        .eq("meeting_date", meetingDate)
        .maybeSingle();
      if (cancelled) return;
      const meetingRow = (m as SacramentMeeting) ?? null;
      setMeeting(meetingRow);
      if (meetingRow) {
        const { data: a } = await supabase
          .from("sacrament_assignments")
          .select("*")
          .eq("meeting_id", meetingRow.id);
        if (cancelled) return;
        setAssignments((a as SacramentAssignment[]) ?? []);
      } else {
        setAssignments([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingDate]);

  const nameOf = (a?: SacramentAssignment) => {
    if (!a) return "";
    if (a.member_id) {
      const mem = members.find((x) => x.id === a.member_id);
      if (!mem) return "";
      const age = calcAge(mem.birth_date);
      return age !== null ? `${mem.name} (${age})` : mem.name;
    }
    return a.custom_name || "";
  };

  const rows: SacramentOrderRow[] = ROWS.map((r) => ({
    ...r,
    assignments: assignments
      .filter((a) => a.role === r.role)
      .sort((a, b) => a.slot - b.slot),
  }));

  return { loading, meeting, rows, nameOf };
}
