import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Member } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search, X } from "lucide-react";
import MemberCard from "@/components/members/MemberCard";
import AddMemberDialog from "@/components/members/AddMemberDialog";
import MemberDetailPanel from "@/components/members/MemberDetailPanel";
import ExcelImportDialog from "@/components/members/ExcelImportDialog";
import { useToast } from "@/hooks/use-toast";

// Korean alphabetical grouping
const KOREAN_INITIALS = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function getKoreanInitial(name: string): string {
  if (!name) return '#';
  const code = name.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) {
    // English or other
    return name[0].toUpperCase();
  }
  const offset = code - 0xAC00;
  const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const initialIndex = Math.floor(offset / (21 * 28));
  const initial = initials[initialIndex];
  // Normalize doubled initials
  const normalMap: Record<string, string> = { 'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ' };
  return normalMap[initial] || initial;
}

function isEnglish(name: string): boolean {
  return /^[A-Za-z]/.test(name);
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeInitial, setActiveInitial] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');
    if (error) {
      toast({ title: '오류', description: '회원 목록을 불러오지 못했습니다.', variant: 'destructive' });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || '').includes(search)
  );

  // Group: English first, then Korean by initial
  const englishMembers = filtered.filter(m => isEnglish(m.name));
  const koreanMembers = filtered.filter(m => !isEnglish(m.name));

  const groups: { label: string; members: Member[] }[] = [];
  if (englishMembers.length > 0) {
    groups.push({ label: '영문', members: englishMembers });
  }
  for (const initial of KOREAN_INITIALS) {
    const group = koreanMembers.filter(m => getKoreanInitial(m.name) === initial);
    if (group.length > 0) groups.push({ label: initial, members: group });
  }
  // Any other (numbers, special chars)
  const others = koreanMembers.filter(m => !KOREAN_INITIALS.includes(getKoreanInitial(m.name)));
  if (others.length > 0) groups.push({ label: '#', members: others });

  const allInitials = groups.map(g => g.label);

  return (
    <div className="flex h-screen">
      {/* Main list area */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${selectedMember ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">회원기록양식</h1>
              <p className="text-xs text-muted-foreground mt-0.5">총 {members.length}명</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 전화번호 검색..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 w-52"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                Excel 가져오기
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                회원 추가
              </Button>
            </div>
          </div>

          {/* Initial filter tabs */}
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            <button
              onClick={() => setActiveInitial(null)}
              className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${!activeInitial ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >전체</button>
            {allInitials.map(i => (
              <button
                key={i}
                onClick={() => setActiveInitial(activeInitial === i ? null : i)}
                className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${activeInitial === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >{i}</button>
            ))}
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Users2Icon />
              <p className="text-sm">등록된 회원이 없습니다.</p>
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1.5" />첫 번째 회원 추가
              </Button>
            </div>
          ) : (
            groups
              .filter(g => !activeInitial || g.label === activeInitial)
              .map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-full bg-[hsl(var(--table-header))] text-primary font-bold text-sm flex items-center justify-center">{group.label}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{group.members.length}명</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.members.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isSelected={selectedMember?.id === member.id}
                        onClick={() => setSelectedMember(member)}
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedMember && (
        <div className="w-full md:w-[480px] lg:w-[560px] border-l border-border flex flex-col bg-card overflow-hidden">
          <MemberDetailPanel
            memberId={selectedMember.id}
            onClose={() => setSelectedMember(null)}
            onUpdated={fetchMembers}
          />
        </div>
      )}

      {showAdd && (
        <AddMemberDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => { fetchMembers(); setShowAdd(false); }}
        />
      )}
      {showImport && (
        <ExcelImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => { fetchMembers(); setShowImport(false); }}
        />
      )}
    </div>
  );
};

const Users2Icon = () => (
  <svg className="w-12 h-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default MembersPage;
