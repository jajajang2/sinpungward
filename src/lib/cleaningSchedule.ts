/** start ~ end 사이의 모든 토요일 (YYYY-MM-DD) 배열 */
export function listSaturdays(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;

  // 첫 토요일까지 이동
  const cursor = new Date(start);
  const day = cursor.getDay(); // 0=일 ... 6=토
  const offset = (6 - day + 7) % 7;
  cursor.setDate(cursor.getDate() + offset);

  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/**
 * 한 조가 N주 연속 담당하도록 cycleOrder를 순환.
 * 반환: [{date, teamCode}]
 */
export function buildScheduleAssignments(
  saturdays: string[],
  cycleOrder: string[],
  weeksPerTeam: number
): { date: string; teamCode: string }[] {
  if (cycleOrder.length === 0 || weeksPerTeam < 1) return [];
  return saturdays.map((date, i) => {
    const slot = Math.floor(i / weeksPerTeam);
    const teamCode = cycleOrder[slot % cycleOrder.length];
    return { date, teamCode };
  });
}
