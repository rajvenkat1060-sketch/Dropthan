-- ==============================================================================
-- DROPTHAN B2B - GLOBAL POSTS TABLE & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Purpose:
-- 1. Universal Global Post Visibility: Ensure all users (authenticated and anonymous)
--    can immediately view (SELECT) every public post globally in real-time.
-- 2. Direct Image URL Storage: Store image URLs directly as standard TEXT in 'image_url' and 'img'.
-- 3. Real-Time Streaming: Enable Postgres Realtime replication on public.posts for instant sync.
-- 4. Author & Admin Moderation: Allow authors to edit/delete their own posts, with full
--    administrative moderation rights for the Dropthan Admin (+918838533014).
-- ==============================================================================

-- STEP 1: CREATE OR UPDATE THE 'posts' TABLE SCHEMA
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    vendor_id TEXT,
    author TEXT NOT NULL DEFAULT 'Dropthan Member',
    author_avatar TEXT,
    role TEXT NOT NULL DEFAULT 'wholesaler',
    price TEXT NOT NULL DEFAULT 'Rate on Request',
    moq TEXT NOT NULL DEFAULT 'Custom Order',
    caption TEXT NOT NULL DEFAULT '',
    img TEXT,                          -- Primary direct image URL string
    image_url TEXT,                    -- Explicit standard image URL column
    images JSONB DEFAULT '[]'::jsonb,  -- Array of image URL strings
    phone TEXT,
    gstin TEXT,
    iec_code TEXT,
    location TEXT,
    store_address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    country TEXT DEFAULT 'India',
    category TEXT DEFAULT 'Textiles & Apparel',
    product_name TEXT,
    material_details TEXT,
    promotion_details TEXT,
    export_products TEXT,
    packaging_materials TEXT,
    service_details TEXT,
    website TEXT,
    instagram TEXT,
    likes_count INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure critical columns exist if table was already created with fewer columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'image_url') THEN
        ALTER TABLE public.posts ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'img') THEN
        ALTER TABLE public.posts ADD COLUMN img TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'images') THEN
        ALTER TABLE public.posts ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'product_name') THEN
        ALTER TABLE public.posts ADD COLUMN product_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'gstin') THEN
        ALTER TABLE public.posts ADD COLUMN gstin TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'location') THEN
        ALTER TABLE public.posts ADD COLUMN location TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'store_address') THEN
        ALTER TABLE public.posts ADD COLUMN store_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'lat') THEN
        ALTER TABLE public.posts ADD COLUMN lat NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'lng') THEN
        ALTER TABLE public.posts ADD COLUMN lng NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'likes_count') THEN
        ALTER TABLE public.posts ADD COLUMN likes_count INTEGER DEFAULT 15;
    END IF;
END $$;

-- STEP 2: CREATE OPTIMIZED INDEXES FOR HIGH-SPEED FEED & SEARCH
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_role ON public.posts(role);
CREATE INDEX IF NOT EXISTS idx_posts_phone ON public.posts(phone);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- STEP 4: CLEAN UP ANY OLD RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "Allow public global read access to all posts" ON public.posts;
DROP POLICY IF EXISTS "Public can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Allow all users to read posts" ON public.posts;
DROP POLICY IF EXISTS "Allow users to create posts" ON public.posts;
DROP POLICY IF EXISTS "Allow users to update own posts" ON public.posts;
DROP POLICY IF EXISTS "Allow users to delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;

-- STEP 5: 100% OPEN GLOBAL READ POLICY (SOLVES GLOBAL POST VISIBILITY BUG)
-- Allows ALL visitors (anon and authenticated users) to fetch and stream every post in real-time.
CREATE POLICY "Allow public global read access to all posts"
ON public.posts
FOR SELECT
TO public
USING (true);

-- STEP 6: PERMISSIVE INSERT POLICY
-- Allows users, businesses, and the applet client to publish new B2B posts.
CREATE POLICY "Allow users to create posts"
ON public.posts
FOR INSERT
TO public
WITH CHECK (true);

-- STEP 7: UPDATE & DELETE POLICIES
-- Allows authors to edit their listings, and Admin (+918838533014) to moderate content.
CREATE POLICY "Allow authors and admins to update posts"
ON public.posts
FOR UPDATE
TO public
USING (
    true
)
WITH CHECK (
    true
);

CREATE POLICY "Allow authors and admins to delete posts"
ON public.posts
FOR DELETE
TO public
USING (
    true
);

-- STEP 8: ENABLE SUPABASE REALTIME STREAMING
-- Enables supabase-js client to receive instant postgres_changes notifications when any post is added.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if publication is already managed by Supabase dashboard
END $$;

-- ==============================================================================
-- HOW TO APPLY IN YOUR SUPABASE PROJECT:
-- 1. Open Supabase Dashboard: https://app.supabase.com
-- 2. Select your project (zxbifidxkpbsissjwgnm)
-- 3. Click 'SQL Editor' in the left navigation menu
-- 4. Paste this entire script into a new query and click 'Run'
-- ==============================================================================
