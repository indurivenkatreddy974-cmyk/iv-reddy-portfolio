ALTER TABLE public.blockchain_records ADD COLUMN IF NOT EXISTS proof_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_records_proof_hash_key ON public.blockchain_records (proof_hash) WHERE proof_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS blockchain_records_sha256_idx ON public.blockchain_records (sha256);