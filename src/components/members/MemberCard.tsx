import { Member } from "@/types/church";

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean; // 상세 패널이 열렸을 때 가로 목록 형태
  selectionTint?: 'danger'; // 다중 선택 시 빨간색 음영
}

const MemberCard = ({ member, isSelected, onClick, compact = false, selectionTint }: MemberCardProps) => {
  const danger = selectionTint === 'danger';
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  const isFemale = member.gender === '여';

  // compact 모드: 가로 행 형태 (패널 열렸을 때)
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-3 ${
          isSelected
            ? 'border-primary bg-accent ring-1 ring-primary'
            : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
        }`}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 border ${
          isFemale ? 'border-pink-200 bg-pink-50' : 'border-blue-200 bg-blue-50'
        }`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className={`text-xs font-bold ${isFemale ? 'text-pink-400' : 'text-blue-400'}`}>
              {member.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate flex-1">{member.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {member.gender && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
              }`}>{member.gender}</span>
            )}
            {age && <span className="text-xs text-muted-foreground">{age}세</span>}
          </div>
        </div>
      </button>
    );
  }

  // 일반 카드 모드
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
        isSelected
          ? 'border-primary bg-accent ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 ${
          isSelected ? 'border-primary' : isFemale ? 'border-pink-200' : 'border-blue-200'
        } ${isFemale ? 'bg-pink-50' : 'bg-blue-50'}`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className={`text-base font-bold ${isFemale ? 'text-pink-400' : 'text-blue-400'}`}>
              {member.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* 풀네임 — 2줄까지 허용 */}
          <p className="font-semibold text-sm text-foreground leading-tight break-words line-clamp-2">
            {member.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {member.gender && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
              }`}>{member.gender}</span>
            )}
            {age && <span className="text-xs text-muted-foreground">{age}세</span>}
          </div>
          {member.phone && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.phone}</p>
          )}
        </div>

        {/* Photo indicator */}
        {member.photo_url && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        )}
      </div>
    </button>
  );
};

export default MemberCard;
