-- Migration: Create products table and update organizations/campaigns for multi-product support
-- Date: 2025-11-21
-- Description: Transforms single-product-per-organization to multi-product catalog architecture

-- ============================================================================
-- PHASE 1: Create products table
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Core Product Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255), -- URL-friendly identifier
    description TEXT,
    product_url TEXT, -- Website/landing page for this product

    -- Messaging & Positioning
    value_proposition TEXT,
    target_audience TEXT,
    industry VARCHAR(100), -- beauty, technology, healthcare, etc.
    messaging_tone VARCHAR(50) DEFAULT 'professional', -- professional, casual, technical, creative, friendly

    -- Features & Details
    product_features TEXT[], -- Array of key features
    product_examples TEXT[], -- Example icebreakers
    custom_icebreaker_prompt TEXT, -- Product-specific AI prompt override

    -- Category Matching (for smart product selection)
    target_categories TEXT[], -- Array of business categories this product targets
    category_matching_keywords TEXT[], -- Keywords for auto-matching businesses to products

    -- Status & Metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default product for this organization
    display_order INTEGER DEFAULT 0, -- For UI sorting

    -- AI Analysis
    product_analyzed_at TIMESTAMPTZ, -- When product URL was last analyzed by AI

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, slug),
    CHECK (name IS NOT NULL AND length(trim(name)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_default ON products(organization_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_target_categories ON products USING GIN(target_categories);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access products from their organization
-- Note: This assumes you have an app.current_organization_id setting
CREATE POLICY products_organization_isolation ON products
    FOR ALL
    USING (
        organization_id::text = current_setting('app.current_organization_id', true)
        OR current_setting('app.current_organization_id', true) IS NULL
        OR current_setting('app.current_organization_id', true) = ''
    );

-- Add comment
COMMENT ON TABLE products IS 'Product catalog - allows organizations to have multiple products with specific targeting and messaging';
COMMENT ON COLUMN products.custom_icebreaker_prompt IS 'Optional AI instruction override for this specific product';
COMMENT ON COLUMN products.target_categories IS 'Business categories this product targets (e.g., ["Gym", "Fitness Center"])';
COMMENT ON COLUMN products.is_default IS 'Default product to use when creating campaigns without explicit product selection';

-- ============================================================================
-- PHASE 2: Update organizations table
-- ============================================================================

-- Add default_product_id foreign key
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS default_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_organizations_default_product_id ON organizations(default_product_id);

-- Rename existing product columns to deprecated (keeps data for rollback)
DO $$
BEGIN
    -- Only rename if not already renamed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_name') THEN
        ALTER TABLE organizations RENAME COLUMN product_name TO product_name_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_description') THEN
        ALTER TABLE organizations RENAME COLUMN product_description TO product_description_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'value_proposition') THEN
        ALTER TABLE organizations RENAME COLUMN value_proposition TO value_proposition_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'target_audience') THEN
        ALTER TABLE organizations RENAME COLUMN target_audience TO target_audience_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'industry') THEN
        ALTER TABLE organizations RENAME COLUMN industry TO industry_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_features') THEN
        ALTER TABLE organizations RENAME COLUMN product_features TO product_features_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_examples') THEN
        ALTER TABLE organizations RENAME COLUMN product_examples TO product_examples_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'messaging_tone') THEN
        ALTER TABLE organizations RENAME COLUMN messaging_tone TO messaging_tone_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'custom_icebreaker_prompt') THEN
        ALTER TABLE organizations RENAME COLUMN custom_icebreaker_prompt TO custom_icebreaker_prompt_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_url') THEN
        ALTER TABLE organizations RENAME COLUMN product_url TO product_url_deprecated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'product_analyzed_at') THEN
        ALTER TABLE organizations RENAME COLUMN product_analyzed_at TO product_analyzed_at_deprecated;
    END IF;
END$$;

-- Add comments explaining the deprecation
COMMENT ON COLUMN organizations.product_name_deprecated IS 'DEPRECATED: Use products table instead. Kept for 30-day rollback safety.';
COMMENT ON COLUMN organizations.product_description_deprecated IS 'DEPRECATED: Use products table instead. Kept for 30-day rollback safety.';
COMMENT ON COLUMN organizations.value_proposition_deprecated IS 'DEPRECATED: Use products table instead. Kept for 30-day rollback safety.';
COMMENT ON COLUMN organizations.target_audience_deprecated IS 'DEPRECATED: Use products table instead. Kept for 30-day rollback safety.';

-- ============================================================================
-- PHASE 3: Update gmaps_campaigns table
-- ============================================================================

-- Add product_id foreign key (nullable - uses default if not specified)
ALTER TABLE gmaps_campaigns
    ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_gmaps_campaigns_product_id ON gmaps_campaigns(product_id);

-- Add comment
COMMENT ON COLUMN gmaps_campaigns.product_id IS 'Links campaign to specific product for personalized messaging. NULL uses organization default product.';

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Products table created successfully';
    RAISE NOTICE '✅ Organizations table updated (product fields renamed to deprecated)';
    RAISE NOTICE '✅ Campaigns table updated (product_id added)';
    RAISE NOTICE '⏭️  Next step: Run data migration script to create default products';
END$$;
