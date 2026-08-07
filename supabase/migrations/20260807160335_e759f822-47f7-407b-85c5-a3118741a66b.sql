ALTER TABLE public.blockchain_records
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_check_result text;

CREATE INDEX IF NOT EXISTS blockchain_records_subject_ref_idx ON public.blockchain_records (subject_ref);
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_records_sha256_key ON public.blockchain_records (sha256);