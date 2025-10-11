-- ============================================================================
-- PHASE 2.5 COMPLETE MIGRATION: LinkedIn + Bouncer Integration
-- ============================================================================
-- This migration adds all required database schema for Phase 2.5
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql
-- ============================================================================

-- Step 1: Add linkedin_enriched column to gmaps_businesses
-- ============================================================================
ALTER TABLE gmaps_businesses
ADD COLUMN IF NOT EXISTS linkedin_enriched BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_businesses_linkedin_enriched
ON gmaps_businesses(linkedin_enriched);

COMMENT ON COLUMN gmaps_businesses.linkedin_enriched IS 'Tracks if business has been enriched with LinkedIn data (Phase 2.5)';


-- Step 2: Create LinkedIn Enrichments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmaps_linkedin_enrichments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

    -- LinkedIn Profile Data
    linkedin_url TEXT,
    profile_type VARCHAR(20), -- 'company' or 'personal'
    person_name TEXT,
    person_title TEXT,
    person_profile_url TEXT,
    company_name TEXT,
    location TEXT,
    connections INTEGER,

    -- Contact Information
    emails_found TEXT[], -- Array of emails found
    primary_email TEXT,
    email_source VARCHAR(50), -- 'linkedin_direct', 'generated', 'pattern_match'
    phone_numbers TEXT[],

    -- Email Verification (Bouncer API)
    email_verified BOOLEAN DEFAULT FALSE,
    email_status VARCHAR(50), -- 'deliverable', 'undeliverable', 'risky', 'unknown', 'accept_all'
    email_score INTEGER, -- 0-100 score from Bouncer
    is_safe BOOLEAN, -- Safe to use for outreach (deliverable + score >= 70)
    is_deliverable BOOLEAN,
    is_risky BOOLEAN,
    is_disposable BOOLEAN,
    is_role_based BOOLEAN,
    is_free_email BOOLEAN,

    -- Metadata
    enriched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_date TIMESTAMP WITH TIME ZONE,
    raw_verification_response JSONB, -- Full Bouncer API response
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Step 3: Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_business_id
ON gmaps_linkedin_enrichments(business_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_campaign_id
ON gmaps_linkedin_enrichments(campaign_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_email_verified
ON gmaps_linkedin_enrichments(email_verified);

CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_is_safe
ON gmaps_linkedin_enrichments(is_safe);

CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_email_status
ON gmaps_linkedin_enrichments(email_status);

CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_profile_type
ON gmaps_linkedin_enrichments(profile_type);


-- Step 4: Create updated_at Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_gmaps_linkedin_enrichments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gmaps_linkedin_enrichments_updated_at
    BEFORE UPDATE ON gmaps_linkedin_enrichments
    FOR EACH ROW
    EXECUTE FUNCTION update_gmaps_linkedin_enrichments_updated_at();


-- Step 5: Add Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS on the table
ALTER TABLE gmaps_linkedin_enrichments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read
CREATE POLICY IF NOT EXISTS "Allow authenticated read access"
ON gmaps_linkedin_enrichments
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow all authenticated users to insert
CREATE POLICY IF NOT EXISTS "Allow authenticated insert access"
ON gmaps_linkedin_enrichments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow all authenticated users to update
CREATE POLICY IF NOT EXISTS "Allow authenticated update access"
ON gmaps_linkedin_enrichments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow anon read access (for API)
CREATE POLICY IF NOT EXISTS "Allow anon read access"
ON gmaps_linkedin_enrichments
FOR SELECT
TO anon
USING (true);

-- Policy: Allow anon insert access (for API)
CREATE POLICY IF NOT EXISTS "Allow anon insert access"
ON gmaps_linkedin_enrichments
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow anon update access (for API)
CREATE POLICY IF NOT EXISTS "Allow anon update access"
ON gmaps_linkedin_enrichments
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);


-- Step 6: Add Documentation Comments
-- ============================================================================
COMMENT ON TABLE gmaps_linkedin_enrichments IS 'Stores LinkedIn profile enrichment data and Bouncer email verification results (Phase 2.5)';
COMMENT ON COLUMN gmaps_linkedin_enrichments.email_score IS 'Bouncer email deliverability score (0-100)';
COMMENT ON COLUMN gmaps_linkedin_enrichments.is_safe IS 'Safe to use: deliverable status + score >= 70';
COMMENT ON COLUMN gmaps_linkedin_enrichments.profile_type IS 'LinkedIn profile type: company or personal';
COMMENT ON COLUMN gmaps_linkedin_enrichments.email_source IS 'Source of email: linkedin_direct, generated, or pattern_match';
COMMENT ON COLUMN gmaps_linkedin_enrichments.raw_verification_response IS 'Complete JSON response from Bouncer API for debugging';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Phase 2.5 (LinkedIn + Bouncer) is now ready!
--
-- What was created:
--   ✅ linkedin_enriched column in gmaps_businesses
--   ✅ gmaps_linkedin_enrichments table with full schema
--   ✅ Performance indexes on key columns
--   ✅ updated_at trigger for automatic timestamp updates
--   ✅ Row Level Security (RLS) policies for API access
--   ✅ Documentation comments
--
-- Next steps:
--   1. Run a new campaign to test Phase 2.5 LinkedIn enrichment
--   2. Check results in gmaps_linkedin_enrichments table
--   3. Verify Bouncer email verification data is being saved
-- ============================================================================
