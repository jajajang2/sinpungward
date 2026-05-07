import { supabase } from "@/integrations/supabase/client";

export type RelationType = "spouse" | "parent" | "child" | "sibling";

export interface RelationMember {
  id: string;
  name: string;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  current_calling?: string[] | null;
}

export interface RelationEdge {
  member_id: string;
  related_member_id: string;
  relation_type: RelationType;
}

// 한국어 표시 라벨 (self → other)
export function relationLabel(
  type: RelationType,
  selfGender?: string | null,
  otherGender?: string | null,
  selfBirth?: string | null,
  otherBirth?: string | null
): string {
  if (type === "spouse") {
    if (otherGender === "남") return "배우자 (남편)";
    if (otherGender === "여") return "배우자 (아내)";
    return "배우자";
  }
  if (type === "parent") {
    // self의 부모 = other
    if (otherGender === "남") return "아버지";
    if (otherGender === "여") return "어머니";
    return "부모";
  }
  if (type === "child") {
    if (otherGender === "남") return "아들";
    if (otherGender === "여") return "딸";
    return "자녀";
  }
  // sibling
  const otherOlder =
    selfBirth && otherBirth ? otherBirth < selfBirth : false;
  if (selfGender === "남") {
    if (otherGender === "남") return otherOlder ? "형" : "남동생";
    if (otherGender === "여") return otherOlder ? "누나" : "여동생";
  } else if (selfGender === "여") {
    if (otherGender === "남") return otherOlder ? "오빠" : "남동생";
    if (otherGender === "여") return otherOlder ? "언니" : "여동생";
  }
  return "형제자매";
}

export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string }[] = [
  { value: "spouse", label: "배우자" },
  { value: "parent", label: "부모" },
  { value: "child", label: "자녀" },
  { value: "sibling", label: "형제자매" },
];

// 모든 회원 + 모든 관계 캐시 fetch
export async function fetchRelationGraph(): Promise<{
  members: Map<string, RelationMember>;
  edgesByMember: Map<string, RelationEdge[]>;
}> {
  const [{ data: members }, { data: edges }, { data: ci }] = await Promise.all([
    supabase.from("members").select("id, name, gender, birth_date, phone"),
    supabase.from("member_relations").select("member_id, related_member_id, relation_type"),
    supabase.from("member_church_info").select("member_id, current_calling"),
  ]);
  const ciMap = new Map<string, string[] | null>();
  (ci || []).forEach((c: any) => ciMap.set(c.member_id, c.current_calling ?? null));
  const memberMap = new Map<string, RelationMember>();
  (members || []).forEach((m: any) =>
    memberMap.set(m.id, { ...m, current_calling: ciMap.get(m.id) ?? null })
  );
  const edgeMap = new Map<string, RelationEdge[]>();
  (edges || []).forEach((e: any) => {
    const arr = edgeMap.get(e.member_id) || [];
    arr.push(e as RelationEdge);
    edgeMap.set(e.member_id, arr);
  });
  return { members: memberMap, edgesByMember: edgeMap };
}

export function getRelated(
  edgesByMember: Map<string, RelationEdge[]>,
  memberId: string,
  type: RelationType
): string[] {
  return (edgesByMember.get(memberId) || [])
    .filter((e) => e.relation_type === type)
    .map((e) => e.related_member_id);
}
