-- ============================================================================
-- Migration: Add Demographics to Master Leads View
-- Date: 2025-11-26
-- Description: Enhances master_leads materialized view with ZIP demographics
--              data via LEFT JOIN to zip_demographics table
-- Prerequisites:
--   - 20251125_002_create_master_leads_view.sql (creates master_leads)
--   - 20251126_001_create_zip_demographics.sql (creates zip_demographics)
--   - Import script must have populated zip_demographics with data
-- ============================================================================

-- ============================================================================
-- Part 1: Drop and Recreate the Enhanced Materialized View
-- ============================================================================

-- Drop existing view and indexes
DROP MATERIALIZED VIEW IF EXISTS master_leads CASCADE;

-- Create enhanced view with demographic data
CREATE MATERIALIZED VIEW master_leads AS
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

    -- =========================================================================
    -- NEW: Demographics from zip_demographics
    -- =========================================================================
    zd.population as zip_population,
    zd.median_household_income as zip_median_income,
    zd.population_density as zip_population_density,
    zd.median_home_value as zip_home_value,
    zd.market_opportunity_score as zip_market_score,
    zd.lead_quality_tier as zip_quality_tier,
    zd.email_rate as zip_email_rate,
    zd.total_businesses as zip_total_businesses,

    -- =========================================================================
    -- NEW: Lead Priority Score
    -- Combines email verification status with market opportunity
    -- =========================================================================
    CASE
        WHEN be.email_verified = true AND zd.lead_quality_tier = 'A' THEN 'Hot'
        WHEN be.best_email IS NOT NULL AND zd.lead_quality_tier IN ('A', 'B') THEN 'Warm'
        WHEN be.best_email IS NOT NULL THEN 'Standard'
        ELSE 'Cold'
    END as lead_priority,

    NOW() as view_refreshed_at

FROM ranked_businesses rb
JOIN org_contributions oc ON rb.place_id = oc.place_id
LEFT JOIN best_emails be ON rb.place_id = be.place_id
LEFT JOIN zip_demographics zd ON rb.postal_code = zd.zip_code  -- NEW JOIN
WHERE rb.rn = 1;

-- ============================================================================
-- Part 2: Recreate All Indexes (Including New Demographic Indexes)
-- ============================================================================

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_master_leads_place_id
ON master_leads(place_id);

-- Category filtering (primary use case)
CREATE INDEX idx_master_leads_category
ON master_leads(category);

-- Location-based queries
CREATE INDEX idx_master_leads_city_state
ON master_leads(city, state);

CREATE INDEX idx_master_leads_postal_code
ON master_leads(postal_code);

-- Email availability (common filter)
CREATE INDEX idx_master_leads_email
ON master_leads(email) WHERE email IS NOT NULL;

-- Verified emails only
CREATE INDEX idx_master_leads_verified
ON master_leads(email_verified) WHERE email_verified = true;

-- NEW: Demographic indexes
CREATE INDEX idx_master_leads_market_score
ON master_leads(zip_market_score DESC) WHERE zip_market_score IS NOT NULL;

CREATE INDEX idx_master_leads_quality_tier
ON master_leads(zip_quality_tier);

CREATE INDEX idx_master_leads_lead_priority
ON master_leads(lead_priority);

CREATE INDEX idx_master_leads_zip_income
ON master_leads(zip_median_income DESC) WHERE zip_median_income IS NOT NULL;

-- ============================================================================
-- Part 3: Update Stats Function (Include Demographics)
-- ============================================================================

-- Must drop first because we're changing the return type
DROP FUNCTION IF EXISTS get_master_leads_stats();

CREATE OR REPLACE FUNCTION get_master_leads_stats()
RETURNS TABLE(
    total_leads BIGINT,
    leads_with_email BIGINT,
    leads_verified BIGINT,
    total_categories BIGINT,
    top_categories JSONB,
    -- NEW: Demographic stats
    avg_market_score DECIMAL,
    tier_a_leads BIGINT,
    tier_b_leads BIGINT,
    hot_leads BIGINT,
    warm_leads BIGINT
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
        ) top)::JSONB,
        -- NEW: Demographic stats
        AVG(ml.zip_market_score)::DECIMAL as avg_market_score,
        COUNT(*) FILTER (WHERE ml.zip_quality_tier = 'A')::BIGINT as tier_a_leads,
        COUNT(*) FILTER (WHERE ml.zip_quality_tier = 'B')::BIGINT as tier_b_leads,
        COUNT(*) FILTER (WHERE ml.lead_priority = 'Hot')::BIGINT as hot_leads,
        COUNT(*) FILTER (WHERE ml.lead_priority = 'Warm')::BIGINT as warm_leads
    FROM master_leads ml;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 4: Grant Permissions
-- ============================================================================

GRANT SELECT ON master_leads TO authenticated;
GRANT EXECUTE ON FUNCTION get_master_leads_stats() TO authenticated;

-- ============================================================================
-- Part 5: Update Documentation
-- ============================================================================

COMMENT ON MATERIALIZED VIEW master_leads IS
    'Deduplicated master database of all businesses across all organizations with ZIP demographics. Refresh after campaign completion.';

COMMENT ON COLUMN master_leads.zip_population IS
    'Population of the business ZIP code area';

COMMENT ON COLUMN master_leads.zip_median_income IS
    'Median household income in the business ZIP code area';

COMMENT ON COLUMN master_leads.zip_market_score IS
    'Market opportunity score (0-100) for the ZIP code based on income, email rate, and business density';

COMMENT ON COLUMN master_leads.zip_quality_tier IS
    'Quality tier (A/B/C/D) for the ZIP code. A=70+, B=50-69, C=30-49, D=<30 market score';

COMMENT ON COLUMN master_leads.lead_priority IS
    'Calculated lead priority: Hot (verified email + tier A), Warm (has email + tier A/B), Standard (has email), Cold (no email)';

COMMENT ON COLUMN master_leads.zip_email_rate IS
    'Historical email discovery rate for this ZIP code (0.0-1.0)';
