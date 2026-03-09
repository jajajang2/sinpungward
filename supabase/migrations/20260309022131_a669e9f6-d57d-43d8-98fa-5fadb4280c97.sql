
ALTER TABLE public.member_church_info
  ADD COLUMN IF NOT EXISTS bishop_interview_date date,
  ADD COLUMN IF NOT EXISTS stake_president_interview_date date;
