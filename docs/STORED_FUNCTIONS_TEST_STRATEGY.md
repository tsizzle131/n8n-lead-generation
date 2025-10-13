# Comprehensive Test Strategy for PostgreSQL Stored Functions

**Created**: 2025-10-13
**Purpose**: Design comprehensive test strategy for validating 8 PostgreSQL stored functions and their integration with application code
**Status**: Ready for Implementation

---

## Executive Summary

This document provides a complete testing strategy for the 8 critical PostgreSQL stored functions implementing atomic transaction boundaries. The strategy covers:

1. **Unit Tests** - SQL-level testing of each function in isolation
2. **Integration Tests** - Application code calling functions via RPC
3. **Concurrency Tests** - Race condition and locking validation
4. **Performance Tests** - Benchmarking and optimization validation
5. **Regression Tests** - Ensuring existing functionality remains intact

**Total Estimated Test Time**: 3-4 hours
**Prerequisite**: All 8 stored functions deployed to database
**Success Criteria**: 100% passing tests before production deployment

---

## The 8 Stored Functions Under Test

Based on `TRANSACTION_REQUIREMENTS.md` and `RPC_MIGRATION_CATALOG.md`:

1. `save_facebook_enrichment_tx()` - Insert enrichment + update business atomically
2. `save_linkedin_enrichment_tx()` - Insert enrichment + update business atomically
3. `create_campaign_with_coverage_tx()` - Insert campaign + coverage records atomically
4. `update_email_verification_tx()` - Update verification for Google Maps/Facebook/LinkedIn
5. `update_campaign_statistics_tx()` - Calculate and update campaign aggregates
6. `track_api_cost_tx()` - Insert cost record + update campaign costs with locking
7. `update_coverage_status_tx()` - Update coverage after ZIP scraping
8. `update_campaign_status_tx()` - Transition campaign status with validation

---

## 1. Unit Test Strategy (SQL-Level)

### Test Environment Setup
```sql
-- Run these tests in Supabase SQL Editor or psql
-- Create test data fixtures
DO $$
DECLARE
    v_test_campaign_id UUID;
    v_test_business_id UUID;
BEGIN
    -- Create test campaign
    INSERT INTO gmaps_campaigns (name, location, keywords, status)
    VALUES ('TEST CAMPAIGN - DELETE ME', '90210', ARRAY['test'], 'draft')
    RETURNING id INTO v_test_campaign_id;

    -- Store for reuse
    CREATE TEMP TABLE test_fixtures AS
    SELECT v_test_campaign_id as campaign_id,
           NULL::UUID as business_id;
END $$;
```

---

### Function 1: `save_facebook_enrichment_tx()`

**Test Cases:**

#### Test 1.1: Success Path - Valid Enrichment
```sql
-- Setup
INSERT INTO gmaps_businesses (campaign_id, place_id, name, address)
SELECT campaign_id, 'test_fb_001', 'Test Business', '123 Test St'
FROM test_fixtures;

-- Execute
SELECT save_facebook_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_fb_001'),
    (SELECT campaign_id FROM test_fixtures),
    '{
        "facebook_url": "https://facebook.com/testbiz",
        "page_name": "Test Business Page",
        "primary_email": "test@business.com",
        "emails": ["test@business.com"],
        "phone_numbers": ["+1-555-0100"],
        "success": true
    }'::JSONB
);

-- Verify
-- ✅ Enrichment record exists
SELECT COUNT(*) = 1 FROM gmaps_facebook_enrichments
WHERE business_id = (SELECT id FROM gmaps_businesses WHERE place_id = 'test_fb_001');

-- ✅ Business email updated
SELECT email = 'test@business.com' AND email_source = 'facebook'
FROM gmaps_businesses WHERE place_id = 'test_fb_001';

-- ✅ Enrichment status updated
SELECT enrichment_status = 'enriched' AND enrichment_attempts = 1
FROM gmaps_businesses WHERE place_id = 'test_fb_001';
```

#### Test 1.2: Failure Path - Invalid Business ID
```sql
-- Execute with non-existent business
SELECT save_facebook_enrichment_tx(
    '00000000-0000-0000-0000-000000000000'::UUID,
    (SELECT campaign_id FROM test_fixtures),
    '{"facebook_url": "https://facebook.com/invalid", "success": true}'::JSONB
);

-- Verify
-- ✅ Returns error JSONB: {"success": false, "error": "Business with id ... not found"}
-- ✅ No enrichment record created
SELECT COUNT(*) = 0 FROM gmaps_facebook_enrichments
WHERE business_id = '00000000-0000-0000-0000-000000000000'::UUID;
```

#### Test 1.3: Rollback Test - Business Update Failure
```sql
-- Execute with malformed JSONB (missing required fields)
SELECT save_facebook_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_fb_001'),
    (SELECT campaign_id FROM test_fixtures),
    '{}'::JSONB  -- Empty object
);

-- Verify
-- ✅ Transaction rolled back - no enrichment saved
-- ✅ Business record unchanged
```

#### Test 1.4: Failed Enrichment (success = false)
```sql
-- Execute with failed enrichment
SELECT save_facebook_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_fb_002'),
    (SELECT campaign_id FROM test_fixtures),
    '{
        "facebook_url": "https://facebook.com/notfound",
        "success": false,
        "error_message": "Page not found"
    }'::JSONB
);

-- Verify
-- ✅ Enrichment record saved with success = false
-- ✅ Business enrichment_status = 'failed'
-- ✅ Business email NOT updated (no email provided)
```

---

### Function 2: `save_linkedin_enrichment_tx()`

**Test Cases:**

#### Test 2.1: Success Path - LinkedIn with Verified Email
```sql
-- Execute
SELECT save_linkedin_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_li_001'),
    (SELECT campaign_id FROM test_fixtures),
    '{
        "linkedin_url": "https://linkedin.com/company/testbiz",
        "profile_type": "company",
        "company_name": "Test Business Inc",
        "primary_email": "contact@testbiz.com",
        "email_source": "linkedin_public",
        "email_verified": true,
        "bouncer_status": "deliverable",
        "bouncer_score": 95,
        "bouncer_is_safe": true,
        "bouncer_verified_at": "2025-10-13T12:00:00Z"
    }'::JSONB
);

-- Verify
-- ✅ LinkedIn enrichment created
-- ✅ Business.linkedin_url updated
-- ✅ Business.linkedin_enriched = TRUE
-- ✅ Business.email = 'contact@testbiz.com'
-- ✅ Business.email_source = 'linkedin' (highest priority)
-- ✅ Email verification fields populated
```

#### Test 2.2: LinkedIn Profile with Generated Email
```sql
SELECT save_linkedin_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_li_002'),
    (SELECT campaign_id FROM test_fixtures),
    '{
        "linkedin_url": "https://linkedin.com/in/john-doe",
        "profile_type": "personal",
        "person_name": "John Doe",
        "person_title": "CEO",
        "primary_email": "john.doe@testbiz.com",
        "email_source": "generated",
        "email_quality_tier": "tier2"
    }'::JSONB
);

-- Verify
-- ✅ Personal profile saved correctly
-- ✅ Generated email stored with quality tier
```

