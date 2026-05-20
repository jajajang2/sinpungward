import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, FileText, Calendar, Search, X, AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import NotionEditor from "@/components/meeting/NotionEditor";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  category: string;
  content: string;
  attendees: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["전체", "와드평의회", "감독단회의"];

const emptyForm = (): Omit<MeetingMinute, "id" | "created_at" | "updated_at"> => ({
  title: "",
  meeting_date: new Date().toISOString().split("T")[0],
  category: "와드평의회",
  content: "",
  attendees: "",
});

export default function MeetingMinutesPage() {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMinute, setSelectedMinute] = useState<MeetingMinute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<{ form: typeof form; isPrivate: boolean; savedAt: string } | null>(null);
  const [lastDraftAt, setLastDraftAt] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchMinutes();
  }, []);

  // Autosave draft to localStorage
  useEffect(() => {
    if (!draftKey) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftKey, JSON.stringify({ form, isPrivate, savedAt }));
      setLastDraftAt(savedAt);
    }, 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, isPrivate, draftKey]);

  function openDraft(key: string) {
    setDraftKey(key);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setRecoveredDraft(parsed);
      } catch {
        setRecoveredDraft(null);
      }
    } else {
      setRecoveredDraft(null);
    }
    setLastDraftAt(null);
  }

  function clearDraft() {
    if (draftKey) localStorage.removeItem(draftKey);
    setDraftKey(null);
    setRecoveredDraft(null);
    setLastDraftAt(null);
  }


  async function fetchMinutes() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("meeting_minutes")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setMinutes((data as MeetingMinute[]) || []);
    }
    setLoading(false);
  }

  const filtered = minutes.filter((m) => {
    const matchCat = selectedCategory === "전체" || m.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  function handleSelect(minute: MeetingMinute) {
    setSelectedMinute(minute);
    setIsEditing(false);
    setIsCreating(false);
  }

  function handleBack() {
    setSelectedMinute(null);
    setIsEditing(false);
    setIsCreating(false);
  }

  function handleNewClick() {
    setForm(emptyForm());
    setIsPrivate(false);
    setIsCreating(true);
    setIsEditing(false);
    setSelectedMinute(null);
  }

  function handleEditClick() {
    if (!selectedMinute) return;
    setForm({
      title: selectedMinute.title,
      meeting_date: selectedMinute.meeting_date,
      category: selectedMinute.category,
      content: selectedMinute.content,
      attendees: selectedMinute.attendees ?? "",
    });
    setIsPrivate(false);
    setIsEditing(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    if (isCreating) {
      const { data, error } = await db
        .from("meeting_minutes")
        .insert([form])
        .select()
        .single();
      if (error) {
        toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "회의록이 저장되었습니다" });
        setMinutes((prev) => [data as MeetingMinute, ...prev]);
        setSelectedMinute(data as MeetingMinute);
        setIsCreating(false);
      }
    } else if (isEditing && selectedMinute) {
      const { data, error } = await db
        .from("meeting_minutes")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", selectedMinute.id)
        .select()
        .single();
      if (error) {
        toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "회의록이 수정되었습니다" });
        setMinutes((prev) => prev.map((m) => (m.id === (data as MeetingMinute).id ? data as MeetingMinute : m)));
        setSelectedMinute(data as MeetingMinute);
        setIsEditing(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("meeting_minutes").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "회의록이 삭제되었습니다" });
      setMinutes((prev) => prev.filter((m) => m.id !== id));
      setSelectedMinute(null);
    }
    setDeleteConfirmId(null);
  }

  const showDetail = !!selectedMinute && !isEditing;
  const showForm = isEditing || isCreating;
  const showList = !showDetail && !showForm;

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <aside className="w-[200px] shrink-0 flex flex-col border-r bg-muted/30">
        <div className="px-4 py-4 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">카테고리</p>
          <div className="space-y-0.5">
            {CATEGORIES.map((cat) => {
              const count = cat === "전체" ? minutes.length : minutes.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); handleBack(); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span>{cat}</span>
                  <span className={cn("text-xs", selectedCategory === cat ? "opacity-80" : "text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 py-3 mt-auto border-t">
          <Button size="sm" className="w-full" onClick={handleNewClick}>
            <Plus className="w-4 h-4" /> 새 회의록
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {!showForm && (
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-background">
          {(showDetail || showForm) && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="mr-1">
              <ArrowLeft className="w-4 h-4" />
              목록으로
            </Button>
          )}
          <div className="flex-1">
            {showList && (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="제목 또는 내용 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}
            {showDetail && <h2 className="font-semibold text-lg truncate">{selectedMinute?.title}</h2>}
            {showForm && <h2 className="font-semibold text-lg">{isCreating ? "새 회의록 작성" : "회의록 수정"}</h2>}
          </div>
          {showDetail && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleEditClick}>수정</Button>
              {deleteConfirmId === selectedMinute?.id ? (
                <>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedMinute!.id)}>삭제 확인</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)}>취소</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(selectedMinute!.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          {showForm && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleBack}>취소</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            </div>
          )}
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* List */}
          {showList && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">불러오는 중...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">회의록이 없습니다</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={handleNewClick}>
                    <Plus className="w-4 h-4" /> 새 회의록 작성
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m)}
                      className="w-full text-left px-6 py-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{m.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{m.category}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {m.meeting_date}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detail View */}
          {showDetail && selectedMinute && (
            <div className="max-w-3xl mx-auto px-8 py-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{selectedMinute.category}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />{selectedMinute.meeting_date}
                </span>
              </div>
              {selectedMinute.attendees && (
                <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">참석자</p>
                  <p className="text-sm">{selectedMinute.attendees}</p>
                </div>
              )}
              <div
                className="meeting-editor"
                dangerouslySetInnerHTML={{ __html: selectedMinute.content }}
              />
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="flex h-full flex-col bg-background">
              <div className="border-b border-border px-6 py-5 md:px-8">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={handleBack} aria-label="뒤로가기" className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="문서제목을 입력하세요"
                    className="h-auto border-0 bg-transparent px-0 text-3xl font-semibold text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                  <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_220px] md:items-center">
                    <label className="flex h-16 items-center gap-3 rounded-[0.5rem] border border-input bg-card px-4 text-base text-foreground">
                      <Checkbox checked={isPrivate} onCheckedChange={(checked) => setIsPrivate(checked === true)} />
                      <span>비공개</span>
                    </label>

                    <div className="rounded-[0.5rem] border border-input bg-card px-4 py-3">
                      <Label className="mb-1 block text-xs text-muted-foreground">카테고리 검색 및 선택</Label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="h-8 w-full bg-transparent text-base text-foreground focus:outline-none"
                      >
                        {CATEGORIES.filter((c) => c !== "전체").map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-[0.5rem] border border-input bg-card px-4 py-3">
                      <Label className="mb-1 block text-xs text-muted-foreground">회의 날짜</Label>
                      <Input
                        type="date"
                        value={form.meeting_date}
                        onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
                        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="rounded-[0.5rem] border border-input bg-card p-4">
                    <Label className="mb-2 block text-xs text-muted-foreground">참석자</Label>
                    <Input
                      placeholder="참석자 이름을 입력하세요 (쉼표로 구분)"
                      value={form.attendees ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                      className="border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>

                  <RichTextEditor
                    value={form.content}
                    onChange={(val) => setForm((f) => ({ ...f, content: val }))}
                    placeholder="텍스트를 입력하거나 /를 입력하여 명령을 입력하세요."
                    className="min-h-[540px]"
                  />
                </div>
              </div>

              <div className="border-t border-border bg-card/80 px-6 py-4 backdrop-blur md:px-8">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3">
                  <Button size="lg" onClick={handleSave} disabled={saving}>
                    {saving ? "저장 중..." : "저장"}
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleBack}>취소</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
