import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface CalendarEvent {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  onChanged: () => void;
}

const EventDialog = ({ open, onClose, date, onChanged }: Props) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("event_date", date)
      .order("created_at");
    setEvents((data as CalendarEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      load();
      setTitle("");
      setDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("calendar_events").insert({
      event_date: date,
      title: title.trim(),
      description: description.trim() || null,
    });
    if (error) {
      toast({ title: "추가 실패", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setDescription("");
    await load();
    onChanged();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{date} 일정</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-2 p-3 rounded-md border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.description}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-11 w-11 md:h-7 md:w-7 p-0" onClick={() => handleDelete(e.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <p className="text-sm font-medium">새 일정 추가</p>
          <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <Button onClick={handleAdd} className="w-full" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> 추가
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
