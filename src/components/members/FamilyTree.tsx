import { useState, useEffect } from "react";
import { Member, MemberChurchInfo } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Edit2, Trash2, ExternalLink, Plus, Eye, Pencil, X, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  calcAge,
  FamilyRow,
  MemberListItem,
  FamilyNameCombobox,
  RelationshipSelect,
} from "./MemberDetailPanel";

interface FamilyTreeProps {
  member: Member | null;
  memberId: string;
  churchInfo: MemberChurchInfo | null;
  family: FamilyRow[];
  setFamily: React.Dispatch<React.SetStateAction<FamilyRow[]>>;
  memberList: MemberListItem[];
  onNavigateToMember?: (m: { id: string; name: string }) => void;
}

type Level =
  | "grandparents"
  | "spouse_grandparents"
  | "parents"
  | "spouse_parents"
  | "siblings"
  | "spouse_siblings"
  | "siblings_in_law"
  | "spouse"
  | "children"
  | "grandchildren"
  | "nieces_nephews"
  | "extended";

function classifyLevel(rel?: string | null): Level {
  if (!rel) return "extended";
  if (/시할(아버지|머니)|처할(아버지|머니)/.test(rel)) return "spouse_grandparents";
  if (/할아버지|할머니|외할/.test(rel)) return "grandparents";
  if (/시아버지|시어머니|장인|장모/.test(rel)) return "spouse_parents";
  if (/^아버지$|^어머니$/.test(rel)) return "parents";
  if (rel.startsWith("배우자") || rel === "남편" || rel === "아내") return "spouse";
  if (/아주버님|도련님|시누이|시동생|시형|처남|처형|처제|형님/.test(rel)) return "spouse_siblings";
  if (/동서|올케|매형|매부|형부|제부/.test(rel)) return "siblings_in_law";
  if (/^형$|^오빠$|^누나$|^언니$|^남동생$|^여동생$|^동생$/.test(rel)) return "siblings";
  if (rel === "아들" || rel === "딸" || rel === "며느리" || rel === "사위") return "children";
  if (/조카/.test(rel)) return "nieces_nephews";
  if (/손자|손녀|외손/.test(rel)) return "grandchildren";
  return "extended";
}

function sortByAge(rows: FamilyRow[]) {
  return [...rows].sort((a, b) => {
    const ad = a._birth_date || "9999-12-31";
    const bd = b._birth_date || "9999-12-31";
    return ad.localeCompare(bd);
  });
}

