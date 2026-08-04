CREATE TYPE public.verification_subject AS ENUM ('resume','certificate','offer_letter','completion_certificate','project','research_paper','asset');
CREATE TYPE public.verification_status AS ENUM ('pending','confirmed','failed');

CREATE TABLE public.blockchain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type public.verification_subject NOT NULL,
  subject_ref text,
  title text NOT NULL,
  file_name text,
  mime text,
  size_bytes bigint,
  sha256 text NOT NULL UNIQUE,
  ipfs_cid text,
  ipfs_url text,
  fallback_url text,
  network text NOT NULL DEFAULT 'polygon-amoy',
  chain_id integer NOT NULL DEFAULT 80002,
  contract_address text,
  tx_hash text,
  block_number bigint,
  wallet_address text,
  status public.verification_status NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  registered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blockchain_records_subject_idx ON public.blockchain_records (subject_type, subject_ref);
CREATE INDEX blockchain_records_sha_idx ON public.blockchain_records (sha256);

GRANT SELECT ON public.blockchain_records TO anon;
GRANT SELECT ON public.blockchain_records TO authenticated;
GRANT ALL ON public.blockchain_records TO service_role;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verification records" ON public.blockchain_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert verification records" ON public.blockchain_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update verification records" ON public.blockchain_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete verification records" ON public.blockchain_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blockchain_records_set_updated_at BEFORE UPDATE ON public.blockchain_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.nft_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref text,
  project_name text NOT NULL,
  description text,
  artwork_url text,
  metadata_cid text,
  token_id text,
  contract_address text,
  network text NOT NULL DEFAULT 'polygon-amoy',
  chain_id integer NOT NULL DEFAULT 80002,
  mint_tx_hash text,
  owner_wallet text,
  minted_at timestamptz,
  status public.verification_status NOT NULL DEFAULT 'pending',
  error_message text,
  featured boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nft_tokens TO anon;
GRANT SELECT ON public.nft_tokens TO authenticated;
GRANT ALL ON public.nft_tokens TO service_role;
ALTER TABLE public.nft_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ownership tokens" ON public.nft_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert ownership tokens" ON public.nft_tokens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ownership tokens" ON public.nft_tokens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ownership tokens" ON public.nft_tokens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER nft_tokens_set_updated_at BEFORE UPDATE ON public.nft_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blockchain_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  network text NOT NULL DEFAULT 'polygon-amoy',
  chain_id integer NOT NULL DEFAULT 80002,
  explorer_base text NOT NULL DEFAULT 'https://amoy.polygonscan.com',
  verification_contract text,
  nft_contract text,
  wallet_address text,
  ipfs_gateway text NOT NULL DEFAULT 'https://gateway.pinata.cloud/ipfs/',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blockchain_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.blockchain_settings TO anon;
GRANT SELECT ON public.blockchain_settings TO authenticated;
GRANT ALL ON public.blockchain_settings TO service_role;
ALTER TABLE public.blockchain_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blockchain settings" ON public.blockchain_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert blockchain settings" ON public.blockchain_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update blockchain settings" ON public.blockchain_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blockchain_settings_set_updated_at BEFORE UPDATE ON public.blockchain_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.blockchain_settings (id) VALUES (1);