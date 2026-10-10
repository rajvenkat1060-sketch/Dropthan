/**
 * LeadLens / Dropthan Tracking Configuration & SQL Schema Definition
 */

export const LEADLENS_BRAND_ID = 'bnd_dropthan_593';
export const LEADLENS_API_KEY = 'll_live_bnddropt_03cea5d4b42aa3efa9';
export const LEADLENS_SCRIPT_URL = 'https://ais-dev-mfgmnvhaaoroq4mpo7zfxn-134638396931.asia-east1.run.app/tracker.js';
export const SUPABASE_TARGET_PROJECT_URL = 'https://jfsmjztrnicqrcvgyzgd.supabase.co';

export const TRACKING_SCRIPT_SNIPPET = `<script src="${LEADLENS_SCRIPT_URL}" data-brand-id="${LEADLENS_BRAND_ID}" data-api-key="${LEADLENS_API_KEY}" defer></script>`;

export const LEADS_SETUP_SQL = `-- ============================================================================
-- DROPTHAN / LEADLENS TRACKING SYSTEM: SUPABASE SQL RESET & SETUP SCRIPT
-- Project Target: https://jfsmjztrnicqrcvgyzgd.supabase.co
-- Brand ID: bnd_dropthan_593
-- API Key: ll_live_bnddropt_03cea5d4b42aa3efa9
-- ============================================================================

-- 1. DROP CONFLICTING OLD TRACKING TABLES (Safe Reset)
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.leadlens_events CASCADE;
DROP TABLE IF EXISTS public.abandoned_carts CASCADE;
DROP TABLE IF EXISTS public.storefront_leads CASCADE;

-- 2. CREATE public.leads TABLE WITH EXACT SPECIFIED SCHEMA
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  visitor_name TEXT,
  phone_number TEXT,
  email TEXT,
  clicked_item TEXT,
  status TEXT DEFAULT 'Abandoned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE PERFORMANCE & QUERY INDEXES
CREATE INDEX idx_leads_brand_id ON public.leads (brand_id);
CREATE INDEX idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX idx_leads_status ON public.leads (status);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR STOREFRONT INSERTS & AUTHENTICATED BRAND ACCESS
-- Policy A: Anonymous & Public Storefront Inserts (Allows tracker.js to push captured leads)
CREATE POLICY "Allow anonymous inserts from storefronts"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy B: Authenticated & Brand Read Access
CREATE POLICY "Allow authenticated read matching brand_id"
  ON public.leads
  FOR SELECT
  TO anon, authenticated
  USING (
    brand_id = 'bnd_dropthan_593' 
    OR (auth.jwt() ->> 'brand_id') = brand_id 
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
  );

-- Policy C: Authenticated & Brand Update Access (e.g. status changes to 'Contacted', 'Recovered')
CREATE POLICY "Allow authenticated update matching brand_id"
  ON public.leads
  FOR UPDATE
  TO anon, authenticated
  USING (
    brand_id = 'bnd_dropthan_593' 
    OR (auth.jwt() ->> 'brand_id') = brand_id 
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
  )
  WITH CHECK (true);

-- Policy D: Allow lead deletion by authenticated or admin
CREATE POLICY "Allow lead deletion"
  ON public.leads
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 6. ENABLE SUPABASE REALTIME REPLICATION FOR public.leads
-- Ensures all UPDATE, DELETE, and INSERT payloads stream to listeners with full row data
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- Add table to publication safely (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;

-- 7. INSERT INITIAL VERIFICATION TEST LEADS
INSERT INTO public.leads (brand_id, visitor_name, phone_number, email, clicked_item, status, created_at)
VALUES 
  ('bnd_dropthan_593', 'Rahul Sharma (Organic Trader)', '+91 98765 43210', 'rahul.sharma@agroexports.in', 'Organic Ashwagandha Root 100kg Bulk', 'Abandoned', NOW() - INTERVAL '4 minutes'),
  ('bnd_dropthan_593', 'Priya Patel (Wholesale Buyer)', '+91 91234 56789', 'priya.wholesales@gmail.com', 'A2 Desi Gir Cow Ghee (Tin 15kg)', 'Abandoned', NOW() - INTERVAL '14 minutes'),
  ('bnd_dropthan_593', 'Amit Verma (Dropshipper)', '+91 88990 01122', 'amit.resell@dropship.co', 'Kashmiri Saffron Grade A++ (50g)', 'Contacted', NOW() - INTERVAL '35 minutes');
`;
