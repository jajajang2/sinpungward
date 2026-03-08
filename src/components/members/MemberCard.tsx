import { Member } from "@/types/church";

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onClick: () => void;
}

const MemberCard = ({ member, isSelected, onClick }: MemberCardProps) => {
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  const isFemale = member.gender === '여';
  const initials = member.name.charAt(0);

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
          isSelected
            ? 'border-primary'
            : isFemale ? 'border-pink-200' : 'border-blue-200'
        } ${isFemale ? 'bg-pink-50' : 'bg-blue-50'}`}>
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={`text-base font-bold ${isFemale ? 'text-pink-400' : 'text-blue-400'}`}>
              {initials}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
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
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="사진 있음" />
        )}
      </div>
    </button>
  );
};

export default MemberCard;
