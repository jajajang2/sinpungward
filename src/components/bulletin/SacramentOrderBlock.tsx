import { useSacramentOrderForDate } from "@/hooks/useSacramentOrderForDate";
import type { MemberLite } from "@/components/sacrament/types";

interface Props {
  meetingDate: string;
  members: MemberLite[];
  className?: string;
}

/** 특정 날짜의 성찬식 순서를 읽기 전용으로 보여준다 (공지용/감독단용 주보 공통) */
export default function SacramentOrderBlock({ meetingDate, members, className }: Props) {
  const { rows, nameOf } = useSacramentOrderForDate(meetingDate, members);

  const valueOf = (row: (typeof rows)[number]): string => {
    if (row.kind === "hymn") {
      const v = row.assignments[0]?.hymn_number;
      if (!v) return "";
      // "43 - 제목" 형식(찬송가 검색으로 선택)이면 그대로, 옛 데이터(번호만)면 "#" 접두
      return v.includes(" - ") ? v : `# ${v}`;
    }
    if (row.kind === "deliverers") {
      const names = row.assignments.map((a) => nameOf(a)).filter(Boolean);
      return names.length > 0 ? names.join(", ") : "-";
    }
    // person / talk
    const name = nameOf(row.assignments[0]);
    if (!name && row.role.startsWith("성찬축복")) return "신권을 지닌 형제";
    return name;
  };

  return (
    <div className={className}>
      {rows.map((row) => (
        <div key={row.role} className="flex items-baseline gap-2 py-0.5">
          <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">{row.label}</span>
          <span className="text-sm">{valueOf(row) || " "}</span>
        </div>
      ))}
    </div>
  );
}
