-- ============================================================================
-- Migration: Add email_verified field for email verification status
-- Date: 2025-11-30
-- Description: Adds boolean flag for email verification from Bouncer API
-- ============================================================================

ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN gmaps_businesses.email_verified IS 'Whether email was verified as deliverable by Bouncer API';

-- Index for filtering verified emails
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_email_verified
ON gmaps_businesses(email_verified) WHERE email_verified = TRUE;
