-- Manual Database Fix for Audience Manager
-- Copy and paste this into your Supabase SQL Editor to fix the "failed to accept link" error

-- This will restructure the audience_urls table to match what the application expects
-- The app expects audience_urls to directly store URLs with notes, not reference search_urls

-- Step 1: Drop the existing audience_urls table (backup data first if needed)
DROP TABLE IF EXISTS audience_urls CASCADE;

-- Step 2: Recreate audience_urls table with the structure the application expects
CREATE TABLE audience_urls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
    
    -- Direct URL storage (what the app expects)
    url TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    total_contacts_found INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    UNIQUE(audience_id, url)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audience_urls_org_id ON audience_urls(organization_id);
CREATE INDEX IF NOT EXISTS idx_audience_urls_audience_id ON audience_urls(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_urls_status ON audience_urls(status);
CREATE INDEX IF NOT EXISTS idx_audience_urls_url ON audience_urls(url);

-- Step 4: Update the audiences table to ensure it has the right structure
-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check and add total_urls column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'total_urls'
    ) THEN
        ALTER TABLE audiences ADD COLUMN total_urls INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add estimated_contacts column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'estimated_contacts'
    ) THEN
        ALTER TABLE audiences ADD COLUMN estimated_contacts INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'status'
    ) THEN
        ALTER TABLE audiences ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- Check and add scraping_progress column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'scraping_progress'
    ) THEN
        ALTER TABLE audiences ADD COLUMN scraping_progress INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add last_scraped_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'last_scraped_at'
    ) THEN
        ALTER TABLE audiences ADD COLUMN last_scraped_at TIMESTAMPTZ;
    END IF;
    
    -- Check and add error_message column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audiences' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE audiences ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Step 5: Insert a test organization if none exists
INSERT INTO organizations (name, slug, description, contact_email)
SELECT 'Demo Organization', 'demo-org', 'Default organization for testing', 'demo@example.com'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'demo-org');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== DATABASE FIX COMPLETED ===';
    RAISE NOTICE 'Fixed audience_urls table structure to match application expectations';
    RAISE NOTICE 'The Audience Manager should now work properly for adding Apollo links';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Go to Audience Manager in your app';
    RAISE NOTICE '2. Create a new audience';
    RAISE NOTICE '3. Add Apollo URLs - this should now work without errors';
END $$;