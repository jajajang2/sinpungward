export type RecommendStatus = "활동적" | "주의" | "긴급" | "만료됨";

export interface StatusInfo {
  status: RecommendStatus;
  dday: number | null; // 남은 일수 (음수면 지남)
  expiryEnd: Date | null; // 만료 말일
  colorClass: string; // Tailwind badge classes
}

const MS_DAY = 86400000;

export function endOfMonth(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // dateStr = YYYY-MM-01
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return null;
  // 다음 달 0일 = 해당 월 말일
  const d = new Date(y, m, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function computeStatus(expiryMonth: string | null | undefined, today: Date = new Date()): StatusInfo {
  const expiryEnd = endOfMonth(expiryMonth);
  if (!expiryEnd) {
    return { status: "활동적", dday: null, expiryEnd: null, colorClass: colorFor("활동적") };
  }
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const diffMs = expiryEnd.getTime() - t.getTime();
  const dday = Math.ceil(diffMs / MS_DAY);

  let status: RecommendStatus;
  if (dday < 0) status = "만료됨";
  else if (dday <= 60) status = "긴급";
  else if (dday <= 90) status = "주의";
  else status = "활동적";

  return { status, dday, expiryEnd, colorClass: colorFor(status) };
}

export function colorFor(status: RecommendStatus): string {
  switch (status) {
    case "만료됨": return "bg-red-100 text-red-700 border-red-300";
    case "긴급": return "bg-orange-100 text-orange-700 border-orange-300";
    case "주의": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "활동적": return "bg-green-100 text-green-700 border-green-300";
  }
}

export const STATUS_ORDER: RecommendStatus[] = ["활동적", "주의", "긴급", "만료됨"];
