require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration for the email agent 2 project
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ndrqixjdddcozjlevieo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// Helper function to handle Supabase errors
function handleError(error, defaultMessage = 'Database operation failed') {
  console.error('Supabase error:', error);
  throw new Error(error?.message || defaultMessage);
}

// Google Maps Campaign functions
const gmapsCampaigns = {
  // Get all campaigns (optionally filtered by organization)
  async getAll(organizationId = null) {
    let query = supabase
      .from('gmaps_campaigns')
      .select('*');

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) handleError(error, 'Failed to fetch campaigns');
    return data || [];
  },

  // Get single campaign
  async getById(id) {
    const { data, error } = await supabase
      .from('gmaps_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'Failed to fetch campaign');
    return data;
  },

  // Create campaign
  async create(campaignData) {
    // First insert the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('gmaps_campaigns')
      .insert({
        name: campaignData.name,
        description: campaignData.description,
        keywords: campaignData.keywords,
        location: campaignData.location,
        coverage_profile: campaignData.coverage_profile || 'balanced',
        custom_zip_codes: campaignData.custom_zip_codes,
        status: 'draft',
        target_zip_count: campaignData.zipCodes?.length || 0,
        actual_zip_count: campaignData.zipCodes?.length || 0,
        coverage_percentage: campaignData.coverage_achieved,
        estimated_cost: campaignData.estimated_cost || 0,
        total_businesses_found: 0,
        total_emails_found: 0,
        total_facebook_pages_found: 0,
        organization_id: campaignData.organization_id,
        created_by: campaignData.created_by || 'system'
      })
      .select()
      .single();
    
    if (campaignError) handleError(campaignError, 'Failed to create campaign');

    // Insert ZIP codes into campaign_coverage if provided
    if (campaignData.zipCodes && campaignData.zipCodes.length > 0) {
      const coverageData = campaignData.zipCodes.map(zip => ({
        campaign_id: campaign.id,
        zip_code: zip.zip || zip.zip_code,
        keywords: campaignData.keywords,
        max_results: 200,
        estimated_cost: zip.estimated_cost || 0.01,
        scraped: false,
        businesses_found: 0,
        emails_found: 0
      }));

      // Deduplicate by zip_code to avoid constraint violations
      const uniqueCoverage = coverageData.filter((item, index, self) =>
        index === self.findIndex(t => t.zip_code === item.zip_code)
      );

      console.log(`📍 Inserting ${uniqueCoverage.length} unique ZIP codes for campaign ${campaign.id}`);

      // Use upsert to handle any conflicts gracefully
      const { error: coverageError } = await supabase
        .from('gmaps_campaign_coverage')
        .upsert(uniqueCoverage, {
          onConflict: 'campaign_id,zip_code',
          ignoreDuplicates: true
        });

      if (coverageError) {
        console.error('Failed to insert ZIP codes:', coverageError);
        // Don't throw - campaign is already created, ZIP insertion is non-critical at this point
      } else {
        console.log(`✅ Successfully inserted ${uniqueCoverage.length} ZIP codes`);
      }
    }

    return campaign;
  },

  // Update campaign
  async update(id, updates) {
    const { data, error } = await supabase
      .from('gmaps_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update campaign');
    return data;
  },

  // Delete campaign
  async delete(id) {
    const { error } = await supabase
      .from('gmaps_campaigns')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete campaign');
    return { success: true };
  },

  // Get campaign with coverage details
  async getWithCoverage(id) {
    const campaign = await this.getById(id);
    
    const { data: coverage, error } = await supabase
      .from('gmaps_campaign_coverage')
      .select('*')
      .eq('campaign_id', id)
      .order('zip_code');
    
    if (error) handleError(error, 'Failed to fetch campaign coverage');
    
    campaign.zipCodes = coverage || [];
    return campaign;
  }
};

