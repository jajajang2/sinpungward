import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { MemberLite } from "./types";

interface Props {
  members: MemberLite[];
  currentMemberId: string | null;
  currentCustomName: string | null;
  onPick: (member_id: string | null, custom_name: string | null) => void;
  onClear?: () => void;
  showClear?: boolean;
}

export default function PersonPicker({ members, currentMemberId, currentCustomName, onPick, onClear, showClear }: Props) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(currentCustomName ?? "");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return members.slice(0, 50);
    return members.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 50);
  }, [q, members]);

  return (
    <div className="w-64 space-y-2 p-2">
      <Input placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="max-h-56 overflow-y-auto rounded border">
        {filtered.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">결과 없음</div>}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id, null)}
            className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-muted ${m.id === currentMemberId ? "bg-muted font-semibold" : ""}`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="border-t pt-2">
        <div className="mb-1 text-xs text-muted-foreground">직접 입력 (비회원)</div>
        <div className="flex gap-1">
          <Input
            placeholder="이름"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim()) onPick(null, custom.trim());
            }}
          />
          <Button size="sm" onClick={() => custom.trim() && onPick(null, custom.trim())}>
            적용
          </Button>
        </div>
      </div>
      {showClear && (
        <Button variant="outline" size="sm" className="w-full" onClick={onClear}>
          <Trash2 className="mr-1 h-3 w-3" /> 삭제
        </Button>
      )}
    </div>
  );
}
