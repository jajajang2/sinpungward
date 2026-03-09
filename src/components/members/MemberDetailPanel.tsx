import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Member, MemberFamily, MemberChurchInfo, MemberNote } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Save, Trash2, Plus, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PhotoUpload from "./PhotoUpload";
import { CALLING_GROUPS } from "@/data/callings";

interface MemberDetailPanelProps {
  memberId: string;
  onClose: () => void;
  onUpdated: () => void;
}

// 한국 2촌 관계 목록
const RELATIONSHIP_OPTIONS = [
  { group: "배우자", items: ["배우자 (남편)", "배우자 (아내)"] },
  { group: "자녀", items: ["아들", "딸"] },
  { group: "부모", items: ["아버지", "어머니"] },
  { group: "형제자매", items: ["형", "오빠", "남동생", "언니", "누나", "여동생"] },
  { group: "조부모 / 손자녀", items: ["할아버지", "할머니", "외할아버지", "외할머니", "손자", "손녀", "외손자", "외손녀"] },
  { group: "친가 2촌", items: ["큰아버지", "작은아버지", "고모", "사촌 형", "사촌 오빠", "사촌 남동생", "사촌 언니", "사촌 누나", "사촌 여동생"] },
  { group: "외가 2촌", items: ["외삼촌", "이모", "외사촌 형", "외사촌 오빠", "외사촌 남동생", "외사촌 언니", "외사촌 누나", "외사촌 여동생"] },
  { group: "시가 / 처가", items: ["시아버지", "시어머니", "장인어른", "장모님", "시누이", "시동생 (형제)", "처남", "처제", "형수", "제수", "올케"] },
];

