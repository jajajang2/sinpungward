export interface Member {
  id: string;
  name: string;
  gender?: '남' | '여';
  birth_date?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined relations
  church_info?: MemberChurchInfo;
  family?: MemberFamily[];
  member_notes?: MemberNote[];
}

export interface MemberFamily {
  id: string;
  member_id: string;
  name?: string;
  relationship?: string;
  phone?: string;
  sort_order: number;
}

export interface MemberChurchInfo {
  id: string;
  member_id: string;
  record_number?: string;
  baptism_date?: string;
  priesthood?: string;
  current_calling?: string;
  previous_callings?: string;
  ministry_target?: string;
  temple_recommend: boolean;
  sunday_school_class?: string;
  missionary_work?: string;
}

export interface MemberNote {
  id: string;
  member_id: string;
  note_date: string;
  content: string;
  author?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  attendance_date: string;
  is_present: boolean;
}

export interface OrgPosition {
  id: string;
  section: string;
  role: string;
  calling_keyword?: string;
  sort_order: number;
}
