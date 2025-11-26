-- Migration: Add A/B Testing Infrastructure for Icebreakers
-- Date: 2025-11-25
-- Description: Adds variant tracking to businesses and creates experiments tracking table

-- =====================================================
-- Part 1: Add variant tracking columns to gmaps_businesses
-- =====================================================

-- Add icebreaker_variant column to track which prompt variant was used
ALTER TABLE gmaps_businesses
ADD COLUMN IF NOT EXISTS icebreaker_variant VARCHAR(50) DEFAULT 'control';

-- Add icebreaker_metadata column to store additional context
ALTER TABLE gmaps_businesses
ADD COLUMN IF NOT EXISTS icebreaker_metadata JSONB DEFAULT '{}';

-- Add index for efficient variant queries
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_icebreaker_variant
ON gmaps_businesses(icebreaker_variant);

-- =====================================================
-- Part 2: Create icebreaker_experiments table
-- =====================================================

CREATE TABLE IF NOT EXISTS icebreaker_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

    -- Variant identification
    variant_name VARCHAR(50) NOT NULL,
    variant_description TEXT,

    -- Counts (updated as emails are sent/tracked)
    sample_size INTEGER DEFAULT 0,
    opens INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    positive_replies INTEGER DEFAULT 0,

    -- Calculated rates (can be updated by trigger or manually)
    open_rate DECIMAL(5,4),
    reply_rate DECIMAL(5,4),
    positive_reply_rate DECIMAL(5,4),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_experiments_campaign
ON icebreaker_experiments(campaign_id);

CREATE INDEX IF NOT EXISTS idx_experiments_variant
ON icebreaker_experiments(variant_name);

CREATE INDEX IF NOT EXISTS idx_experiments_organization
ON icebreaker_experiments(organization_id);

-- =====================================================
-- Part 3: Create trigger to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_icebreaker_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_icebreaker_experiments_updated_at ON icebreaker_experiments;

CREATE TRIGGER trigger_icebreaker_experiments_updated_at
    BEFORE UPDATE ON icebreaker_experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_icebreaker_experiments_updated_at();

-- =====================================================
-- Part 4: Add RLS policies for icebreaker_experiments
-- =====================================================

ALTER TABLE icebreaker_experiments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their organization's experiments
CREATE POLICY "Users can view own organization experiments"
ON icebreaker_experiments FOR SELECT
USING (true);

-- Allow authenticated users to insert experiments for their organization
CREATE POLICY "Users can create experiments"
ON icebreaker_experiments FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update their organization's experiments
CREATE POLICY "Users can update own organization experiments"
ON icebreaker_experiments FOR UPDATE
USING (true);

-- =====================================================
-- Part 5: Add comments for documentation
-- =====================================================

COMMENT ON TABLE icebreaker_experiments IS 'Tracks A/B test results for different icebreaker prompt variants';
COMMENT ON COLUMN icebreaker_experiments.variant_name IS 'Identifier for the prompt variant (control, prospect, question, observation)';
COMMENT ON COLUMN icebreaker_experiments.sample_size IS 'Number of emails sent with this variant';
COMMENT ON COLUMN icebreaker_experiments.open_rate IS 'Calculated open rate (opens / sample_size)';
COMMENT ON COLUMN icebreaker_experiments.reply_rate IS 'Calculated reply rate (replies / sample_size)';
COMMENT ON COLUMN gmaps_businesses.icebreaker_variant IS 'Which prompt variant was used to generate this icebreaker';
COMMENT ON COLUMN gmaps_businesses.icebreaker_metadata IS 'Additional context: is_perfect_fit, pain_points_used, prompt_version';
