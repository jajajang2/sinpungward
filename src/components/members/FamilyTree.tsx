import { useState, useEffect, useCallback } from "react";
import { Member, MemberChurchInfo } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Trash2, ExternalLink, Plus, Eye, Pencil, ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { calcAge } from "./MemberDetailPanel";
import {
  RelationType,
  RelationMember,
  RelationEdge,
  RELATION_TYPE_OPTIONS,
  relationLabel,
  fetchRelationGraph,
  getRelated,
} from "@/lib/familyRelations";

interface FamilyTreeProps {
  memberId: string;
  member?: Member | null;
  churchInfo?: MemberChurchInfo | null;
  onNavigateToMember?: (m: { id: string; name: string }) => void;
  family?: any;
  setFamily?: any;
  memberList?: any;
}

// ── Row ────────────────────────────────────────────────────
const FamilyRowItem = ({
  m, label, indent, isSelf, onNavigate, onDelete, editMode,
}: {
  m: RelationMember;
  label?: string;
  indent: number;
  isSelf?: boolean;
  onNavigate?: () => void;
  onDelete?: () => void;
  editMode?: boolean;
}) => {
  const age = calcAge(m.birth_date);
  const isNonMember = !!m.is_non_member;
  return (
    <HoverCard openDelay={250}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors hover:bg-muted/40",
            isSelf ? "border-primary bg-primary/5" : "border-border bg-card"
          )}
          style={{ marginLeft: indent * 16 }}
        >
          <span className={cn(
            "shrink-0 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[3.5rem] text-center",
            isSelf ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {isSelf ? "본인" : label || "—"}
          </span>
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
            <div className={cn("col-span-3 text-sm font-semibold truncate flex items-center gap-1.5", isSelf && "text-primary")}>
              <span className="truncate">{m.name || "—"}</span>
              {isNonMember && (
                <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  비회원
                </span>
              )}
            </div>
            <div className="col-span-3 text-xs text-muted-foreground truncate">
              {m.birth_date ? `${m.birth_date}${age != null ? ` (${age})` : ""}` : "—"}
            </div>
            <div className="col-span-3 text-xs truncate">
              {m.current_calling && m.current_calling.length > 0 ? m.current_calling.join(", ") : "—"}
            </div>
            <div className="col-span-3 text-xs text-muted-foreground truncate">
              {m.phone || "—"}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isSelf && !isNonMember && onNavigate && (
              <button type="button" onClick={onNavigate} className="p-1 rounded hover:bg-accent text-primary" title="회원카드 이동">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {editMode && onDelete && !isSelf && (
              <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="관계 삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-xs space-y-1" side="top">
        <div className="font-semibold text-sm flex items-center gap-1.5">
          {m.name}
          {isNonMember && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              비회원
            </span>
          )}
        </div>
        {label && <div><span className="text-muted-foreground">관계:</span> {label}</div>}
        {m.birth_date && <div><span className="text-muted-foreground">생년월일:</span> {m.birth_date}{age != null && ` (${age}세)`}</div>}
        {m.current_calling && m.current_calling.length > 0 && (
          <div><span className="text-muted-foreground">부름:</span> {m.current_calling.join(", ")}</div>
        )}
        {m.phone && <div><span className="text-muted-foreground">연락처:</span> {m.phone}</div>}
      </HoverCardContent>
    </HoverCard>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border-2 border-border bg-background p-3 space-y-2">
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </section>
);

// ── In-law / extended label helpers (self perspective) ────
function childSpouseLabel(g?: string | null) {
  return g === "남" ? "사위" : g === "여" ? "며느리" : "자녀의 배우자";
}
function grandchildLabel(g?: string | null) {
  return g === "남" ? "손자" : g === "여" ? "손녀" : "손자녀";
}
function niblingLabel(g?: string | null) {
  return g === "남" ? "조카" : g === "여" ? "조카딸" : "조카";
}
type SibKind = "older-bro" | "older-sis" | "younger-bro" | "younger-sis";
function siblingKind(
  selfBirth?: string | null,
  sibGender?: string | null,
  sibBirth?: string | null
): SibKind | null {
  if (!sibGender) return null;
  const older = selfBirth && sibBirth ? sibBirth < selfBirth : false;
  if (sibGender === "남") return older ? "older-bro" : "younger-bro";
  if (sibGender === "여") return older ? "older-sis" : "younger-sis";
  return null;
}
function siblingSpouseLabel(kind: SibKind | null, selfGender?: string | null): string {
  if (!kind) return "형제자매의 배우자";
  if (kind === "older-bro") return "형수";
  if (kind === "older-sis") return selfGender === "남" ? "매형" : "형부";
  if (kind === "younger-bro") return selfGender === "남" ? "제수" : "올케";
  if (kind === "younger-sis") return selfGender === "남" ? "매제" : "제부";
  return "형제자매의 배우자";
}

// ── Combobox ───────────────────────────────────────────────
const MemberCombobox = ({
  members, value, valueLabel, onChange, onSelectNonMember,
}: {
  members: RelationMember[];
  value: string;
  valueLabel?: string;
  onChange: (memberId: string) => void;
  onSelectNonMember: (name: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = members.find(m => m.id === value);
  const filtered = members.filter(m =>
    !q || m.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 30);
  const trimmed = q.trim();
  const exactMatch = trimmed && members.some(m => m.name === trimmed);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 px-2 text-xs border border-input rounded-md flex items-center justify-between gap-1 w-full bg-background hover:bg-accent"
        >
          <span className={cn("truncate", !selected && !valueLabel && "text-muted-foreground")}>
            {selected?.name || valueLabel || "회원 선택 또는 비회원 이름 입력..."}
          </span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Input
          autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="이름 검색 또는 비회원 이름 입력..." className="h-8 text-xs border-0 border-b rounded-none"
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); setQ(""); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-1.5"
            >
              <span className="font-medium">{m.name}</span>
              {m.is_non_member && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">비회원</span>
              )}
              {m.birth_date && <span className="ml-auto text-muted-foreground">{m.birth_date}</span>}
            </button>
          ))}
          {trimmed && !exactMatch && (
            <button
              type="button"
              onClick={() => { onSelectNonMember(trimmed); setOpen(false); setQ(""); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent border-t border-border flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3 text-amber-600" />
              <span>비회원으로 추가: <span className="font-semibold">"{trimmed}"</span></span>
            </button>
          )}
          {filtered.length === 0 && !trimmed && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">이름을 입력하세요</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ── Main ───────────────────────────────────────────────────
const FamilyTree = ({ memberId, onNavigateToMember }: FamilyTreeProps) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [members, setMembers] = useState<Map<string, RelationMember>>(new Map());
  const [edges, setEdges] = useState<Map<string, RelationEdge[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const [addType, setAddType] = useState<RelationType>("child");
  const [addTarget, setAddTarget] = useState<string>("");
  const [addNonMemberName, setAddNonMemberName] = useState<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    const g = await fetchRelationGraph();
    setMembers(g.members);
    setEdges(g.edgesByMember);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload, memberId]);

  const self = members.get(memberId);

  const sortByAge = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const ad = members.get(a)?.birth_date || "9999-12-31";
      const bd = members.get(b)?.birth_date || "9999-12-31";
      return ad.localeCompare(bd);
    });
  const relatedOf = (id: string, t: RelationType) => sortByAge(getRelated(edges, id, t));

  const handleAddRelation = async () => {
    let targetId = addTarget;

    // 비회원으로 신규 등록
    if (!targetId && addNonMemberName.trim()) {
      const name = addNonMemberName.trim();
      const { data: created, error: createErr } = await supabase
        .from("members")
        .insert({ name, is_non_member: true })
        .select("id")
        .single();
      if (createErr || !created) {
        toast({ title: "비회원 추가 실패", description: createErr?.message, variant: "destructive" });
        return;
      }
      targetId = created.id;
    }

    if (!targetId) { toast({ title: "회원을 선택하거나 비회원 이름을 입력하세요", variant: "destructive" }); return; }
    if (targetId === memberId) { toast({ title: "자기 자신은 추가할 수 없습니다", variant: "destructive" }); return; }
    const { error } = await supabase.from("member_relations").insert({
      member_id: memberId, related_member_id: targetId, relation_type: addType,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "이미 등록된 관계입니다", variant: "destructive" });
      else toast({ title: "추가 실패", description: error.message, variant: "destructive" });
      return;
    }
    setAddTarget("");
    setAddNonMemberName("");
    toast({ title: "추가됨", description: "양쪽 회원카드에 자동 반영됩니다." });
    await reload();
  };

  const handleDeleteRelation = async (fromId: string, toId: string, type: RelationType) => {
    if (!confirm("이 가족 관계를 삭제할까요? 양쪽 회원카드 모두에서 제거됩니다.")) return;
    const { error } = await supabase.from("member_relations").delete()
      .eq("member_id", fromId).eq("related_member_id", toId).eq("relation_type", type);
    if (error) { toast({ title: "삭제 실패", description: error.message, variant: "destructive" }); return; }
    toast({ title: "삭제됨" });
    await reload();
  };

  const labelFor = (fromId: string, toId: string, type: RelationType) => {
    const a = members.get(fromId);
    const b = members.get(toId);
    return relationLabel(type, a?.gender, b?.gender, a?.birth_date, b?.birth_date);
  };

  // Generic row — by direct edge (allows delete in edit mode)
  const renderDirectRow = (
    targetId: string, fromId: string, type: RelationType, indent: number
  ) => {
    const m = members.get(targetId);
    if (!m) return null;
    const label = labelFor(fromId, targetId, type);
    return (
      <FamilyRowItem
        key={`${fromId}->${targetId}-${type}`}
        m={m}
        label={label}
        indent={indent}
        editMode={editMode}
        onNavigate={onNavigateToMember ? () => onNavigateToMember({ id: targetId, name: m.name }) : undefined}
        onDelete={() => handleDeleteRelation(fromId, targetId, type)}
      />
    );
  };

  // Derived (in-law / grandchild / nibling) — no delete; not directly editable
  const renderDerivedRow = (targetId: string, label: string, indent: number, keyPrefix: string) => {
    const m = members.get(targetId);
    if (!m) return null;
    return (
      <FamilyRowItem
        key={`${keyPrefix}-${targetId}`}
        m={m}
        label={label}
        indent={indent}
        onNavigate={onNavigateToMember ? () => onNavigateToMember({ id: targetId, name: m.name }) : undefined}
      />
    );
  };

  if (loading || !self) {
    return <div className="text-sm text-muted-foreground py-6 text-center">불러오는 중...</div>;
  }

  const parentIds = relatedOf(memberId, "parent");
  const siblingIds = relatedOf(memberId, "sibling");
  const spouseIds = relatedOf(memberId, "spouse");
  const childIds = relatedOf(memberId, "child");

  // Filter so a person isn't shown twice across derived sets
  const seen = new Set<string>([memberId, ...parentIds, ...siblingIds, ...spouseIds, ...childIds]);

  const hasUpper = parentIds.length > 0 || siblingIds.length > 0;

  const addCandidates = Array.from(members.values()).filter(m => m.id !== memberId);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">가족 정보 (본인 기준 촌수)</p>
        <Button
          size="sm" variant={editMode ? "default" : "outline"} className="h-7 text-xs"
          onClick={() => setEditMode(m => !m)}
        >
          {editMode ? <><Eye className="w-3 h-3 mr-1" />보기</> : <><Pencil className="w-3 h-3 mr-1" />편집</>}
        </Button>
      </div>

      {editMode && (
        <div className="mb-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
          <p className="text-xs font-semibold text-primary">새 가족 관계 추가</p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Select value={addType} onValueChange={(v) => setAddType(v as RelationType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATION_TYPE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MemberCombobox
              members={addCandidates}
              value={addTarget}
              valueLabel={addNonMemberName ? `비회원: ${addNonMemberName}` : undefined}
              onChange={(id) => { setAddTarget(id); setAddNonMemberName(""); }}
              onSelectNonMember={(name) => { setAddNonMemberName(name); setAddTarget(""); }}
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleAddRelation}>
              <Plus className="w-3 h-3 mr-1" />추가
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ※ 부모/자녀 관계를 추가하면 동일 부모를 가진 자녀들끼리 형제 관계가 자동 연결됩니다.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* 부모님 가족: 부모 + 형제자매 + 형제자매의 배우자 + 조카 */}
        {hasUpper && (
          <Section title="부모님 가족">
            {parentIds.map(pid => renderDirectRow(pid, memberId, "parent", 0))}
            {siblingIds.map(sid => {
              const sib = members.get(sid);
              const kind = siblingKind(self.birth_date, sib?.gender, sib?.birth_date);
              // sibling's spouse
              const sibSpouses = relatedOf(sid, "spouse").filter(id => !seen.has(id));
              sibSpouses.forEach(id => seen.add(id));
              // sibling's children (조카)
              const nieces = relatedOf(sid, "child").filter(id => !seen.has(id));
              nieces.forEach(id => seen.add(id));
              return (
                <div key={`sibblock-${sid}`} className="space-y-1.5">
                  {renderDirectRow(sid, memberId, "sibling", 1)}
                  {sibSpouses.map(spId =>
                    renderDerivedRow(spId, siblingSpouseLabel(kind, self.gender), 2, `sibsp-${sid}`)
                  )}
                  {nieces.map(nid => {
                    const n = members.get(nid);
                    return renderDerivedRow(nid, niblingLabel(n?.gender), 2, `nib-${sid}`);
                  })}
                </div>
              );
            })}
          </Section>
        )}

        {/* 본인의 가족: 본인 + 배우자 + 자녀 + 자녀의 배우자(사위/며느리) + 손자/손녀 */}
        <Section title="본인의 가족">
          <FamilyRowItem
            m={self}
            indent={0}
            isSelf
          />
          {spouseIds.map(sid => renderDirectRow(sid, memberId, "spouse", 1))}
          {childIds.map(cid => {
            const childSpouses = relatedOf(cid, "spouse").filter(id => !seen.has(id));
            childSpouses.forEach(id => seen.add(id));
            const grands = relatedOf(cid, "child").filter(id => !seen.has(id));
            grands.forEach(id => seen.add(id));
            return (
              <div key={`childblock-${cid}`} className="space-y-1.5">
                {renderDirectRow(cid, memberId, "child", 1)}
                {childSpouses.map(spId => {
                  const sp = members.get(spId);
                  return renderDerivedRow(spId, childSpouseLabel(sp?.gender), 2, `csp-${cid}`);
                })}
                {grands.map(gid => {
                  const g = members.get(gid);
                  return renderDerivedRow(gid, grandchildLabel(g?.gender), 2, `gc-${cid}`);
                })}
              </div>
            );
          })}
          {spouseIds.length === 0 && childIds.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">
              {editMode ? "위에서 배우자·자녀를 추가하세요" : "등록된 가족이 없습니다"}
            </p>
          )}
        </Section>
      </div>
    </>
  );
};

export default FamilyTree;
