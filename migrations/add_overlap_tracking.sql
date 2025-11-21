-- Migration: Add overlap tracking to campaign coverage
-- Date: 2025-10-30
-- Purpose: Track ZIP code overlap and spacing metrics for optimization

-- Add overlap tracking columns to gmaps_campaign_coverage
ALTER TABLE gmaps_campaign_coverage
ADD COLUMN IF NOT EXISTS estimated_overlap_percent NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS adjacent_zips TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_spacing_miles NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_unique_businesses INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gmaps_campaign_coverage.estimated_overlap_percent IS 'Estimated percentage of businesses that overlap with other ZIPs in campaign';
COMMENT ON COLUMN gmaps_campaign_coverage.adjacent_zips IS 'Array of adjacent ZIP codes within 5 miles';
COMMENT ON COLUMN gmaps_campaign_coverage.min_spacing_miles IS 'Minimum spacing used when selecting this ZIP';
COMMENT ON COLUMN gmaps_campaign_coverage.actual_unique_businesses IS 'Count of unique businesses after deduplication';

-- Create index for faster overlap queries
CREATE INDEX IF NOT EXISTS idx_gmaps_campaign_coverage_overlap
ON gmaps_campaign_coverage(campaign_id, estimated_overlap_percent)
WHERE estimated_overlap_percent IS NOT NULL;

-- Add composite index for campaign + zip lookups
CREATE INDEX IF NOT EXISTS idx_gmaps_campaign_coverage_campaign_zip
ON gmaps_campaign_coverage(campaign_id, zip_code);

-- Add metadata tracking columns to gmaps_campaigns for overall metrics
ALTER TABLE gmaps_campaigns
ADD COLUMN IF NOT EXISTS overlap_reduction_percent NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS avg_spacing_miles NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_zips_selected INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_zips_available INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN gmaps_campaigns.overlap_reduction_percent IS 'Percentage reduction in ZIPs selected vs available (e.g., 40% means 40% fewer ZIPs selected)';
COMMENT ON COLUMN gmaps_campaigns.avg_spacing_miles IS 'Average distance between selected ZIP codes';
COMMENT ON COLUMN gmaps_campaigns.total_zips_selected IS 'Total number of ZIP codes selected for campaign';
COMMENT ON COLUMN gmaps_campaigns.total_zips_available IS 'Total number of ZIP codes available before filtering';
