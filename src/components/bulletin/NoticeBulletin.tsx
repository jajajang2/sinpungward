import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Printer, Download } from "lucide-react";
import DatePickerPopover from "./DatePickerPopover";
import SacramentOrderBlock from "./SacramentOrderBlock";
import AnnouncementList, { type AnnouncementItem } from "./AnnouncementList";
import { exportNodeAsPdf, exportNodeAsPng } from "@/lib/exportCapture";
import type { MemberLite } from "@/components/sacrament/types";

interface NoticeFields {
  image_url: string | null;
  scripture_text: string;
  address_text: string;
  arrival_note_text: string;
}

interface MissionaryRow {
  id: string;
  type: "elder" | "sister";
  name: string;
  phone: string | null;
  sort_order: number;
}

const DEFAULT_ARRIVAL_NOTE = "경건한 모임을 위해 모임 10분 전 도착";
const emptyFields = (): NoticeFields => ({
  image_url: null,
  scripture_text: "",
  address_text: "",
  arrival_note_text: DEFAULT_ARRIVAL_NOTE,
});

interface Props {
  meetingDate: string;
  onDateChange: (d: string) => void;
  members: MemberLite[];
}

export default function NoticeBulletin({ meetingDate, onDateChange, members }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [fields, setFields] = useState<NoticeFields>(emptyFields());
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [missionaries, setMissionaries] = useState<MissionaryRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("full_time_missionaries").select("id, type, name, phone, sort_order").order("type").order("sort_order");
      setMissionaries((data as MissionaryRow[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("bulletin_notices")
        .select("*")
        .eq("meeting_date", meetingDate)
        .maybeSingle();
      if (cancelled) return;

      if (existing) {
        setNoticeId(existing.id);
        setFields({
          image_url: existing.image_url,
          scripture_text: existing.scripture_text,
          address_text: existing.address_text,
          arrival_note_text: existing.arrival_note_text,
        });
        const { data: ann } = await supabase
          .from("bulletin_notice_announcements")
          .select("id, content, sort_order")
          .eq("notice_id", existing.id)
          .order("sort_order");
        if (!cancelled) setAnnouncements((ann as AnnouncementItem[]) ?? []);
      } else {
        const { data: prev } = await supabase
          .from("bulletin_notices")
          .select("*")
          .lt("meeting_date", meetingDate)
          .order("meeting_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        setNoticeId(null);
        setFields(
          prev
            ? {
                image_url: prev.image_url,
                scripture_text: prev.scripture_text,
                address_text: prev.address_text,
                arrival_note_text: prev.arrival_note_text,
              }
            : emptyFields()
        );
        setAnnouncements([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingDate]);

  const saveField = async (patch: Partial<NoticeFields>) => {
    const merged = { ...fields, ...patch };
    setFields(merged);
    if (noticeId) {
      await supabase.from("bulletin_notices").update(patch).eq("id", noticeId);
    } else {
      const { data, error } = await supabase
        .from("bulletin_notices")
        .insert({ meeting_date: meetingDate, ...merged })
        .select("id")
        .single();
      if (!error && data) setNoticeId(data.id);
    }
  };

  const ensureNoticeId = async (): Promise<string> => {
    if (noticeId) return noticeId;
    const { data, error } = await supabase
      .from("bulletin_notices")
      .insert({ meeting_date: meetingDate, ...fields })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("공지 항목 생성 실패");
    setNoticeId(data.id);
    return data.id;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "이미지 파일만 업로드 가능합니다.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "파일 크기는 5MB 이하여야 합니다.", variant: "destructive" });
      return;
    }
    setUploading(true);
    if (fields.image_url) {
      const oldPath = fields.image_url.split("/bulletin-photos/")[1];
      if (oldPath) await supabase.storage.from("bulletin-photos").remove([oldPath]);
    }
    const ext = file.name.split(".").pop();
    const filePath = `${meetingDate}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("bulletin-photos").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "업로드 실패", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("bulletin-photos").getPublicUrl(filePath);
    await saveField({ image_url: publicUrl });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addAnnouncement = async () => {
    const nid = await ensureNoticeId();
    const maxOrder = announcements.reduce((mx, a) => Math.max(mx, a.sort_order ?? 0), 0);
    const { data, error } = await supabase
      .from("bulletin_notice_announcements")
      .insert({ notice_id: nid, content: "", sort_order: maxOrder + 1 })
      .select("id, content, sort_order")
      .single();
    if (!error && data) setAnnouncements((prev) => [...prev, data as AnnouncementItem]);
  };
  const changeAnnouncement = (id: string, content: string) =>
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));
  const commitAnnouncement = async (id: string, content: string) => {
    await supabase.from("bulletin_notice_announcements").update({ content }).eq("id", id);
  };
  const removeAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("bulletin_notice_announcements").delete().eq("id", id);
  };

  const elders = missionaries.filter((m) => m.type === "elder");
  const sisters = missionaries.filter((m) => m.type === "sister");

  const filenameBase = `주보_공지용_${meetingDate}`;
  const doExportPdf = async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      await exportNodeAsPdf(captureRef.current, `${filenameBase}.pdf`, "landscape", "a3");
    } catch (e) {
      toast({ title: "PDF 생성 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };
  const doExportPng = async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      await exportNodeAsPng(captureRef.current, `${filenameBase}.png`);
    } catch (e) {
      toast({ title: "PNG 생성 실패", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={doExportPng} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PNG 내보내기
        </Button>
        <Button size="sm" onClick={doExportPdf} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} PDF 내보내기
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div
          ref={captureRef}
          className="min-w-[1100px] rounded-xl border border-border bg-card p-6 grid grid-cols-[0.9fr_1.2fr_0.9fr] gap-6"
        >
          {/* 좌: 날짜/신풍와드/사진/경전구절/주소 */}
          <div className="space-y-3">
            <DatePickerPopover value={meetingDate} onChange={onDateChange} className="text-lg font-bold" />
            <div className="text-2xl font-extrabold tracking-tight">신풍와드</div>

            <div
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {fields.image_url ? (
                <img src={fields.image_url} alt="와드 사진" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">사진 업로드</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            <Textarea
              value={fields.scripture_text}
              onChange={(e) => setFields((f) => ({ ...f, scripture_text: e.target.value }))}
              onBlur={(e) => saveField({ scripture_text: e.target.value })}
              placeholder="경전 구절"
              rows={3}
              className="text-xs resize-none"
            />
            <Textarea
              value={fields.address_text}
              onChange={(e) => setFields((f) => ({ ...f, address_text: e.target.value }))}
              onBlur={(e) => saveField({ address_text: e.target.value })}
              placeholder="주소"
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* 중: 성찬식 순서 */}
          <div>
            <div className="text-center font-bold mb-3">♣ 성찬식 순서 ♣</div>
            <SacramentOrderBlock meetingDate={meetingDate} members={members} />
          </div>

          {/* 우: 광고/도착안내/선교사 */}
          <div className="space-y-4">
            <div>
              <div className="font-bold mb-1.5">☞ 광고</div>
              <AnnouncementList
                items={announcements}
                onAdd={addAnnouncement}
                onChangeContent={changeAnnouncement}
                onCommitContent={commitAnnouncement}
                onRemove={removeAnnouncement}
              />
            </div>

            <Textarea
              value={fields.arrival_note_text}
              onChange={(e) => setFields((f) => ({ ...f, arrival_note_text: e.target.value }))}
              onBlur={(e) => saveField({ arrival_note_text: e.target.value })}
              rows={2}
              className="text-xs text-center resize-none"
            />

            <div>
              <div className="text-center font-bold mb-1.5">♥ 신풍와드 선교사 ♥</div>
              <div className="space-y-1 text-center text-xs">
                {[...elders, ...sisters].map((m) => (
                  <div key={m.id}>
                    <span className="font-medium">{m.name}</span>
                    {m.phone && <span className="text-muted-foreground"> {m.phone}</span>}
                  </div>
                ))}
                {missionaries.length === 0 && <p className="text-muted-foreground">등록된 선교사가 없습니다</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
