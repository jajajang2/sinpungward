import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Member, OrgPosition } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrgSection {
  section: string;
  positions: (OrgPosition & { memberName?: string })[];
}

const SECTION_COLORS: Record<string, string> = {
  '감독단': 'bg-orange-500',
  '서기': 'bg-gray-500',
  '장로정원회': 'bg-blue-500',
  '상호부조회': 'bg-teal-500',
  '아론신권정원회': 'bg-green-600',
  '청녀회': 'bg-pink-500',
  '초등회': 'bg-amber-500',
  '주일학교': 'bg-cyan-600',
  '와드청년독신성인': 'bg-purple-500',
  '와드선교담당': 'bg-red-500',
  '기타조직': 'bg-slate-500',
};

const OrgChartPage = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<OrgSection[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPos, setEditPos] = useState<OrgPosition | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPos, setNewPos] = useState({ section: '', role: '', calling_keyword: '', sort_order: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [posRes, memRes] = await Promise.all([
      supabase.from('org_positions').select('*').order('section').order('sort_order'),
      supabase.from('members').select('id, name, member_church_info(current_calling)'),
    ]);

    const positions = posRes.data || [];
    const memberData = (memRes.data || []) as (Member & { member_church_info?: { current_calling?: string } })[];
    setMembers(memberData as Member[]);

    // Match members to positions by calling keyword
    const enriched = positions.map(pos => {
      const matched = memberData.find(m => {
        const calling = (m as any).member_church_info?.current_calling || '';
        return pos.calling_keyword && calling.includes(pos.calling_keyword);
      });
      return { ...pos, memberName: matched?.name };
    });

    // Group by section
    const sectionMap: Record<string, (OrgPosition & { memberName?: string })[]> = {};
    enriched.forEach(p => {
      if (!sectionMap[p.section]) sectionMap[p.section] = [];
      sectionMap[p.section].push(p);
    });

    setSections(Object.entries(sectionMap).map(([section, positions]) => ({ section, positions })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveEdit = async () => {
    if (!editPos) return;
    await supabase.from('org_positions').update({
      section: editPos.section,
      role: editPos.role,
      calling_keyword: editPos.calling_keyword,
      sort_order: editPos.sort_order,
    }).eq('id', editPos.id);
    toast({ title: '수정 완료' });
    setEditPos(null);
    fetchData();
  };

  const deletePos = async (id: string) => {
    if (!confirm('이 직책을 삭제하시겠습니까?')) return;
    await supabase.from('org_positions').delete().eq('id', id);
    fetchData();
  };

  const addPos = async () => {
    if (!newPos.section || !newPos.role) {
      toast({ title: '필수 입력', description: '조직명과 직책명을 입력해주세요.', variant: 'destructive' });
      return;
    }
    await supabase.from('org_positions').insert(newPos);
    toast({ title: '추가 완료' });
    setShowAdd(false);
    setNewPos({ section: '', role: '', calling_keyword: '', sort_order: 0 });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground p-8">불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">조직도</h1>
            <p className="text-xs text-muted-foreground mt-0.5">회원의 '현재 부름' 필드와 자동으로 연결됩니다</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1.5" />직책 추가
          </Button>
        </div>
      </div>

      {/* Org chart grid */}
      <div className="flex-1 overflow-auto p-6">
        {/* Bishop section - centered, full width */}
        {sections.filter(s => ['감독단', '서기'].includes(s.section)).map(sec => (
          <div key={sec.section} className="mb-6">
            <OrgSectionCard
              sec={sec}
              colorClass={SECTION_COLORS[sec.section] || 'bg-gray-500'}
              onEdit={setEditPos}
              onDelete={deletePos}
            />
          </div>
        ))}

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sections
            .filter(s => !['감독단', '서기'].includes(s.section))
            .map(sec => (
              <OrgSectionCard
                key={sec.section}
                sec={sec}
                colorClass={SECTION_COLORS[sec.section] || 'bg-slate-500'}
                onEdit={setEditPos}
                onDelete={deletePos}
              />
            ))
          }
        </div>
      </div>

      {/* Edit dialog */}
      {editPos && (
        <Dialog open={!!editPos} onOpenChange={() => setEditPos(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>직책 수정</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">조직명</Label>
                <Input value={editPos.section} onChange={e => setEditPos(p => p ? { ...p, section: e.target.value } : p)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">직책명</Label>
                <Input value={editPos.role} onChange={e => setEditPos(p => p ? { ...p, role: e.target.value } : p)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">현재 부름 키워드 (자동 매칭)</Label>
                <Input value={editPos.calling_keyword || ''} onChange={e => setEditPos(p => p ? { ...p, calling_keyword: e.target.value } : p)} placeholder="ex: 감독단 1보좌" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPos(null)}>취소</Button>
              <Button onClick={saveEdit}><Save className="w-4 h-4 mr-1" />저장</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add dialog */}
      {showAdd && (
        <Dialog open={showAdd} onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>직책 추가</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">조직명</Label>
                <Input value={newPos.section} onChange={e => setNewPos(p => ({ ...p, section: e.target.value }))} placeholder="예: 상호부조회" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">직책명</Label>
                <Input value={newPos.role} onChange={e => setNewPos(p => ({ ...p, role: e.target.value }))} placeholder="예: 회장" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">현재 부름 키워드</Label>
                <Input value={newPos.calling_keyword} onChange={e => setNewPos(p => ({ ...p, calling_keyword: e.target.value }))} placeholder="ex: 상호부조회 회장" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
              <Button onClick={addPos}><Plus className="w-4 h-4 mr-1" />추가</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface OrgSectionCardProps {
  sec: OrgSection;
  colorClass: string;
  onEdit: (pos: OrgPosition) => void;
  onDelete: (id: string) => void;
}

const OrgSectionCard = ({ sec, colorClass, onEdit, onDelete }: OrgSectionCardProps) => (
  <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
    <div className={`${colorClass} text-white px-3 py-2 text-sm font-bold text-center`}>
      {sec.section}
    </div>
    <div className="divide-y divide-border">
      {sec.positions.map(pos => (
        <div key={pos.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 group">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">{pos.role}</span>
            <span className="text-sm font-medium text-foreground ml-2">
              {pos.memberName || <span className="text-muted-foreground/50 text-xs">미배정</span>}
            </span>
          </div>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button onClick={() => onEdit(pos)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(pos.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default OrgChartPage;