// Business functions
const businesses = {
  // Save businesses from scraping
  async saveBusinesses(campaignId, businessesData, zipCode = null) {
    const businessRecords = businessesData.map(biz => ({
      campaign_id: campaignId,
      zip_code: zipCode || biz.postalCode,
      place_id: biz.placeId || biz.place_id,
      name: biz.title || biz.name,
      address: biz.address || biz.street,
      city: biz.city,
      state: biz.state,
      postal_code: biz.postalCode || biz.postal_code,
      country: biz.country || 'USA',
      latitude: biz.latitude,
      longitude: biz.longitude,
      phone: biz.phone,
      website: biz.website || biz.url,
      email: biz.email,
      email_source: biz.emailSource || (biz.email ? 'google_maps' : 'not_found'),
      category: biz.categoryName || biz.category,
      categories: biz.categories,
      description: biz.description,
      rating: biz.rating || biz.reviewsAverage,
      reviews_count: biz.reviewsCount || biz.reviews_count,
      price_level: biz.priceLevel || biz.price_level,
      hours: biz.openingHours || biz.hours,
      facebook_url: biz.facebookUrl || biz.facebook_url,
      linkedin_url: biz.linkedInUrl || biz.linkedin_url,
      needs_enrichment: !biz.email,
      enrichment_status: biz.email ? 'enriched' : 'pending',
      raw_data: biz
    }));

    const { data, error } = await supabase
      .from('gmaps_businesses')
      .upsert(businessRecords, {
        onConflict: 'place_id',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('Failed to save businesses:', error);
      // Don't throw, just log - some businesses might be duplicates
    }
    
    return data || [];
  },

  // Get businesses for a campaign
  async getByCampaign(campaignId) {
    const { data, error } = await supabase
      .from('gmaps_businesses')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name');
    
    if (error) handleError(error, 'Failed to fetch businesses');
    return data || [];
  },

  // Update business with enrichment data
  async updateEnrichment(businessId, enrichmentData) {
    const updates = {
      email: enrichmentData.email,
      email_source: enrichmentData.email ? 'facebook' : 'not_found',
      facebook_url: enrichmentData.facebookUrl,
      enrichment_status: enrichmentData.email ? 'enriched' : 'no_facebook',
      enrichment_attempts: supabase.sql`enrichment_attempts + 1`,
      last_enrichment_attempt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('gmaps_businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update business enrichment');
    return data;
  },

  // Save Facebook enrichment data
  async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
    const { data, error } = await supabase
      .from('gmaps_facebook_enrichments')
      .insert({
        business_id: businessId,
        campaign_id: campaignId,
        facebook_url: enrichmentData.facebookUrl,
        primary_email: enrichmentData.email,
        emails: enrichmentData.emails || [enrichmentData.email].filter(Boolean),
        phone_numbers: enrichmentData.phoneNumbers || [],
        enrichment_source: 'facebook_scraper',
        // confidence_score: enrichmentData.confidence || 0.8, // Commented out - column doesn't exist yet
        raw_data: enrichmentData.rawData || enrichmentData
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to save Facebook enrichment');
    return data;
  }
};

// Campaign coverage functions
const campaignCoverage = {
  // Update coverage after scraping
  async updateCoverage(campaignId, zipCode, results) {
    const { data, error } = await supabase
      .from('gmaps_campaign_coverage')
      .update({
        scraped: true,
        scraped_at: new Date().toISOString(),
        businesses_found: results.businessesFound || 0,
        emails_found: results.emailsFound || 0,
        actual_cost: results.cost || 0,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .eq('zip_code', zipCode)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update coverage');
    return data;
  },

  // Get coverage for campaign
  async getByCampaign(campaignId) {
    const { data, error } = await supabase
      .from('gmaps_campaign_coverage')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('zip_code');

    if (error) handleError(error, 'Failed to fetch coverage');
    return data || [];
  },

  // Update overlap metrics for a ZIP code
  async updateOverlapMetrics(campaignId, zipCode, metrics) {
    const { data, error } = await supabase
      .from('gmaps_campaign_coverage')
      .update({
        estimated_overlap_percent: metrics.overlapPercent || null,
        adjacent_zips: metrics.adjacentZips || null,
        min_spacing_miles: metrics.minSpacing || null,
        actual_unique_businesses: metrics.uniqueBusinesses || null,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .eq('zip_code', zipCode)
      .select()
      .single();

    if (error) handleError(error, 'Failed to update overlap metrics');
    return data;
  },

  // Calculate and update overlap for all ZIPs in a campaign
  async calculateCampaignOverlap(campaignId) {
    // Get all businesses for this campaign grouped by ZIP
    const { data: businesses, error: bizError } = await supabase
      .from('gmaps_businesses')
      .select('place_id, zip_code')
      .eq('campaign_id', campaignId);

    if (bizError) {
      console.error('Failed to fetch businesses for overlap calculation:', bizError);
      return null;
    }

    // Group by ZIP code
    const zipGroups = {};
    businesses.forEach(biz => {
      if (!zipGroups[biz.zip_code]) {
        zipGroups[biz.zip_code] = new Set();
      }
      zipGroups[biz.zip_code].add(biz.place_id);
    });

    // Calculate overlap for each ZIP
    const overlapResults = {};
    const allPlaceIds = new Set(businesses.map(b => b.place_id));

    for (const [zipCode, placeIds] of Object.entries(zipGroups)) {
      // Count how many of this ZIP's businesses also appear in other ZIPs
      let duplicateCount = 0;
      for (const placeId of placeIds) {
        // Check if this place_id appears in any other ZIP
        let foundInOther = false;
        for (const [otherZip, otherPlaceIds] of Object.entries(zipGroups)) {
          if (otherZip !== zipCode && otherPlaceIds.has(placeId)) {
            foundInOther = true;
            break;
          }
        }
        if (foundInOther) duplicateCount++;
      }

      const overlapPercent = placeIds.size > 0
        ? (duplicateCount / placeIds.size * 100).toFixed(2)
        : 0;

      overlapResults[zipCode] = {
        overlapPercent: parseFloat(overlapPercent),
        uniqueBusinesses: placeIds.size
      };
    }

    // Update each ZIP's overlap metrics
    for (const [zipCode, metrics] of Object.entries(overlapResults)) {
      await this.updateOverlapMetrics(campaignId, zipCode, metrics);
    }

    return overlapResults;
  }
};

// Export functions for CSV generation
const exportData = {
  // Get all data for export with pagination support
  async getExportData(campaignId, options = {}) {
    const pageSize = options.pageSize || 1000;
    const page = options.page || 0;
    const getAllPages = options.getAllPages !== false; // Default to true

    if (getAllPages) {
      // Fetch ALL records using pagination
      let allBusinesses = [];
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        const start = currentPage * pageSize;
        const end = start + pageSize - 1;

        const { data: businesses, error, count } = await supabase
          .from('gmaps_businesses')
          .select(`
            *,
            gmaps_facebook_enrichments (
              primary_email,
              emails,
              facebook_url,
              phone_numbers
            ),
            gmaps_linkedin_enrichments (
              primary_email,
              person_name,
              person_title,
              linkedin_url,
              bouncer_status,
              is_safe,
              email_verified
            )
          `, { count: 'exact' })
          .eq('campaign_id', campaignId)
          .order('name')
          .range(start, end);

        if (error) handleError(error, `Failed to fetch export data (page ${currentPage})`);

        if (businesses && businesses.length > 0) {
          allBusinesses = allBusinesses.concat(businesses);
          currentPage++;
          hasMore = businesses.length === pageSize;
        } else {
          hasMore = false;
        }

        // Safety check to prevent infinite loops
        if (currentPage > 100) { // Max 100,000 records
          console.warn('Export pagination limit reached (100 pages)');
          hasMore = false;
        }
      }

      console.log(`Export: Fetched ${allBusinesses.length} total businesses across ${currentPage} pages`);
      return allBusinesses;
    } else {
      // Single page fetch for specific page
      const start = page * pageSize;
      const end = start + pageSize - 1;

      const { data: businesses, error } = await supabase
        .from('gmaps_businesses')
        .select(`
          *,
          gmaps_facebook_enrichments (
            primary_email,
            emails,
            facebook_url,
            phone_numbers
          ),
          gmaps_linkedin_enrichments (
            primary_email,
            person_name,
            person_title,
            linkedin_url,
            bouncer_status,
            is_safe,
            email_verified
          )
        `)
        .eq('campaign_id', campaignId)
        .order('name')
        .range(start, end);

      if (error) handleError(error, `Failed to fetch export data (page ${page})`);
      return businesses;
    }
  },

  // Format businesses for CSV export
  formatForExport(businesses) {
    if (!businesses) return [];

    // Format for CSV export with proper email source
    return businesses.map(biz => {
      // Determine the actual email and source
      let email = biz.email;
      let emailSource = biz.email_source || 'not_found';
      let linkedinEmail = '';
      let linkedinContactName = '';
      let linkedinContactTitle = '';
      let linkedinUrl = '';
      let emailVerificationStatus = '';
      let emailDeliverability = '';

      // If we have Facebook enrichment data, use that
      if (biz.gmaps_facebook_enrichments && biz.gmaps_facebook_enrichments.length > 0) {
        const fbEnrichment = biz.gmaps_facebook_enrichments[0];
        if (fbEnrichment.primary_email) {
          email = fbEnrichment.primary_email;
          emailSource = 'facebook';
        }
      }

      // If we have LinkedIn enrichment data, include it
      if (biz.gmaps_linkedin_enrichments && biz.gmaps_linkedin_enrichments.length > 0) {
        const liEnrichment = biz.gmaps_linkedin_enrichments[0];
        linkedinEmail = liEnrichment.primary_email || '';
        linkedinContactName = liEnrichment.person_name || '';
        linkedinContactTitle = liEnrichment.person_title || '';
        linkedinUrl = liEnrichment.linkedin_url || biz.linkedin_url || '';
        emailVerificationStatus = liEnrichment.email_verified ? 'verified' : 'not_verified';
        emailDeliverability = liEnrichment.bouncer_status || '';

        // If LinkedIn email is verified and safe, prioritize it over other sources
        if (liEnrichment.primary_email && liEnrichment.is_safe) {
          email = liEnrichment.primary_email;
          emailSource = 'linkedin_verified';
        }
      }

      // Extract A/B test metadata
      const icebreakerMetadata = biz.icebreaker_metadata || {};

      return {
        name: biz.name,
        address: biz.address,
        city: biz.city,
        state: biz.state,
        zip: biz.postal_code,
        phone: biz.phone,
        website: biz.website,
        email: email || '',
        emailSource: emailSource,
        icebreaker: biz.icebreaker || '',
        subjectLine: biz.subject_line || '',
        icebreakerVariant: biz.icebreaker_variant || 'control',
        isPerfectFit: icebreakerMetadata.is_perfect_fit || false,
        facebook: biz.facebook_url || biz.gmaps_facebook_enrichments?.[0]?.facebook_url || '',
        linkedin: linkedinUrl,
        linkedinEmail: linkedinEmail,
        linkedinContactName: linkedinContactName,
        linkedinContactTitle: linkedinContactTitle,
        emailVerificationStatus: emailVerificationStatus,
        emailDeliverability: emailDeliverability,
        category: biz.category,
        rating: biz.rating,
        reviews: biz.reviews_count
      };
    });
  },

  // Get full export data (wrapper for backward compatibility)
  async getFullExportData(campaignId) {
    const businesses = await this.getExportData(campaignId, { getAllPages: true });
    return this.formatForExport(businesses);
  }
};

// Product functions
const products = {
  // Get all products for an organization
  async getAllForOrg(organizationId) {
    const { data, error} = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) handleError(error, 'Failed to fetch products');
    return data || [];
  },

  // Get single product by ID
  async getById(productId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) handleError(error, 'Failed to fetch product');
    return data;
  },

  // Get default product for organization
  async getDefaultForOrg(organizationId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single();

    if (error) {
      // If no default product, try to get any product for this org
      const { data: anyProduct, error: anyError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (anyError) handleError(anyError, 'Failed to fetch default product');
      return anyProduct;
    }

    return data;
  },

  // Create new product
  async create(productData) {
    // Generate slug if not provided
    if (!productData.slug && productData.name) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) handleError(error, 'Failed to create product');
    return data;
  },

  // Update product
  async update(productId, updates) {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) handleError(error, 'Failed to update product');
    return data;
  },

  // Delete product (with safety check for default product)
  async delete(productId, organizationId) {
    // First check if this is the default product
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('default_product_id')
      .eq('id', organizationId)
      .single();

    if (orgError) handleError(orgError, 'Failed to check organization');

    if (org?.default_product_id === productId) {
      throw new Error('Cannot delete default product. Set another product as default first.');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('organization_id', organizationId);

    if (error) handleError(error, 'Failed to delete product');
    return { success: true };
  },

  // Set product as default
  async setAsDefault(productId, organizationId) {
    // First, unset any existing default
    await supabase
      .from('products')
      .update({ is_default: false })
      .eq('organization_id', organizationId);

    // Set this product as default
    const { data, error } = await supabase
      .from('products')
      .update({ is_default: true })
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) handleError(error, 'Failed to set default product');

    // Update organization's default_product_id
    await supabase
      .from('organizations')
      .update({ default_product_id: productId })
      .eq('id', organizationId);

    return data;
  }
};

// ============================================================================
// MASTER LEADS (Internal Team Database)
// ============================================================================
// Aggregates all businesses across all organizations into deduplicated view

const masterLeads = {
  // Refresh the materialized view
  async refresh() {
    const { error } = await supabase.rpc('refresh_master_leads');
    if (error) handleError(error, 'Failed to refresh master leads');
    console.log('Master leads view refreshed');
    return { success: true };
  },

  // Get all leads with filters (including demographics)
  async getAll(filters = {}, options = {}) {
    const pageSize = options.pageSize || 100;
    const page = options.page || 0;

    let query = supabase.from('master_leads').select('*', { count: 'exact' });

    // Core filters
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.city) query = query.eq('city', filters.city);
    if (filters.state) query = query.eq('state', filters.state);
    if (filters.postalCode) query = query.eq('postal_code', filters.postalCode);
    if (filters.hasEmail) query = query.not('email', 'is', null);
    if (filters.verified) query = query.eq('email_verified', true);

    // Demographic filters (requires enhanced master_leads view with zip_demographics JOIN)
    if (filters.minIncome) query = query.gte('zip_median_income', filters.minIncome);
    if (filters.minMarketScore) query = query.gte('zip_market_score', filters.minMarketScore);
    if (filters.qualityTier) query = query.eq('zip_quality_tier', filters.qualityTier.toUpperCase());
    if (filters.leadPriority) query = query.eq('lead_priority', filters.leadPriority);

    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await query
      .order('last_updated', { ascending: false })
      .range(start, end);

    if (error) handleError(error, 'Failed to fetch master leads');
    return { data: data || [], total: count };
  },

  // Get statistics
  async getStats() {
    const { data, error } = await supabase.rpc('get_master_leads_stats');
    if (error) handleError(error, 'Failed to get master leads stats');
    return data?.[0] || {};
  },

  // Search by name
  async search(query, limit = 50) {
    const { data, error } = await supabase
      .from('master_leads')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);
    if (error) handleError(error, 'Failed to search master leads');
    return data || [];
  },

  // Get by category
  async getByCategory(category, options = {}) {
    return this.getAll({ category }, options);
  },

  // Export all leads (for monthly client reports)
  async exportAll(filters = {}) {
    let query = supabase.from('master_leads').select('*');

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.state) query = query.eq('state', filters.state);
    if (filters.hasEmail) query = query.not('email', 'is', null);

    const { data, error } = await query.order('category').order('city');
    if (error) handleError(error, 'Failed to export master leads');
    return data || [];
  }
};

