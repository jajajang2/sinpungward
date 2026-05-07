import { useState } from "react";
import { Member, MemberChurchInfo } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit2, Trash2, ExternalLink, Plus, Eye, Pencil, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
  // 배우자 쪽 조부모
  if (/시할(아버지|머니)|처할(아버지|머니)/.test(rel)) return "spouse_grandparents";
  // 본인 조부모
  if (/할아버지|할머니|외할/.test(rel)) return "grandparents";
  // 시(처)부모
  if (/시아버지|시어머니|장인|장모/.test(rel)) return "spouse_parents";
  // 본인 부모
  if (/^아버지$|^어머니$/.test(rel)) return "parents";
  // 배우자
  if (rel.startsWith("배우자") || rel === "남편" || rel === "아내") return "spouse";
  // 시형제 / 처형제
  if (/아주버님|도련님|시누이|시동생|시형|처남|처형|처제|형님/.test(rel)) return "spouse_siblings";
  // 동서·올케·매형 등 (형제의 배우자)
  if (/동서|올케|매형|매부|형부|제부/.test(rel)) return "siblings_in_law";
  // 본인 형제자매
  if (/^형$|^오빠$|^누나$|^언니$|^남동생$|^여동생$|^동생$/.test(rel)) return "siblings";
  // 자녀
  if (rel === "아들" || rel === "딸" || rel === "며느리" || rel === "사위") return "children";
  // 조카
  if (/조카/.test(rel)) return "nieces_nephews";
  // 손자녀
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

// ── 카드 컴포넌트 ───────────────────────────────────────────
interface CardProps {
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
}

