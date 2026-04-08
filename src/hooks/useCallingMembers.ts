import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallingMemberMap {
  [callingLabel: string]: string; // callingLabel -> member name
}

export function useCallingMembers() {
  return useQuery({
    queryKey: ["calling-members"],
    queryFn: async (): Promise<CallingMemberMap> => {
      const { data, error } = await supabase
        .from("member_church_info")
        .select("current_calling, member_id, members(name)")
        .not("current_calling", "is", null);

      if (error) throw error;

      const map: CallingMemberMap = {};
      for (const row of data ?? []) {
        const callings = row.current_calling as string[] | null;
        const name = (row.members as { name: string })?.name;
        if (callings && name) {
          for (const c of callings) {
            map[c] = name;
          }
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}