// ── Row 컴포넌트 ───────────────────────────────────────────
interface RowProps {
  name: string;
  relationship?: string;
  birthDate?: string | null;
  calling?: string[] | null;
  phone?: string | null;
  notes?: string | null;
  isSelf?: boolean;
  linkedId?: string;
  onNavigate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editMode?: boolean;
  indent?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const FamilyRowItem = ({
  name, relationship, birthDate, calling, phone, notes,
  isSelf, linkedId, onNavigate, onEdit, onDelete, editMode, indent = 0,
  expandable, expanded, onToggleExpand,
}: RowProps) => {
  const age = calcAge(birthDate);
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
            {isSelf ? "본인" : relationship || "—"}
          </span>
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
            <div className={cn("col-span-3 text-sm font-semibold truncate", isSelf && "text-primary")}>
              {name || "—"}
            </div>
            <div className="col-span-3 text-xs text-muted-foreground truncate">
              {birthDate ? `${birthDate}${age != null ? ` (${age})` : ""}` : "—"}
            </div>
            <div className="col-span-3 text-xs truncate">
              {calling && calling.length > 0 ? calling.join(", ") : "—"}
            </div>
            <div className="col-span-3 text-xs text-muted-foreground truncate">
              {phone || "—"}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {linkedId && onNavigate && (
              <button type="button" onClick={onNavigate} className="p-1 rounded hover:bg-accent text-primary" title="회원카드 이동">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {editMode && onEdit && (
              <button type="button" onClick={onEdit} className="p-1 rounded hover:bg-accent">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {editMode && onDelete && !isSelf && (
              <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-xs space-y-1" side="top">
        <div className="font-semibold text-sm">{name}</div>
        {relationship && <div><span className="text-muted-foreground">관계:</span> {relationship}</div>}
        {birthDate && <div><span className="text-muted-foreground">생년월일:</span> {birthDate}{age != null && ` (${age}세)`}</div>}
        {calling && calling.length > 0 && <div><span className="text-muted-foreground">부름:</span> {calling.join(", ")}</div>}
        {phone && <div><span className="text-muted-foreground">연락처:</span> {phone}</div>}
        {notes && <div><span className="text-muted-foreground">비고:</span> {notes}</div>}
      </HoverCardContent>
    </HoverCard>
  );
};

// ── 인라인 편집 ─────────────────────────────────────────────
const InlineEditRow = ({
  fam, index, memberList, setFamily, onClose,
}: {
  fam: FamilyRow;
  index: number;
  memberList: MemberListItem[];
  setFamily: React.Dispatch<React.SetStateAction<FamilyRow[]>>;
  onClose: () => void;
}) => (
  <div className="rounded-md border-2 border-primary bg-card p-2 space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold text-primary">편집 중</span>
      <button onClick={onClose} className="p-0.5 rounded hover:bg-accent">
        <X className="w-3 h-3" />
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
      <FamilyNameCombobox
        value={fam.name || ""}
        memberList={memberList}
        onChange={(name, linked) => setFamily(f => f.map((x, j) => j === index ? {
          ...x, name,
          _birth_date: linked?.birth_date ?? (linked ? null : x._birth_date),
          _current_calling: linked?.current_calling ?? (linked ? null : x._current_calling),
          _phone: linked?.phone ?? (linked ? null : x._phone),
          _linked_member_id: linked?.id ?? x._linked_member_id,
        } : x))}
      />
      <RelationshipSelect
        value={fam.relationship || ""}
        onChange={v => setFamily(f => f.map((x, j) => j === index ? { ...x, relationship: v } : x))}
      />
      {!fam._linked_member_id && (
        <Input
          value={fam.notes || ""}
          onChange={e => setFamily(f => f.map((x, j) => j === index ? { ...x, notes: e.target.value } : x))}
          placeholder="비고..."
          className="h-8 text-xs"
        />
      )}
    </div>
  </div>
);

// ── Section ────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border-2 border-border bg-background p-3 space-y-2">
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </section>
);

// ── 서브 가족 (배우자/자녀) 행 ─────────────────────────────
interface SubFamilyRow {
  id: string;
  name: string;
  relationship: string;
  birth_date: string | null;
  current_calling: string[] | null;
  phone: string | null;
  linked_id?: string;
}

const ExpandableSubFamily = ({
  parentMemberId,
  memberList,
  indent,
  onNavigateToMember,
}: {
  parentMemberId: string;
  memberList: MemberListItem[];
  indent: number;
  onNavigateToMember?: (m: { id: string; name: string }) => void;
}) => {
  const [rows, setRows] = useState<SubFamilyRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("member_family")
        .select("id, name, relationship")
        .eq("member_id", parentMemberId)
        .order("sort_order");
      if (cancel) return;
      const filtered = (data || []).filter((r: any) => {
        const lv = classifyLevel(r.relationship);
        return lv === "spouse" || lv === "children";
      });
      const enriched: SubFamilyRow[] = filtered.map((r: any) => {
        const linked = memberList.find(m => m.name === r.name);
        return {
          id: r.id,
          name: r.name,
          relationship: r.relationship,
          birth_date: linked?.birth_date ?? null,
          current_calling: linked?.current_calling ?? null,
          phone: linked?.phone ?? null,
          linked_id: linked?.id,
        };
      });
      // 배우자 먼저, 그다음 자녀
      enriched.sort((a, b) => {
        const ord = (lv: Level) => (lv === "spouse" ? 0 : 1);
        const la = classifyLevel(a.relationship);
        const lb = classifyLevel(b.relationship);
        if (la !== lb) return ord(la) - ord(lb);
        return (a.birth_date || "9999").localeCompare(b.birth_date || "9999");
      });
      setRows(enriched);
      setLoading(false);
    })();
    return () => { cancel = true; };
  });

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-1.5" style={{ marginLeft: indent * 16 }}>
        불러오는 중...
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-1.5" style={{ marginLeft: indent * 16 }}>
        등록된 배우자·자녀 없음
      </div>
    );
  }
  return (
    <>
      {rows.map(r => (
        <FamilyRowItem
          key={r.id}
          name={r.name}
          relationship={r.relationship}
          birthDate={r.birth_date}
          calling={r.current_calling}
          phone={r.phone}
          linkedId={r.linked_id}
          indent={indent}
          onNavigate={r.linked_id && onNavigateToMember
            ? () => onNavigateToMember({ id: r.linked_id!, name: r.name })
            : undefined}
        />
      ))}
    </>
  );
};

