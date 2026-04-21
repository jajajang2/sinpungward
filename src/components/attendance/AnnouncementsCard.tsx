import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Megaphone, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  event_date: string | null;
  created_at: string;
}

export const AnnouncementsCard = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", event_date: "" });
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "공지 불러오기 오류", description: error.message, variant: "destructive" });
    } else {
      setItems(data as Announcement[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setAdding(false);
    setDraft({ title: a.title, content: a.content, event_date: a.event_date ?? "" });
  };

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraft({ title: "", content: "", event_date: "" });
  };

  const cancel = () => {
    setEditingId(null);
    setAdding(false);
    setDraft({ title: "", content: "", event_date: "" });
  };

  const save = async () => {
    if (!draft.title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    const payload = {
      title: draft.title.trim(),
      content: draft.content,
      event_date: draft.event_date || null,
    };
    if (editingId) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editingId);
      if (error) return toast({ title: "수정 오류", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) return toast({ title: "저장 오류", description: error.message, variant: "destructive" });
    }
    cancel();
    fetchItems();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("announcements").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "삭제 오류", description: error.message, variant: "destructive" });
    } else {
      fetchItems();
    }
    setDeleteId(null);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">행사 공지사항</h3>
        </div>
        {!adding && !editingId && (
          <Button size="sm" onClick={startAdd} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> 추가
          </Button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="space-y-2 mb-4 p-3 rounded-md border border-border bg-muted/30">
          <Input
            placeholder="제목"
            value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            type="date"
            value={draft.event_date}
            onChange={e => setDraft({ ...draft, event_date: e.target.value })}
          />
          <Textarea
            placeholder="내용"
            value={draft.content}
            onChange={e => setDraft({ ...draft, content: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={cancel}>
              <X className="w-4 h-4 mr-1" /> 취소
            </Button>
            <Button size="sm" onClick={save}>
              <Check className="w-4 h-4 mr-1" /> 저장
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">등록된 공지가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(a => (
            <li
              key={a.id}
              className="p-3 rounded-md border border-border hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    {a.event_date && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        {a.event_date}
                      </span>
                    )}
                  </div>
                  {a.content && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(a)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
