import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export interface NonHolderMember {
  id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
}

export interface RecommendLite {
  id: string;
  lcr_name: string;
  member_id: string | null;
  recommend_type: "REGULAR" | "LIMITED_USE";
}

interface Props {
  members: NonHolderMember[];
  recommends: RecommendLite[];
  reload: () => Promise<void> | void;
  /** 청소년 상한(포함). 기본 18. 18을 성인으로 볼거면 17로 변경. */
  youthUpperAge?: number;
}

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

const calcAge = (bd: string | null): number | null => {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

export const NonHoldersView = ({
  members,
  recommends,
  reload,
  youthUpperAge = 18,
}: Props) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [unmatchedSearch, setUnmatchedSearch] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // 1) 이미 member_id로 연결된 소지자
  const holderIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of recommends) if (r.member_id) s.add(r.member_id);
    return s;
  }, [recommends]);

  // 2) 이름 기반 보조 매칭 (member_id 없는 추천서만 대상)
  const membersByNorm = useMemo(() => {
    const map = new Map<string, NonHolderMember[]>();
    for (const m of members) {
      const key = norm(m.name);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [members]);

  const { softHolderIds, needsMatching } = useMemo(() => {
    const soft = new Set<string>();
    const need: { rec: RecommendLite; candidates: NonHolderMember[] }[] = [];
    for (const r of recommends) {
      if (r.member_id) continue;
      const cands = membersByNorm.get(norm(r.lcr_name)) ?? [];
      if (cands.length === 1) {
        soft.add(cands[0].id);
      } else {
        need.push({ rec: r, candidates: cands });
      }
    }
    return { softHolderIds: soft, needsMatching: need };
  }, [recommends, membersByNorm]);

  const allHolderIds = useMemo(() => {
    const s = new Set(holderIds);
    softHolderIds.forEach((id) => s.add(id));
    return s;
  }, [holderIds, softHolderIds]);

  // 3) 미소지자 분류
  const { youth, adults } = useMemo(() => {
    const y: (NonHolderMember & { age: number })[] = [];
    const a: (NonHolderMember & { age: number })[] = [];
    for (const m of members) {
      if (allHolderIds.has(m.id)) continue;
      const age = calcAge(m.birth_date);
      if (age === null) continue;
      if (age >= 11 && age <= youthUpperAge) y.push({ ...m, age });
      else if (age >= youthUpperAge + 1) a.push({ ...m, age });
      // <11 은 대상 아님
    }
    const byName = (x: { name: string }, y: { name: string }) => x.name.localeCompare(y.name, "ko");
    y.sort(byName);
    a.sort(byName);
    return { youth: y, adults: a };
  }, [members, allHolderIds, youthUpperAge]);

  const filterList = <T extends { name: string }>(list: T[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q));
  };

  const handleLink = async (recommendId: string, memberId: string) => {
    setLinkingId(recommendId);
    const { error } = await supabase
      .from("temple_recommends")
      .update({ member_id: memberId })
      .eq("id", recommendId);
    setLinkingId(null);
    if (error) {
      toast({ title: "연결 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "회원과 연결되었습니다" });
    await reload();
  };

  const renderTable = (list: (NonHolderMember & { age: number })[]) => (
    <div className="border rounded-lg table-scroll table-sticky-first">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">이름</th>
            <th className="px-3 py-2 text-left">성별</th>
            <th className="px-3 py-2 text-left">나이</th>
          </tr>
        </thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-3 py-1.5 font-medium">{m.name}</td>
              <td className="px-3 py-1.5">{m.gender ?? "-"}</td>
              <td className="px-3 py-1.5">{m.age}세</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                해당 인원이 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const filteredYouth = filterList(youth);
  const filteredAdults = filterList(adults);

  const filteredUnmatched = useMemo(() => {
    const q = unmatchedSearch.trim().toLowerCase();
    if (!q) return needsMatching;
    return needsMatching.filter((n) => n.rec.lcr_name.toLowerCase().includes(q));
  }, [needsMatching, unmatchedSearch]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-muted/30 text-sm space-y-1">
        <div>
          <b>매칭 기준</b>: temple_recommends의 member_id로 연결된 회원은 소지자로 간주.
          member_id가 비어 있는 추천서는 이름(공백 제거)로 회원과 대조하여 <b>유일하게</b> 매칭되면 소지자로 처리하며,
          매칭이 없거나 다중이면 아래 <b>매칭 필요</b>에 나타납니다.
        </div>
        <div className="text-muted-foreground">
          연령 기준: 만 11 ~ {youthUpperAge}세 = 청소년, 만 {youthUpperAge + 1}세 이상 = 성인, 만 11세 미만은 대상 아님.
        </div>
      </div>

      <Tabs defaultValue="non-holders">
        <TabsList className="flex w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="non-holders">미소지자</TabsTrigger>
          <TabsTrigger value="matching">
            매칭 필요{needsMatching.length > 0 ? ` (${needsMatching.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="non-holders" className="mt-4 space-y-4">
          <Input
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />

          <section className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold">성인 미소지자</h3>
              <span className="text-sm text-muted-foreground">
                총 {adults.length}명{search && ` · 검색결과 ${filteredAdults.length}명`}
              </span>
            </div>
            {renderTable(filteredAdults)}
          </section>

          <section className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold">청소년 미소지자</h3>
              <span className="text-sm text-muted-foreground">
                만 11 ~ {youthUpperAge}세 · 총 {youth.length}명
                {search && ` · 검색결과 ${filteredYouth.length}명`}
              </span>
            </div>
            {renderTable(filteredYouth)}
          </section>
        </TabsContent>

        <TabsContent value="matching" className="mt-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            자동 매칭에 실패한 추천서입니다. 오른쪽에서 회원을 선택하여 수동으로 연결하세요.
          </div>
          <Input
            placeholder="추천서 이름 검색"
            value={unmatchedSearch}
            onChange={(e) => setUnmatchedSearch(e.target.value)}
            className="w-64"
          />
          <div className="border rounded-lg table-scroll table-sticky-first">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">추천서 이름</th>
                  <th className="px-3 py-2 text-left">유형</th>
                  <th className="px-3 py-2 text-left">후보</th>
                  <th className="px-3 py-2 text-left">수동 연결</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnmatched.map(({ rec, candidates }) => (
                  <tr key={rec.id} className="border-t">
                    <td className="px-3 py-1.5 font-medium">{rec.lcr_name}</td>
                    <td className="px-3 py-1.5">{rec.recommend_type === "REGULAR" ? "정규" : "제한사용"}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {candidates.length === 0
                        ? "일치 없음"
                        : `동명 ${candidates.length}명: ${candidates.map((c) => c.name).join(", ")}`}
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        disabled={linkingId === rec.id}
                        onValueChange={(v) => handleLink(rec.id, v)}
                      >
                        <SelectTrigger className="w-full min-w-[180px] md:w-56 h-11 md:h-8">
                          <SelectValue placeholder="회원 선택..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {members
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                            .map((m) => {
                              const age = calcAge(m.birth_date);
                              return (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                  {age !== null ? ` (${age}세)` : ""}
                                  {m.gender ? ` · ${m.gender}` : ""}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filteredUnmatched.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      매칭이 필요한 추천서가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
