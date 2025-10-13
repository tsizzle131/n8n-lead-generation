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
  // Get all campaigns
  async getAll() {
    const { data, error } = await supabase
      .from('gmaps_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
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

      const { error: coverageError } = await supabase
        .from('gmaps_campaign_coverage')
        .insert(coverageData);
      
      if (coverageError) {
        console.error('Failed to insert ZIP codes:', coverageError);
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
  initializeSchema
};