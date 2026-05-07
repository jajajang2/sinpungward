import { useState, useEffect, useMemo, useCallback } from "react";
import { Member, MemberChurchInfo } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Trash2, ExternalLink, Plus, Eye, Pencil, X, ChevronRight, ChevronDown, ChevronsUpDown,
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
  // 아래 props는 호환을 위해 유지(미사용)
  family?: any;
  setFamily?: any;
  memberList?: any;
}

interface TreeNode {
  key: string;
  memberId: string;
  isSelf?: boolean;
  relationLabel?: string;
  indent: number;
  children: TreeNode[];
}

// ── Row 컴포넌트 ────────────────────────────────────────────
const FamilyRowItem = ({
  m, label, indent, isSelf, onNavigate, onDelete, editMode,
  expandable, expanded, onToggleExpand,
}: {
  m: RelationMember;
  label?: string;
  indent: number;
  isSelf?: boolean;
  onNavigate?: () => void;
  onDelete?: () => void;
  editMode?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) => {
  const age = calcAge(m.birth_date);
  return (
    <HoverCard openDelay={250}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors hover:bg-muted/40",
            isSelf ? "border-primary bg-primary/5" : "border-border bg-card",
            expandable && "cursor-pointer"
          )}
          style={{ marginLeft: indent * 16 }}
          onClick={expandable ? onToggleExpand : undefined}
        >
          {expandable ? (
            <span className="shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          ) : (
            <span className="shrink-0 w-3.5" />
          )}
          <span className={cn(
            "shrink-0 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[3.5rem] text-center",
            isSelf ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {isSelf ? "본인" : label || "—"}
          </span>
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
            <div className={cn("col-span-3 text-sm font-semibold truncate", isSelf && "text-primary")}>
              {m.name || "—"}
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
            {!isSelf && onNavigate && (
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
        <div className="font-semibold text-sm">{m.name}</div>
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

// ── Section ────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border-2 border-border bg-background p-3 space-y-2">
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </section>
);

// ── Member 검색 콤보박스 ───────────────────────────────────
const MemberCombobox = ({
  members, value, onChange,
}: {
  members: RelationMember[];
  value: string;
  onChange: (memberId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = members.find(m => m.id === value);
  const filtered = members.filter(m =>
    !q || m.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 30);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 px-2 text-xs border border-input rounded-md flex items-center justify-between gap-1 w-full bg-background hover:bg-accent"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.name || "회원 선택..."}
          </span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="이름 검색..."
          className="h-8 text-xs border-0 border-b rounded-none"
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">결과 없음</div>
          ) : filtered.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); setQ(""); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
            >
              <span className="font-medium">{m.name}</span>
              {m.birth_date && <span className="ml-2 text-muted-foreground">{m.birth_date}</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ── 메인 ───────────────────────────────────────────────────
const FamilyTree = ({ memberId, onNavigateToMember }: FamilyTreeProps) => {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<Map<string, RelationMember>>(new Map());
  const [edges, setEdges] = useState<Map<string, RelationEdge[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // 새 관계 추가 상태
  const [addType, setAddType] = useState<RelationType>("child");
  const [addTarget, setAddTarget] = useState<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    const g = await fetchRelationGraph();
    setMembers(g.members);
    setEdges(g.edgesByMember);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload, memberId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const self = members.get(memberId);

  // 관계별 정렬: 나이순
  const sortByAge = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const ad = members.get(a)?.birth_date || "9999-12-31";
      const bd = members.get(b)?.birth_date || "9999-12-31";
      return ad.localeCompare(bd);
    });

  const relatedOf = (id: string, t: RelationType) => sortByAge(getRelated(edges, id, t));

  // 관계 추가
  const handleAddRelation = async () => {
    if (!addTarget) {
      toast({ title: "회원을 선택하세요", variant: "destructive" });
      return;
    }
    if (addTarget === memberId) {
      toast({ title: "자기 자신은 추가할 수 없습니다", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("member_relations").insert({
      member_id: memberId,
      related_member_id: addTarget,
      relation_type: addType,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "이미 등록된 관계입니다", variant: "destructive" });
      } else {
        toast({ title: "추가 실패", description: error.message, variant: "destructive" });
      }
      return;
    }
    setAddTarget("");
    toast({ title: "추가됨", description: "양쪽 회원카드에 자동 반영됩니다." });
    await reload();
  };

  // 관계 삭제: A의 관점에서 B와의 직접 edge 제거 (트리거가 역방향도 정리)
  const handleDeleteRelation = async (fromId: string, toId: string, type: RelationType) => {
    if (!confirm("이 가족 관계를 삭제할까요? 양쪽 회원카드 모두에서 제거됩니다.")) return;
    const { error } = await supabase
      .from("member_relations")
      .delete()
      .eq("member_id", fromId)
      .eq("related_member_id", toId)
      .eq("relation_type", type);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "삭제됨" });
    await reload();
  };

  // 본인 관점 라벨
  const labelFor = (fromId: string, toId: string, type: RelationType) => {
    const a = members.get(fromId);
    const b = members.get(toId);
    return relationLabel(type, a?.gender, b?.gender, a?.birth_date, b?.birth_date);
  };

  // ── 행 렌더 ─────────────────────────────────────────────
  const renderMemberRow = (
    targetId: string,
    fromId: string,
    type: RelationType | null,
    indent: number,
    expandable: boolean,
    isSelf?: boolean
  ) => {
    const m = members.get(targetId);
    if (!m) return null;
    const label = type ? labelFor(fromId, targetId, type) : undefined;
    const expanded = expandable && expandedIds.has(targetId);
    return (
      <div key={`${fromId}->${targetId}-${type}`} className="space-y-1.5">
        <FamilyRowItem
          m={m}
          label={label}
          indent={indent}
          isSelf={isSelf}
          editMode={editMode}
          onNavigate={onNavigateToMember && !isSelf ? () => onNavigateToMember({ id: targetId, name: m.name }) : undefined}
          onDelete={!isSelf && type ? () => handleDeleteRelation(fromId, targetId, type) : undefined}
          expandable={expandable && !editMode}
          expanded={expanded}
          onToggleExpand={() => toggleExpand(targetId)}
        />
        {expanded && renderSubFamily(targetId, indent + 1)}
      </div>
    );
  };

  // 클릭 시 펼쳐지는 서브 가족: 배우자 + 자녀
  const renderSubFamily = (parentId: string, indent: number) => {
    const spouseIds = relatedOf(parentId, "spouse");
    const childIds = relatedOf(parentId, "child");
    if (spouseIds.length === 0 && childIds.length === 0) {
      return (
        <div className="text-xs text-muted-foreground px-3 py-1.5" style={{ marginLeft: indent * 16 }}>
          등록된 배우자·자녀 없음
        </div>
      );
    }
    return (
      <>
        {spouseIds.map(sid => renderMemberRow(sid, parentId, "spouse", indent, false))}
        {childIds.map(cid => renderMemberRow(cid, parentId, "child", indent, false))}
      </>
    );
  };

  if (loading || !self) {
    return <div className="text-sm text-muted-foreground py-6 text-center">불러오는 중...</div>;
  }

  // 본인 기준 그룹
  const parentIds = relatedOf(memberId, "parent");
  const siblingIds = relatedOf(memberId, "sibling");
  const spouseIds = relatedOf(memberId, "spouse");
  const childIds = relatedOf(memberId, "child");
  // 손자녀 = 자녀의 자녀 (집계)
  const grandchildIds = Array.from(new Set(
    childIds.flatMap(cid => relatedOf(cid, "child"))
  ));

  const hasUpper = parentIds.length > 0 || siblingIds.length > 0;

  // 추가 가능한 회원 목록 (본인 제외 + 이미 동일 타입으로 연결된 사람 제외)
  const addCandidates = Array.from(members.values()).filter(m => {
    if (m.id === memberId) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">가족 정보 (관계 기반 자동 동기화)</p>
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => setEditMode(m => !m)}
        >
          {editMode ? <><Eye className="w-3 h-3 mr-1" />보기</> : <><Pencil className="w-3 h-3 mr-1" />편집</>}
        </Button>
      </div>

      {/* 편집 모드: 관계 추가 폼 */}
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
            <MemberCombobox members={addCandidates} value={addTarget} onChange={setAddTarget} />
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
        {/* 부모님 가족 */}
        {hasUpper && (
          <Section title="부모님 가족">
            {parentIds.map(pid => renderMemberRow(pid, memberId, "parent", 0, false))}
            {siblingIds.map(sid => renderMemberRow(sid, memberId, "sibling", 1, true))}
          </Section>
        )}

        {/* 본인의 가족 */}
        <Section title="본인의 가족">
          {renderMemberRow(memberId, memberId, null, 0, false, true)}
          {spouseIds.map(sid => renderMemberRow(sid, memberId, "spouse", 1, false))}
          {childIds.map(cid => renderMemberRow(cid, memberId, "child", 1, true))}
          {grandchildIds.map(gid => {
            // 어떤 자녀의 자녀인지 라벨 계산: 본인 → 손자/손녀
            const m = members.get(gid);
            if (!m) return null;
            // 본인 입장 라벨: 손자/손녀
            const label = m.gender === "남" ? "손자" : m.gender === "여" ? "손녀" : "손자녀";
            return (
              <FamilyRowItem
                key={`gc-${gid}`}
                m={m}
                label={label}
                indent={2}
                editMode={false}
                onNavigate={onNavigateToMember ? () => onNavigateToMember({ id: gid, name: m.name }) : undefined}
              />
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
