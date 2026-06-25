import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/types/church";

type Rel = {
  member_id: string;
  related_member_id: string;
  relation_type: "spouse" | "parent" | "child" | "sibling";
};

interface BuildResult {
  familiesCreated: number;
  membersAssigned: number;
}

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
 * 가족 단위 재구성 (핵가족 기준).
 *
 * 규칙:
 *  1) 부부는 한 가족. 남편이 head, 아내가 spouse.
 *  2) 결혼한 사람은 부모 가족에서 분리되어 본인이 head인 새 가족.
 *  3) 자녀는 본인의 직계 부모(가능하면 아빠)의 가족에 child로 소속.
 *  4) 미혼·자녀 없음:
 *      - 만 19세 미만 또는 birth_date 없음 → 부모 가족에 child
 *      - 만 19세 이상이면서 부모도 명단에 없음(혹은 부모 가족 없음) → single
 *  5) 배우자 없이 자녀만 있는 사람도 본인이 head인 가족.
 *  6) birth_date 없으면 미성년으로 간주(어린 자녀가 1인 가족으로 빠지지 않게).
 */
export async function rebuildFamilies(): Promise<BuildResult> {
  const { data: members, error: mErr } = await supabase
    .from("members")
    .select("id, name, gender, birth_date, marriage_date");
  if (mErr) throw mErr;

  const { data: rels, error: rErr } = await supabase
    .from("member_relations")
    .select("member_id, related_member_id, relation_type");
  if (rErr) throw rErr;

  const memberMap = new Map<string, Member>(
    (members ?? []).map((m) => [m.id, m as Member])
  );
  const allRels = (rels ?? []) as Rel[];

  // ---- 관계 인덱스 ----
  // spouse: 양방향
  const spouseMap = new Map<string, Set<string>>();
  // parentsOf: childId -> parentIds[]
  const parentsOf = new Map<string, string[]>();
  // hasChildren: 본인이 부모인 경우
  const hasChildren = new Set<string>();

  const addParent = (childId: string, parentId: string) => {
    if (!parentsOf.has(childId)) parentsOf.set(childId, []);
    const arr = parentsOf.get(childId)!;
    if (!arr.includes(parentId)) arr.push(parentId);
  };

  for (const r of allRels) {
    if (r.relation_type === "spouse") {
      if (!spouseMap.has(r.member_id)) spouseMap.set(r.member_id, new Set());
      spouseMap.get(r.member_id)!.add(r.related_member_id);
    } else if (r.relation_type === "parent") {
      // member_id = 자녀, related_member_id = 부모
      addParent(r.member_id, r.related_member_id);
      hasChildren.add(r.related_member_id);
    } else if (r.relation_type === "child") {
      // member_id = 부모, related_member_id = 자녀
      addParent(r.related_member_id, r.member_id);
      hasChildren.add(r.member_id);
    }
  }

  // ---- 가족 구성 ----
  interface FamilyDraft {
    headId: string;
    spouseId?: string;
    childIds: Set<string>;
  }
  const families = new Map<string, FamilyDraft>(); // key -> draft
  const familyOf = new Map<string, string>(); // memberId -> family key

  const pickHead = (a: Member, b: Member): [Member, Member] => {
    // 남편(남) 우선, 같으면 나이 많은 쪽
    if (a.gender === "남" && b.gender !== "남") return [a, b];
    if (b.gender === "남" && a.gender !== "남") return [b, a];
    const ab = a.birth_date ?? "9999";
    const bb = b.birth_date ?? "9999";
    return ab <= bb ? [a, b] : [b, a];
  };

  // 1) 부부 가족 형성
  const visited = new Set<string>();
  for (const [aId, sps] of spouseMap) {
    if (visited.has(aId)) continue;
    const a = memberMap.get(aId);
    if (!a) continue;
    // 첫 번째 유효한 배우자만 사용
    let partner: Member | undefined;
    for (const bId of sps) {
      if (visited.has(bId)) continue;
      const b = memberMap.get(bId);
      if (b) {
        partner = b;
        break;
      }
    }
    if (!partner) continue;
    const [head, spouse] = pickHead(a, partner);
    const key = `c:${head.id}`;
    families.set(key, { headId: head.id, spouseId: spouse.id, childIds: new Set() });
    familyOf.set(head.id, key);
    familyOf.set(spouse.id, key);
    visited.add(head.id);
    visited.add(spouse.id);
  }

  // 2) 배우자는 없지만 자녀가 있는 사람 → 본인 head 가족
  for (const m of memberMap.values()) {
    if (familyOf.has(m.id)) continue;
    if (hasChildren.has(m.id)) {
      const key = `h:${m.id}`;
      families.set(key, { headId: m.id, childIds: new Set() });
      familyOf.set(m.id, key);
    }
  }

  // 3) 나머지(미혼·자녀 없음)를 부모 가족에 붙이거나 single
  for (const m of memberMap.values()) {
    if (familyOf.has(m.id)) continue;

    const age = calcAge(m.birth_date);
    const isMinor = age === null || age < 19; // birth_date 없으면 미성년 취급

    // 부모 후보: 명단에 있고, 가족이 만들어진 부모만
    const parentIds = (parentsOf.get(m.id) ?? []).filter(
      (pid) => memberMap.has(pid) && familyOf.has(pid)
    );
    // 아빠 우선
    parentIds.sort((x, y) => {
      const gx = memberMap.get(x)?.gender;
      const gy = memberMap.get(y)?.gender;
      if (gx === "남" && gy !== "남") return -1;
      if (gy === "남" && gx !== "남") return 1;
      return 0;
    });

    if (isMinor && parentIds.length > 0) {
      const famKey = familyOf.get(parentIds[0])!;
      families.get(famKey)!.childIds.add(m.id);
      familyOf.set(m.id, famKey);
    } else {
      const key = `s:${m.id}`;
      families.set(key, { headId: m.id, childIds: new Set() });
      familyOf.set(m.id, key);
    }
  }

  // ---- DB 반영: 기존 데이터 삭제 후 재삽입 ----
  await supabase.from("team_assignments").delete().not("id", "is", null);
  await supabase.from("family_members").delete().not("id", "is", null);
  await supabase.from("families").delete().not("id", "is", null);

  let membersAssigned = 0;
  let familiesCreated = 0;

  for (const draft of families.values()) {
    const { data: fam, error: fErr } = await supabase
      .from("families")
      .insert({ head_member_id: draft.headId })
      .select("id")
      .single();
    if (fErr || !fam) throw fErr ?? new Error("family insert failed");

    const isSingle = !draft.spouseId && draft.childIds.size === 0;
    const rows: {
      family_id: string;
      member_id: string;
      family_role: "head" | "spouse" | "child" | "single";
    }[] = [];

    rows.push({
      family_id: fam.id,
      member_id: draft.headId,
      family_role: isSingle ? "single" : "head",
    });
    if (draft.spouseId) {
      rows.push({
        family_id: fam.id,
        member_id: draft.spouseId,
        family_role: "spouse",
      });
    }
    for (const cid of draft.childIds) {
      rows.push({ family_id: fam.id, member_id: cid, family_role: "child" });
    }

    const { error: fmErr } = await supabase.from("family_members").insert(rows);
    if (fmErr) throw fmErr;
    membersAssigned += rows.length;
    familiesCreated += 1;
  }

  return { familiesCreated, membersAssigned };
}
