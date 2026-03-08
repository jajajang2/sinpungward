
-- Create member-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true);

-- RLS policies for member-photos bucket
CREATE POLICY "Public read for member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

CREATE POLICY "Allow upload for member photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-photos');

CREATE POLICY "Allow update for member photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'member-photos');

CREATE POLICY "Allow delete for member photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'member-photos');
