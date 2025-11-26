-- ============================================================================
-- Migration: Create ZIP Demographics Table
-- Date: 2025-11-26
-- Description: Creates a comprehensive demographics table for all US ZIP codes
--              with market opportunity scoring for lead generation intelligence
-- ============================================================================

-- ============================================================================
-- Part 1: Create the ZIP Demographics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS zip_demographics (
    zip_code VARCHAR(5) PRIMARY KEY,

    -- Location
    city VARCHAR(100),
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100),
    timezone VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Population & Density
    population INTEGER DEFAULT 0,
    population_density DECIMAL(10, 2),  -- per sq mile
    land_area_sqmi DECIMAL(10, 4),
    housing_units INTEGER,

    -- Economic
    median_household_income INTEGER,
    median_home_value INTEGER,

    -- Business Metrics (calculated from master_leads)
    total_businesses INTEGER DEFAULT 0,
    businesses_with_email INTEGER DEFAULT 0,
    email_rate DECIMAL(5, 4),           -- 0.0000 to 1.0000
    business_density DECIMAL(10, 4),    -- businesses per sq mile
    avg_rating DECIMAL(3, 2),

    -- Scoring (calculated)
    market_opportunity_score DECIMAL(5, 2),  -- 0-100
    lead_quality_tier CHAR(1),               -- A, B, C, D

    -- Metadata
    data_source VARCHAR(50) DEFAULT 'uszipcode',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Part 2: Create Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_zip_demo_state
ON zip_demographics(state);

CREATE INDEX IF NOT EXISTS idx_zip_demo_city_state
ON zip_demographics(city, state);

CREATE INDEX IF NOT EXISTS idx_zip_demo_income
ON zip_demographics(median_household_income);

CREATE INDEX IF NOT EXISTS idx_zip_demo_population
ON zip_demographics(population);

CREATE INDEX IF NOT EXISTS idx_zip_demo_score
ON zip_demographics(market_opportunity_score DESC);

CREATE INDEX IF NOT EXISTS idx_zip_demo_tier
ON zip_demographics(lead_quality_tier);

CREATE INDEX IF NOT EXISTS idx_zip_demo_email_rate
ON zip_demographics(email_rate DESC);

CREATE INDEX IF NOT EXISTS idx_zip_demo_coords
ON zip_demographics(latitude, longitude);

-- ============================================================================
-- Part 3: Market Opportunity Score Function
-- ============================================================================
-- Scoring weights:
--   - Income (25%): $60k-120k optimal for small business services
--   - Email Rate (30%): Historical email discovery success - strongest predictor
--   - Business Density (20%): More businesses = more opportunity
--   - Population (15%): 10k-100k optimal for local businesses
--   - Avg Rating (10%): Quality of businesses in area
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_market_scores()
RETURNS void AS $$
BEGIN
    UPDATE zip_demographics SET
        market_opportunity_score = LEAST(100, GREATEST(0,
            -- Income Score (25% weight): $60k-120k optimal
            (CASE
                WHEN median_household_income BETWEEN 60000 AND 120000 THEN 25
                WHEN median_household_income BETWEEN 40000 AND 60000 THEN 20
                WHEN median_household_income > 120000 THEN 18
                WHEN median_household_income BETWEEN 30000 AND 40000 THEN 12
                ELSE 8
            END) +
            -- Email Rate Score (30% weight): Higher = better
            (COALESCE(email_rate, 0) * 30) +
            -- Business Density Score (20% weight): More = better, cap at 100/sqmi
            (LEAST(1.0, COALESCE(business_density, 0) / 100.0) * 20) +
            -- Population Score (15% weight): 10k-100k optimal
            (CASE
                WHEN population BETWEEN 10000 AND 100000 THEN 15
                WHEN population BETWEEN 5000 AND 10000 THEN 12
                WHEN population > 100000 THEN 10
                WHEN population BETWEEN 1000 AND 5000 THEN 8
                ELSE 5
            END) +
            -- Avg Rating Score (10% weight): Higher quality businesses
            (COALESCE(avg_rating, 3.5) / 5.0 * 10)
        )),
        updated_at = NOW()
    WHERE population > 0;

    -- Set lead quality tier based on score
    UPDATE zip_demographics SET
        lead_quality_tier = CASE
            WHEN market_opportunity_score >= 70 THEN 'A'
            WHEN market_opportunity_score >= 50 THEN 'B'
            WHEN market_opportunity_score >= 30 THEN 'C'
            ELSE 'D'
        END
    WHERE population > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 4: Sync Business Metrics Function
