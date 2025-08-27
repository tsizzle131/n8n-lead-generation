-- Quick Database Fix for Audience Manager
-- Copy and paste this into Supabase SQL Editor to fix the "failed to accept link" error

-- Add missing columns to audience_urls table that the application expects
ALTER TABLE audience_urls 
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS total_contacts_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Make search_url_id nullable since we'll store URLs directly now
ALTER TABLE audience_urls ALTER COLUMN search_url_id DROP NOT NULL;

-- Add unique constraint on audience_id + url combination
ALTER TABLE audience_urls DROP CONSTRAINT IF EXISTS audience_urls_audience_id_url_key;
ALTER TABLE audience_urls ADD CONSTRAINT audience_urls_audience_id_url_key UNIQUE (audience_id, url);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audience_urls_url ON audience_urls(url);
CREATE INDEX IF NOT EXISTS idx_audience_urls_status ON audience_urls(status);

-- Success message
SELECT 'Database fix completed! Audience Manager should now work properly.' as result;