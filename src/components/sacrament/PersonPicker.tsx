import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { type MemberLite, type AssignStatus, calcAge } from "./types";

interface Props {
  members: MemberLite[];
  currentMemberId: string | null;
  currentCustomName: string | null;
  onPick: (member_id: string | null, custom_name: string | null) => void;
  onClear?: () => void;
  showClear?: boolean;
  currentStatus?: AssignStatus | null;
  onStatus?: (s: AssignStatus) => void;
  showStatus?: boolean;
}

export default function PersonPicker({
  members,
  currentMemberId,
  currentCustomName,
  onPick,
  onClear,
  showClear,
  currentStatus,
  onStatus,
  showStatus,
}: Props) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(currentCustomName ?? "");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return members.filter((m) => m.name.toLowerCase().includes(t)).slice(0, 50);
  }, [q, members]);

  const statusBtn = (s: AssignStatus, cls: string) => (
    <Button
      type="button"
      size="sm"
      variant={currentStatus === s ? "default" : "outline"}
      className={`flex-1 h-7 px-1 text-xs ${currentStatus === s ? cls : ""}`}
      onClick={() => onStatus?.(s)}
    >
      {s}
    </Button>
  );

  return (
    <div className="w-64 space-y-2 p-2">
      <Input placeholder="이름 검색" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      {q.trim() && (
        <div className="max-h-56 overflow-y-auto rounded border">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">결과 없음</div>
          ) : (
            filtered.map((m) => {
              const age = calcAge(m.birth_date);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick(m.id, null)}
                  className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-muted ${m.id === currentMemberId ? "bg-muted font-semibold" : ""}`}
                >
                  {m.name}
                  {age !== null && <span className="ml-1 text-xs text-muted-foreground">({age}세)</span>}
                </button>
              );
            })
          )}
        </div>
      )}
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
      {(showStatus || showClear) && (
        <div className="flex gap-1 border-t pt-2">
          {showStatus && onStatus && (
            <>
              {statusBtn("승인", "bg-sky-500 hover:bg-sky-600 text-white")}
              {statusBtn("부탁", "bg-yellow-400 hover:bg-yellow-500 text-black")}
              {statusBtn("거절", "bg-red-500 hover:bg-red-600 text-white")}
            </>
          )}
          {showClear && (
            <Button variant="outline" size="sm" className="flex-1 h-7 px-1 text-xs" onClick={onClear}>
              <Trash2 className="mr-1 h-3 w-3" /> 삭제
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