// ── 메인 ───────────────────────────────────────────────────
const FamilyTree = ({
  member, memberId, churchInfo, family, setFamily, memberList, onNavigateToMember,
}: FamilyTreeProps) => {
  const [editMode, setEditMode] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const byLevel = (lv: Level) => sortByAge(family.filter(f => classifyLevel(f.relationship) === lv));
  const grandparents = byLevel("grandparents");
  const parents = byLevel("parents");
  const siblings = byLevel("siblings");
  const siblingsInLaw = byLevel("siblings_in_law");
  const nieces = byLevel("nieces_nephews");
  const spouseParents = byLevel("spouse_parents");
  const spouseGrandparents = byLevel("spouse_grandparents");
  const spouseSiblings = byLevel("spouse_siblings");
  const spouse = family.filter(f => classifyLevel(f.relationship) === "spouse");
  const children = byLevel("children");
  const grandchildren = byLevel("grandchildren");
  const extended = family.filter(f => classifyLevel(f.relationship) === "extended");

  const indexOfFam = (fam: FamilyRow) => family.indexOf(fam);

  const renderRow = (fam: FamilyRow, indent = 0, allowExpand = false) => {
    const idx = indexOfFam(fam);
    if (editMode && editingIdx === idx) {
      return (
        <InlineEditRow
          key={fam.id || `f-${idx}`}
          fam={fam} index={idx}
          memberList={memberList} setFamily={setFamily}
          onClose={() => setEditingIdx(null)}
        />
      );
    }
    const expandable = allowExpand && !!fam._linked_member_id && !editMode;
    const expanded = expandable && expandedIds.has(fam._linked_member_id!);
    return (
      <div key={fam.id || `f-${idx}`} className="space-y-1.5">
        <FamilyRowItem
          name={fam.name || ""}
          relationship={fam.relationship || undefined}
          birthDate={fam._birth_date}
          calling={fam._current_calling}
          phone={fam._phone}
          notes={fam.notes}
          linkedId={fam._linked_member_id}
          indent={indent}
          onNavigate={fam._linked_member_id && fam.name && onNavigateToMember
            ? () => onNavigateToMember({ id: fam._linked_member_id!, name: fam.name! })
            : undefined}
          editMode={editMode}
          onEdit={() => setEditingIdx(idx)}
          onDelete={() => setFamily(f => f.filter((_, j) => j !== idx))}
          expandable={expandable}
          expanded={expanded}
          onToggleExpand={expandable ? () => toggleExpand(fam._linked_member_id!) : undefined}
        />
        {expanded && (
          <ExpandableSubFamily
            parentMemberId={fam._linked_member_id!}
            memberList={memberList}
            indent={indent + 1}
            onNavigateToMember={onNavigateToMember}
          />
        )}
      </div>
    );
  };

  const selfRow = (
    <FamilyRowItem
      key="self"
      isSelf
      name={member?.name || "본인"}
      birthDate={member?.birth_date}
      calling={churchInfo?.current_calling}
      phone={member?.phone}
    />
  );

  const header = (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-muted-foreground">가족 정보</p>
      <div className="flex items-center gap-2">
        {editMode && (
          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => {
              setFamily(f => [...f, {
                id: "", member_id: memberId, name: "", relationship: "", phone: "",
                sort_order: f.length,
                _birth_date: null, _current_calling: null, _linked_member_id: undefined,
              }]);
              setEditingIdx(family.length);
            }}
          >
            <Plus className="w-3 h-3 mr-1" />가족 추가
          </Button>
        )}
        <Button
          size="sm" variant={editMode ? "default" : "outline"} className="h-7 text-xs"
          onClick={() => { setEditMode(m => !m); setEditingIdx(null); }}
        >
          {editMode ? <><Eye className="w-3 h-3 mr-1" />보기</> : <><Pencil className="w-3 h-3 mr-1" />편집</>}
        </Button>
      </div>
    </div>
  );

  if (family.length === 0 && !editMode) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <p className="text-sm">가족 정보가 없습니다</p>
          <p className="text-xs">편집 모드에서 가족을 추가하세요</p>
        </div>
      </>
    );
  }

  const hasUpperFamily =
    parents.length > 0 || grandparents.length > 0 ||
    siblings.length > 0 || siblingsInLaw.length > 0 || nieces.length > 0;
  const hasSpouseSide =
    spouseParents.length > 0 || spouseGrandparents.length > 0 || spouseSiblings.length > 0;

  return (
    <>
      {header}
      <div className="space-y-3">
        {/* 부모님 가족 (조부모-부모-본인 형제) */}
        {hasUpperFamily && (
          <Section title="부모님 가족">
            {grandparents.map(r => renderRow(r, 0))}
            {parents.map(r => renderRow(r, 0))}
            {siblings.map(r => renderRow(r, 1))}
          </Section>
        )}

        {/* 형제의 가족 */}
        {(siblingsInLaw.length > 0 || nieces.length > 0) && (
          <Section title="형제의 가족">
            {siblingsInLaw.map(r => renderRow(r, 0))}
            {nieces.map(r => renderRow(r, 1))}
          </Section>
        )}

        {/* 배우자측 가족 */}
        {hasSpouseSide && (
          <Section title="배우자 가족">
            {spouseGrandparents.map(r => renderRow(r, 0))}
            {spouseParents.map(r => renderRow(r, 0))}
            {spouseSiblings.map(r => renderRow(r, 1))}
          </Section>
        )}

        {/* 본인의 가족 */}
        <Section title="본인의 가족">
          {selfRow}
          {spouse.map(r => renderRow(r, 1))}
          {children.map(r => renderRow(r, 1))}
          {grandchildren.map(r => renderRow(r, 2))}
        </Section>

        {/* 기타 친족 */}
        {extended.length > 0 && (
          <Section title="기타 친족">
            {extended.map(r => renderRow(r, 0))}
          </Section>
        )}
      </div>
    </>
  );
};

export default FamilyTree;
