import SacramentHistoryBoard from "./SacramentHistoryBoard";
import type { MemberLite } from "./types";

interface Props {
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
}

export default function SacramentPrayerHistory(props: Props) {
  return <SacramentHistoryBoard {...props} mode="prayer" />;
}
