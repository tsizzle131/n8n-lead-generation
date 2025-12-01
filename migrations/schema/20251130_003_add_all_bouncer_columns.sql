-- ============================================================================
-- Migration: Add ALL Bouncer verification and LinkedIn enrichment columns
-- Date: 2025-11-30
-- Description: Comprehensive migration for all missing email verification fields
-- NOTE: bouncer_verified_at and email_verified were added in previous migrations
-- ============================================================================

-- ============================================================================
-- PART 1: gmaps_businesses table columns
-- ============================================================================

-- Bouncer verification core fields
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bouncer_status TEXT;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bouncer_score NUMERIC;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bouncer_reason TEXT;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bouncer_raw_response JSONB;

-- Email quality flags from Bouncer
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS is_safe BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS is_disposable BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS is_role_based BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS is_free_email BOOLEAN DEFAULT FALSE;

-- LinkedIn enrichment tracking
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS linkedin_enriched BOOLEAN DEFAULT FALSE;

-- Email source tracking
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS email_verified_source TEXT;

-- Comments for documentation
COMMENT ON COLUMN gmaps_businesses.bouncer_status IS 'Bouncer API verification status (deliverable, undeliverable, risky, unknown)';
COMMENT ON COLUMN gmaps_businesses.bouncer_score IS 'Bouncer confidence score (0-100)';
COMMENT ON COLUMN gmaps_businesses.bouncer_reason IS 'Reason for Bouncer status (e.g., accepted_email, invalid_domain)';
COMMENT ON COLUMN gmaps_businesses.bouncer_raw_response IS 'Full JSON response from Bouncer API';
COMMENT ON COLUMN gmaps_businesses.is_safe IS 'Whether email is considered safe to send';
COMMENT ON COLUMN gmaps_businesses.is_disposable IS 'Whether email uses a disposable email provider';
COMMENT ON COLUMN gmaps_businesses.is_role_based IS 'Whether email is role-based (info@, sales@, etc.)';
COMMENT ON COLUMN gmaps_businesses.is_free_email IS 'Whether email uses free provider (gmail, yahoo, etc.)';
COMMENT ON COLUMN gmaps_businesses.linkedin_enriched IS 'Whether LinkedIn enrichment has been attempted';
COMMENT ON COLUMN gmaps_businesses.email_verified_source IS 'Source of email verification (linkedin_public, pattern_generated, etc.)';

-- ============================================================================
-- PART 2: gmaps_linkedin_enrichments table columns
-- ============================================================================

-- Bouncer verification fields for LinkedIn-found emails
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS bouncer_status TEXT;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS bouncer_score NUMERIC;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS bouncer_reason TEXT;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS bouncer_verified_at TIMESTAMPTZ;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS bouncer_raw_response JSONB;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Email quality flags
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS is_safe BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS is_disposable BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS is_role_based BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS is_free_email BOOLEAN DEFAULT FALSE;

-- Email extraction tracking
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS email_extraction_attempted BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS email_verified_source TEXT;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE gmaps_linkedin_enrichments ADD COLUMN IF NOT EXISTS email_quality_tier TEXT;

-- Comments
COMMENT ON COLUMN gmaps_linkedin_enrichments.bouncer_status IS 'Bouncer API verification status';
COMMENT ON COLUMN gmaps_linkedin_enrichments.bouncer_score IS 'Bouncer confidence score (0-100)';
COMMENT ON COLUMN gmaps_linkedin_enrichments.email_verified IS 'Whether email was verified as deliverable';
COMMENT ON COLUMN gmaps_linkedin_enrichments.email_quality_tier IS 'Email quality tier (linkedin_verified, pattern_generated, etc.)';

-- ============================================================================
-- PART 3: Useful indexes for querying
-- ============================================================================

-- Index for finding verified safe emails
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_safe_emails
ON gmaps_businesses(is_safe) WHERE is_safe = TRUE AND email IS NOT NULL;

-- Index for LinkedIn enrichment status
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_linkedin_enriched
ON gmaps_businesses(linkedin_enriched) WHERE linkedin_enriched = TRUE;

-- Index for disposable email filtering
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_not_disposable
ON gmaps_businesses(is_disposable) WHERE is_disposable = FALSE AND email IS NOT NULL;