#### Test 2.3: LinkedIn Without Email
```sql
SELECT save_linkedin_enrichment_tx(
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_li_003'),
    (SELECT campaign_id FROM test_fixtures),
    '{
        "linkedin_url": "https://linkedin.com/company/noemail",
        "profile_type": "company",
        "error": "No email found on profile"
    }'::JSONB
);

-- Verify
-- ✅ Enrichment saved with NULL primary_email
-- ✅ Business email NOT updated (no email to set)
-- ✅ linkedin_enriched still set to TRUE (attempt made)
```

---

### Function 3: `create_campaign_with_coverage_tx()`

**Test Cases:**

#### Test 3.1: Success Path - Campaign with 3 ZIP Codes
```sql
SELECT create_campaign_with_coverage_tx(
    '{
        "name": "Test Campaign Multi-ZIP",
        "location": "Los Angeles, CA",
        "keywords": ["restaurants", "coffee"],
        "coverage_profile": "balanced",
        "target_zip_count": 3,
        "actual_zip_count": 3,
        "estimated_cost": 21.50
    }'::JSONB,
    ARRAY[
        '{"zip_code": "90210", "keywords": ["restaurants"], "max_results": 200, "estimated_cost": 7.50}'::JSONB,
        '{"zip_code": "90211", "keywords": ["coffee"], "max_results": 200, "estimated_cost": 7.00}'::JSONB,
        '{"zip_code": "90212", "keywords": ["restaurants", "coffee"], "max_results": 200, "estimated_cost": 7.00}'::JSONB
    ]::JSONB[]
);

-- Verify
-- ✅ Campaign created with status = 'draft'
-- ✅ Exactly 3 coverage records created
-- ✅ Coverage records have campaign_id = campaign.id
-- ✅ All coverage records have scraped = FALSE
-- ✅ Campaign.actual_zip_count matches coverage count
```

#### Test 3.2: Rollback Test - Coverage Insert Failure
```sql
-- Execute with duplicate ZIP codes (should fail UNIQUE constraint)
SELECT create_campaign_with_coverage_tx(
    '{"name": "Test Duplicate ZIPs", "location": "LA"}'::JSONB,
    ARRAY[
        '{"zip_code": "90210"}'::JSONB,
        '{"zip_code": "90210"}'::JSONB  -- Duplicate!
    ]::JSONB[]
);

-- Verify
-- ✅ Transaction rolled back
-- ✅ No campaign created
-- ✅ No coverage records created
```

#### Test 3.3: Empty Coverage Array
```sql
SELECT create_campaign_with_coverage_tx(
    '{"name": "Test No ZIPs", "location": "Test"}'::JSONB,
    ARRAY[]::JSONB[]  -- Empty array
);

-- Verify
-- ✅ Campaign created (allowed - manual campaigns)
-- ✅ Coverage count = 0
```

---

### Function 4: `update_email_verification_tx()`

**Test Cases:**

#### Test 4.1: Verify Google Maps Email
```sql
SELECT update_email_verification_tx(
    'google_maps',
    (SELECT id FROM gmaps_businesses WHERE place_id = 'test_gm_001'),
    '{
        "email": "info@business.com",
        "status": "deliverable",
        "score": 88,
        "is_safe": true,
        "is_disposable": false,
        "is_role_based": false,
        "is_free_email": false,
        "domain": "business.com",
        "provider": "Google Workspace"
    }'::JSONB
);

-- Verify
-- ✅ Business.email_verified = TRUE
-- ✅ Business.bouncer_status = 'deliverable'
-- ✅ Verification log entry created in gmaps_email_verifications
-- ✅ Verification log has NULL facebook_enrichment_id and linkedin_enrichment_id
```

#### Test 4.2: Verify Facebook Email
```sql
SELECT update_email_verification_tx(
    'facebook',
    (SELECT id FROM gmaps_facebook_enrichments WHERE business_id = (SELECT id FROM gmaps_businesses WHERE place_id = 'test_fb_001')),
    '{
        "email": "test@business.com",
        "status": "risky",
        "score": 45,
        "is_safe": false,
        "reason": "Catch-all domain"
    }'::JSONB
);

-- Verify
-- ✅ Facebook enrichment email_verified = TRUE
-- ✅ bouncer_status = 'risky', is_safe = FALSE
-- ✅ Verification log linked to facebook_enrichment_id
```

#### Test 4.3: Verify LinkedIn Email
```sql
SELECT update_email_verification_tx(
    'linkedin',
    (SELECT id FROM gmaps_linkedin_enrichments WHERE business_id = (SELECT id FROM gmaps_businesses WHERE place_id = 'test_li_001')),
    '{
        "email": "contact@testbiz.com",
        "status": "deliverable",
        "score": 95,
        "is_safe": true
    }'::JSONB
);

-- Verify
-- ✅ LinkedIn enrichment email_verified = TRUE
-- ✅ Verification log linked to linkedin_enrichment_id
```

---

### Function 5: `update_campaign_statistics_tx()`

**Test Cases:**

#### Test 5.1: Calculate Statistics for Campaign
```sql
-- Setup: Create test data
INSERT INTO gmaps_businesses (campaign_id, place_id, name, address, email, email_source)
SELECT campaign_id, 'stat_test_' || i, 'Business ' || i, 'Address ' || i,
       CASE WHEN i % 2 = 0 THEN 'email' || i || '@test.com' ELSE NULL END,
       CASE WHEN i % 2 = 0 THEN 'google_maps' ELSE 'not_found' END
FROM test_fixtures, generate_series(1, 10) i;

-- Execute
SELECT update_campaign_statistics_tx(
    (SELECT campaign_id FROM test_fixtures)
);

-- Verify
SELECT
    total_businesses_found = 10,
    total_emails_found = 5,  -- Every other business
    total_facebook_pages_found = 0,
    total_linkedin_profiles_found = 0
FROM gmaps_campaigns
WHERE id = (SELECT campaign_id FROM test_fixtures);
```

#### Test 5.2: Statistics with Enrichments
```sql
-- Add enrichments
INSERT INTO gmaps_facebook_enrichments (business_id, campaign_id, facebook_url)
SELECT id, campaign_id, 'https://facebook.com/biz' || place_id
FROM gmaps_businesses WHERE place_id LIKE 'stat_test_%' LIMIT 3;

INSERT INTO gmaps_linkedin_enrichments (business_id, campaign_id, linkedin_url, email_verified)
SELECT id, campaign_id, 'https://linkedin.com/biz' || place_id, TRUE
FROM gmaps_businesses WHERE place_id LIKE 'stat_test_%' LIMIT 2;

-- Execute
SELECT update_campaign_statistics_tx((SELECT campaign_id FROM test_fixtures));

-- Verify
SELECT
    total_facebook_pages_found = 3,
    total_linkedin_profiles_found = 2,
    total_verified_emails = 2
FROM gmaps_campaigns
WHERE id = (SELECT campaign_id FROM test_fixtures);
```

