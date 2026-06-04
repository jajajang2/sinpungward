export interface FamilyForName {
  display_name_override?: string | null;
  head?: { name: string; gender: string | null } | null;
  spouse?: { name: string; gender: string | null } | null;
  /** family에 head 외 다른 회원이 없는 경우 true */
  isSingle?: boolean;
}

/**
 * 청소조 명단 표기 규칙
 * - display_name_override 우선
 * - head=남성 + spouse → "{head} 형제 가족 ({spouse} 자매)"
 * - head=남성 + 배우자 없음(가족 있음) → "{head} 형제 가족"
 * - head=남성 + 단독 → "{head} 형제"
 * - head=여성 + 단독 → "{head} 자매"
 * - head=여성 + 가족 있음(드물지만) → "{head} 자매 가족"
 */
export function formatFamilyName(family: FamilyForName): string {
  if (family.display_name_override?.trim()) {
    return family.display_name_override.trim();
  }
  const head = family.head;
  if (!head) return "(미지정 가족)";

  const isMale = head.gender === "남" || (head.gender as string) === "M";
  const honorific = isMale ? "형제" : "자매";

  if (family.isSingle) {
    return `${head.name} ${honorific}`;
  }

  if (isMale && family.spouse) {
    return `${head.name} 형제 가족 (${family.spouse.name} 자매)`;
  }

  return `${head.name} ${honorific} 가족`;
}
