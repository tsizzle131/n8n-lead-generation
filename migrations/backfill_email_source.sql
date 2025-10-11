-- Migration: Backfill NULL email_source values in gmaps_businesses
-- Purpose: Fix email_source tracking bug where existing records have NULL values
-- Date: 2025-10-10
--
-- This migration analyzes existing business records and sets the email_source field
-- based on the available data and enrichment history.
--
-- Priority order:
-- 1. If email exists in gmaps_facebook_enrichments -> 'facebook'
-- 2. If email exists in business record -> 'google_maps'
-- 3. If no email -> 'not_found'

-- Start transaction
BEGIN;

-- Log initial state
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM gmaps_businesses WHERE email_source IS NULL;
    SELECT COUNT(*) INTO total_count FROM gmaps_businesses;
    RAISE NOTICE 'Starting migration: % records with NULL email_source out of % total records', null_count, total_count;
END $$;

-- Step 1: Update businesses that have Facebook enrichment with emails
-- These should be marked as 'facebook' source
UPDATE gmaps_businesses gb
SET
    email_source = 'facebook',
    updated_at = NOW()
FROM gmaps_facebook_enrichments gfe
WHERE
    gb.id = gfe.business_id
    AND gb.email_source IS NULL
    AND gfe.primary_email IS NOT NULL
    AND gfe.primary_email != '';

-- Log Step 1 results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Step 1: Updated % businesses with Facebook enrichment emails to email_source = facebook', updated_count;
END $$;

-- Step 2: Update businesses that have emails from Google Maps
-- These should be marked as 'google_maps' source
UPDATE gmaps_businesses
SET
    email_source = 'google_maps',
    updated_at = NOW()
WHERE
    email_source IS NULL
    AND email IS NOT NULL
    AND email != '';

-- Log Step 2 results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Step 2: Updated % businesses with Google Maps emails to email_source = google_maps', updated_count;
END $$;

-- Step 3: Update businesses with no emails
-- These should be marked as 'not_found'
UPDATE gmaps_businesses
SET
    email_source = 'not_found',
    updated_at = NOW()
WHERE
    email_source IS NULL
    AND (email IS NULL OR email = '');

-- Log Step 3 results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Step 3: Updated % businesses with no emails to email_source = not_found', updated_count;
END $$;

-- Verification: Check if any NULL values remain
DO $$
DECLARE
    remaining_nulls INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_nulls FROM gmaps_businesses WHERE email_source IS NULL;

    IF remaining_nulls > 0 THEN
        RAISE WARNING 'Migration incomplete: % records still have NULL email_source', remaining_nulls;
    ELSE
        RAISE NOTICE 'Migration successful: All email_source values backfilled';
    END IF;
END $$;

-- Final statistics
DO $$
DECLARE
    google_maps_count INTEGER;
    facebook_count INTEGER;
    not_found_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO google_maps_count FROM gmaps_businesses WHERE email_source = 'google_maps';
    SELECT COUNT(*) INTO facebook_count FROM gmaps_businesses WHERE email_source = 'facebook';
    SELECT COUNT(*) INTO not_found_count FROM gmaps_businesses WHERE email_source = 'not_found';
    SELECT COUNT(*) INTO total_count FROM gmaps_businesses;

    RAISE NOTICE '=== Final Statistics ===';
    RAISE NOTICE 'Google Maps: % (%.1f%%)', google_maps_count, (google_maps_count::FLOAT / total_count * 100);
    RAISE NOTICE 'Facebook: % (%.1f%%)', facebook_count, (facebook_count::FLOAT / total_count * 100);
    RAISE NOTICE 'Not Found: % (%.1f%%)', not_found_count, (not_found_count::FLOAT / total_count * 100);
    RAISE NOTICE 'Total: %', total_count;
END $$;

-- Commit transaction
COMMIT;

-- Create index on email_source for faster queries
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_email_source ON gmaps_businesses(email_source);

-- Add comment to document the field
COMMENT ON COLUMN gmaps_businesses.email_source IS 'Source of the email: google_maps (from initial scrape), facebook (from Facebook enrichment), not_found (no email discovered)';
