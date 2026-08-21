import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface AnnouncementItem {
  id: string;
  content: string;
  sort_order?: number;
}

interface Props {
  items: AnnouncementItem[];
  onAdd: () => void;
  onChangeContent: (id: string, content: string) => void;
  onCommitContent: (id: string, content: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

/** 광고 목록 +/- 편집 (공지용/감독단용 공통 재사용, 각자 다른 테이블에 연결) */
export default function AnnouncementList({ items, onAdd, onChangeContent, onCommitContent, onRemove, disabled }: Props) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-1.5">
          <Textarea
            value={item.content}
            onChange={(e) => onChangeContent(item.id, e.target.value)}
            onBlur={(e) => onCommitContent(item.id, e.target.value)}
            placeholder="광고 내용"
            rows={2}
            className="min-h-0 text-xs resize-none"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            aria-label="광고 삭제"
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full border-dashed h-8 text-xs" onClick={onAdd} disabled={disabled}>
        <Plus className="w-3.5 h-3.5" /> 광고 추가
      </Button>
    </div>
  );
}
