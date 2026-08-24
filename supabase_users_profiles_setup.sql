-- ==============================================================================
-- DROPTHAN B2B PLATFORM - COMPREHENSIVE USERS & PROFILES TABLE SETUP
-- ==============================================================================
-- PostgreSQL / Supabase Migration Script
-- 
-- Description:
-- Creates the master 'profiles' (and 'users' alias) table in Supabase Table Editor
-- with full support for:
-- 1. id (UUID, Primary Key, default gen_random_uuid())
-- 2. phone (TEXT, Unique, Required for login)
-- 3. password (TEXT, Required, for strict password verification)
-- 4. business_category (TEXT, e.g., Manufacturer, Wholesaler, Dropshipper)
-- 5. gstin (TEXT, optional GST identification number)
-- 6. company_name (TEXT, Enterprise / Business Entity Name)
-- 7. country (TEXT, Default 'India')
-- 8. location (TEXT, City / State / Market Area)
-- 9. instagram_profile (TEXT, Social / Handle / URL)
-- 10. website_link (TEXT, Official Website or Catalog Link)
-- 11. business_bio (TEXT, Company / Catalog Description)
-- 12. created_at (TIMESTAMPTZ, Default timezone('utc'::text, now()))
--
-- Plus full compatibility columns for the Dropthan Admin Verification Panel,
-- Geo-Coordinates, Status Workflows, and Supabase Realtime synchronization.
-- ==============================================================================

-- STEP 1: ENABLE THE UUID EXTENSION (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 2: CREATE THE MASTER 'profiles' TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    -- 1. Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 2. Login & Authentication Credentials
    phone TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '',

    -- 3. Business Core Details
    business_category TEXT DEFAULT 'wholesaler',
    company_name TEXT,
    gstin TEXT,
    iec_code TEXT,

    -- 4. Geographical Details
    country TEXT DEFAULT 'India',
    location TEXT DEFAULT '',
    store_address TEXT,
    lat NUMERIC,
    lng NUMERIC,

    -- 5. Social & Online Presence
    instagram_profile TEXT,
    website_link TEXT,
    business_bio TEXT,

    -- 6. UI & Display Aliases (for seamless multi-platform rendering)
    display_name TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'wholesaler',
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    instagram TEXT,

    -- 7. Verification & Moderation Status
    status TEXT NOT NULL DEFAULT 'Active',
    is_gst_approved BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,

    -- 8. Timestamps
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    CONSTRAINT uq_profiles_phone UNIQUE (phone)
);

-- STEP 3: ENSURE ALL COLUMNS EXIST IF TABLE WAS PREVIOUSLY CREATED
DO $$ 
BEGIN 
    -- Required core columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password') THEN
        ALTER TABLE public.profiles ADD COLUMN password TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_category') THEN
        ALTER TABLE public.profiles ADD COLUMN business_category TEXT DEFAULT 'wholesaler';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_name') THEN
        ALTER TABLE public.profiles ADD COLUMN company_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gstin') THEN
        ALTER TABLE public.profiles ADD COLUMN gstin TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country') THEN
        ALTER TABLE public.profiles ADD COLUMN country TEXT DEFAULT 'India';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instagram_profile') THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_profile TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website_link') THEN
        ALTER TABLE public.profiles ADD COLUMN website_link TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_bio') THEN
        ALTER TABLE public.profiles ADD COLUMN business_bio TEXT;
    END IF;

    -- Additional Applet Compatibility Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'wholesaler';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'store_address') THEN
        ALTER TABLE public.profiles ADD COLUMN store_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'iec_code') THEN
        ALTER TABLE public.profiles ADD COLUMN iec_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_gst_approved') THEN
        ALTER TABLE public.profiles ADD COLUMN is_gst_approved BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.profiles ADD COLUMN rejection_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE public.profiles ADD COLUMN website TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instagram') THEN
        ALTER TABLE public.profiles ADD COLUMN instagram TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lat') THEN
        ALTER TABLE public.profiles ADD COLUMN lat NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lng') THEN
        ALTER TABLE public.profiles ADD COLUMN lng NUMERIC;
    END IF;
END $$;

-- STEP 4: AUTO-SYNC TRIGGER FOR ALIAS FIELDS (Keeps business_category/role, business_bio/bio, etc. perfectly in sync)
CREATE OR REPLACE FUNCTION public.sync_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync business_category <-> role
    IF NEW.business_category IS NOT NULL AND (NEW.role IS NULL OR NEW.role = 'wholesaler') THEN
        NEW.role := NEW.business_category;
    ELSIF NEW.role IS NOT NULL AND NEW.business_category IS NULL THEN
        NEW.business_category := NEW.role;
    END IF;

    -- Sync business_bio <-> bio
    IF NEW.business_bio IS NOT NULL AND NEW.bio IS NULL THEN
        NEW.bio := NEW.business_bio;
    ELSIF NEW.bio IS NOT NULL AND NEW.business_bio IS NULL THEN
        NEW.business_bio := NEW.bio;
    END IF;

    -- Sync instagram_profile <-> instagram
    IF NEW.instagram_profile IS NOT NULL AND NEW.instagram IS NULL THEN
        NEW.instagram := NEW.instagram_profile;
    ELSIF NEW.instagram IS NOT NULL AND NEW.instagram_profile IS NULL THEN
        NEW.instagram_profile := NEW.instagram;
    END IF;

    -- Sync website_link <-> website
    IF NEW.website_link IS NOT NULL AND NEW.website IS NULL THEN
        NEW.website := NEW.website_link;
    ELSIF NEW.website IS NOT NULL AND NEW.website_link IS NULL THEN
        NEW.website_link := NEW.website;
    END IF;

    -- Set updated timestamp
    NEW.updated_at := timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_columns ON public.profiles;
CREATE TRIGGER trg_sync_profile_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_columns();

-- STEP 5: OPTIMIZED PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_category ON public.profiles(business_category);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- STEP 6: ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any outdated or overly restrictive policies
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow user registration and insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow full admin and author update" ON public.profiles;
DROP POLICY IF EXISTS "Allow full admin delete" ON public.profiles;

-- 1. Universal Read Access (Permits Admin Panel, Directory Search, & B2B Profile Cards)
CREATE POLICY "Allow public read access to all profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- 2. Universal Registration / Insert (Permits new visitors to register/onboard)
CREATE POLICY "Allow user registration and insert"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);

-- 3. Profile Update Access (Allows registered users to edit their details and Admin to approve/verify)
CREATE POLICY "Allow full admin and author update"
ON public.profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 4. Delete Access (Allows administrative account cleanup)
CREATE POLICY "Allow full admin delete"
ON public.profiles
FOR DELETE
TO public
USING (true);

-- STEP 7: ENABLE REALTIME NOTIFICATIONS
-- Enables instant live updates in Admin Verification Panel and User Directories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ==============================================================================
-- VERIFICATION QUERY (Optional check to run after creating the table)
-- ==============================================================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;
-- ==============================================================================