-- ============================================================================
-- Updates business metrics from master_leads data and recalculates scores
-- Should be called after master_leads refresh
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_zip_business_metrics()
RETURNS void AS $$
BEGIN
    -- Update business counts and metrics from master_leads
    WITH zip_stats AS (
        SELECT
            postal_code,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
            AVG(rating) as avg_rat
        FROM master_leads
        WHERE postal_code IS NOT NULL
        GROUP BY postal_code
    )
    UPDATE zip_demographics zd SET
        total_businesses = COALESCE(zs.total, 0),
        businesses_with_email = COALESCE(zs.with_email, 0),
        email_rate = CASE
            WHEN zs.total > 0 THEN zs.with_email::DECIMAL / zs.total
            ELSE 0
        END,
        business_density = CASE
            WHEN zd.land_area_sqmi > 0 THEN zs.total / zd.land_area_sqmi
            ELSE 0
        END,
        avg_rating = zs.avg_rat,
        updated_at = NOW()
    FROM zip_stats zs
    WHERE zd.zip_code = zs.postal_code;

    -- Recalculate market opportunity scores
    PERFORM calculate_market_scores();

    RAISE NOTICE 'ZIP demographics business metrics synced and scores recalculated';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 5: State Demographics Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_state_demographics_summary()
RETURNS TABLE(
    state VARCHAR,
    zip_count BIGINT,
    total_population BIGINT,
    avg_income INTEGER,
    avg_market_score DECIMAL,
    total_businesses BIGINT,
    businesses_with_email BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        zd.state,
        COUNT(*)::BIGINT as zip_count,
        SUM(zd.population)::BIGINT as total_population,
        AVG(zd.median_household_income)::INTEGER as avg_income,
        AVG(zd.market_opportunity_score) as avg_market_score,
        SUM(zd.total_businesses)::BIGINT as total_businesses,
        SUM(zd.businesses_with_email)::BIGINT as businesses_with_email
    FROM zip_demographics zd
    GROUP BY zd.state
    ORDER BY SUM(zd.total_businesses) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 6: Get ZIP Demographics Stats Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_zip_demographics_stats()
RETURNS TABLE(
    total_zips BIGINT,
    zips_with_businesses BIGINT,
    total_population BIGINT,
    avg_income INTEGER,
    tier_a_count BIGINT,
    tier_b_count BIGINT,
    tier_c_count BIGINT,
    tier_d_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_zips,
        COUNT(*) FILTER (WHERE zd.total_businesses > 0)::BIGINT as zips_with_businesses,
        SUM(zd.population)::BIGINT as total_population,
        AVG(zd.median_household_income)::INTEGER as avg_income,
        COUNT(*) FILTER (WHERE zd.lead_quality_tier = 'A')::BIGINT as tier_a_count,
        COUNT(*) FILTER (WHERE zd.lead_quality_tier = 'B')::BIGINT as tier_b_count,
        COUNT(*) FILTER (WHERE zd.lead_quality_tier = 'C')::BIGINT as tier_c_count,
        COUNT(*) FILTER (WHERE zd.lead_quality_tier = 'D')::BIGINT as tier_d_count
    FROM zip_demographics zd;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Part 7: Grant Permissions
-- ============================================================================

GRANT SELECT ON zip_demographics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_market_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_zip_business_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_state_demographics_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_zip_demographics_stats() TO authenticated;

-- ============================================================================
-- Part 8: Add Documentation Comments
-- ============================================================================

COMMENT ON TABLE zip_demographics IS
    'Comprehensive demographics data for all US ZIP codes with market opportunity scoring';

COMMENT ON COLUMN zip_demographics.zip_code IS
    '5-digit US ZIP code - primary key';

COMMENT ON COLUMN zip_demographics.market_opportunity_score IS
    'Composite score 0-100 based on income, email rate, business density, population, and rating';

COMMENT ON COLUMN zip_demographics.lead_quality_tier IS
    'Quality tier: A (70+), B (50-69), C (30-49), D (<30)';

COMMENT ON COLUMN zip_demographics.email_rate IS
    'Historical email discovery rate from master_leads (0.0 to 1.0)';

COMMENT ON COLUMN zip_demographics.business_density IS
    'Businesses per square mile, calculated from master_leads and land_area';

COMMENT ON FUNCTION calculate_market_scores() IS
    'Recalculates market_opportunity_score and lead_quality_tier for all ZIP codes';

COMMENT ON FUNCTION sync_zip_business_metrics() IS
    'Syncs business metrics from master_leads and recalculates scores. Call after master_leads refresh.';
