import { Member } from "@/types/church";
import { User } from "lucide-react";

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onClick: () => void;
}

const MemberCard = ({ member, isSelected, onClick }: MemberCardProps) => {
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

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
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          member.gender === '여' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {member.gender && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                member.gender === '여' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
              }`}>{member.gender}</span>
            )}
            {age && <span className="text-xs text-muted-foreground">{age}세</span>}
          </div>
          {member.phone && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.phone}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default MemberCard;
