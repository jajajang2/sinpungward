import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Member, MemberFamily, MemberChurchInfo, MemberNote } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberDetailPanelProps {
  memberId: string;
  onClose: () => void;
  onUpdated: () => void;
}

const MemberDetailPanel = ({ memberId, onClose, onUpdated }: MemberDetailPanelProps) => {
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [family, setFamily] = useState<MemberFamily[]>([]);
  const [churchInfo, setChurchInfo] = useState<MemberChurchInfo | null>(null);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({ note_date: new Date().toISOString().split('T')[0], content: '', author: '' });

  const fetchData = async () => {
    const [mRes, fRes, cRes, nRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('member_family').select('*').eq('member_id', memberId).order('sort_order'),
      supabase.from('member_church_info').select('*').eq('member_id', memberId).maybeSingle(),
      supabase.from('member_notes').select('*').eq('member_id', memberId).order('note_date', { ascending: false }),
    ]);
    if (mRes.data) setMember(mRes.data);
    setFamily(fRes.data || []);
    setChurchInfo(cRes.data || null);
    setNotes(nRes.data || []);
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
    }).eq('id', memberId);

    // Save family
    await supabase.from('member_family').delete().eq('member_id', memberId);
    if (family.filter(f => f.name).length > 0) {
      await supabase.from('member_family').insert(
        family.filter(f => f.name).map((f, i) => ({ member_id: memberId, name: f.name, relationship: f.relationship, phone: f.phone, sort_order: i }))
      );
    }

    // Save church info
    if (churchInfo) {
      const existing = await supabase.from('member_church_info').select('id').eq('member_id', memberId).maybeSingle();
      if (existing.data) {
        await supabase.from('member_church_info').update({ ...churchInfo }).eq('member_id', memberId);
      } else {
        await supabase.from('member_church_info').insert({ ...churchInfo, member_id: memberId });
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
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border bg-[hsl(var(--table-header))] flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground text-lg">{member.name}</h2>
          <p className="text-xs text-muted-foreground">
            {member.gender && `${member.gender}성`}
            {age && ` · ${age}세`}
            {churchInfo?.current_calling && ` · ${churchInfo.current_calling}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteMember}><Trash2 className="w-4 h-4" /></Button>
          <Button size="sm" onClick={saveMember} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? '저장 중' : '저장'}</Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-5 mt-3 grid grid-cols-3 w-auto">
          <TabsTrigger value="basic">기본정보</TabsTrigger>
          <TabsTrigger value="church">교회정보</TabsTrigger>
          <TabsTrigger value="notes">구체적 정보</TabsTrigger>
        </TabsList>

        {/* Basic Info */}
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

          {/* Family */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">가족 정보</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setFamily(f => [...f, { id: '', member_id: memberId, name: '', relationship: '', phone: '', sort_order: f.length }])}>
                <Plus className="w-3 h-3 mr-1" />추가
              </Button>
            </div>
            <div className="space-y-2">
              {family.map((fam, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-center p-2 bg-muted rounded-lg">
                  <Input
                    placeholder="이름"
                    value={fam.name || ''}
                    onChange={e => setFamily(f => f.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="관계 (처, 자)"
                    value={fam.relationship || ''}
                    onChange={e => setFamily(f => f.map((x, j) => j === i ? { ...x, relationship: e.target.value } : x))}
                    className="h-7 text-xs"
                  />
                  <div className="flex gap-1">
                    <Input
                      placeholder="휴대폰"
                      value={fam.phone || ''}
                      onChange={e => setFamily(f => f.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                      className="h-7 text-xs"
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0 text-destructive" onClick={() => setFamily(f => f.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Church Info */}
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
                  <Input value={ci.current_calling || ''} onChange={e => update('current_calling', e.target.value)} placeholder="감독단 1보좌, 등" />
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

        {/* Notes (구체적 정보) */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-4">
          {/* Add note */}
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

          {/* Notes list */}
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

export default MemberDetailPanel;
