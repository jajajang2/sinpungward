ALTER TABLE public.sacrament_assignments
  ADD COLUMN IF NOT EXISTS status text
  CHECK (status IS NULL OR status IN ('승인','부탁','거절'));

UPDATE public.sacrament_assignments sa
SET status = '승인'
FROM public.sacrament_meetings sm
WHERE sa.meeting_id = sm.id
  AND sm.meeting_date < CURRENT_DATE
  AND sa.status IS NULL
  AND (sa.member_id IS NOT NULL OR sa.custom_name IS NOT NULL);