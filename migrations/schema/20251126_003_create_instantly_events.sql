-- ============================================================================
-- Migration: Create Instantly Events Table for Webhook Integration
-- Date: 2025-11-26
-- Description: Stores engagement events from Instantly.ai webhooks (opens,
--              clicks, replies, bounces) with multi-organization support
-- Prerequisites:
--   - organizations table exists
--   - gmaps_campaigns table exists
--   - gmaps_businesses table exists
-- ============================================================================

-- ============================================================================
-- Part 1: Create instantly_events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS instantly_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Organization (from webhook URL path parameter)
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event identification
    event_type VARCHAR(50) NOT NULL,  -- email_opened, reply_received, link_clicked, email_bounced, lead_unsubscribed
    event_timestamp TIMESTAMPTZ NOT NULL,

    -- Instantly identifiers
    instantly_workspace_id TEXT,  -- workspace UUID from payload
    instantly_campaign_id TEXT NOT NULL,
    instantly_campaign_name TEXT,
    lead_email TEXT NOT NULL,
    email_account TEXT,  -- sender email
    unibox_url TEXT,  -- link to Instantly unibox for replies

    -- Link to our data (resolved at insert time)
    campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE SET NULL,
    business_id UUID REFERENCES gmaps_businesses(id) ON DELETE SET NULL,

    -- Raw payload for debugging/auditing
    raw_payload JSONB,

    -- Deduplication (hash of org_id + event_type + timestamp + lead_email)
    event_hash TEXT UNIQUE,

    -- Metadata
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Part 2: Indexes for Fast Lookups
-- ============================================================================

-- Organization filtering (most common query pattern)
CREATE INDEX idx_instantly_events_org ON instantly_events(organization_id);

-- Email lookups (for matching to businesses)
CREATE INDEX idx_instantly_events_email ON instantly_events(lead_email);

-- Campaign filtering
CREATE INDEX idx_instantly_events_campaign ON instantly_events(instantly_campaign_id);
CREATE INDEX idx_instantly_events_our_campaign ON instantly_events(campaign_id) WHERE campaign_id IS NOT NULL;

-- Event type filtering
CREATE INDEX idx_instantly_events_type ON instantly_events(event_type);

-- Time-based queries (recent events dashboard)
CREATE INDEX idx_instantly_events_timestamp ON instantly_events(event_timestamp DESC);

-- Business engagement lookups
CREATE INDEX idx_instantly_events_business ON instantly_events(business_id) WHERE business_id IS NOT NULL;

-- Composite index for org + time (common dashboard query)
CREATE INDEX idx_instantly_events_org_time ON instantly_events(organization_id, event_timestamp DESC);

-- ============================================================================
-- Part 3: Add Engagement Fields to gmaps_businesses
-- ============================================================================

-- Engagement status (current state of the lead)
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS engagement_status VARCHAR(20) DEFAULT 'not_sent';
-- Values: not_sent, sent, opened, clicked, replied, bounced, unsubscribed

-- Engagement score (0-100, with negatives for bounced/unsubscribed)
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0;

-- Last engagement timestamp
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMPTZ;

-- Engagement counters
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS total_opens INTEGER DEFAULT 0;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0;

-- Boolean flags for key events
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT FALSE;
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE;

-- First sent timestamp (when lead was first exported to Instantly)
ALTER TABLE gmaps_businesses ADD COLUMN IF NOT EXISTS first_sent_at TIMESTAMPTZ;

-- ============================================================================
-- Part 4: Indexes for Engagement Queries on gmaps_businesses
-- ============================================================================

-- Engagement status filtering
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_engagement
ON gmaps_businesses(engagement_status);

-- Find all replied leads (hot leads!)
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_replied
ON gmaps_businesses(replied) WHERE replied = true;

-- Find bounced leads (for cleanup)
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_bounced
ON gmaps_businesses(bounced) WHERE bounced = true;

-- Engagement score ranking
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_eng_score
ON gmaps_businesses(engagement_score DESC) WHERE engagement_score > 0;

-- ============================================================================
-- Part 5: RLS Policies for Organization Isolation
-- ============================================================================

-- Enable RLS on instantly_events
ALTER TABLE instantly_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see events for their organization
-- Note: This requires setting app.current_organization_id before queries
CREATE POLICY "instantly_events_org_read" ON instantly_events
    FOR SELECT USING (
        organization_id = COALESCE(
            NULLIF(current_setting('app.current_organization_id', true), '')::uuid,
            organization_id  -- If not set, allow (for service account/admin)
        )
    );

-- Policy: Allow insert from any org (webhook doesn't have auth context)
CREATE POLICY "instantly_events_org_insert" ON instantly_events
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- Part 6: Comments for Documentation
-- ============================================================================

COMMENT ON TABLE instantly_events IS
    'Stores email engagement events from Instantly.ai webhooks. Each organization has its own webhook URL.';

COMMENT ON COLUMN instantly_events.organization_id IS
    'Organization that owns this event, derived from webhook URL path parameter';

COMMENT ON COLUMN instantly_events.event_type IS
    'Type of event: email_opened, reply_received, link_clicked, email_bounced, lead_unsubscribed';

COMMENT ON COLUMN instantly_events.event_hash IS
    'MD5 hash of org_id + event_type + timestamp + lead_email for deduplication';

COMMENT ON COLUMN instantly_events.business_id IS
    'Resolved FK to gmaps_businesses by matching lead_email to business email';

COMMENT ON COLUMN gmaps_businesses.engagement_status IS
    'Current engagement state: not_sent, sent, opened, clicked, replied, bounced, unsubscribed';

COMMENT ON COLUMN gmaps_businesses.engagement_score IS
    'Calculated score: replied=100, clicked=50, opened=25 (max 75), bounced/unsub=-100';

-- ============================================================================
-- Part 7: Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT ON instantly_events TO authenticated;
GRANT SELECT, INSERT ON instantly_events TO anon;  -- For webhook (no auth)

-- ============================================================================
-- Migration Complete
-- ============================================================================
