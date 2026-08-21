import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, UserRound } from "lucide-react";

type MissionaryType = "elder" | "sister";

interface MissionaryRow {
  id: string;
  type: MissionaryType;
  name: string;
  phone: string | null;
  sort_order: number;
}

interface MissionaryDialogProps {
  open: boolean;
  onClose: () => void;
}

const MissionaryDialog = ({ open, onClose }: MissionaryDialogProps) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<MissionaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("full_time_missionaries")
      .select("id, type, name, phone, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "오류", description: "선교사 목록을 불러오지 못했습니다.", variant: "destructive" });
    } else {
      setRows((data ?? []) as MissionaryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const byType = (type: MissionaryType) => rows.filter((r) => r.type === type);

  const handleAdd = async (type: MissionaryType) => {
    const maxOrder = byType(type).reduce((max, r) => Math.max(max, r.sort_order), 0);
    const { data, error } = await supabase
      .from("full_time_missionaries")
      .insert({ type, name: "", phone: "", sort_order: maxOrder + 1 })
      .select("id, type, name, phone, sort_order")
      .single();
    if (error || !data) {
      toast({ title: "오류", description: "선교사를 추가하지 못했습니다.", variant: "destructive" });
      return;
    }
    setRows((prev) => [...prev, data as MissionaryRow]);
  };

  const handleRemove = async (id: string) => {
    const prevRows = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("full_time_missionaries").delete().eq("id", id);
    if (error) {
      setRows(prevRows);
      toast({ title: "오류", description: "삭제하지 못했습니다.", variant: "destructive" });
    }
  };

  const handleNameChange = (id: string, name: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, name } : x)));
  };

  const handleNameCommit = async (id: string, name: string) => {
    const { error } = await supabase.from("full_time_missionaries").update({ name }).eq("id", id);
    if (error) {
      toast({ title: "오류", description: "이름을 저장하지 못했습니다.", variant: "destructive" });
    }
  };

  const handlePhoneChange = (id: string, phone: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, phone } : x)));
  };

  const handlePhoneCommit = async (id: string, phone: string) => {
    const { error } = await supabase.from("full_time_missionaries").update({ phone }).eq("id", id);
    if (error) {
      toast({ title: "오류", description: "전화번호를 저장하지 못했습니다.", variant: "destructive" });
    }
  };

  const renderColumn = (type: MissionaryType, label: string) => {
    const list = byType(type);
    return (
      <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-muted/20">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserRound className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{label}</span>
            <span className="text-xs text-muted-foreground shrink-0">{list.length}명</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleAdd(type)}>
            <Plus className="w-3.5 h-3.5 mr-1" />추가
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[50vh]">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">등록된 선교사가 없습니다.</p>
          ) : (
            list.map((row, i) => (
              <div key={row.id} className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                  {label} {i + 1}
                </span>
                <Input
                  value={row.name}
                  placeholder="이름"
                  onChange={(e) => handleNameChange(row.id, e.target.value)}
                  onBlur={(e) => handleNameCommit(row.id, e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  value={row.phone ?? ""}
                  placeholder="전화번호"
                  onChange={(e) => handlePhoneChange(row.id, e.target.value)}
                  onBlur={(e) => handlePhoneCommit(row.id, e.target.value)}
                  className="h-8 text-sm w-28 shrink-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(row.id)}
                  aria-label="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>선교사 관리</DialogTitle>
          <DialogDescription>
            상주 중인 장로선교사·자매선교사를 관리합니다. 인원이 바뀌면 추가·삭제하고, 이름은 자유롭게 수정하세요.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {renderColumn("elder", "장로선교사")}
            {renderColumn("sister", "자매선교사")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MissionaryDialog;
