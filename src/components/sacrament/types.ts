export type EventType = "일반" | "금식간증" | "연차대회" | "부활절" | "와드대회" | "스테이크대회" | "크리스마스모임" | "기타";

export interface SacramentMeeting {
  id: string;
  meeting_date: string; // YYYY-MM-DD
  event_type: EventType;
  event_custom_name: string | null;
}

export interface SacramentAssignment {
  id: string;
  meeting_id: string;
  role: string;
  slot: number;
  member_id: string | null;
  custom_name: string | null;
  hymn_number: string | null;
  talk_topic: string | null;
  talk_content: string | null;
}

export interface MemberLite {
  id: string;
  name: string;
  birth_date?: string | null;
}

export function calcAge(birth_date?: string | null): number | null {
  if (!birth_date) return null;
  const b = new Date(birth_date);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export type RowKind = "person" | "hymn" | "talk" | "deliverers";

export interface RowDef {
  role: string;
  label: string;
  kind: RowKind;
}

export const ROWS: RowDef[] = [
  { role: "감리자", label: "감리자", kind: "person" },
  { role: "사회자", label: "사회자", kind: "person" },
  { role: "지휘자", label: "지휘자", kind: "person" },
  { role: "반주자", label: "반주자", kind: "person" },
  { role: "개회찬송", label: "개회찬송", kind: "hymn" },
  { role: "개회기도", label: "개회기도", kind: "person" },
  { role: "성찬찬송", label: "성찬찬송", kind: "hymn" },
  { role: "성찬축복_1", label: "성찬축복 (1)", kind: "person" },
  { role: "성찬축복_2", label: "성찬축복 (2)", kind: "person" },
  { role: "성찬전달", label: "성찬전달", kind: "deliverers" },
  { role: "말씀_3분", label: "말씀 - 3분", kind: "talk" },
  { role: "말씀_7분", label: "말씀 - 7분", kind: "talk" },
  { role: "말씀_10분", label: "말씀 - 10분", kind: "talk" },
  { role: "중간찬송", label: "중간찬송", kind: "hymn" },
  { role: "마지막연사", label: "마지막연사", kind: "talk" },
  { role: "폐회찬송", label: "폐회찬송", kind: "hymn" },
  { role: "폐회기도", label: "폐회기도", kind: "person" },
];

export const TALK_ROLES = ["말씀_3분", "말씀_7분", "말씀_10분", "마지막연사"];
export const SPECIAL_MERGE_ROLES = ["말씀_3분", "말씀_7분", "말씀_10분", "중간찬송", "마지막연사"];
