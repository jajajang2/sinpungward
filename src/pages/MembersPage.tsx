import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Member } from "@/types/church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search, Users, ChevronRight, ArrowLeft, Trash2, X } from "lucide-react";
import MemberCard from "@/components/members/MemberCard";
import AddMemberDialog from "@/components/members/AddMemberDialog";
import MemberDetailPanel from "@/components/members/MemberDetailPanel";
import ExcelImportDialog from "@/components/members/ExcelImportDialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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

// ── Age helper ───────────────────────────────────────────────
const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// ── Group definitions (same as AttendancePage) ────────────────
interface MemberGroup {
  id: string;
  label: string;
  description: string;
  filter: (m: Member) => boolean;
}

const GROUPS: MemberGroup[] = [
  {
    id: "all",
    label: "전체회원",
    description: "모든 회원",
    filter: () => true,
  },
  {
    id: "elders",
    label: "장로정원회",
    description: "19세 이상 남성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "남" && age !== null && age >= 19;
    },
  },
  {
    id: "rs",
    label: "상호부조회",
    description: "19세 이상 여성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "여" && age !== null && age >= 19;
    },
  },
  {
    id: "singles",
    label: "독신 (미혼)",
    description: "결혼날짜 없는 성인",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return age !== null && age >= 19 && !m.marriage_date;
    },
  },
  {
    id: "ym",
    label: "청남",
    description: "11세 ~ 18세 남성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "남" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "yw",
    label: "청녀",
    description: "11세 ~ 18세 여성",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return m.gender === "여" && age !== null && age >= 11 && age < 19;
    },
  },
  {
    id: "primary",
    label: "초등회",
    description: "0세 ~ 10세",
    filter: (m) => {
      const age = getAge(m.birth_date);
      return age !== null && age < 11;
    },
  },
];

// ── Korean alphabetical helpers ──────────────────────────────
const KOREAN_INITIALS = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function getKoreanInitial(name: string): string {
  if (!name) return '#';
  const code = name.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return name[0].toUpperCase();
  const offset = code - 0xAC00;
  const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const initial = initials[Math.floor(offset / (21 * 28))];
  const normalMap: Record<string, string> = { 'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ' };
  return normalMap[initial] || initial;
}
function isEnglish(name: string): boolean { return /^[A-Za-z]/.test(name); }

