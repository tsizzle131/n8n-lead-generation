-- Migration: Create LinkedIn Enrichments Table for Phase 2.5
-- Creates table to store LinkedIn profile enrichment data and email verification results

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_business_id ON gmaps_linkedin_enrichments(business_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_campaign_id ON gmaps_linkedin_enrichments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_email_verified ON gmaps_linkedin_enrichments(email_verified);
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_is_safe ON gmaps_linkedin_enrichments(is_safe);
CREATE INDEX IF NOT EXISTS idx_linkedin_enrichments_email_status ON gmaps_linkedin_enrichments(email_status);

-- Add updated_at trigger
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

-- Add column to gmaps_businesses to track LinkedIn enrichment status
ALTER TABLE gmaps_businesses
ADD COLUMN IF NOT EXISTS linkedin_enriched BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_businesses_linkedin_enriched ON gmaps_businesses(linkedin_enriched);

-- Add comments for documentation
COMMENT ON TABLE gmaps_linkedin_enrichments IS 'Stores LinkedIn profile enrichment data and Bouncer email verification results (Phase 2.5)';
COMMENT ON COLUMN gmaps_linkedin_enrichments.email_score IS 'Bouncer email deliverability score (0-100)';
COMMENT ON COLUMN gmaps_linkedin_enrichments.is_safe IS 'Safe to use: deliverable status + score >= 70';
COMMENT ON COLUMN gmaps_linkedin_enrichments.profile_type IS 'LinkedIn profile type: company or personal';
