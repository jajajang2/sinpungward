import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { HYMN_BOOK_LABEL, formatHymn, searchHymns } from "@/data/hymns";

interface Props {
  value: string;
  onPick: (value: string) => void;
  onClear?: () => void;
}

/** 번호 또는 제목으로 찬송가를 검색해 "번호 - 제목" 형식으로 선택 */
export default function HymnPicker({ value, onPick, onClear }: Props) {
  const [q, setQ] = useState(value || "");
  const results = useMemo(() => searchHymns(q), [q]);

  return (
    <div className="w-[min(88vw,18rem)] md:w-72 space-y-2 p-2">
      <Input placeholder="번호 또는 제목 검색" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="max-h-56 overflow-y-auto rounded border">
        {results.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {q.trim() ? "결과 없음" : "번호나 제목을 입력하세요"}
          </div>
        ) : (
          results.map((h) => (
            <button
              key={`${h.book}-${h.number}`}
              type="button"
              onClick={() => onPick(formatHymn(h))}
              className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="truncate">
                {h.number} · {h.title}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{HYMN_BOOK_LABEL[h.book]}</span>
            </button>
          ))
        )}
      </div>
      {onClear && (
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={onClear}>
          <Trash2 className="mr-1 h-3 w-3" /> 삭제
        </Button>
      )}
    </div>
  );
}
