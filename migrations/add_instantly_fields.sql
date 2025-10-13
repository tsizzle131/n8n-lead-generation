-- Add Instantly.ai integration fields to gmaps_campaigns table

-- Add fields for tracking Instantly exports
ALTER TABLE gmaps_campaigns
ADD COLUMN IF NOT EXISTS exported_to_instantly BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instantly_export_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS instantly_campaign_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmaps_campaigns_instantly
ON gmaps_campaigns(instantly_campaign_id)
WHERE instantly_campaign_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN gmaps_campaigns.instantly_campaign_id IS 'Instantly.ai campaign ID for tracking exports';