// ============================================================================
// ZIP DEMOGRAPHICS
// ============================================================================
// Demographic data for all US ZIP codes with market opportunity scoring

const zipDemographics = {
  // Get demographics for a single ZIP code
  async getByZip(zipCode) {
    const { data, error } = await supabase
      .from('zip_demographics')
      .select('*')
      .eq('zip_code', zipCode)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      handleError(error, 'Failed to fetch ZIP demographics');
    }
    return data || null;
  },

  // Search ZIP codes with filters
  async search(filters = {}, options = {}) {
    const pageSize = options.pageSize || 100;
    const page = options.page || 0;

    let query = supabase.from('zip_demographics').select('*', { count: 'exact' });

    // Apply filters
    if (filters.state) query = query.eq('state', filters.state.toUpperCase());
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.county) query = query.ilike('county', `%${filters.county}%`);
    if (filters.minIncome) query = query.gte('median_household_income', filters.minIncome);
    if (filters.maxIncome) query = query.lte('median_household_income', filters.maxIncome);
    if (filters.minScore) query = query.gte('market_opportunity_score', filters.minScore);
    if (filters.maxScore) query = query.lte('market_opportunity_score', filters.maxScore);
    if (filters.tier) query = query.eq('lead_quality_tier', filters.tier.toUpperCase());
    if (filters.minPopulation) query = query.gte('population', filters.minPopulation);
    if (filters.maxPopulation) query = query.lte('population', filters.maxPopulation);
    if (filters.hasBusinesses) query = query.gt('total_businesses', 0);

    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await query
      .order('market_opportunity_score', { ascending: false })
      .range(start, end);

    if (error) handleError(error, 'Failed to search ZIP demographics');
    return { data: data || [], total: count };
  },

  // Get top opportunity areas (by market score)
  async getTopOpportunities(state = null, limit = 50) {
    let query = supabase
      .from('zip_demographics')
      .select('*')
      .gt('total_businesses', 0)
      .not('market_opportunity_score', 'is', null)
      .order('market_opportunity_score', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data, error } = await query;
    if (error) handleError(error, 'Failed to get top opportunities');
    return data || [];
  },

  // Get state-level demographics summary
  async getStateSummary() {
    const { data, error } = await supabase.rpc('get_state_demographics_summary');
    if (error) handleError(error, 'Failed to get state demographics summary');
    return data || [];
  },

  // Get overall statistics
  async getStats() {
    const { data, error } = await supabase.rpc('get_zip_demographics_stats');
    if (error) handleError(error, 'Failed to get ZIP demographics stats');
    return data?.[0] || {};
  },

  // Sync business metrics from master_leads (updates email_rate, business_density, etc.)
  async syncBusinessMetrics() {
    const { error } = await supabase.rpc('sync_zip_business_metrics');
    if (error) handleError(error, 'Failed to sync business metrics');
    console.log('ZIP demographics business metrics synced');
    return { success: true };
  },

  // Calculate market opportunity scores
  async calculateScores() {
    const { error } = await supabase.rpc('calculate_market_scores');
    if (error) handleError(error, 'Failed to calculate market scores');
    console.log('Market opportunity scores calculated');
    return { success: true };
  },

  // Get demographics for multiple ZIP codes
  async getMultiple(zipCodes) {
    if (!zipCodes || zipCodes.length === 0) return [];

    const { data, error } = await supabase
      .from('zip_demographics')
      .select('*')
      .in('zip_code', zipCodes);

    if (error) handleError(error, 'Failed to fetch multiple ZIP demographics');
    return data || [];
  },

  // Get ZIPs by tier
  async getByTier(tier, state = null, limit = 100) {
    let query = supabase
      .from('zip_demographics')
      .select('*')
      .eq('lead_quality_tier', tier.toUpperCase())
      .order('market_opportunity_score', { ascending: false })
      .limit(limit);

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data, error } = await query;
    if (error) handleError(error, 'Failed to get ZIPs by tier');
    return data || [];
  }
};

