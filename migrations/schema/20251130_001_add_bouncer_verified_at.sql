-- ============================================================================
-- Migration: Add bouncer_verified_at field for email verification tracking
-- Date: 2025-11-30
-- Description: Adds timestamp for when Bouncer verified email addresses
-- ============================================================================

ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bouncer_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN gmaps_businesses.bouncer_verified_at IS 'Timestamp when email was verified by Bouncer API';

-- Index for tracking verification status
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_bouncer_verified
ON gmaps_businesses(bouncer_verified_at) WHERE bouncer_verified_at IS NOT NULL;