const MemberDetailPanel = ({ memberId, onClose, onUpdated }: MemberDetailPanelProps) => {
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [family, setFamily] = useState<MemberFamily[]>([]);
  const [churchInfo, setChurchInfo] = useState<MemberChurchInfo | null>(null);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({ note_date: new Date().toISOString().split('T')[0], content: '', author: '' });
  // Member list for family name combobox
  const [memberList, setMemberList] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    const [mRes, fRes, cRes, nRes, allMRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('member_family').select('*').eq('member_id', memberId).order('sort_order'),
      supabase.from('member_church_info').select('*').eq('member_id', memberId).maybeSingle(),
      supabase.from('member_notes').select('*').eq('member_id', memberId).order('note_date', { ascending: false }),
      supabase.from('members').select('id, name').order('name'),
    ]);
    if (mRes.data) setMember(mRes.data);
    setFamily(fRes.data || []);
    setChurchInfo(cRes.data || null);
    setNotes(nRes.data || []);
    setMemberList(allMRes.data || []);
  };

  useEffect(() => { fetchData(); }, [memberId]);

  const saveMember = async () => {
    if (!member) return;
    setSaving(true);
    await supabase.from('members').update({
      name: member.name,
      gender: member.gender,
      birth_date: member.birth_date || null,
      phone: member.phone,
      email: member.email,
      address: member.address,
      occupation: member.occupation,
      is_special_care: member.is_special_care ?? false,
      marital_status: member.marital_status || null,
    }).eq('id', memberId);

    await supabase.from('member_family').delete().eq('member_id', memberId);
    if (family.filter(f => f.name).length > 0) {
      await supabase.from('member_family').insert(
        family.filter(f => f.name).map((f, i) => ({ member_id: memberId, name: f.name, relationship: f.relationship, phone: f.phone, sort_order: i }))
      );
    }

    if (churchInfo) {
      const toNull = (v: string | null | undefined) => (v === '' || v == null) ? null : v;
      const payload = {
        member_id: memberId,
        record_number: toNull(churchInfo.record_number),
        baptism_date: toNull(churchInfo.baptism_date),
        priesthood: toNull(churchInfo.priesthood),
        current_calling: toNull(churchInfo.current_calling),
        previous_callings: toNull(churchInfo.previous_callings),
        ministry_target: toNull(churchInfo.ministry_target),
        temple_recommend: churchInfo.temple_recommend ?? false,
        sunday_school_class: toNull(churchInfo.sunday_school_class),
        missionary_work: toNull(churchInfo.missionary_work),
      };
      const existing = await supabase.from('member_church_info').select('id').eq('member_id', memberId).maybeSingle();
      if (existing.data) {
        await supabase.from('member_church_info').update(payload).eq('member_id', memberId);
      } else {
        await supabase.from('member_church_info').insert(payload);
      }
    }

    setSaving(false);
    toast({ title: '저장 완료' });
    onUpdated();
  };

  const deleteMember = async () => {
    if (!confirm(`${member?.name} 회원을 삭제하시겠습니까?`)) return;
    await supabase.from('members').delete().eq('id', memberId);
    toast({ title: '삭제 완료' });
    onClose();
    onUpdated();
  };

  const addNote = async () => {
    if (!newNote.content.trim()) return;
    await supabase.from('member_notes').insert({ ...newNote, member_id: memberId });
    setNewNote({ note_date: new Date().toISOString().split('T')[0], content: '', author: '' });
    fetchData();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('member_notes').delete().eq('id', id);
    fetchData();
  };

  if (!member) return <div className="flex items-center justify-center h-full text-muted-foreground">불러오는 중...</div>;

  const age = member.birth_date
    ? (() => {
        const today = new Date();
        const b = new Date(member.birth_date!);
        let a = today.getFullYear() - b.getFullYear();
        if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--;
        return a;
      })()
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border bg-[hsl(var(--table-header))]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <PhotoUpload
              memberId={memberId}
              currentPhotoUrl={member.photo_url}
              memberName={member.name}
              gender={member.gender}
              onPhotoUpdated={(url) => {
                setMember(m => m ? { ...m, photo_url: url ?? undefined } : m);
                onUpdated();
              }}
            />
            <div>
              <h2 className="font-bold text-foreground text-lg">{member.name}</h2>
              <p className="text-xs text-muted-foreground">
                {member.gender && `${member.gender}성`}
                {age != null && ` · ${age}세`}
                {churchInfo?.current_calling && ` · ${churchInfo.current_calling}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteMember}><Trash2 className="w-4 h-4" /></Button>
            <Button size="sm" onClick={saveMember} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? '저장 중' : '저장'}</Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-5 mt-3 grid grid-cols-4 w-auto">
          <TabsTrigger value="basic" className="text-xs">기본정보</TabsTrigger>
          <TabsTrigger value="family" className="text-xs">가족정보</TabsTrigger>
          <TabsTrigger value="church" className="text-xs">교회정보</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">구체적 정보</TabsTrigger>
        </TabsList>

        {/* ── 기본정보 ── */}
        <TabsContent value="basic" className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">이름</Label>
              <Input value={member.name} onChange={e => setMember(m => m ? { ...m, name: e.target.value } : m)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">성별</Label>
              <Select value={member.gender || ''} onValueChange={v => setMember(m => m ? { ...m, gender: v as '남' | '여' } : m)}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent><SelectItem value="남">남</SelectItem><SelectItem value="여">여</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">생년월일</Label>
              <Input type="date" value={member.birth_date || ''} onChange={e => setMember(m => m ? { ...m, birth_date: e.target.value } : m)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">혼인 여부</Label>
              <Select value={member.marital_status || ''} onValueChange={v => setMember(m => m ? { ...m, marital_status: v as '기혼' | '미혼' | '이혼' | '사별' } : m)}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="미혼">미혼</SelectItem>
                  <SelectItem value="기혼">기혼</SelectItem>
                  <SelectItem value="이혼">이혼</SelectItem>
                  <SelectItem value="사별">사별</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">휴대폰</Label>
              <Input value={member.phone || ''} onChange={e => setMember(m => m ? { ...m, phone: e.target.value } : m)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">직업</Label>
              <Input value={member.occupation || ''} onChange={e => setMember(m => m ? { ...m, occupation: e.target.value } : m)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">이메일</Label>
              <Input type="email" value={member.email || ''} onChange={e => setMember(m => m ? { ...m, email: e.target.value } : m)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">주소</Label>
              <Input value={member.address || ''} onChange={e => setMember(m => m ? { ...m, address: e.target.value } : m)} />
            </div>
          </div>

          {/* 특별관리회원 */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--table-header))] border border-border">
              <input
                type="checkbox"
                id="special-care"
                checked={member.is_special_care ?? false}
                onChange={e => setMember(m => m ? { ...m, is_special_care: e.target.checked } : m)}
                className="w-4 h-4 accent-primary"
              />
              <div>
                <Label htmlFor="special-care" className="text-sm font-semibold cursor-pointer text-foreground">특별관리회원</Label>
                <p className="text-xs text-muted-foreground">체크 시 조직도 특별관리회원 섹션에 표시됩니다</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 가족정보 ── */}
        <TabsContent value="family" className="flex-1 overflow-y-auto px-5 pb-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">가족 구성원을 추가하세요</p>
            <Button
              size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setFamily(f => [...f, { id: '', member_id: memberId, name: '', relationship: '', phone: '', sort_order: f.length }])}
            >
              <Plus className="w-3 h-3 mr-1" />추가
            </Button>
          </div>

          {family.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <p className="text-sm">가족 정보가 없습니다</p>
              <p className="text-xs">위 추가 버튼을 눌러 가족을 등록하세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {family.map((fam, i) => (
                <div key={i} className="p-3 bg-muted/60 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">가족 {i + 1}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setFamily(f => f.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 이름: 회원 선택 or 수기 */}
                  <div className="space-y-1">
                    <Label className="text-xs">이름</Label>
                    <FamilyNameCombobox
                      value={fam.name || ''}
                      memberList={memberList}
                      onChange={v => setFamily(f => f.map((x, j) => j === i ? { ...x, name: v } : x))}
                    />
                  </div>

                  {/* 관계 */}
                  <div className="space-y-1">
                    <Label className="text-xs">관계</Label>
                    <RelationshipSelect
                      value={fam.relationship || ''}
                      onChange={v => setFamily(f => f.map((x, j) => j === i ? { ...x, relationship: v } : x))}
                    />
                  </div>

                  {/* 핸드폰 */}
                  <div className="space-y-1">
                    <Label className="text-xs">핸드폰 번호</Label>
                    <Input
                      placeholder="010-0000-0000"
                      value={fam.phone || ''}
                      onChange={e => setFamily(f => f.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── 교회정보 ── */}
        <TabsContent value="church" className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 mt-4">
          {(() => {
            const ci = churchInfo || { id: '', member_id: memberId, record_number: '', baptism_date: '', priesthood: '', current_calling: '', previous_callings: '', ministry_target: '', temple_recommend: false, sunday_school_class: '', missionary_work: '' };
            const update = (field: string, value: string | boolean) => setChurchInfo(c => ({ ...(c || ci), [field]: value }));
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">회원기록번호</Label>
                  <Input value={ci.record_number || ''} onChange={e => update('record_number', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">침례날짜</Label>
                  <Input type="date" value={ci.baptism_date || ''} onChange={e => update('baptism_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">신권직분</Label>
                  <Input value={ci.priesthood || ''} onChange={e => update('priesthood', e.target.value)} placeholder="대제사, 장로, 등" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">현재 부름</Label>
                  <CallingCombobox value={ci.current_calling || ''} onChange={v => update('current_calling', v)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">이전 부름 이력</Label>
                  <Textarea value={ci.previous_callings || ''} onChange={e => update('previous_callings', e.target.value)} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">성역대상자</Label>
                  <Input value={ci.ministry_target || ''} onChange={e => update('ministry_target', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">주일학교 반</Label>
                  <Input value={ci.sunday_school_class || ''} onChange={e => update('sunday_school_class', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">선교사업</Label>
                  <Input value={ci.missionary_work || ''} onChange={e => update('missionary_work', e.target.value)} />
                </div>
                <div className="space-y-1 flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="temple"
                    checked={ci.temple_recommend || false}
                    onChange={e => update('temple_recommend', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <Label htmlFor="temple" className="text-xs cursor-pointer">성전추천서 보유</Label>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* ── 구체적 정보 ── */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-4">
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-xs font-semibold text-foreground">새 기록 추가</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">날짜</Label>
                <Input type="date" value={newNote.note_date} onChange={e => setNewNote(n => ({ ...n, note_date: e.target.value }))} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">작성자</Label>
                <Input value={newNote.author} onChange={e => setNewNote(n => ({ ...n, author: e.target.value }))} placeholder="이름" className="h-7 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">내용</Label>
              <Textarea value={newNote.content} onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))} rows={2} placeholder="기재할 내용을 입력하세요" className="text-xs" />
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={addNote}>기록 추가</Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[hsl(var(--table-header))]">
                  <th className="px-3 py-2 text-left font-semibold w-24">날짜</th>
                  <th className="px-3 py-2 text-left font-semibold">필요한 기재 내용</th>
                  <th className="px-3 py-2 text-left font-semibold w-20">작성자</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">기록이 없습니다</td></tr>
                ) : notes.map(note => (
                  <tr key={note.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2 text-muted-foreground">{note.note_date}</td>
                    <td className="px-3 py-2">{note.content}</td>
                    <td className="px-3 py-2 text-muted-foreground">{note.author}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => deleteNote(note.id)} className="text-destructive hover:text-destructive/70">
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Family Name Combobox (회원리스트 선택 or 수기입력) ─────────────
const FamilyNameCombobox = ({
  value,
  memberList,
  onChange,
}: {
  value: string;
  memberList: { id: string; name: string }[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // sync when external value changes
  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = memberList.filter(m =>
    inputValue ? m.name.toLowerCase().includes(inputValue.toLowerCase()) : true
  ).slice(0, 20);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="이름 입력 또는 회원 선택..."
            className="h-8 text-xs pr-7"
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList className="max-h-52">
            {filtered.length === 0 ? (
              <CommandEmpty>
                <button
                  className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-accent"
                  onClick={() => { onChange(inputValue); setOpen(false); }}
                >
                  "{inputValue}" 직접 입력
                </button>
              </CommandEmpty>
            ) : (
              <CommandGroup heading="회원 목록">
                {filtered.map(m => (
                  <CommandItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      setInputValue(m.name);
                      onChange(m.name);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3 shrink-0", value === m.name ? "opacity-100" : "opacity-0")} />
                    {m.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ── Relationship Select (한국 2촌 가족관계) ────────────────────────
const RelationshipSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 font-normal text-xs"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "관계 선택..."}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="관계 검색..." className="text-xs" />
          <CommandList className="max-h-56">
            <CommandEmpty>검색 결과 없음</CommandEmpty>
            {RELATIONSHIP_OPTIONS.map(({ group, items }) => (
              <CommandGroup key={group} heading={group}>
                {items.map(rel => (
                  <CommandItem
                    key={rel}
                    value={rel}
                    onSelect={() => { onChange(rel === value ? '' : rel); setOpen(false); }}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3 shrink-0", value === rel ? "opacity-100" : "opacity-0")} />
                    {rel}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ── Calling Combobox ──────────────────────────────────────────
const CallingCombobox = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal text-sm"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "부름 선택 또는 검색..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="부름 검색..." />
          <CommandList className="max-h-64">
            <CommandEmpty>검색 결과 없음</CommandEmpty>
            {CALLING_GROUPS.map(({ group, items }) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item}
                    value={item}
                    onSelect={() => {
                      onChange(item === value ? '' : item);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3 shrink-0", value === item ? "opacity-100" : "opacity-0")} />
                    {item}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MemberDetailPanel;
