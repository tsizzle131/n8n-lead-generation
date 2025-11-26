-- ============================================================================
-- Migration: Create Master Leads Materialized View
-- Date: 2025-11-25
-- Description: Creates a deduplicated master database of all businesses across
--              all organizations, with best email selection and contribution tracking
-- ============================================================================

-- ============================================================================
-- Part 1: Create the Materialized View
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS master_leads AS
WITH ranked_businesses AS (
    -- Rank businesses by place_id, preferring records with email and most recent
    SELECT
        b.*,
        c.organization_id,
        o.name as organization_name,
        ROW_NUMBER() OVER (
            PARTITION BY b.place_id
            ORDER BY
                CASE WHEN b.email IS NOT NULL THEN 0 ELSE 1 END,
                b.updated_at DESC
        ) as rn
    FROM gmaps_businesses b
    JOIN gmaps_campaigns c ON b.campaign_id = c.id
    JOIN organizations o ON c.organization_id = o.id
),
-- Track which organizations contributed to each business
org_contributions AS (
    SELECT
        b.place_id,
        ARRAY_AGG(DISTINCT c.organization_id) as contributing_org_ids,
        ARRAY_AGG(DISTINCT o.name) as contributing_org_names,
        COUNT(DISTINCT c.organization_id) as org_count,
        COUNT(DISTINCT c.id) as campaign_count
    FROM gmaps_businesses b
    JOIN gmaps_campaigns c ON b.campaign_id = c.id
    JOIN organizations o ON c.organization_id = o.id
    GROUP BY b.place_id
),
-- Get best email from all enrichment sources
best_emails AS (
    SELECT DISTINCT ON (b.place_id)
        b.place_id,
        COALESCE(
            CASE WHEN le.is_safe = true THEN le.primary_email END,
            le.primary_email,
            fe.primary_email,
            b.email
        ) as best_email,
        CASE
            WHEN le.is_safe = true THEN 'linkedin_verified'
            WHEN le.primary_email IS NOT NULL THEN 'linkedin'
            WHEN fe.primary_email IS NOT NULL THEN 'facebook'
            WHEN b.email IS NOT NULL THEN 'google_maps'
            ELSE 'not_found'
        END as best_email_source,
        le.bouncer_status,
        COALESCE(le.is_safe, false) as email_verified
    FROM gmaps_businesses b
    LEFT JOIN gmaps_linkedin_enrichments le ON le.business_id = b.id
    LEFT JOIN gmaps_facebook_enrichments fe ON fe.business_id = b.id
    ORDER BY b.place_id,
        CASE WHEN le.is_safe = true THEN 1
             WHEN le.primary_email IS NOT NULL THEN 2
             WHEN fe.primary_email IS NOT NULL THEN 3
             WHEN b.email IS NOT NULL THEN 4
             ELSE 5 END
)
SELECT
    -- Core identification
    rb.place_id,
    rb.name,

    -- Location
    rb.address,
    rb.city,
    rb.state,
    rb.postal_code,
    rb.latitude,
    rb.longitude,

    -- Contact
    rb.phone,
    rb.website,
    be.best_email as email,
    be.best_email_source as email_source,
    be.bouncer_status,
    be.email_verified,

    -- Category (primary column as requested)
    rb.category,
    rb.categories,

    -- Business metrics
    rb.rating,
    rb.reviews_count,

    -- Social URLs
    rb.facebook_url,
    rb.linkedin_url,
    rb.instagram_url,
    rb.twitter_url,

    -- Contribution tracking
    oc.contributing_org_ids,
    oc.contributing_org_names,
    oc.org_count,
    oc.campaign_count,

    -- Timestamps
    rb.scraped_at as first_seen,
    rb.updated_at as last_updated,
    NOW() as view_refreshed_at

FROM ranked_businesses rb
JOIN org_contributions oc ON rb.place_id = oc.place_id
LEFT JOIN best_emails be ON rb.place_id = be.place_id
WHERE rb.rn = 1;

-- ============================================================================
-- Part 2: Create Indexes for Efficient Querying
-- ============================================================================

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_leads_place_id
ON master_leads(place_id);

-- Category filtering (primary use case)
CREATE INDEX IF NOT EXISTS idx_master_leads_category
ON master_leads(category);

-- Location-based queries
CREATE INDEX IF NOT EXISTS idx_master_leads_city_state
ON master_leads(city, state);

CREATE INDEX IF NOT EXISTS idx_master_leads_postal_code
ON master_leads(postal_code);

-- Email availability (common filter)
CREATE INDEX IF NOT EXISTS idx_master_leads_email
ON master_leads(email) WHERE email IS NOT NULL;

-- Verified emails only
CREATE INDEX IF NOT EXISTS idx_master_leads_verified
ON master_leads(email_verified) WHERE email_verified = true;

-- ============================================================================
-- Part 3: Create Refresh Function
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_master_leads()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY master_leads;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 4: Create Stats Function for Dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_master_leads_stats()
RETURNS TABLE(
    total_leads BIGINT,
    leads_with_email BIGINT,
    leads_verified BIGINT,
    total_categories BIGINT,
    top_categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE ml.email IS NOT NULL)::BIGINT,
        COUNT(*) FILTER (WHERE ml.email_verified = true)::BIGINT,
        COUNT(DISTINCT ml.category)::BIGINT,
        (SELECT jsonb_agg(cat_stats ORDER BY cnt DESC) FROM (
            SELECT jsonb_build_object('category', ml2.category, 'count', COUNT(*)) as cat_stats, COUNT(*) as cnt
            FROM master_leads ml2
            WHERE ml2.category IS NOT NULL
            GROUP BY ml2.category
            ORDER BY COUNT(*) DESC
            LIMIT 15
        ) top)::JSONB
    FROM master_leads ml;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 5: Grant Permissions
-- ============================================================================

GRANT SELECT ON master_leads TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_master_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION get_master_leads_stats() TO authenticated;

-- ============================================================================
-- Part 6: Add Comments for Documentation
-- ============================================================================

COMMENT ON MATERIALIZED VIEW master_leads IS
    'Deduplicated master database of all businesses across all organizations. Refresh after campaign completion.';
COMMENT ON COLUMN master_leads.place_id IS
    'Google Maps Place ID - unique identifier for deduplication';
COMMENT ON COLUMN master_leads.category IS
    'Primary business category from Google Maps';
COMMENT ON COLUMN master_leads.email IS
    'Best available email (priority: LinkedIn verified > LinkedIn > Facebook > Google Maps)';
COMMENT ON COLUMN master_leads.email_source IS
    'Source of the email: linkedin_verified, linkedin, facebook, google_maps, or not_found';
COMMENT ON COLUMN master_leads.contributing_org_ids IS
    'Array of organization UUIDs that contributed data for this business';
COMMENT ON COLUMN master_leads.contributing_org_names IS
    'Array of organization names that contributed data for this business';
COMMENT ON COLUMN master_leads.org_count IS
    'Number of distinct organizations that found this business';
COMMENT ON COLUMN master_leads.campaign_count IS
    'Total number of campaigns that included this business';
