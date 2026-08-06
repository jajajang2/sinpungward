import SacramentHistoryBoard from "./SacramentHistoryBoard";
import type { MemberLite } from "./types";

interface Props {
  members: MemberLite[];
  refreshKey: number;
  onChanged: () => void;
}

export default function SacramentTalkHistory(props: Props) {
  return <SacramentHistoryBoard {...props} mode="talk" />;
}
