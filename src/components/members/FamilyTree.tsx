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

type Level = "grandparents" | "parents" | "siblings" | "spouse" | "children" | "grandchildren" | "extended";

function classifyLevel(rel?: string | null): Level {
  if (!rel) return "extended";
  if (/할아버지|할머니|외할/.test(rel)) return "grandparents";
  if (/^아버지$|^어머니$|시아버지|시어머니|장인|장모/.test(rel)) return "parents";
  if (rel.startsWith("배우자")) return "spouse";
  if (/^형$|^오빠$|^누나$|^언니$|^남동생$|^여동생$/.test(rel)) return "siblings";
  if (rel === "아들" || rel === "딸" || rel === "며느리" || rel === "사위") return "children";
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
          {/* 관계 뱃지 */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className={cn(
              "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded",
              isSelf ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isSelf ? "본인" : relationship || "—"}
            </span>
            <div className="flex items-center gap-0.5">
              {linkedId && onNavigate && (
                <button
                  type="button"
                  onClick={onNavigate}
                  className="p-0.5 rounded hover:bg-accent text-primary"
                  title="회원카드 이동"
                >
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
          {/* 이름 */}
          <div className={cn("text-sm font-semibold truncate", isSelf && "text-primary")}>{name || "—"}</div>
          {/* 생년월일·나이 */}
          {birthDate && (
            <div className="text-[11px] text-muted-foreground truncate">
              {birthDate}{age != null && ` (${age}세)`}
            </div>
          )}
          {/* 부름 */}
          {calling && calling.length > 0 && (
            <div className="text-[11px] text-foreground truncate">{calling.join(", ")}</div>
          )}
          {/* 연락처 */}
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

// ── 그룹 섹션 (모바일/펼침-접기) ───────────────────────────
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

// ── 메인 FamilyTree ───────────────────────────────────────
const FamilyTree = ({
  member, memberId, churchInfo, family, setFamily, memberList, onNavigateToMember,
}: FamilyTreeProps) => {
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // 그룹화
  const indexed = family.map((fam, i) => ({ fam, i }));
  const grandparents = sortByAge(indexed.filter(x => classifyLevel(x.fam.relationship) === "grandparents").map(x => x.fam));
  const parents = sortByAge(indexed.filter(x => classifyLevel(x.fam.relationship) === "parents").map(x => x.fam));
  const siblings = sortByAge(indexed.filter(x => classifyLevel(x.fam.relationship) === "siblings").map(x => x.fam));
  const spouse = indexed.filter(x => classifyLevel(x.fam.relationship) === "spouse").map(x => x.fam);
  const children = sortByAge(indexed.filter(x => classifyLevel(x.fam.relationship) === "children").map(x => x.fam));
  const grandchildren = sortByAge(indexed.filter(x => classifyLevel(x.fam.relationship) === "grandchildren").map(x => x.fam));
  const extended = indexed.filter(x => classifyLevel(x.fam.relationship) === "extended").map(x => x.fam);

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

  // ── 헤더 ──
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
    return (
      <>
        {header}
        <div className="space-y-4">
          {grandparents.length > 0 && (
            <GroupSection title="조부모" count={grandparents.length}>
              <div className="grid grid-cols-2 gap-2">{grandparents.map(renderCard)}</div>
            </GroupSection>
          )}
          {parents.length > 0 && (
            <GroupSection title="부모" count={parents.length}>
              <div className="grid grid-cols-2 gap-2">{parents.map(renderCard)}</div>
            </GroupSection>
          )}
          {siblings.length > 0 && (
            <GroupSection title="형제자매" count={siblings.length}>
              <div className="grid grid-cols-2 gap-2">{siblings.map(renderCard)}</div>
            </GroupSection>
          )}
          <GroupSection title="본인 / 배우자" count={1 + spouse.length}>
            <div className="grid grid-cols-2 gap-2">
              {selfCard}
              {spouse.map(renderCard)}
            </div>
          </GroupSection>
          {children.length > 0 && (
            <GroupSection title="자녀" count={children.length}>
              <div className="grid grid-cols-2 gap-2">{children.map(renderCard)}</div>
            </GroupSection>
          )}
          {grandchildren.length > 0 && (
            <GroupSection title="손자녀" count={grandchildren.length}>
              <div className="grid grid-cols-2 gap-2">{grandchildren.map(renderCard)}</div>
            </GroupSection>
          )}
          {extended.length > 0 && (
            <GroupSection title="기타 친족" count={extended.length} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">{extended.map(renderCard)}</div>
            </GroupSection>
          )}
        </div>
      </>
    );
  }

  // ── 데스크탑: 가계도 ──
  // 연결선: 부모 그룹 아래 ↓, 본인-배우자 가로선, 본인 아래 자녀 ↓
  const Connector = ({ className }: { className?: string }) => (
    <div className={cn("bg-border", className)} />
  );

  return (
    <>
      {header}
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col items-center gap-3 min-w-max px-4">
          {/* L1: 조부모 */}
          {grandparents.length > 0 && (
            <>
              <div className="flex items-end gap-4">{grandparents.map(renderCard)}</div>
              <Connector className="w-px h-5" />
            </>
          )}

          {/* L2: 부모 */}
          {parents.length > 0 && (
            <>
              <div className="flex items-end gap-4 relative">
                {parents.length >= 2 && (
                  <Connector className="absolute top-1/2 left-8 right-8 h-px" />
                )}
                {parents.map(renderCard)}
              </div>
              <Connector className="w-px h-5" />
            </>
          )}

          {/* L3: 형제 + 본인 + 배우자 */}
          <div className="relative">
            {/* 형제·본인·배우자를 한 줄에 표시 */}
            <div className="flex items-end gap-4 relative">
              {/* 형제→본인 가로 연결선 (parents가 있을 때) */}
              {parents.length > 0 && siblings.length > 0 && (
                <Connector className="absolute -top-3 left-1/2 right-1/2 h-px" />
              )}
              {siblings.map(renderCard)}
              {selfCard}
              {spouse.map(renderCard)}
            </div>
            {/* 본인-배우자 가로 연결선 */}
            {spouse.length > 0 && (
              <div
                className="absolute h-px bg-primary/40"
                style={{
                  top: "50%",
                  left: `calc(${siblings.length} * (11rem + 1rem) + 5.5rem)`,
                  width: `calc(${spouse.length} * (11rem + 1rem))`,
                }}
              />
            )}
          </div>

          {/* L4: 자녀 */}
          {children.length > 0 && (
            <>
              <Connector className="w-px h-5" />
              <div className="flex items-end gap-4 relative">
                {children.length >= 2 && (
                  <Connector className="absolute -top-3 left-8 right-8 h-px" />
                )}
                {children.map(renderCard)}
              </div>
            </>
          )}

          {/* L5: 손자녀 */}
          {grandchildren.length > 0 && (
            <>
              <Connector className="w-px h-5" />
              <div className="flex items-end gap-4">{grandchildren.map(renderCard)}</div>
            </>
          )}

          {/* 기타 친족 */}
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
