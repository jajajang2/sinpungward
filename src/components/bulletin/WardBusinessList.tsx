import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import PersonPicker from "@/components/sacrament/PersonPicker";
import { calcAge, type MemberLite } from "@/components/sacrament/types";

export interface WardBusinessItem {
  id: string;
  member_id: string | null;
  custom_name: string | null;
  note: string;
}

interface Props {
  label: string;
  items: WardBusinessItem[];
  members: MemberLite[];
  onAdd: () => void;
  onPick: (id: string, memberId: string | null, customName: string | null) => void;
  onNoteChange: (id: string, note: string) => void;
  onNoteCommit: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

/** 와드행사(해임/부름/기타) 한 카테고리 편집 목록 — 회원 선택(PersonPicker 재사용) + 수기 메모 */
export default function WardBusinessList({
  label,
  items,
  members,
  onAdd,
  onPick,
  onNoteChange,
  onNoteCommit,
  onRemove,
  disabled,
}: Props) {
  const nameOf = (item: WardBusinessItem) => {
    if (item.member_id) {
      const m = members.find((x) => x.id === item.member_id);
      if (!m) return "";
      const age = calcAge(m.birth_date);
      return age !== null ? `${m.name} (${age})` : m.name;
    }
    return item.custom_name || "";
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-8 w-28 shrink-0 rounded-md border border-input px-2 text-left text-xs hover:bg-muted"
                disabled={disabled}
              >
                {nameOf(item) || <span className="text-muted-foreground">회원 선택</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <PersonPicker
                members={members}
                currentMemberId={item.member_id}
                currentCustomName={item.custom_name}
                onPick={(mid, cn) => onPick(item.id, mid, cn)}
              />
            </PopoverContent>
          </Popover>
          <Input
            value={item.note}
            placeholder="메모"
            onChange={(e) => onNoteChange(item.id, e.target.value)}
            onBlur={(e) => onNoteCommit(item.id, e.target.value)}
            className="h-8 text-xs flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            aria-label={`${label} 삭제`}
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full border-dashed h-7 text-xs" onClick={onAdd} disabled={disabled}>
        <Plus className="w-3.5 h-3.5" /> {label} 추가
      </Button>
    </div>
  );
}
