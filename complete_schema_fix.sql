-- ============================================================================
-- Complete Schema Fix for Audience-Contact Linking
-- ============================================================================
-- This script fixes the missing audience_id column and migrates existing data

-- Step 1: Add the missing audience_id column to raw_contacts table
ALTER TABLE raw_contacts 
ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_raw_contacts_audience_id ON raw_contacts(audience_id);

-- Step 3: Migrate existing data from the completed scrape
-- Update contacts from the completed Apollo search to link to the audience
UPDATE raw_contacts 
SET audience_id = 'f08913d0-b585-4730-b559-d2f76ed9ab3b'
WHERE search_url_id = 'f3ee6623-482d-4edf-a5a0-35a4f4c46618'
AND audience_id IS NULL;

-- Step 4: Verify the migration
-- This should return the count of contacts now linked to the audience
SELECT COUNT(*) as linked_contacts 
FROM raw_contacts 
WHERE audience_id = 'f08913d0-b585-4730-b559-d2f76ed9ab3b';

-- Step 5: Update any other search URLs that should be linked to audiences
-- (This can be expanded as needed for other audience-search URL relationships)

-- Step 6: Add audience_id to contacts table if it doesn't exist
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_audience_id ON contacts(audience_id);

-- ============================================================================
-- Verification Queries (run these to check the fix worked)
-- ============================================================================

-- Check if column exists and has data
SELECT 
    COUNT(*) as total_contacts,
    COUNT(audience_id) as contacts_with_audience,
    COUNT(DISTINCT audience_id) as unique_audiences
FROM raw_contacts;

-- Check specific audience contact count
SELECT 
    a.id,
    a.name,
    COUNT(rc.id) as contact_count
FROM audiences a
LEFT JOIN raw_contacts rc ON a.id = rc.audience_id
GROUP BY a.id, a.name;

-- ============================================================================
-- Notes:
-- 1. Run this SQL in your Supabase dashboard SQL editor
-- 2. The audience ID 'f08913d0-b585-4730-b559-d2f76ed9ab3b' is the Apollo Test audience
-- 3. The search URL ID 'f3ee6623-482d-4edf-a5a0-35a4f4c46618' contains the 1000+ scraped contacts
-- ============================================================================