// ============================================================================
// INSTANTLY EVENTS MODULE
// ============================================================================
// Handles webhook events from Instantly.ai for email engagement tracking

const instantlyEvents = {
  /**
   * Create a new event from Instantly webhook
   * Automatically resolves business_id and campaign_id from the lead email
   */
  async create(eventData) {
    // First, try to match the email to a business in this org's campaigns
    let business = null;
    let campaignId = null;

    // Find business by email within org's campaigns
    const { data: businessMatch } = await supabase
      .from('gmaps_businesses')
      .select(`
        id,
        campaign_id,
        gmaps_campaigns!inner(organization_id)
      `)
      .eq('email', eventData.lead_email)
      .eq('gmaps_campaigns.organization_id', eventData.organization_id)
      .limit(1)
      .single();

    if (businessMatch) {
      business = businessMatch;
      campaignId = businessMatch.campaign_id;
    }

    // Also try to find campaign by instantly_campaign_id if not found
    if (!campaignId && eventData.instantly_campaign_id) {
      const { data: campaign } = await supabase
        .from('gmaps_campaigns')
        .select('id')
        .eq('instantly_campaign_id', eventData.instantly_campaign_id)
        .eq('organization_id', eventData.organization_id)
        .single();
      if (campaign) campaignId = campaign.id;
    }

    // Insert the event
    const { data, error } = await supabase
      .from('instantly_events')
      .insert({
        organization_id: eventData.organization_id,
        event_type: eventData.event_type,
        event_timestamp: eventData.event_timestamp,
        instantly_workspace_id: eventData.instantly_workspace_id,
        instantly_campaign_id: eventData.instantly_campaign_id,
        instantly_campaign_name: eventData.instantly_campaign_name,
        lead_email: eventData.lead_email,
        email_account: eventData.email_account,
        unibox_url: eventData.unibox_url,
        campaign_id: campaignId,
        business_id: business?.id,
        raw_payload: eventData.raw_payload,
        event_hash: eventData.event_hash
      })
      .select()
      .single();

    if (error) throw error;

    // Return with business_id for engagement update
    return { ...data, business_id: business?.id };
  },

  /**
   * Update business engagement based on event type
   */
  async updateBusinessEngagement(businessId, eventType) {
    if (!businessId) return;

    // Build update object based on event type
    let updateData = {
      last_engagement_at: new Date().toISOString()
    };

    switch (eventType) {
      case 'email_opened':
        // Use raw SQL for incrementing
        const { error: openError } = await supabase.rpc('increment_business_opens', {
          business_id_param: businessId
        });
        if (openError) {
          // Fallback: just update status
          await supabase
            .from('gmaps_businesses')
            .update({
              engagement_status: 'opened',
              last_engagement_at: new Date().toISOString()
            })
            .eq('id', businessId);
        }
        return;

      case 'link_clicked':
        const { error: clickError } = await supabase.rpc('increment_business_clicks', {
          business_id_param: businessId
        });
        if (clickError) {
          await supabase
            .from('gmaps_businesses')
            .update({
              engagement_status: 'clicked',
              last_engagement_at: new Date().toISOString()
            })
            .eq('id', businessId);
        }
        return;

      case 'reply_received':
        updateData.engagement_status = 'replied';
        updateData.replied = true;
        updateData.engagement_score = 100;
        break;

      case 'email_bounced':
        updateData.engagement_status = 'bounced';
        updateData.bounced = true;
        updateData.engagement_score = -100;
        break;

      case 'lead_unsubscribed':
        updateData.engagement_status = 'unsubscribed';
        updateData.unsubscribed = true;
        updateData.engagement_score = -100;
        break;

      case 'email_sent':
        updateData.engagement_status = 'sent';
        if (!updateData.first_sent_at) {
          updateData.first_sent_at = new Date().toISOString();
        }
        break;

      default:
        return;
    }

    const { error } = await supabase
      .from('gmaps_businesses')
      .update(updateData)
      .eq('id', businessId);

    if (error) {
      console.error('Error updating business engagement:', error);
    }
  },

  /**
   * Get engagement stats for a campaign
   */
  async getCampaignStats(campaignId) {
    const { data, error } = await supabase
      .from('instantly_events')
      .select('event_type')
      .eq('campaign_id', campaignId);

    if (error) {
      handleError(error, 'Failed to get campaign stats');
      return null;
    }

    const events = data || [];
    return {
      total_events: events.length,
      opens: events.filter(e => e.event_type === 'email_opened').length,
      clicks: events.filter(e => e.event_type === 'link_clicked').length,
      replies: events.filter(e => e.event_type === 'reply_received').length,
      bounces: events.filter(e => e.event_type === 'email_bounced').length,
      unsubscribes: events.filter(e => e.event_type === 'lead_unsubscribed').length
    };
  },

  /**
   * Get recent events (optionally filtered by org)
   */
  async getRecent(orgId = null, limit = 50) {
    let query = supabase
      .from('instantly_events')
      .select(`
        *,
        gmaps_businesses(name, email),
        gmaps_campaigns(name)
      `)
      .order('event_timestamp', { ascending: false })
      .limit(limit);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    if (error) {
      handleError(error, 'Failed to get recent events');
      return [];
    }
    return data || [];
  },

  /**
   * Get events by email (for debugging/lookup)
   */
  async getByEmail(email, orgId = null) {
    let query = supabase
      .from('instantly_events')
      .select('*')
      .eq('lead_email', email)
      .order('event_timestamp', { ascending: false });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;
    if (error) {
      handleError(error, 'Failed to get events by email');
      return [];
    }
    return data || [];
  },

  /**
   * Get engagement summary for an organization
   */
  async getOrgEngagementSummary(orgId) {
    const { data, error } = await supabase
      .from('instantly_events')
      .select('event_type')
      .eq('organization_id', orgId);

    if (error) {
      handleError(error, 'Failed to get org engagement summary');
      return null;
    }

    const events = data || [];
    const uniqueLeads = new Set(events.map(e => e.lead_email)).size;

    return {
      total_events: events.length,
      unique_leads: uniqueLeads,
      opens: events.filter(e => e.event_type === 'email_opened').length,
      clicks: events.filter(e => e.event_type === 'link_clicked').length,
      replies: events.filter(e => e.event_type === 'reply_received').length,
      bounces: events.filter(e => e.event_type === 'email_bounced').length
    };
  }
};

// ============================================================================
// ORGANIZATIONS MODULE (for webhook validation)
// ============================================================================

const organizations = {
  /**
   * Get organization by ID
   */
  async getById(orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      handleError(error, 'Failed to get organization');
    }
    return data;
  },

  /**
   * Get all organizations
   */
  async getAll() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) handleError(error, 'Failed to get organizations');
    return data || [];
  }
};

// Initialize schema if needed (for new setups)
async function initializeSchema() {
  // Check if schema exists by trying to query campaigns
  const { error } = await supabase
    .from('gmaps_campaigns')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    // Table doesn't exist, need to run migration
    console.log('Note: gmaps_scraper schema not found. Please run the migration SQL file.');
    return false;
  }

  return true;
}

module.exports = {
  supabase,
  gmapsCampaigns,
  gmapsBusinesses: businesses,
  gmapsCoverage: campaignCoverage,
  gmapsExport: exportData,
  products,
  masterLeads,
  zipDemographics,
  instantlyEvents,
  organizations,
  initializeSchema
};