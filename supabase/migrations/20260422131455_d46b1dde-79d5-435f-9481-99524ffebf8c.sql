CREATE TABLE public.attendance_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_date DATE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for attendance_visitors"
ON public.attendance_visitors
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_attendance_visitors_attendance_date
ON public.attendance_visitors(attendance_date, sort_order, created_at);

CREATE TRIGGER update_attendance_visitors_updated_at
BEFORE UPDATE ON public.attendance_visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();