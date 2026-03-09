
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date date NOT NULL,
  category text NOT NULL DEFAULT '기타',
  content text NOT NULL DEFAULT '',
  attendees text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for meeting_minutes"
  ON public.meeting_minutes
  FOR ALL
  USING (true)
  WITH CHECK (true);