---

### Function 6: `track_api_cost_tx()`

**Test Cases:**

#### Test 6.1: Track Google Maps Cost
```sql
SELECT track_api_cost_tx(
    (SELECT campaign_id FROM test_fixtures),
    'google_maps',
    '{
        "items_processed": 1000,
        "cost_usd": 7.50,
        "metadata": {"zip_code": "90210", "results": 847}
    }'::JSONB
);

-- Verify
-- ✅ Cost record inserted into gmaps_api_costs
-- ✅ Campaign.google_maps_cost = 7.50
-- ✅ Campaign.actual_cost = 7.50
```

#### Test 6.2: Track Multiple Service Costs
```sql
-- Track Facebook cost
SELECT track_api_cost_tx(
    (SELECT campaign_id FROM test_fixtures),
    'facebook',
    '{"items_processed": 500, "cost_usd": 1.50}'::JSONB
);

-- Track LinkedIn cost
SELECT track_api_cost_tx(
    (SELECT campaign_id FROM test_fixtures),
    'linkedin',
    '{"items_processed": 200, "cost_usd": 2.00}'::JSONB
);

-- Verify
SELECT
    google_maps_cost = 7.50,
    facebook_cost = 1.50,
    linkedin_enrichment_cost = 2.00,
    actual_cost = 11.00  -- Sum of all costs
FROM gmaps_campaigns
WHERE id = (SELECT campaign_id FROM test_fixtures);
```

#### Test 6.3: Concurrent Cost Updates (Locking Test)
```sql
-- This test requires running 2 transactions simultaneously
-- Transaction 1
BEGIN;
SELECT track_api_cost_tx((SELECT campaign_id FROM test_fixtures), 'bouncer', '{"cost_usd": 0.50}'::JSONB);
-- Wait 2 seconds before commit
pg_sleep(2);
COMMIT;

-- Transaction 2 (run immediately after Transaction 1 starts)
BEGIN;
SELECT track_api_cost_tx((SELECT campaign_id FROM test_fixtures), 'google_maps', '{"cost_usd": 1.00}'::JSONB);
COMMIT;

-- Verify
-- ✅ Second transaction waited for first to complete (SELECT FOR UPDATE lock)
-- ✅ Both costs recorded accurately
-- ✅ actual_cost = sum of all costs (no race condition)
```

---

### Function 7: `update_coverage_status_tx()`

**Test Cases:**

#### Test 7.1: Update Coverage After Scraping
```sql
-- Setup: Get coverage record
INSERT INTO gmaps_campaign_coverage (campaign_id, zip_code, keywords)
SELECT campaign_id, '90210', ARRAY['test']
FROM test_fixtures;

-- Execute
SELECT update_coverage_status_tx(
    (SELECT campaign_id FROM test_fixtures),
    '90210',
    '{
        "businesses_found": 150,
        "emails_found": 75,
        "actual_cost": 1.50
    }'::JSONB
);

-- Verify
SELECT
    scraped = TRUE,
    scraped_at IS NOT NULL,
    businesses_found = 150,
    emails_found = 75,
    actual_cost = 1.50
FROM gmaps_campaign_coverage
WHERE campaign_id = (SELECT campaign_id FROM test_fixtures) AND zip_code = '90210';
```

---

### Function 8: `update_campaign_status_tx()`

**Test Cases:**

#### Test 8.1: Valid Transition - Draft to Running
```sql
SELECT update_campaign_status_tx(
    (SELECT campaign_id FROM test_fixtures),
    'running',
    '{}'::JSONB
);

-- Verify
SELECT
    status = 'running',
    started_at IS NOT NULL,
    completed_at IS NULL
FROM gmaps_campaigns
WHERE id = (SELECT campaign_id FROM test_fixtures);
```

#### Test 8.2: Valid Transition - Running to Completed
```sql
SELECT update_campaign_status_tx(
    (SELECT campaign_id FROM test_fixtures),
    'completed',
    '{}'::JSONB
);

-- Verify
SELECT
    status = 'completed',
    completed_at IS NOT NULL
FROM gmaps_campaigns
WHERE id = (SELECT campaign_id FROM test_fixtures);
```

#### Test 8.3: Invalid Transition - Draft to Completed
```sql
-- Reset to draft
UPDATE gmaps_campaigns SET status = 'draft' WHERE id = (SELECT campaign_id FROM test_fixtures);

-- Attempt invalid transition
SELECT update_campaign_status_tx(
    (SELECT campaign_id FROM test_fixtures),
    'completed',  -- Can't go directly from draft to completed
    '{}'::JSONB
);

-- Verify
-- ✅ Returns error: "Invalid status transition: draft -> completed"
-- ✅ Status remains 'draft' (transaction rolled back)
```

---

## 2. Integration Test Strategy (Application Code)

### Test Environment
- **Backend**: Simple-server.js + Node modules
- **Python**: Campaign manager + Supabase manager
- **Database**: Supabase with stored functions deployed

---

### JavaScript Integration Tests (`tests/integration/test_rpc_functions.js`)

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

