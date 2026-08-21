import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download } from "lucide-react";
import DatePickerPopover from "./DatePickerPopover";
import SacramentOrderBlock from "./SacramentOrderBlock";
import AnnouncementList, { type AnnouncementItem } from "./AnnouncementList";
import WardBusinessList, { type WardBusinessItem } from "./WardBusinessList";
import { exportNodeAsPdf, exportNodeAsPng } from "@/lib/exportCapture";
import type { MemberLite } from "@/components/sacrament/types";

type Category = "해임" | "부름" | "기타";
const CATEGORIES: Category[] = ["해임", "부름", "기타"];

interface WardBusinessRow extends WardBusinessItem {
  category: Category;
  sort_order: number;
}

interface Props {
  meetingDate: string;
  onDateChange: (d: string) => void;
  members: MemberLite[];
}

export default function BishopricBulletin({ meetingDate, onDateChange, members }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bishopricId, setBishopricId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [wardBusiness, setWardBusiness] = useState<WardBusinessRow[]>([]);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("bulletin_bishopric")
        .select("*")
        .eq("meeting_date", meetingDate)
        .maybeSingle();
      if (cancelled) return;

      if (existing) {
        setBishopricId(existing.id);
        const [{ data: ann }, { data: wb }] = await Promise.all([
          supabase.from("bulletin_bishopric_announcements").select("id, content, sort_order").eq("bishopric_id", existing.id).order("sort_order"),
          supabase.from("bulletin_ward_business").select("*").eq("bishopric_id", existing.id).order("sort_order"),
        ]);
        if (cancelled) return;
        setAnnouncements((ann as AnnouncementItem[]) ?? []);
        setWardBusiness((wb as WardBusinessRow[]) ?? []);
      } else {
        setBishopricId(null);
        setAnnouncements([]);
        setWardBusiness([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingDate]);

  const ensureBishopricId = async (): Promise<string> => {
    if (bishopricId) return bishopricId;
    const { data, error } = await supabase.from("bulletin_bishopric").insert({ meeting_date: meetingDate }).select("id").single();
    if (error || !data) throw error ?? new Error("감독단용 항목 생성 실패");
    setBishopricId(data.id);
    return data.id;
  };

  // 광고
  const addAnnouncement = async () => {
    const bid = await ensureBishopricId();
    const maxOrder = announcements.reduce((mx, a) => Math.max(mx, a.sort_order ?? 0), 0);
    const { data, error } = await supabase
      .from("bulletin_bishopric_announcements")
      .insert({ bishopric_id: bid, content: "", sort_order: maxOrder + 1 })
      .select("id, content, sort_order")
      .single();
    if (!error && data) setAnnouncements((prev) => [...prev, data as AnnouncementItem]);
  };
  const changeAnnouncement = (id: string, content: string) =>
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));
  const commitAnnouncement = async (id: string, content: string) => {
    await supabase.from("bulletin_bishopric_announcements").update({ content }).eq("id", id);
  };
  const removeAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("bulletin_bishopric_announcements").delete().eq("id", id);
  };

  // 와드행사
  const wardBusinessOf = (cat: Category) => wardBusiness.filter((w) => w.category === cat);

  const addWardBusiness = async (cat: Category) => {
    const bid = await ensureBishopricId();
    const maxOrder = wardBusinessOf(cat).reduce((mx, w) => Math.max(mx, w.sort_order), 0);
    const { data, error } = await supabase
      .from("bulletin_ward_business")
      .insert({ bishopric_id: bid, category: cat, member_id: null, custom_name: null, note: "", sort_order: maxOrder + 1 })
      .select("*")
      .single();
    if (!error && data) setWardBusiness((prev) => [...prev, data as WardBusinessRow]);
  };
  const pickWardBusiness = async (id: string, memberId: string | null, customName: string | null) => {
    setWardBusiness((prev) => prev.map((w) => (w.id === id ? { ...w, member_id: memberId, custom_name: customName } : w)));
    await supabase.from("bulletin_ward_business").update({ member_id: memberId, custom_name: customName }).eq("id", id);
  };
  const changeWardBusinessNote = (id: string, note: string) =>
    setWardBusiness((prev) => prev.map((w) => (w.id === id ? { ...w, note } : w)));
  const commitWardBusinessNote = async (id: string, note: string) => {
    await supabase.from("bulletin_ward_business").update({ note }).eq("id", id);
  };
  const removeWardBusiness = async (id: string) => {
    setWardBusiness((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("bulletin_ward_business").delete().eq("id", id);
  };

  const filenameBase = `주보_감독단용_${meetingDate}`;
  const doExportPdf = async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      await exportNodeAsPdf(captureRef.current, `${filenameBase}.pdf`, "portrait", "a4");
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
        <div ref={captureRef} className="w-[720px] mx-auto rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">신풍와드 성찬식</div>
            <DatePickerPopover value={meetingDate} onChange={onDateChange} className="text-sm font-semibold" />
          </div>

          <div>
            <div className="font-bold mb-1.5">광고</div>
            <AnnouncementList
              items={announcements}
              onAdd={addAnnouncement}
              onChangeContent={changeAnnouncement}
              onCommitContent={commitAnnouncement}
              onRemove={removeAnnouncement}
            />
          </div>

          <SacramentOrderBlock meetingDate={meetingDate} members={members} />

          <div>
            <div className="font-bold mb-1.5">와드행사</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <WardBusinessList
                  key={cat}
                  label={cat}
                  items={wardBusinessOf(cat)}
                  members={members}
                  onAdd={() => addWardBusiness(cat)}
                  onPick={pickWardBusiness}
                  onNoteChange={changeWardBusinessNote}
                  onNoteCommit={commitWardBusinessNote}
                  onRemove={removeWardBusiness}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
