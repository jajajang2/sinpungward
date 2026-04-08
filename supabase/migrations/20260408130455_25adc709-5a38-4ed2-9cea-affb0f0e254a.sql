-- Convert current_calling from text to text array
ALTER TABLE public.member_church_info
  ALTER COLUMN current_calling TYPE text[]
  USING CASE
    WHEN current_calling IS NOT NULL THEN ARRAY[current_calling]
    ELSE NULL
  END;