describe('RPC Function Integration Tests', () => {
  let testCampaignId;
  let testBusinessId;

  beforeAll(async () => {
    // Create test campaign
    const { data: campaign } = await supabase
      .from('gmaps_campaigns')
      .insert({ name: 'RPC Test Campaign', location: '90210', keywords: ['test'] })
      .select()
      .single();
    testCampaignId = campaign.id;

    // Create test business
    const { data: business } = await supabase
      .from('gmaps_businesses')
      .insert({ campaign_id: testCampaignId, place_id: `test_${Date.now()}`, name: 'Test Biz' })
      .select()
      .single();
    testBusinessId = business.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('gmaps_campaigns').delete().eq('id', testCampaignId);
  });

  test('save_facebook_enrichment_tx - Success Path', async () => {
    const { data, error } = await supabase.rpc('save_facebook_enrichment_tx', {
      p_business_id: testBusinessId,
      p_campaign_id: testCampaignId,
      p_enrichment_data: {
        facebook_url: 'https://facebook.com/testbiz',
        primary_email: 'test@business.com',
        success: true
      }
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.enrichment_id).toBeDefined();

    // Verify business updated
    const { data: business } = await supabase
      .from('gmaps_businesses')
      .select('email, email_source')
      .eq('id', testBusinessId)
      .single();

    expect(business.email).toBe('test@business.com');
    expect(business.email_source).toBe('facebook');
  });

  test('save_linkedin_enrichment_tx - Success Path', async () => {
    const { data, error } = await supabase.rpc('save_linkedin_enrichment_tx', {
      p_business_id: testBusinessId,
      p_campaign_id: testCampaignId,
      p_enrichment_data: {
        linkedin_url: 'https://linkedin.com/company/testbiz',
        profile_type: 'company',
        primary_email: 'linkedin@business.com',
        email_verified: true
      }
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);

    // Verify LinkedIn email overrides Facebook
    const { data: business } = await supabase
      .from('gmaps_businesses')
      .select('email, email_source, linkedin_enriched')
      .eq('id', testBusinessId)
      .single();

    expect(business.email).toBe('linkedin@business.com');
    expect(business.email_source).toBe('linkedin');
    expect(business.linkedin_enriched).toBe(true);
  });

  test('create_campaign_with_coverage_tx - Success Path', async () => {
    const { data, error } = await supabase.rpc('create_campaign_with_coverage_tx', {
      campaign_data: {
        name: 'RPC Integration Test Campaign',
        location: 'Los Angeles, CA',
        keywords: ['restaurants'],
        coverage_profile: 'budget',
        actual_zip_count: 2
      },
      coverage_data: [
        { zip_code: '90001', keywords: ['restaurants'], max_results: 200 },
        { zip_code: '90002', keywords: ['restaurants'], max_results: 200 }
      ]
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.coverage_count).toBe(2);

    // Verify coverage records created
    const { count } = await supabase
      .from('gmaps_campaign_coverage')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', data.campaign_id);

    expect(count).toBe(2);

    // Cleanup
    await supabase.from('gmaps_campaigns').delete().eq('id', data.campaign_id);
  });

  test('track_api_cost_tx - Concurrent Updates', async () => {
    // Execute 3 cost tracking operations in parallel
    const promises = [
      supabase.rpc('track_api_cost_tx', {
        p_campaign_id: testCampaignId,
        p_service: 'google_maps',
        p_cost_data: { cost_usd: 5.00, items_processed: 500 }
      }),
      supabase.rpc('track_api_cost_tx', {
        p_campaign_id: testCampaignId,
        p_service: 'facebook',
        p_cost_data: { cost_usd: 2.00, items_processed: 200 }
      }),
      supabase.rpc('track_api_cost_tx', {
        p_campaign_id: testCampaignId,
        p_service: 'linkedin',
        p_cost_data: { cost_usd: 3.00, items_processed: 150 }
      })
    ];

    const results = await Promise.all(promises);
    results.forEach(({ data, error }) => {
      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    // Verify total cost is correct (no race condition)
    const { data: campaign } = await supabase
      .from('gmaps_campaigns')
      .select('google_maps_cost, facebook_cost, linkedin_enrichment_cost, actual_cost')
      .eq('id', testCampaignId)
      .single();

    expect(campaign.google_maps_cost).toBe(5.00);
    expect(campaign.facebook_cost).toBe(2.00);
    expect(campaign.linkedin_enrichment_cost).toBe(3.00);
    expect(campaign.actual_cost).toBe(10.00);
  });
});
```

---

### Python Integration Tests (`tests/integration/test_rpc_python.py`)

```python
import pytest
from lead_generation.modules.gmaps_supabase_manager import GmapsSupabaseManager

@pytest.fixture
def db_manager():
    """Create database manager instance"""
    return GmapsSupabaseManager(
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_KEY')
    )

@pytest.fixture
def test_campaign(db_manager):
    """Create test campaign"""
    result = db_manager.client.table('gmaps_campaigns').insert({
        'name': 'Python RPC Test',
        'location': '90210',
        'keywords': ['test']
    }).execute()
    campaign_id = result.data[0]['id']

    yield campaign_id

    # Cleanup
    db_manager.client.table('gmaps_campaigns').delete().eq('id', campaign_id).execute()

def test_save_facebook_enrichment_rpc(db_manager, test_campaign):
    """Test Facebook enrichment via RPC"""
    # Create business
    business = db_manager.client.table('gmaps_businesses').insert({
        'campaign_id': test_campaign,
        'place_id': f'test_py_{int(time.time())}',
        'name': 'Python Test Business'
    }).execute().data[0]

    # Call RPC function
    enrichment_data = {
        'facebook_url': 'https://facebook.com/pythontest',
        'primary_email': 'python@test.com',
        'success': True
    }

    result = db_manager.save_facebook_enrichment(
        business_id=business['id'],
        campaign_id=test_campaign,
        enrichment_data=enrichment_data
    )

    assert result is True

    # Verify business updated
    updated_business = db_manager.client.table('gmaps_businesses')\
        .select('email, email_source, enrichment_status')\
        .eq('id', business['id'])\
        .single()\
        .execute().data

    assert updated_business['email'] == 'python@test.com'
    assert updated_business['email_source'] == 'facebook'
    assert updated_business['enrichment_status'] == 'enriched'

def test_save_linkedin_enrichment_with_bouncer(db_manager, test_campaign):
    """Test LinkedIn enrichment with Bouncer verification via RPC"""
    # Create business
    business = db_manager.client.table('gmaps_businesses').insert({
        'campaign_id': test_campaign,
        'place_id': f'test_li_py_{int(time.time())}',
        'name': 'LinkedIn Test Business'
    }).execute().data[0]

    # Call RPC function with full LinkedIn data
    enrichment_data = {
        'linkedin_url': 'https://linkedin.com/company/pythontest',
        'profile_type': 'company',
        'company_name': 'Python Test Co',
        'primary_email': 'contact@pythontest.com',
        'email_source': 'linkedin_public',
        'email_verified': True,
        'bouncer_status': 'deliverable',
        'bouncer_score': 92,
        'bouncer_is_safe': True,
        'bouncer_verified_at': datetime.now().isoformat()
    }

    result = db_manager.save_linkedin_enrichment(
        business_id=business['id'],
        campaign_id=test_campaign,
        enrichment_data=enrichment_data
    )

    assert result is True

    # Verify LinkedIn enrichment saved with verification
    enrichment = db_manager.client.table('gmaps_linkedin_enrichments')\
        .select('*')\
        .eq('business_id', business['id'])\
        .single()\
        .execute().data

    assert enrichment['email_verified'] is True
    assert enrichment['bouncer_status'] == 'deliverable'
    assert enrichment['bouncer_score'] == 92
```

---

### Campaign Manager Integration Tests (`tests/integration/test_campaign_manager_rpc.py`)

```python
def test_full_campaign_workflow_with_rpc(db_manager):
    """Test complete campaign flow using RPC functions"""

    # Phase 1: Create campaign with coverage
    campaign_data = {
        'name': 'RPC Workflow Test',
        'location': 'Beverly Hills, CA',
        'keywords': ['restaurants'],
        'coverage_profile': 'budget'
    }

    coverage_data = [
        {'zip_code': '90210', 'keywords': ['restaurants'], 'max_results': 200}
    ]

    result = db_manager.client.rpc('create_campaign_with_coverage_tx', {
        'campaign_data': campaign_data,
        'coverage_data': coverage_data
    }).execute()

    assert result.data['success'] is True
    campaign_id = result.data['campaign_id']

    # Phase 2: Save businesses (simulate scraping)
    businesses = [
        {
            'campaign_id': campaign_id,
            'place_id': f'workflow_test_{i}',
            'name': f'Restaurant {i}',
            'address': f'{i} Test St',
            'zip_code': '90210'
        }
        for i in range(5)
    ]

    # Save businesses (RPC handles deduplication)
    saved = db_manager.save_businesses(businesses, campaign_id, '90210')
    assert saved == 5

    # Phase 3: Update coverage status
    result = db_manager.client.rpc('update_coverage_status_tx', {
        'p_campaign_id': campaign_id,
        'p_zip_code': '90210',
        'p_results': {
            'businesses_found': 5,
            'emails_found': 0,
            'actual_cost': 0.50
        }
    }).execute()

    assert result.data['success'] is True

    # Phase 4: Track API cost
    result = db_manager.track_api_cost(
        campaign_id=campaign_id,
        service='google_maps',
        items=5,
        cost_usd=0.50
    )

    assert result is True

    # Phase 5: Update campaign statistics
    result = db_manager.client.rpc('update_campaign_statistics_tx', {
        'p_campaign_id': campaign_id
    }).execute()

    assert result.data['success'] is True
    assert result.data['statistics']['total_businesses'] == 5

    # Phase 6: Transition campaign status
    result = db_manager.client.rpc('update_campaign_status_tx', {
        'p_campaign_id': campaign_id,
        'p_new_status': 'running'
    }).execute()

    assert result.data['success'] is True
    assert result.data['new_status'] == 'running'

    # Cleanup
    db_manager.client.table('gmaps_campaigns').delete().eq('id', campaign_id).execute()
```

---

## 3. Concurrency Test Strategy

### Test Scenarios

#### Scenario 1: Concurrent Cost Tracking (HIGH PRIORITY)
**Risk**: Multiple workers updating campaign costs simultaneously

```javascript
// tests/concurrency/test_cost_tracking_race.js
const { Worker } = require('worker_threads');

async function runConcurrentCostTracking() {
  const campaignId = await createTestCampaign();

  // Spawn 10 workers to track costs concurrently
  const workers = [];
  for (let i = 0; i < 10; i++) {
    workers.push(new Worker('./cost_tracking_worker.js', {
      workerData: {
        campaignId,
        service: i % 2 === 0 ? 'google_maps' : 'facebook',
        cost: 1.00
      }
    }));
  }

  // Wait for all workers to complete
  await Promise.all(workers.map(w => new Promise(resolve => w.on('exit', resolve))));

  // Verify total cost is correct
  const { data: campaign } = await supabase
    .from('gmaps_campaigns')
    .select('actual_cost')
    .eq('id', campaignId)
    .single();

  // Expected: 5 x google_maps (1.00) + 5 x facebook (1.00) = 10.00
  assert.equal(campaign.actual_cost, 10.00, 'Cost race condition detected!');
}
```

**Expected Outcome**: SELECT FOR UPDATE lock serializes updates, preventing race conditions

---

#### Scenario 2: Email Source Priority Race
**Risk**: LinkedIn and Facebook enrichment running simultaneously

```python
# tests/concurrency/test_email_source_race.py
import threading

def test_email_source_priority_concurrent():
    """Test email source priority when enrichments run concurrently"""
    campaign_id = create_test_campaign()
    business = create_test_business(campaign_id)

    # Thread 1: Save Facebook enrichment
    def save_facebook():
        db_manager.save_facebook_enrichment(
            business['id'],
            campaign_id,
            {
                'facebook_url': 'https://facebook.com/test',
                'primary_email': 'facebook@test.com',
                'success': True
            }
        )

    # Thread 2: Save LinkedIn enrichment (higher priority)
    def save_linkedin():
        time.sleep(0.1)  # Start slightly after Facebook
        db_manager.save_linkedin_enrichment(
            business['id'],
            campaign_id,
            {
                'linkedin_url': 'https://linkedin.com/company/test',
                'primary_email': 'linkedin@test.com',
                'email_verified': True
            }
        )

    # Run concurrently
    t1 = threading.Thread(target=save_facebook)
    t2 = threading.Thread(target=save_linkedin)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Verify LinkedIn email wins (highest priority)
    business_updated = db_manager.client.table('gmaps_businesses')\
        .select('email, email_source')\
        .eq('id', business['id'])\
        .single()\
        .execute().data

    assert business_updated['email'] == 'linkedin@test.com'
    assert business_updated['email_source'] == 'linkedin'
```

**Expected Outcome**: Last write wins, but atomicity ensures enrichment record matches business record

---

#### Scenario 3: Campaign Statistics Race
**Risk**: Multiple updates to campaign counters

```javascript
// tests/concurrency/test_statistics_race.js
async function testStatisticsUpdateConcurrency() {
  const campaignId = await createTestCampaign();

  // Create 100 businesses in parallel
  const businessPromises = [];
  for (let i = 0; i < 100; i++) {
    businessPromises.push(
      supabase.from('gmaps_businesses').insert({
        campaign_id: campaignId,
        place_id: `concurrent_${i}`,
        name: `Business ${i}`,
        email: i % 3 === 0 ? `email${i}@test.com` : null
      })
    );
  }

  await Promise.all(businessPromises);

  // Update statistics from 5 workers concurrently
  const updatePromises = [];
  for (let i = 0; i < 5; i++) {
    updatePromises.push(
      supabase.rpc('update_campaign_statistics_tx', {
        p_campaign_id: campaignId
      })
    );
  }

  const results = await Promise.all(updatePromises);

  // All should succeed
  results.forEach(({ data, error }) => {
    expect(error).toBeNull();
    expect(data.statistics.total_businesses).toBe(100);
    expect(data.statistics.total_emails).toBe(34); // 100 / 3 = 33.33
  });
}
```

**Expected Outcome**: All updates produce same result (idempotent)

---

## 4. Performance Test Strategy

### Benchmark Specifications

#### Test 1: Old vs New Approach Comparison
**Objective**: Measure latency impact of RPC calls vs direct table operations

```javascript
// tests/performance/test_rpc_vs_direct.js
async function benchmarkFacebookEnrichment() {
  const iterations = 100;

  // OLD APPROACH: Direct table operations
  const oldStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const { data: enrichment } = await supabase
      .from('gmaps_facebook_enrichments')
      .insert({ business_id, campaign_id, facebook_url: 'test' })
      .select()
      .single();

    await supabase
      .from('gmaps_businesses')
      .update({ email: 'test@email.com', email_source: 'facebook' })
      .eq('id', business_id);
  }
  const oldDuration = performance.now() - oldStart;

  // NEW APPROACH: RPC function
  const newStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await supabase.rpc('save_facebook_enrichment_tx', {
      p_business_id: business_id,
      p_campaign_id: campaign_id,
      p_enrichment_data: {
        facebook_url: 'test',
        primary_email: 'test@email.com',
        success: true
      }
    });
  }
  const newDuration = performance.now() - newStart;

  console.log(`OLD: ${oldDuration}ms (${oldDuration / iterations}ms per operation)`);
  console.log(`NEW: ${newDuration}ms (${newDuration / iterations}ms per operation)`);
  console.log(`Overhead: ${((newDuration - oldDuration) / oldDuration * 100).toFixed(2)}%`);
}
```

**Acceptable Threshold**: < 30% overhead

---

#### Test 2: JSONB Parsing Performance
**Objective**: Measure cost of JSONB parameter parsing

```sql
-- tests/performance/test_jsonb_parsing.sql
EXPLAIN ANALYZE
SELECT save_facebook_enrichment_tx(
    'business-uuid'::UUID,
    'campaign-uuid'::UUID,
    '{
        "facebook_url": "https://facebook.com/test",
        "page_name": "Test Page",
        "emails": ["test1@example.com", "test2@example.com"],
        "primary_email": "test1@example.com",
        "phone_numbers": ["+1-555-0100", "+1-555-0101"],
        "success": true
    }'::JSONB
);

-- Check execution time breakdown
-- Target: < 10ms for JSONB parsing
```

---

#### Test 3: Batch Operation Scalability
**Objective**: Test performance with varying batch sizes

```javascript
// tests/performance/test_batch_scalability.js
async function benchmarkBatchSizes() {
  const batchSizes = [10, 100, 1000, 5000];
  const results = {};

  for (const size of batchSizes) {
    const businesses = generateTestBusinesses(size);

    const start = performance.now();
    const saved = await supabase.rpc('batch_upsert_businesses_atomic', {
      businesses: businesses
    });
    const duration = performance.now() - start;

    results[size] = {
      duration: duration,
      perRecord: duration / size,
      throughput: size / (duration / 1000) // records per second
    };
  }

  console.table(results);
}
```

**Expected Results:**
| Batch Size | Duration | Per Record | Throughput |
|------------|----------|------------|------------|
| 10 | 50-100ms | 5-10ms | 100-200/s |
| 100 | 200-500ms | 2-5ms | 200-500/s |
| 1000 | 2-5s | 2-5ms | 200-500/s |
| 5000 | 10-25s | 2-5ms | 200-500/s |

---

#### Test 4: EXPLAIN ANALYZE for Slow Queries
**Objective**: Identify slow stored functions

```sql
-- tests/performance/test_explain_analyze.sql

-- Test 1: Campaign Statistics (potentially slow with 100k+ businesses)
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT update_campaign_statistics_tx('campaign-uuid'::UUID);

-- Check:
-- ✅ Seq Scan vs Index Scan
-- ✅ Execution time breakdown
-- ✅ Buffer hits vs misses
-- ✅ Planning time vs execution time

-- Test 2: Campaign Creation with 100 ZIPs
EXPLAIN (ANALYZE, BUFFERS)
SELECT create_campaign_with_coverage_tx(
    '{"name": "Perf Test"}'::JSONB,
    (SELECT array_agg(('{"zip_code": "' || i || '"}')::JSONB)
     FROM generate_series(10000, 10099) i)
);

-- Target: < 500ms for 100 ZIP codes
```

---

## 5. Regression Test Strategy

### Objective
Ensure existing functionality remains intact after RPC migration

---

### Test Suite Execution Plan

#### Step 1: Run Existing Test Suite (Baseline)
```bash
# JavaScript tests
npm test tests/test_database_integrity.js
npm test tests/test_api_endpoints.js
npm test tests/test_email_tracking.js

# Python tests
python tests/test_campaign_manager.py
python tests/integration/test_gmaps_integration.py
python tests/integration/test_complete_flow.py
python tests/test_email_source_tracking.py
python tests/integration/test_email_enrichment.py
python tests/integration/test_linkedin_enrichment_full.py

# Record baseline pass rate
# Expected: 94.12% passing (from STATUS.md)
```

---

#### Step 2: Deploy RPC Functions

```sql
-- Run in Supabase SQL Editor
-- migrations/schema/20251013_001_create_stored_functions.sql
-- (Contains all 8 stored functions)
```

---

#### Step 3: Run Test Suite Again (After Migration)
```bash
# Run same tests
npm test tests/test_database_integrity.js
# ... (all tests from Step 1)

# Compare results
# Success Criteria: ≥ 94.12% passing (no regressions)
```

---

#### Step 4: Verify Specific Behaviors

**Test 4.1: Email Source Priority Still Works**
```javascript
test('Email source priority: LinkedIn > Facebook > Google Maps', async () => {
  // Create business with Google Maps email
  const business = await createTestBusiness({ email: 'gm@test.com', email_source: 'google_maps' });

  // Add Facebook enrichment
  await supabase.rpc('save_facebook_enrichment_tx', {
    p_business_id: business.id,
    p_campaign_id: campaign.id,
    p_enrichment_data: { primary_email: 'fb@test.com', success: true }
  });

  // Verify Facebook overrides Google Maps
  let updated = await getBusinessEmail(business.id);
  expect(updated.email_source).toBe('facebook');

  // Add LinkedIn enrichment
  await supabase.rpc('save_linkedin_enrichment_tx', {
    p_business_id: business.id,
    p_campaign_id: campaign.id,
    p_enrichment_data: { primary_email: 'li@test.com', email_verified: true }
  });

  // Verify LinkedIn overrides Facebook
  updated = await getBusinessEmail(business.id);
  expect(updated.email_source).toBe('linkedin');
});
```

**Test 4.2: Chain Business Deduplication**
```python
def test_chain_business_deduplication():
    """Test multiple businesses sharing same Facebook URL"""
    campaign_id = create_test_campaign()

    # Create 3 businesses (same chain)
    businesses = [
        create_test_business(campaign_id, f'chain_location_{i}')
        for i in range(3)
    ]

    # Enrich all with same Facebook page
    for business in businesses:
        db_manager.save_facebook_enrichment(
            business['id'],
            campaign_id,
            {
                'facebook_url': 'https://facebook.com/starbucks',
                'primary_email': 'info@starbucks.com',
                'success': True
            }
        )

    # Verify: 3 enrichment records, all businesses have email
    enrichments = db_manager.client.table('gmaps_facebook_enrichments')\
        .select('*')\
        .eq('campaign_id', campaign_id)\
        .execute().data

    assert len(enrichments) == 3

    for business in businesses:
        updated = db_manager.client.table('gmaps_businesses')\
            .select('email, email_source')\
            .eq('id', business['id'])\
            .single()\
            .execute().data

        assert updated['email'] == 'info@starbucks.com'
        assert updated['email_source'] == 'facebook'
```

**Test 4.3: Campaign Statistics Accuracy**
```javascript
test('Campaign statistics match actual counts', async () => {
  const campaignId = await createTestCampaign();

  // Create 10 businesses, 5 with emails
  for (let i = 0; i < 10; i++) {
    await supabase.from('gmaps_businesses').insert({
      campaign_id: campaignId,
      place_id: `stat_check_${i}`,
      name: `Business ${i}`,
      email: i % 2 === 0 ? `email${i}@test.com` : null
    });
  }

  // Update statistics
  await supabase.rpc('update_campaign_statistics_tx', {
    p_campaign_id: campaignId
  });

  // Verify counts
  const { data: campaign } = await supabase
    .from('gmaps_campaigns')
    .select('total_businesses_found, total_emails_found')
    .eq('id', campaignId)
    .single();

  expect(campaign.total_businesses_found).toBe(10);
  expect(campaign.total_emails_found).toBe(5);
});
```

---

#### Step 5: Data Integrity Checks

```sql
-- tests/regression/data_integrity_checks.sql

-- Check 1: No orphaned enrichments
SELECT COUNT(*) as orphaned_facebook_enrichments
FROM gmaps_facebook_enrichments fe
LEFT JOIN gmaps_businesses b ON b.id = fe.business_id
WHERE b.id IS NULL;
-- Expected: 0

SELECT COUNT(*) as orphaned_linkedin_enrichments
FROM gmaps_linkedin_enrichments le
LEFT JOIN gmaps_businesses b ON b.id = le.business_id
WHERE b.id IS NULL;
-- Expected: 0

-- Check 2: Campaign statistics match reality
SELECT
    c.id,
    c.total_businesses_found,
    COUNT(DISTINCT b.id) as actual_businesses,
    ABS(c.total_businesses_found - COUNT(DISTINCT b.id)) as drift
FROM gmaps_campaigns c
LEFT JOIN gmaps_businesses b ON b.campaign_id = c.id
GROUP BY c.id, c.total_businesses_found
HAVING ABS(c.total_businesses_found - COUNT(DISTINCT b.id)) > 0;
-- Expected: 0 rows (no drift)

-- Check 3: Cost calculations are accurate
SELECT
    c.id,
    c.google_maps_cost,
    c.facebook_cost,
    c.linkedin_enrichment_cost,
    c.bouncer_verification_cost,
    c.actual_cost,
    (COALESCE(c.google_maps_cost, 0) + COALESCE(c.facebook_cost, 0) +
     COALESCE(c.linkedin_enrichment_cost, 0) + COALESCE(c.bouncer_verification_cost, 0)) as calculated_total,
    ABS(c.actual_cost - (COALESCE(c.google_maps_cost, 0) + COALESCE(c.facebook_cost, 0) +
         COALESCE(c.linkedin_enrichment_cost, 0) + COALESCE(c.bouncer_verification_cost, 0))) as drift
FROM gmaps_campaigns c
WHERE c.actual_cost IS NOT NULL
HAVING ABS(c.actual_cost - calculated_total) > 0.01;
-- Expected: 0 rows (no cost drift)

-- Check 4: Email source priority is correct
SELECT
    b.id,
    b.email,
    b.email_source,
    CASE
        WHEN EXISTS(SELECT 1 FROM gmaps_linkedin_enrichments WHERE business_id = b.id AND primary_email IS NOT NULL)
            THEN 'linkedin'
        WHEN EXISTS(SELECT 1 FROM gmaps_facebook_enrichments WHERE business_id = b.id AND primary_email IS NOT NULL)
            THEN 'facebook'
        WHEN b.email IS NOT NULL
            THEN 'google_maps'
        ELSE 'not_found'
    END as expected_source
FROM gmaps_businesses b
WHERE b.email_source != expected_source;
-- Expected: 0 rows (all sources correct)
```

---

## 6. Test Execution Order & Estimated Time

### Phase 1: Unit Tests (SQL Level) - 1.5 hours
1. Function 1: `save_facebook_enrichment_tx()` - 15 min
2. Function 2: `save_linkedin_enrichment_tx()` - 15 min
3. Function 3: `create_campaign_with_coverage_tx()` - 15 min
4. Function 4: `update_email_verification_tx()` - 15 min
5. Function 5: `update_campaign_statistics_tx()` - 10 min
6. Function 6: `track_api_cost_tx()` - 15 min
7. Function 7: `update_coverage_status_tx()` - 5 min
8. Function 8: `update_campaign_status_tx()` - 10 min

### Phase 2: Integration Tests (Application Code) - 1 hour
1. JavaScript RPC Integration Tests - 30 min
2. Python RPC Integration Tests - 20 min
3. Campaign Manager Workflow Test - 10 min

### Phase 3: Concurrency Tests - 30 minutes
1. Cost Tracking Race Condition - 15 min
2. Email Source Priority Race - 10 min
3. Statistics Update Concurrency - 5 min

### Phase 4: Performance Tests - 45 minutes
1. Old vs New Approach Comparison - 15 min
2. JSONB Parsing Performance - 10 min
3. Batch Operation Scalability - 15 min
4. EXPLAIN ANALYZE Analysis - 5 min

### Phase 5: Regression Tests - 45 minutes
1. Run Existing Test Suite (Baseline) - 15 min
2. Deploy RPC Functions - 5 min
3. Run Test Suite (After Migration) - 15 min
4. Verify Specific Behaviors - 5 min
5. Data Integrity Checks - 5 min

**Total Estimated Time: 4 hours**

---

## 7. Success Criteria

### Unit Tests
- ✅ All 8 functions pass success path tests
- ✅ All 8 functions pass failure path tests
- ✅ All 8 functions properly rollback on errors
- ✅ No orphaned records after rollback
- ✅ FK constraints enforced correctly

### Integration Tests
- ✅ JavaScript RPC calls work correctly
- ✅ Python RPC calls work correctly
- ✅ Campaign manager workflow completes successfully
- ✅ Error handling works (returns {success: false} on errors)
- ✅ Business records updated atomically with enrichments

### Concurrency Tests
- ✅ Cost tracking has no race conditions
- ✅ Email source priority maintained under concurrent enrichments
- ✅ Campaign statistics accurate under concurrent updates
- ✅ SELECT FOR UPDATE locks prevent conflicts

### Performance Tests
- ✅ RPC overhead < 30% compared to direct queries
- ✅ JSONB parsing < 10ms per operation
- ✅ Batch operations scale linearly
- ✅ No slow queries (all < 500ms for typical operations)

### Regression Tests
- ✅ Existing test suite pass rate ≥ 94.12% (no regressions)
- ✅ Email source priority still correct
- ✅ Chain business deduplication works
- ✅ Campaign statistics match actual counts
- ✅ No orphaned enrichments
- ✅ Cost calculations accurate

---

## 8. Test Implementation Files

### Files to Create

```
tests/
├── stored_functions/
│   ├── unit/
│   │   ├── test_save_facebook_enrichment.sql
│   │   ├── test_save_linkedin_enrichment.sql
│   │   ├── test_create_campaign_with_coverage.sql
│   │   ├── test_update_email_verification.sql
│   │   ├── test_update_campaign_statistics.sql
│   │   ├── test_track_api_cost.sql
│   │   ├── test_update_coverage_status.sql
│   │   └── test_update_campaign_status.sql
│   │
│   ├── integration/
│   │   ├── test_rpc_functions.js (JavaScript integration)
│   │   ├── test_rpc_python.py (Python integration)
│   │   └── test_campaign_manager_rpc.py (Full workflow)
│   │
│   ├── concurrency/
│   │   ├── test_cost_tracking_race.js
│   │   ├── test_email_source_race.py
│   │   └── test_statistics_race.js
│   │
│   ├── performance/
│   │   ├── test_rpc_vs_direct.js
│   │   ├── test_jsonb_parsing.sql
│   │   ├── test_batch_scalability.js
│   │   └── test_explain_analyze.sql
│   │
│   └── regression/
│       ├── run_baseline_tests.sh
│       ├── run_post_migration_tests.sh
│       ├── test_behavior_preservation.js
│       └── data_integrity_checks.sql
│
├── README_STORED_FUNCTIONS_TESTS.md
└── run_all_stored_function_tests.sh
```

---

## 9. Test Execution Script

```bash
#!/bin/bash
# tests/stored_functions/run_all_stored_function_tests.sh

set -e

echo "========================================="
echo "Stored Functions Test Suite"
echo "========================================="
echo ""

# Phase 1: Unit Tests (SQL)
echo "Phase 1: Running Unit Tests (SQL)..."
for test_file in tests/stored_functions/unit/*.sql; do
    echo "  Running $(basename $test_file)..."
    psql $DATABASE_URL -f $test_file
done
echo "✅ Phase 1 Complete"
echo ""

# Phase 2: Integration Tests (JavaScript)
echo "Phase 2: Running Integration Tests (JavaScript)..."
npm test tests/stored_functions/integration/test_rpc_functions.js
echo "✅ Phase 2 Complete"
echo ""

# Phase 3: Integration Tests (Python)
echo "Phase 3: Running Integration Tests (Python)..."
python -m pytest tests/stored_functions/integration/test_rpc_python.py -v
python -m pytest tests/stored_functions/integration/test_campaign_manager_rpc.py -v
echo "✅ Phase 3 Complete"
echo ""

# Phase 4: Concurrency Tests
echo "Phase 4: Running Concurrency Tests..."
node tests/stored_functions/concurrency/test_cost_tracking_race.js
python tests/stored_functions/concurrency/test_email_source_race.py
node tests/stored_functions/concurrency/test_statistics_race.js
echo "✅ Phase 4 Complete"
echo ""

# Phase 5: Performance Tests
echo "Phase 5: Running Performance Tests..."
node tests/stored_functions/performance/test_rpc_vs_direct.js
psql $DATABASE_URL -f tests/stored_functions/performance/test_jsonb_parsing.sql
node tests/stored_functions/performance/test_batch_scalability.js
echo "✅ Phase 5 Complete"
echo ""

# Phase 6: Regression Tests
echo "Phase 6: Running Regression Tests..."
bash tests/stored_functions/regression/run_post_migration_tests.sh
node tests/stored_functions/regression/test_behavior_preservation.js
psql $DATABASE_URL -f tests/stored_functions/regression/data_integrity_checks.sql
echo "✅ Phase 6 Complete"
echo ""

echo "========================================="
echo "All Tests Complete!"
echo "========================================="
```

---

## 10. Monitoring & Validation After Deployment

### Production Health Checks

```sql
-- Run these queries daily after deployment

-- 1. Transaction failure rate
SELECT
    proname as function_name,
    calls,
    total_time / calls as avg_time_ms,
    (total_time / 1000000.0) / calls as avg_time_sec
FROM pg_stat_user_functions
WHERE proname LIKE '%_tx'
ORDER BY calls DESC;

-- 2. Lock contention
SELECT
    relation::regclass,
    mode,
    COUNT(*) as lock_count,
    COUNT(*) FILTER (WHERE NOT granted) as waiting
FROM pg_locks
WHERE relation IS NOT NULL
GROUP BY relation, mode
HAVING COUNT(*) FILTER (WHERE NOT granted) > 0;

-- 3. Long-running transactions
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '1 second'
ORDER BY duration DESC;
```

---

## 11. Rollback Plan

If tests fail or production issues occur:

### Immediate Rollback (Emergency)
```sql
-- 1. Rename stored functions to disable them
ALTER FUNCTION save_facebook_enrichment_tx RENAME TO save_facebook_enrichment_tx_disabled;
-- Repeat for all 8 functions

-- 2. Application code will fail gracefully (error handling)
-- 3. Investigate issues
-- 4. Fix and redeploy
```

### Gradual Rollback (Feature Flag)
```javascript
// In application code
const USE_RPC_FUNCTIONS = process.env.USE_RPC_FUNCTIONS === 'true';

async function saveFacebookEnrichment(businessId, campaignId, data) {
  if (USE_RPC_FUNCTIONS) {
    // New approach: RPC
    return await supabase.rpc('save_facebook_enrichment_tx', {
      p_business_id: businessId,
      p_campaign_id: campaignId,
      p_enrichment_data: data
    });
  } else {
    // Old approach: Direct queries
    const { data: enrichment } = await supabase
      .from('gmaps_facebook_enrichments')
      .insert({ business_id: businessId, ... });

    await supabase
      .from('gmaps_businesses')
      .update({ email: data.primary_email, ... })
      .eq('id', businessId);

    return enrichment;
  }
}
```

Set `USE_RPC_FUNCTIONS=false` to revert to old behavior.

---

## Summary

This comprehensive test strategy covers:

1. **8 Unit Test Suites** - SQL-level testing with 40+ test cases
2. **3 Integration Test Suites** - Application code testing (JavaScript + Python)
3. **3 Concurrency Test Scenarios** - Race condition validation
4. **4 Performance Test Benchmarks** - Optimization and scalability
5. **5 Regression Test Checks** - No existing functionality broken

**Total Test Cases**: 60+ tests
**Estimated Execution Time**: 4 hours
**Success Threshold**: 100% passing for production deployment

All tests are designed to be:
- ✅ **Automated** - Can run via script
- ✅ **Repeatable** - Same results every time
- ✅ **Isolated** - Tests don't interfere with each other
- ✅ **Comprehensive** - Cover success, failure, edge cases
- ✅ **Performance-aware** - Validate acceptable latency

**Next Steps**:
1. Create test files following the structure above
2. Run Phase 1 (Unit Tests) first
3. Deploy functions to staging
4. Run Phases 2-5 (Integration, Concurrency, Performance)
5. Run Phase 6 (Regression) to confirm no breaking changes
6. Deploy to production with monitoring
7. Run production health checks daily for 1 week

---

**Document Version**: 1.0
**Last Updated**: 2025-10-13
**Status**: Ready for Implementation
**Estimated Implementation Time**: 2-3 days