// ── Main Page ────────────────────────────────────────────────
const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleDeleteAll = async () => {
    try {
      await supabase.from('member_notes').delete().gte('created_at', '1970-01-01');
      await supabase.from('member_family').delete().gte('created_at', '1970-01-01');
      await supabase.from('member_church_info').delete().gte('created_at', '1970-01-01');
      await supabase.from('attendance').delete().gte('created_at', '1970-01-01');
      await supabase.from('attendance_visitors').delete().gte('created_at', '1970-01-01');
      await supabase.from('members').delete().gte('created_at', '1970-01-01');
      toast({ title: '완료', description: '모든 회원 기록이 삭제되었습니다.' });
      setSelectedMember(null);
      setSelectedGroupId(null);
      fetchMembers();
    } catch {
      toast({ title: '오류', description: '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
    setShowDeleteAll(false);
  };

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

  // When group changes, reset selected member
  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId === selectedGroupId ? null : groupId);
    setSelectedMember(null);
    setSearch('');
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
  };

  const handleBack = () => {
    setSelectedMember(null);
  };

  const selectedGroup = GROUPS.find(g => g.id === selectedGroupId) ?? null;

  const groupMembers = selectedGroup
    ? members.filter(selectedGroup.filter).filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.phone || '').includes(search)
      )
    : [];

  // Build alphabetical groups for the member list
  const englishMembers = groupMembers.filter(m => isEnglish(m.name));
  const koreanMembers = groupMembers.filter(m => !isEnglish(m.name));
  const alphaGroups: { label: string; members: Member[] }[] = [];
  if (englishMembers.length > 0) alphaGroups.push({ label: '영문', members: englishMembers });
  for (const initial of KOREAN_INITIALS) {
    const g = koreanMembers.filter(m => getKoreanInitial(m.name) === initial);
    if (g.length > 0) alphaGroups.push({ label: initial, members: g });
  }
  const others = koreanMembers.filter(m => !KOREAN_INITIALS.includes(getKoreanInitial(m.name)));
  if (others.length > 0) alphaGroups.push({ label: '#', members: others });

  // ── View states ──────────────────────────────────────────
  // State A: no group selected → full-width group list
  // State B: group selected, no member → left group list + right member list
  // State C: member selected → left group list + right full detail panel

  const showGroupList = !selectedMember;
  const showMemberList = !!selectedGroupId && !selectedMember;
  const showDetail = !!selectedMember;

  // ── Mobile view: 그룹 탭 제거, 전체 회원 가로 바 형태 ──
  if (isMobile) {
    const allFiltered = members
      .filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.phone || '').includes(search)
      );
    // alphabetical groups for all members
    const mEnglish = allFiltered.filter(m => isEnglish(m.name));
    const mKorean = allFiltered.filter(m => !isEnglish(m.name));
    const mAlpha: { label: string; members: Member[] }[] = [];
    if (mEnglish.length > 0) mAlpha.push({ label: '영문', members: mEnglish });
    for (const initial of KOREAN_INITIALS) {
      const g = mKorean.filter(m => getKoreanInitial(m.name) === initial);
      if (g.length > 0) mAlpha.push({ label: initial, members: g });
    }
    const mOthers = mKorean.filter(m => !KOREAN_INITIALS.includes(getKoreanInitial(m.name)));
    if (mOthers.length > 0) mAlpha.push({ label: '#', members: mOthers });

    if (selectedMember) {
      return (
        <div className="flex flex-col h-screen overflow-hidden bg-card">
          <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 px-2" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" /> 목록으로
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MemberDetailPanel
              memberId={selectedMember.id}
              onClose={handleBack}
              onUpdated={fetchMembers}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">회원기록양식</h1>
              <p className="text-xs text-muted-foreground">총 {members.length}명</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => setShowDeleteAll(true)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setShowImport(true)}>
                <Upload className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-7 text-xs px-2" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="이름 또는 전화번호 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">불러오는 중...</div>
          ) : allFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Users className="w-12 h-12 opacity-20" />
              <p className="text-sm">회원이 없습니다.</p>
            </div>
          ) : (
            mAlpha.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-muted text-primary font-bold text-xs flex items-center justify-center shrink-0">{group.label}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground shrink-0">{group.members.length}명</span>
                </div>
                <div className="flex flex-col gap-1">
                  {group.members.map(member => {
                    const age = member.birth_date
                      ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
                      : null;
                    const isFemale = member.gender === '여';
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleMemberSelect(member)}
                        className="w-full text-left px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center gap-3"
                      >
                        <span className="font-semibold text-sm text-foreground truncate flex-1 min-w-0">
                          {member.name}
                        </span>
                        {member.gender ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                          }`}>{member.gender}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0 w-6 text-center">-</span>
                        )}
                        <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
                          {age !== null ? `${age}세` : '-'}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 w-24 text-right truncate">
                          {member.phone || '-'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

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
        <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>전체 기록 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                모든 회원 기록(가족정보, 교회정보, 메모, 출석 포함)이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                전체 삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel: group list ── */}
      <div className={`flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200 ${selectedGroupId ? 'w-52' : 'flex-1 max-w-xs'}`}>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">회원기록양식</h1>
              <p className="text-xs text-muted-foreground mt-0.5">총 {members.length}명</p>
            </div>
          </div>
          {!selectedGroupId && (
            <div className="flex items-center gap-1.5 mt-3">
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => setShowDeleteAll(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />전체삭제
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowImport(true)}>
                <Upload className="w-3.5 h-3.5 mr-1" />Excel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />추가
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {GROUPS.map(group => {
            const count = members.filter(group.filter).length;
            const isSelected = selectedGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => handleGroupSelect(group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50 border-b border-border/50 ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{group.label}</p>
                    {!selectedGroupId && (
                      <p className="text-xs text-muted-foreground">{group.description} · {count}명</p>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isSelected ? 'rotate-90 text-primary' : ''}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      {!selectedGroupId ? (
        // No group selected: placeholder
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Users className="w-12 h-12 opacity-20" />
          <p className="text-sm">왼쪽에서 그룹을 선택하세요</p>
        </div>
      ) : showDetail ? (
        // Member detail: full right panel
        <div className="flex-1 min-w-0 flex flex-col bg-card overflow-hidden">
          {/* Back bar */}
          <div className="px-4 py-2.5 border-b border-border bg-card shrink-0 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 px-2" onClick={handleBack}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {selectedGroup?.label} 목록으로
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MemberDetailPanel
              memberId={selectedMember.id}
              onClose={handleBack}
              onUpdated={fetchMembers}
            />
          </div>
        </div>
      ) : (
        // Member list
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold text-foreground">{selectedGroup?.label}</h2>
                <span className="text-xs text-muted-foreground">· {groupMembers.length}명</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="이름/전화번호..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-7 w-36 h-7 text-xs"
                  />
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={() => setShowAdd(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />추가
                </Button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">불러오는 중...</div>
            ) : groupMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <Users className="w-12 h-12 opacity-20" />
                <p className="text-sm">해당 그룹에 회원이 없습니다.</p>
              </div>
            ) : (
              alphaGroups.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-muted text-primary font-bold text-xs flex items-center justify-center shrink-0">{group.label}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground shrink-0">{group.members.length}명</span>
                  </div>
                  <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.members.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isSelected={false}
                        onClick={() => handleMemberSelect(member)}
                        compact={false}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
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
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              모든 회원 기록(가족정보, 교회정보, 메모, 출석 포함)이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              전체 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembersPage;
