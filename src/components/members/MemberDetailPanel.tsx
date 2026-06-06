import { useState, useEffect, useRef, useMemo } from "react";
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
import { X, Save, Trash2, Plus, ChevronsUpDown, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PhotoUpload from "./PhotoUpload";
import { CALLING_GROUPS } from "@/data/callings";
import { useCallingMembers } from "@/hooks/useCallingMembers";
import FamilyTree from "./FamilyTree";

interface MemberDetailPanelProps {
  memberId: string;
  onClose: () => void;
  onUpdated: () => void;
  onNavigateToMember?: (member: { id: string; name: string }) => void;
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

// 나이 계산
export function calcAge(birth?: string | null): number | null {
  if (!birth) return null;
  const today = new Date();
  const b = new Date(birth);
  let a = today.getFullYear() - b.getFullYear();
  if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--;
  return a;
}

// 관계 역추론: A가 B를 rel 로 부를 때, B는 A(성별 fromGender)를 무엇이라 부르는가
export function reverseRelationship(rel: string | null | undefined, fromGender?: string | null): string | null {
  if (!rel) return null;
  const g = fromGender;
  const map: Record<string, string | null> = {
    '배우자 (남편)': '배우자 (아내)',
    '배우자 (아내)': '배우자 (남편)',
    '아들': g === '남' ? '아버지' : g === '여' ? '어머니' : null,
    '딸': g === '남' ? '아버지' : g === '여' ? '어머니' : null,
    '아버지': g === '남' ? '아들' : g === '여' ? '딸' : null,
    '어머니': g === '남' ? '아들' : g === '여' ? '딸' : null,
    '할아버지': g === '남' ? '손자' : g === '여' ? '손녀' : null,
    '할머니': g === '남' ? '손자' : g === '여' ? '손녀' : null,
    '외할아버지': g === '남' ? '외손자' : g === '여' ? '외손녀' : null,
    '외할머니': g === '남' ? '외손자' : g === '여' ? '외손녀' : null,
    '손자': g === '남' ? '할아버지' : g === '여' ? '할머니' : null,
    '손녀': g === '남' ? '할아버지' : g === '여' ? '할머니' : null,
    '외손자': g === '남' ? '외할아버지' : g === '여' ? '외할머니' : null,
    '외손녀': g === '남' ? '외할아버지' : g === '여' ? '외할머니' : null,
    '형': g === '남' ? '남동생' : g === '여' ? '여동생' : null,
    '오빠': g === '남' ? '남동생' : g === '여' ? '여동생' : null,
    '누나': g === '남' ? '남동생' : g === '여' ? '여동생' : null,
    '언니': g === '남' ? '남동생' : g === '여' ? '여동생' : null,
    '남동생': g === '남' ? '형' : g === '여' ? '누나' : null,
    '여동생': g === '남' ? '오빠' : g === '여' ? '언니' : null,
  };
  return map[rel] ?? null;
}

// 가족 표시 그룹: 본인 위(above) / 본인 아래(below)
function familyGroup(rel?: string | null): 'above' | 'below' {
  if (!rel) return 'below';
  if (/^배우자|^아들$|^딸$|손자|손녀|외손/.test(rel)) return 'below';
  return 'above';
}

// 가족 정렬 우선순위
function familyRank(rel?: string | null): number {
  if (!rel) return 99;
  if (/할아버지|할머니|외할/.test(rel)) return 1;
  if (rel === '아버지' || rel === '어머니') return 2;
  if (/시아버지|시어머니|장인|장모/.test(rel)) return 3;
  if (/^형$|^오빠$|^누나$|^언니$/.test(rel)) return 4;
  if (/^남동생$|^여동생$/.test(rel)) return 5;
  if (/큰아버지|작은아버지|고모|외삼촌|이모/.test(rel)) return 6;
  if (/사촌/.test(rel)) return 7;
  if (/시누이|시동생|처남|처제|형수|제수|올케/.test(rel)) return 8;
  if (rel.startsWith('배우자')) return 20;
  if (rel === '아들' || rel === '딸') return 21;
  if (/손자|손녀|외손/.test(rel)) return 22;
  return 50;
}

// FamilyRow: DB 가족 + UI 전용 자동완성 필드
export interface FamilyRow extends MemberFamily {
  _birth_date?: string | null;
  _current_calling?: string[] | null;
  _phone?: string | null;
  _linked_member_id?: string;
}

// 회원 목록 타입
export interface MemberListItem {
  id: string;
  name: string;
  birth_date?: string | null;
  current_calling?: string[] | null;
  phone?: string | null;
}

const MemberDetailPanel = ({ memberId, onClose, onUpdated, onNavigateToMember }: MemberDetailPanelProps) => {
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [family, setFamily] = useState<FamilyRow[]>([]);
  const [churchInfo, setChurchInfo] = useState<MemberChurchInfo | null>(null);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({ note_date: new Date().toISOString().split('T')[0], content: '', author: '' });
  const [memberList, setMemberList] = useState<MemberListItem[]>([]);
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);

  const fetchData = async () => {
    const [mRes, fRes, cRes, nRes, allMRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('member_family').select('*').eq('member_id', memberId).order('sort_order'),
      supabase.from('member_church_info').select('*').eq('member_id', memberId).maybeSingle(),
      supabase.from('member_notes').select('*').eq('member_id', memberId).order('note_date', { ascending: false }),
      supabase.from('members').select('id, name, birth_date, phone, member_church_info(current_calling)').order('name'),
    ]);
    if (mRes.data) setMember(mRes.data);

    // 회원 목록 flatten
    const allMembers: MemberListItem[] = ((allMRes.data as any[]) || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      birth_date: m.birth_date ?? null,
      current_calling: m.member_church_info?.current_calling ?? null,
      phone: m.phone ?? null,
    }));
    setMemberList(allMembers);

    // 가족 데이터: 이름이 회원 목록에 있으면 생년월일·부름 자동 채우기
    const familyRows: FamilyRow[] = ((fRes.data as any[]) || []).map((f: any) => {
      const linked = allMembers.find(m => m.name === f.name);
      return {
        ...f,
        _birth_date: linked?.birth_date ?? null,
        _current_calling: linked?.current_calling ?? null,
        _phone: linked?.phone ?? null,
        _linked_member_id: linked?.id,
      };
    });

    // 비어있는 관계는 상대방 회원의 family 테이블에서 역추정
    const linkedIdsToFetch = familyRows
      .filter(f => !f.relationship && f._linked_member_id)
      .map(f => f._linked_member_id!);
    if (linkedIdsToFetch.length > 0 && mRes.data) {
      const [{ data: reverseRows }, { data: otherMembers }] = await Promise.all([
        supabase.from('member_family')
          .select('member_id, name, relationship')
          .in('member_id', linkedIdsToFetch)
          .eq('name', mRes.data.name),
        supabase.from('members')
          .select('id, gender')
          .in('id', linkedIdsToFetch),
      ]);
      const revMap = new Map<string, string>();
      (reverseRows || []).forEach((r: any) => {
        if (r.relationship) revMap.set(r.member_id, r.relationship);
      });
      const otherGenderMap = new Map<string, string | null>();
      (otherMembers || []).forEach((m: any) => otherGenderMap.set(m.id, m.gender ?? null));
      for (const fr of familyRows) {
        if (!fr.relationship && fr._linked_member_id) {
          const otherRel = revMap.get(fr._linked_member_id);
          const inferred = reverseRelationship(otherRel, otherGenderMap.get(fr._linked_member_id));
          if (inferred) fr.relationship = inferred;
        }
      }
    }
    setFamily(familyRows);
    setChurchInfo(cRes.data || null);
    setNotes((nRes.data as any[]) || []);
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
      marriage_date: member.marriage_date || null,
    }).eq('id', memberId);

    await supabase.from('member_family').delete().eq('member_id', memberId);
    if (family.filter(f => f.name).length > 0) {
      await supabase.from('member_family').insert(
        family.filter(f => f.name).map((f, i) => ({
          member_id: memberId,
          name: f.name,
          relationship: f.relationship,
          phone: f.phone,
          notes: f.notes || null,
          sort_order: i,
        }))
      );
    }

    if (churchInfo) {
      const toNull = (v: string | null | undefined) => (v === '' || v == null) ? null : v;
      const payload = {
        member_id: memberId,
        record_number: toNull(churchInfo.record_number),
        baptism_date: toNull(churchInfo.baptism_date),
        priesthood: toNull(churchInfo.priesthood),
        current_calling: churchInfo.current_calling && churchInfo.current_calling.length > 0 ? churchInfo.current_calling : null,
        previous_callings: toNull(churchInfo.previous_callings),
        ministry_target: toNull(churchInfo.ministry_target),
        temple_recommend: churchInfo.temple_recommend ?? false,
        bishop_interview_date: toNull(churchInfo.bishop_interview_date),
        stake_president_interview_date: toNull(churchInfo.stake_president_interview_date),
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

    // ── 양방향 가족 동기화 ──
    // 가족으로 등록된 회원들끼리 서로의 가족정보에 자동으로 포함되고 관계를 채워준다.
    try {
      // 이름 → 회원 매핑 (수동 입력으로 _linked_member_id 미설정 케이스 보완)
      const nameToMember = new Map<string, MemberListItem>();
      for (const m of memberList) nameToMember.set(m.name, m);

      const resolved = family
        .filter(f => f.name)
        .map(f => {
          const linked = nameToMember.get(f.name!);
          return { name: f.name!, relationship: f.relationship || null, linkedId: f._linked_member_id || linked?.id };
        })
        .filter(f => f.linkedId);

      const linkedIds = Array.from(new Set(resolved.map(f => f.linkedId!)));
      const groupIds = Array.from(new Set([memberId, ...linkedIds]));

      if (groupIds.length > 1) {
        const { data: groupMembers } = await supabase
          .from('members')
          .select('id, name, gender, birth_date')
          .in('id', groupIds);
        const idToInfo = new Map<string, { name: string; gender?: string | null; birth_date?: string | null }>(
          (groupMembers || []).map((m: any) => [m.id, { name: m.name, gender: m.gender, birth_date: m.birth_date }])
        );

        // 본인 → 각 가족원의 관계 매핑
        const myRelTo = new Map<string, string | null>();
        for (const f of resolved) myRelTo.set(f.linkedId!, f.relationship);
        const myInfo = idToInfo.get(memberId);

        for (const gid of groupIds) {
          if (gid === memberId) continue;
          const otherIds = groupIds.filter(x => x !== gid);
          const { data: existing } = await supabase
            .from('member_family')
            .select('*')
            .eq('member_id', gid)
            .order('sort_order');
          const existingByName = new Map<string, any>((existing || []).map((e: any) => [e.name, e]));
          const gidInfo = idToInfo.get(gid);

          let newOrder = (existing || []).length;
          for (const oid of otherIds) {
            const oInfo = idToInfo.get(oid);
            if (!oInfo) continue;
            // gid 기준 oid 와의 관계 추정
            let rel: string | null = null;
            if (oid === memberId) {
              // gid 가 본인을 부르는 관계 = (본인이 gid 를 부르는 관계)의 역
              rel = reverseRelationship(myRelTo.get(gid) || null, myInfo?.gender);
            } else {
              // 두 가족원 사이 관계: 본인 → gid, 본인 → oid 모두 알면 일부 추정 가능
              const relMyToGid = myRelTo.get(gid) || null;
              const relMyToOid = myRelTo.get(oid) || null;
              // 부부의 자녀 ↔ 부모: 본인이 gid를 배우자로, oid를 자녀로 보면 gid에서 oid는 자녀
              if (relMyToGid?.startsWith('배우자') && (relMyToOid === '아들' || relMyToOid === '딸')) {
                rel = relMyToOid;
              } else if ((relMyToGid === '아들' || relMyToGid === '딸') && relMyToOid?.startsWith('배우자')) {
                // gid 가 본인의 자녀, oid 가 본인의 배우자 → gid에서 oid는 부모
                rel = oInfo.gender === '남' ? '아버지' : oInfo.gender === '여' ? '어머니' : null;
              } else if ((relMyToGid === '아들' || relMyToGid === '딸') && (relMyToOid === '아들' || relMyToOid === '딸')) {
                // 형제자매: gidInfo 성별 / oid 성별·나이 비교
                const gidB = gidInfo?.birth_date || '';
                const oidB = oInfo.birth_date || '';
                const gidIsOlder = gidB && oidB ? gidB < oidB : false;
                if (gidInfo?.gender === '남') {
                  rel = gidIsOlder ? (oInfo.gender === '남' ? '남동생' : '여동생')
                                   : (oInfo.gender === '남' ? '형' : '누나');
                } else if (gidInfo?.gender === '여') {
                  rel = gidIsOlder ? (oInfo.gender === '남' ? '남동생' : '여동생')
                                   : (oInfo.gender === '남' ? '오빠' : '언니');
                }
              }
            }

            const existingRow = existingByName.get(oInfo.name);
            if (existingRow) {
              if (!existingRow.relationship && rel) {
                await supabase.from('member_family')
                  .update({ relationship: rel })
                  .eq('id', existingRow.id);
              }
            } else {
              await supabase.from('member_family').insert({
                member_id: gid,
                name: oInfo.name,
                relationship: rel,
                phone: null,
                sort_order: newOrder++,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('가족 동기화 실패', err);
    }

    setSaving(false);
    toast({ title: '저장 완료', description: '가족 구성원들에게도 자동 반영되었습니다.' });
    onUpdated();
    fetchData();
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

  const age = calcAge(member.birth_date);

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
                {churchInfo?.current_calling?.length ? ` · ${churchInfo.current_calling.join(', ')}` : ''}
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
              <Label className="text-xs">결혼날짜</Label>
              <Input type="date" value={member.marriage_date || ''} onChange={e => setMember(m => m ? { ...m, marriage_date: e.target.value } : m)} />
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
          <FamilyTree
            member={member}
            memberId={memberId}
            churchInfo={churchInfo}
            family={family}
            setFamily={setFamily}
            memberList={memberList}
            onNavigateToMember={onNavigateToMember}
          />
        </TabsContent>

        {/* ── 교회정보 ── */}
        <TabsContent value="church" className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 mt-4">
          {(() => {
            const ci = churchInfo || { id: '', member_id: memberId, record_number: '', baptism_date: '', priesthood: '', current_calling: [] as string[], previous_callings: '', ministry_target: '', temple_recommend: false, bishop_interview_date: '', stake_president_interview_date: '', sunday_school_class: '', missionary_work: '' };
            const update = (field: string, value: string | boolean | string[]) => setChurchInfo(c => ({ ...(c || ci), [field]: value }) as MemberChurchInfo);

            const renewalDate = (() => {
              if (!ci.stake_president_interview_date) return null;
              const d = new Date(ci.stake_president_interview_date);
              d.setFullYear(d.getFullYear() + 2);
              return d;
            })();
            const today = new Date();
            const daysUntilRenewal = renewalDate
              ? Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              : null;

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
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">현재 부름</Label>
                  <CallingMultiSelect value={ci.current_calling || []} onChange={v => update('current_calling', v)} />
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

                {/* ── 성전추천서 ── */}
                <div className="col-span-2 border-t border-border pt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="temple"
                      checked={ci.temple_recommend || false}
                      onChange={e => update('temple_recommend', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <Label htmlFor="temple" className="text-sm font-semibold cursor-pointer">성전추천서 보유</Label>
                  </div>

                  {ci.temple_recommend && (
                    <div className="pl-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">감독 접견일자</Label>
                          <Input
                            type="date"
                            value={ci.bishop_interview_date || ''}
                            onChange={e => update('bishop_interview_date', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">스테이크 회장 접견일자</Label>
                          <Input
                            type="date"
                            value={ci.stake_president_interview_date || ''}
                            onChange={e => update('stake_president_interview_date', e.target.value)}
                          />
                        </div>
                      </div>

                      {renewalDate && (
                        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                          daysUntilRenewal !== null && daysUntilRenewal <= 0
                            ? 'bg-destructive/10 border-destructive/30 text-destructive'
                            : daysUntilRenewal !== null && daysUntilRenewal <= 90
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          <span className="text-base leading-none mt-0.5">
                            {daysUntilRenewal !== null && daysUntilRenewal <= 0 ? '⚠️' : daysUntilRenewal !== null && daysUntilRenewal <= 90 ? '🔔' : '✅'}
                          </span>
                          <div>
                            <p className="font-semibold">
                              재갱신일: {renewalDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p>
                              {daysUntilRenewal !== null && daysUntilRenewal <= 0
                                ? `만료됨 (${Math.abs(daysUntilRenewal)}일 경과)`
                                : `${daysUntilRenewal}일 후 갱신 필요`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

// ── Family Name Combobox ──────────────────────────────────────
export const FamilyNameCombobox = ({
  value,
  memberList,
  onChange,
}: {
  value: string;
  memberList: MemberListItem[];
  onChange: (name: string, linked?: MemberListItem) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = memberList.filter(m =>
    inputValue ? m.name.toLowerCase().includes(inputValue.toLowerCase()) : true
  ).slice(0, 30);

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
            placeholder="이름 검색..."
            className="h-7 text-xs pr-6"
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-56 p-0"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 && !inputValue ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">이름을 입력하세요</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2">
              <button
                className="w-full text-left text-xs text-primary hover:underline"
                onClick={() => { onChange(inputValue); setOpen(false); }}
              >
                "{inputValue}" 직접 입력
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                회원 목록
              </div>
              {filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === m.name && "bg-accent/50"
                  )}
                  onClick={() => {
                    setInputValue(m.name);
                    onChange(m.name, m);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("w-3 h-3 shrink-0", value === m.name ? "opacity-100 text-primary" : "opacity-0")} />
                  {m.name}
                </button>
              ))}
              {inputValue && !memberList.find(m => m.name === inputValue) && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-xs text-left text-primary hover:bg-accent border-t border-border"
                  onClick={() => { onChange(inputValue); setOpen(false); }}
                >
                  "{inputValue}" 직접 입력
                </button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ── Relationship Select ───────────────────────────────────────
export const RelationshipSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-7 font-normal text-xs px-2"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "관계 선택..."}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
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

// ── Calling Multi-Select ──────────────────────────────────────
const CallingMultiSelect = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const [open, setOpen] = useState(false);
  const { data: callingMap = {} } = useCallingMembers();

  const toggleItem = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter(v => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 font-normal text-sm"
          >
            <span className={cn("truncate", !value.length && "text-muted-foreground")}>
              {value.length > 0 ? `${value.length}개 부름 선택됨` : "부름 선택 또는 검색..."}
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
                  {items.map((item) => {
                    const isSelected = value.includes(item);
                    const isAssigned = !isSelected && !!callingMap[item];
                    return (
                      <CommandItem
                        key={item}
                        value={item}
                        onSelect={() => toggleItem(item)}
                        className={cn("text-xs", isAssigned && "text-muted-foreground/50")}
                      >
                        <Check className={cn("mr-2 h-3 w-3 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                        {item}
                        {isAssigned && <span className="ml-auto text-[10px] text-muted-foreground/40">({callingMap[item]})</span>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
              {v}
              <button onClick={() => onChange(value.filter(x => x !== v))} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberDetailPanel;