const FamilyMemberCard = ({
  name, relationship, birthDate, calling, phone, notes,
  isSelf, linkedId, onNavigate, onEdit, onDelete, editMode,
}: CardProps) => {
  const age = calcAge(birthDate);
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "relative w-44 rounded-lg border bg-card px-2.5 py-2 shadow-sm transition-all hover:shadow-md",
            isSelf ? "border-2 border-primary bg-primary/5" : "border-border"
          )}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className={cn(
              "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded",
              isSelf ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isSelf ? "본인" : relationship || "—"}
            </span>
            <div className="flex items-center gap-0.5">
              {linkedId && onNavigate && (
                <button type="button" onClick={onNavigate} className="p-0.5 rounded hover:bg-accent text-primary" title="회원카드 이동">
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {editMode && onEdit && (
                <button type="button" onClick={onEdit} className="p-0.5 rounded hover:bg-accent">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              {editMode && onDelete && !isSelf && (
                <button type="button" onClick={onDelete} className="p-0.5 rounded hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className={cn("text-sm font-semibold truncate", isSelf && "text-primary")}>{name || "—"}</div>
          {birthDate && (
            <div className="text-[11px] text-muted-foreground truncate">
              {birthDate}{age != null && ` (${age}세)`}
            </div>
          )}
          {calling && calling.length > 0 && (
            <div className="text-[11px] text-foreground truncate">{calling.join(", ")}</div>
          )}
          {phone && <div className="text-[11px] text-muted-foreground truncate">{phone}</div>}
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

// ── 인라인 편집 카드 ───────────────────────────────────────
const InlineEditCard = ({
  fam, index, memberList, setFamily, onClose,
}: {
  fam: FamilyRow;
  index: number;
  memberList: MemberListItem[];
  setFamily: React.Dispatch<React.SetStateAction<FamilyRow[]>>;
  onClose: () => void;
}) => (
  <div className="w-56 rounded-lg border-2 border-primary bg-card p-2.5 shadow-md space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold text-primary">편집 중</span>
      <button onClick={onClose} className="p-0.5 rounded hover:bg-accent">
        <X className="w-3 h-3" />
      </button>
    </div>
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
        className="h-7 text-xs"
      />
    )}
  </div>
);

// ── 그룹 섹션 ─────────────────────────────────────────────
const GroupSection = ({
  title, count, children, defaultOpen = true,
}: {
  title: string; count: number; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-muted-foreground hover:text-foreground py-1 border-b border-border mb-2">
        <ChevronDown className={cn("w-3 h-3 transition-transform", !open && "-rotate-90")} />
        <span>{title}</span>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
};

const Connector = ({ className }: { className?: string }) => (
  <div className={cn("bg-border", className)} />
);

// ── 메인 FamilyTree ───────────────────────────────────────
const FamilyTree = ({
  member, memberId, churchInfo, family, setFamily, memberList, onNavigateToMember,
}: FamilyTreeProps) => {
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const byLevel = (lv: Level) => sortByAge(family.filter(f => classifyLevel(f.relationship) === lv));
  const grandparents = byLevel("grandparents");
  const spouseGrandparents = byLevel("spouse_grandparents");
  const parents = byLevel("parents");
  const spouseParents = byLevel("spouse_parents");
  const siblings = byLevel("siblings");
  const spouseSiblings = byLevel("spouse_siblings");
  const siblingsInLaw = byLevel("siblings_in_law");
  const spouse = family.filter(f => classifyLevel(f.relationship) === "spouse");
  const children = byLevel("children");
  const grandchildren = byLevel("grandchildren");
  const nieces = byLevel("nieces_nephews");
  const extended = family.filter(f => classifyLevel(f.relationship) === "extended");

  const indexOfFam = (fam: FamilyRow) => family.indexOf(fam);

  const renderCard = (fam: FamilyRow) => {
    const idx = indexOfFam(fam);
    if (editMode && editingIdx === idx) {
      return (
        <InlineEditCard
          key={fam.id || `f-${idx}`}
          fam={fam} index={idx}
          memberList={memberList} setFamily={setFamily}
          onClose={() => setEditingIdx(null)}
        />
      );
    }
    return (
      <FamilyMemberCard
        key={fam.id || `f-${idx}`}
        name={fam.name || ""}
        relationship={fam.relationship || undefined}
        birthDate={fam._birth_date}
        calling={fam._current_calling}
        phone={fam._phone}
        notes={fam.notes}
        linkedId={fam._linked_member_id}
        onNavigate={fam._linked_member_id && fam.name && onNavigateToMember
          ? () => onNavigateToMember({ id: fam._linked_member_id!, name: fam.name! })
          : undefined}
        editMode={editMode}
        onEdit={() => setEditingIdx(idx)}
        onDelete={() => setFamily(f => f.filter((_, j) => j !== idx))}
      />
    );
  };

  const selfCard = (
    <FamilyMemberCard
      key="self"
      isSelf
      name={member?.name || "본인"}
      birthDate={member?.birth_date}
      calling={churchInfo?.current_calling}
      phone={member?.phone}
    />
  );

  const addBtn = editMode && (
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
  );

  const header = (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-muted-foreground">가족 관계도</p>
      <div className="flex items-center gap-2">
        {addBtn}
        <Button
          size="sm" variant={editMode ? "default" : "outline"} className="h-7 text-xs"
          onClick={() => { setEditMode(m => !m); setEditingIdx(null); }}
        >
          {editMode ? <><Eye className="w-3 h-3 mr-1" />보기</> : <><Pencil className="w-3 h-3 mr-1" />편집</>}
        </Button>
      </div>
    </div>
  );

  if (family.length === 0) {
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

  // ── 모바일: 세로 스택 ──
  if (isMobile) {
    const grid = (rows: FamilyRow[]) => <div className="grid grid-cols-2 gap-2">{rows.map(renderCard)}</div>;
    return (
      <>
        {header}
        <div className="space-y-4">
          <GroupSection title="조부모" count={grandparents.length}>{grid(grandparents)}</GroupSection>
          <GroupSection title="부모" count={parents.length}>{grid(parents)}</GroupSection>
          <GroupSection title="시(처)부모" count={spouseParents.length}>{grid(spouseParents)}</GroupSection>
          <GroupSection title="형제자매" count={siblings.length}>{grid(siblings)}</GroupSection>
          <GroupSection title="시(처)형제" count={spouseSiblings.length}>{grid(spouseSiblings)}</GroupSection>
          <GroupSection title="형제의 배우자" count={siblingsInLaw.length}>{grid(siblingsInLaw)}</GroupSection>
          <GroupSection title="본인 / 배우자" count={1 + spouse.length}>
            <div className="grid grid-cols-2 gap-2">
              {selfCard}
              {spouse.map(renderCard)}
            </div>
          </GroupSection>
          <GroupSection title="자녀" count={children.length}>{grid(children)}</GroupSection>
          <GroupSection title="조카" count={nieces.length}>{grid(nieces)}</GroupSection>
          <GroupSection title="시(처)조부모" count={spouseGrandparents.length}>{grid(spouseGrandparents)}</GroupSection>
          <GroupSection title="손자녀" count={grandchildren.length}>{grid(grandchildren)}</GroupSection>
          <GroupSection title="기타 친족" count={extended.length} defaultOpen={false}>{grid(extended)}</GroupSection>
        </div>
      </>
    );
  }

  // ── 데스크탑: 본인측 / 배우자측 두 컬럼 ──
  const hasSpouseSide =
    spouse.length > 0 ||
    spouseParents.length > 0 ||
    spouseGrandparents.length > 0 ||
    spouseSiblings.length > 0 ||
    siblingsInLaw.length > 0 ||
    nieces.length > 0;

  const Column = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-3">{children}</div>
  );

  // L1: 조부모 (가로 부부선)
  const renderL1 = (rows: FamilyRow[]) => rows.length > 0 && (
    <>
      <div className="flex items-end gap-4 relative">
        {rows.length >= 2 && <Connector className="absolute top-1/2 left-8 right-8 h-px" />}
        {rows.map(renderCard)}
      </div>
      <Connector className="w-px h-5" />
    </>
  );

  // L2: 부모 (가로 부부선)
  const renderL2 = (rows: FamilyRow[]) => rows.length > 0 && (
    <>
      <div className="flex items-end gap-4 relative">
        {rows.length >= 2 && <Connector className="absolute top-1/2 left-8 right-8 h-px" />}
        {rows.map(renderCard)}
      </div>
      <Connector className="w-px h-5" />
    </>
  );

  // 본인측 컬럼 L3: [형제] [본인]
  const ownColumn = (
    <Column>
      {renderL1(grandparents)}
      {renderL2(parents)}
      <div className="flex items-end gap-4 relative">
        {(parents.length > 0 && siblings.length > 0) && (
          <Connector className="absolute -top-3 left-8 right-8 h-px" />
        )}
        {siblings.map(renderCard)}
        {selfCard}
      </div>
      {children.length > 0 && (
        <>
          <Connector className="w-px h-5" />
          <div className="flex items-end gap-4 relative">
            {children.length >= 2 && <Connector className="absolute -top-3 left-8 right-8 h-px" />}
            {children.map(renderCard)}
          </div>
        </>
      )}
      {grandchildren.length > 0 && (
        <>
          <Connector className="w-px h-5" />
          <div className="flex items-end gap-4">{grandchildren.map(renderCard)}</div>
        </>
      )}
    </Column>
  );

  // 배우자측 컬럼 L3: [배우자] [시형제] [동서]
  const spouseColumn = hasSpouseSide && (
    <Column>
      {renderL1(spouseGrandparents)}
      {renderL2(spouseParents)}
      <div className="flex items-end gap-4 relative">
        {(spouseParents.length > 0 && (spouse.length > 0 || spouseSiblings.length > 0)) && (
          <Connector className="absolute -top-3 left-8 right-8 h-px" />
        )}
        {spouse.map(renderCard)}
        {spouseSiblings.map(renderCard)}
        {siblingsInLaw.map(renderCard)}
      </div>
      {nieces.length > 0 && (
        <>
          <Connector className="w-px h-5" />
          <div className="flex items-end gap-4 relative">
            {nieces.length >= 2 && <Connector className="absolute -top-3 left-8 right-8 h-px" />}
            {nieces.map(renderCard)}
          </div>
        </>
      )}
    </Column>
  );

  return (
    <>
      {header}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max px-4 relative">
          <div className={cn("flex items-start", hasSpouseSide ? "gap-12" : "")}>
            {ownColumn}
            {spouseColumn}
          </div>
          {extended.length > 0 && (
            <div className="w-full mt-6 pt-4 border-t border-border">
              <GroupSection title="기타 친족" count={extended.length} defaultOpen={false}>
                <div className="flex flex-wrap gap-3">{extended.map(renderCard)}</div>
              </GroupSection>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FamilyTree;
