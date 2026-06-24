import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/types/church";

type Rel = { member_id: string; related_member_id: string; relation_type: "spouse" | "parent" | "child" | "sibling" };

interface BuildResult {
  familiesCreated: number;
  membersAssigned: number;
}

/**
 * member_relations 그래프(부부/부모/자녀)로부터 가족 그룹을 만들고
 * families / family_members 테이블에 upsert.
 *
 * 규칙:
 * - 부부(spouse)는 같은 가족
 * - 자녀(child)는 결혼하지 않았고 만 19세 미만인 경우에만 부모 가족에 포함
 *   (결혼했거나 만 19세 이상인 자녀는 부모 가족에서 분리되어 독립 가족 형성)
 * - 가족 내 남성을 head로, 여성을 spouse로
 * - 가족 내 head 외 회원이 없으면 isSingle 가족
 *
 * 기존 데이터는 전부 삭제 후 재구성(파괴적). UI에서 확인 후 호출.
 */
const calcAge = (bd?: string | null): number | null => {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

/**
 * 자녀가 부모 가족에 머무는 조건:
 *  - 본인이 결혼하지 않았고
 *  - 본인에게 자녀가 없을 때
 * (나이는 무관. 손주가 생긴 자녀는 분리되어 자신의 가족을 이룸)
 */
const staysWithParents = (
  m: Member | undefined,
  hasOwnChildren: boolean
): boolean => {
  if (!m) return false;
  if (m.marriage_date) return false;
  if (hasOwnChildren) return false;
  return true;
};

export async function rebuildFamilies(): Promise<BuildResult> {
  const { data: members, error: mErr } = await supabase
    .from("members")
    .select("id, name, gender, birth_date, marriage_date");
  if (mErr) throw mErr;

  const { data: rels, error: rErr } = await supabase
    .from("member_relations")
    .select("member_id, related_member_id, relation_type");
  if (rErr) throw rErr;

  const memberMap = new Map<string, Member>(members?.map((m) => [m.id, m as Member]) ?? []);
  const allRels = (rels ?? []) as Rel[];

  // 각 회원의 "본인 자녀 존재 여부" 미리 계산
  const hasChildren = new Set<string>();
  for (const r of allRels) {
    if (r.relation_type === "child") hasChildren.add(r.member_id);
    if (r.relation_type === "parent") hasChildren.add(r.related_member_id);
  }

  // 가족 구성용 인접 리스트: spouse + (부모↔자녀, 단 자녀가 미혼이고 본인 자녀 없음)
  const adj = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const id of memberMap.keys()) adj.set(id, new Set());

  for (const r of allRels) {
    if (r.relation_type === "spouse") {
      addEdge(r.member_id, r.related_member_id);
    } else if (r.relation_type === "parent") {
      // member is parent of related
      const child = memberMap.get(r.related_member_id);
      if (staysWithParents(child, hasChildren.has(r.related_member_id))) {
        addEdge(r.member_id, r.related_member_id);
      }
    } else if (r.relation_type === "child") {
      const child = memberMap.get(r.member_id);
      if (staysWithParents(child, hasChildren.has(r.member_id))) {
        addEdge(r.member_id, r.related_member_id);
      }
    }
  }

  // 연결 컴포넌트 탐색
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const id of memberMap.keys()) {
    if (visited.has(id)) continue;
    const stack = [id];
    const comp: string[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) if (!visited.has(nb)) stack.push(nb);
    }
    components.push(comp);
  }

  // 기존 데이터 클리어
  await supabase.from("team_assignments").delete().not("id", "is", null);
  await supabase.from("family_members").delete().not("id", "is", null);
  await supabase.from("families").delete().not("id", "is", null);

  let membersAssigned = 0;
  for (const comp of components) {
    if (comp.length === 0) continue;
    const compMembers = comp.map((id) => memberMap.get(id)!).filter(Boolean);

    // head 선정: 남성 우선, 그 안에서 나이 많은 순
    const males = compMembers.filter((m) => m.gender === "남");
    const females = compMembers.filter((m) => m.gender === "여");
    const byAge = (a: Member, b: Member) =>
      (a.birth_date ?? "9999") < (b.birth_date ?? "9999") ? -1 : 1;
    males.sort(byAge);
    females.sort(byAge);

    let head: Member;
    let spouse: Member | undefined;
    if (males.length > 0) {
      head = males[0];
      // head의 spouse 관계가 있는 여성을 우선 spouse로
      const spouseIds = new Set(
        allRels
          .filter((r) => r.relation_type === "spouse" && (r.member_id === head.id || r.related_member_id === head.id))
          .map((r) => (r.member_id === head.id ? r.related_member_id : r.member_id))
      );
      spouse = females.find((f) => spouseIds.has(f.id)) ?? females[0];
    } else {
      head = compMembers.sort(byAge)[0];
    }

    const { data: fam, error: fErr } = await supabase
      .from("families")
      .insert({ head_member_id: head.id })
      .select("id")
      .single();
    if (fErr || !fam) throw fErr ?? new Error("family insert failed");

    const isSingle = compMembers.length === 1;
    const rows = compMembers.map((m) => {
      let role: "head" | "spouse" | "child" | "single";
      if (m.id === head.id) role = isSingle ? "single" : "head";
      else if (spouse && m.id === spouse.id) role = "spouse";
      else role = "child";
      return { family_id: fam.id, member_id: m.id, family_role: role };
    });

    const { error: fmErr } = await supabase.from("family_members").insert(rows);
    if (fmErr) throw fmErr;
    membersAssigned += rows.length;
  }

  return { familiesCreated: components.length, membersAssigned };
}
