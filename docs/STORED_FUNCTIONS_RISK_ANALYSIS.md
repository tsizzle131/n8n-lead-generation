# PostgreSQL Stored Functions Risk Analysis

**Date:** 2025-10-13
**Branch:** pgrst204-fix-final
**Status:** Pre-Implementation Risk Assessment
**Scope:** Migration from direct table operations to PostgreSQL stored procedures

---

## Executive Summary

This document provides a comprehensive risk analysis for implementing PostgreSQL stored functions to replace direct table operations in the Google Maps lead generation system. The migration addresses critical transaction boundary issues that cause data loss and inconsistencies.

**Overall Risk Level:** 🟡 MEDIUM-HIGH
- **Breaking Changes:** Moderate impact - requires code updates in 2 backends
- **Data Migration:** Low risk - no schema changes, additive only
- **Performance:** Medium risk - row locking may cause contention
- **Rollback:** Low risk - can revert to direct queries easily

---

## 1. Breaking Change Analysis

### 1.1 API Contract Changes

#### Current Behavior (Direct Table Operations)
```javascript
// Node.js Backend (supabase-db.js)
async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
  // Step 1: Insert enrichment
  const { data, error } = await supabase
    .from('gmaps_facebook_enrichments')
    .insert(record)
    .select()
    .single();

  // Step 2: Update business (SEPARATE operation - can fail independently!)
  await supabase
    .from('gmaps_businesses')
    .update(updates)
    .eq('id', businessId)
    .execute();

  return data;  // Returns enrichment record
}
```

**Problems:**
- ❌ No transaction boundary - can have enrichment without business update
- ❌ Returns enrichment record even if business update fails
- ❌ Error from step 2 may go unnoticed

#### New Behavior (Stored Procedure)
```javascript
async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
  const { data, error } = await supabase.rpc(
    'save_facebook_enrichment_tx',
    {
      p_business_id: businessId,
      p_campaign_id: campaignId,
      p_enrichment_data: enrichmentData
    }
  );

  // Returns JSONB: { success, enrichment_id, business_id } or { success: false, error }
  if (error || !data.success) {
    throw new Error(data?.error || error.message);
  }

  return data;
}
```

**Changes:**
- ✅ Single atomic operation - all or nothing
- ✅ Explicit success/failure indication
- ⚠️ **Return value format changes:** JSONB object vs. database record
- ⚠️ **Error handling changes:** Exceptions vs. error JSONB

### 1.2 Breaking Changes Checklist

| Component | Current Behavior | New Behavior | Breaking? | Mitigation |
|-----------|-----------------|--------------|-----------|------------|
| **Return Values** | Database records (objects with all columns) | JSONB `{ success, enrichment_id, business_id }` | ✅ YES | Update callers to use new JSONB structure |
| **Error Handling** | Exceptions thrown immediately | JSONB `{ success: false, error }` | ✅ YES | Check `data.success` before proceeding |
| **Partial Failures** | Currently possible (enrichment saved, business not updated) | Not possible (atomic rollback) | ✅ YES | Remove partial failure handling code |
| **Email Source Priority** | Implicit (last write wins) | Explicit in stored function | ⚠️ MAYBE | Verify priority logic matches expectations |
| **Cost Calculation** | Race conditions possible | Serialized with row locks | ✅ YES | May impact concurrent cost tracking performance |
| **Empty Arrays** | Inserted as NULL | May require explicit `ARRAY[]::TEXT[]` | ⚠️ MAYBE | Test with empty coverage data |

### 1.3 Code Locations Requiring Updates

#### Node.js Backend (`supabase-db.js`)
**Functions to Update (8):**
1. ✅ `businesses.saveFacebookEnrichment()` → RPC `save_facebook_enrichment_tx`
2. ✅ `businesses.updateFacebookVerification()` → RPC `update_email_verification_tx`
3. ❌ `gmapsCampaigns.create()` → RPC `create_campaign_with_coverage_tx`
4. ❌ `campaignCoverage.updateCoverage()` → RPC `update_coverage_status_tx`

**Impact:**
- 4 functions currently NOT using stored procedures
- `simple-server.js` API endpoints also need updates
- Frontend expects current response format

#### Python Backend (`gmaps_supabase_manager.py`)
**Methods to Update (8):**
1. ✅ `save_facebook_enrichment()` → RPC `save_facebook_enrichment_tx`
2. ✅ `save_linkedin_enrichment()` → RPC `save_linkedin_enrichment_tx`
3. ❌ `update_facebook_verification()` → RPC `update_email_verification_tx`
4. ❌ `update_linkedin_verification()` → RPC `update_email_verification_tx`
5. ❌ `update_google_maps_verification()` → RPC `update_email_verification_tx`
6. ❌ `track_api_cost()` → RPC `track_api_cost_tx`
7. ❌ `update_coverage_status()` → RPC `update_coverage_status_tx`
8. ❌ `update_campaign()` (for status changes) → RPC `update_campaign_status_tx`

**Impact:**
- 6 of 8 critical methods NOT yet migrated
- `gmaps_campaign_manager.py` orchestrates these operations
- Error handling differs from current implementation

### 1.4 Response Format Migration

#### Facebook Enrichment Save

**Current Return:**
```python
{
  "id": "uuid",
  "business_id": "uuid",
  "campaign_id": "uuid",
  "facebook_url": "https://...",
  "primary_email": "email@domain.com",
  "emails": ["email1", "email2"],
  "phone_numbers": ["+1..."],
  "success": true,
  "error_message": null,
  "raw_data": {...},
  "scraped_at": "2025-10-13T..."
}
```

**New Return:**
```python
{
  "success": true,
  "enrichment_id": "uuid",
  "business_id": "uuid"
}
```

**Breaking Changes:**
- ❌ No longer returns full enrichment record
- ❌ No longer returns `scraped_at` timestamp
- ❌ No longer returns `facebook_url` or email data
- ⚠️ Callers expecting full record will break

**Mitigation:**
1. Update callers to use `enrichment_id` to fetch full record if needed
2. OR: Modify stored function to return full JSONB record
3. OR: Create wrapper function that fetches and returns full record

#### Campaign Creation

**Current Return:**
```javascript
{
  id: "uuid",
  name: "Campaign Name",
  status: "draft",
  created_at: "2025-10-13T...",
  // ... all campaign columns
  zipCodes: [...]  // Joined coverage data
}
```

**New Return:**
```javascript
{
  success: true,
  campaign_id: "uuid",
  coverage_count: 25
}
```

**Breaking Changes:**
- ❌ No campaign details returned
- ❌ No ZIP code array returned
- ❌ Frontend expects full campaign object

**Mitigation:**
- Fetch campaign after creation: `await getCampaignById(data.campaign_id)`
- Adds extra query but ensures consistency

---

## 2. Edge Case Identification

### 2.1 Empty Input Arrays

#### Scenario: Campaign with No ZIP Codes
```javascript
const campaignData = {
  name: "Test Campaign",
  keywords: ["dentist"],
  location: "New York",
  coverage_profile: "balanced"
};

const coverageData = [];  // ❌ EMPTY ARRAY!

await supabase.rpc('create_campaign_with_coverage_tx', {
  p_campaign_data: campaignData,
  p_coverage_data: coverageData
});
```

**Expected Behavior:**
- ✅ Campaign should still be created
- ✅ `target_zip_count` should be 0
- ✅ No coverage records inserted

**Actual Risk:**
- ⚠️ `array_length(p_coverage_data, 1)` returns NULL for empty array
- ⚠️ Verification: `v_inserted_count != array_length(...)` may fail
- ⚠️ Loop may not execute, leaving `v_inserted_count = 0`

**Test Case:**
```sql
SELECT create_campaign_with_coverage_tx(
  '{"name": "Empty Campaign", "keywords": ["test"], "location": "NY", "coverage_profile": "balanced", "target_zip_count": 0}'::JSONB,
  ARRAY[]::JSONB[]  -- Empty array
);
```

**Mitigation:**
```sql
-- In stored function, handle empty array:
IF p_coverage_data IS NULL OR array_length(p_coverage_data, 1) IS NULL THEN
  -- No coverage to insert, skip loop
  v_inserted_count := 0;
ELSE
  -- Normal loop
END IF;

-- Verification:
IF v_inserted_count != COALESCE(array_length(p_coverage_data, 1), 0) THEN
  RAISE EXCEPTION 'Coverage insertion failed';
END IF;
```

### 2.2 Duplicate Business place_id Handling

#### Scenario: Same Business Scraped Twice
```python
# First scrape: business with place_id "ChIJ123"
save_businesses([{
  "place_id": "ChIJ123",
  "name": "Business A",
  "email": None
}], campaign_id, zip_code)

# Facebook enrichment finds email
save_facebook_enrichment(business_id, campaign_id, {
  "primary_email": "found@email.com"
})

# Second scrape: same place_id, different ZIP
save_businesses([{
  "place_id": "ChIJ123",  # ❌ DUPLICATE!
  "name": "Business A",
  "email": None
}], campaign_id, different_zip_code)
```

**Current Behavior (UPSERT):**
- Uses `upsert(businessRecords, on_conflict="place_id")`
- Overwrites existing business
- ⚠️ **DATA LOSS:** Email from enrichment may be overwritten with `None`!

**Stored Function Behavior:**
- Functions don't handle business saves (only enrichments)
- Upsert logic remains in application code
- **Risk persists** - not fixed by stored functions

**Edge Cases:**
1. **Email overwrites:**
   - Business has `email = "found@facebook.com"` (from enrichment)
   - Second scrape has `email = None`
   - Upsert replaces with `None` → DATA LOSS

2. **Email source downgrades:**
   - Business has `email_source = "linkedin"` (highest priority)
   - Second scrape sets `email_source = "google_maps"` (lower priority)
   - Priority order violated

3. **Enrichment status resets:**
   - Business has `enrichment_status = "enriched"`
   - Second scrape sets `enrichment_status = "pending"`
   - Duplicate enrichment attempts

**Mitigation Strategies:**

**Option 1: Smart Upsert (Preserve Higher-Value Data)**
```python
def save_businesses(self, businesses, campaign_id, zip_code):
    for business in businesses:
        # Check if business exists
        existing = self.client.table("gmaps_businesses") \
            .select("email, email_source, enrichment_status") \
            .eq("place_id", business.place_id) \
            .execute()

        if existing.data:
            # Business exists - preserve valuable fields
            record = prepare_business_record(business)

            # Don't overwrite email if new scrape has None
            if record.email is None and existing.data[0].email:
                record.email = existing.data[0].email
                record.email_source = existing.data[0].email_source

            # Don't downgrade enrichment status
            if existing.data[0].enrichment_status == "enriched":
                record.enrichment_status = "enriched"

        # Upsert with preserved data
        self.client.table("gmaps_businesses").upsert(record).execute()
```

**Option 2: Stored Function for Business Upsert**
```sql
CREATE OR REPLACE FUNCTION upsert_business_smart(
    p_business_data JSONB
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO gmaps_businesses (...)
    VALUES (...)
    ON CONFLICT (place_id) DO UPDATE SET
        -- Only update if new value is not NULL
        email = COALESCE(EXCLUDED.email, gmaps_businesses.email),
        email_source = CASE
            WHEN EXCLUDED.email IS NOT NULL THEN EXCLUDED.email_source
            ELSE gmaps_businesses.email_source
        END,
        -- Don't downgrade enrichment status
        enrichment_status = CASE
            WHEN gmaps_businesses.enrichment_status = 'enriched' THEN 'enriched'
            ELSE EXCLUDED.enrichment_status
        END;
END;
$$ LANGUAGE plpgsql;
```

**Option 3: Skip Upsert if Already Enriched**
```python
# Only upsert businesses that don't have enrichment
INSERT INTO gmaps_businesses (...)
VALUES (...)
ON CONFLICT (place_id) DO UPDATE SET
    -- Only update non-enriched businesses
    ...
WHERE gmaps_businesses.enrichment_status IN ('pending', 'failed', 'no_facebook');
```

**Recommendation:** Implement Option 1 (smart upsert) immediately, regardless of stored function migration.

### 2.3 NULL Email Values in Enrichment

#### Scenario: Enrichment Finds No Email
```python
save_linkedin_enrichment(business_id, campaign_id, {
  "linkedin_url": "https://linkedin.com/company/abc",
  "profile_type": "company",
  "primary_email": None,  # ❌ NO EMAIL FOUND
  "emails_found": [],
  "emails_generated": ["generated@abc.com"],
  "email_source": "pattern_generated",
  "error": None
})
```

**Stored Function Behavior:**
```sql
UPDATE gmaps_businesses
SET
    email = CASE
        WHEN p_enrichment_data->>'primary_email' IS NOT NULL
        THEN p_enrichment_data->>'primary_email'
        ELSE email
    END
```

**Edge Cases:**

1. **NULL vs. Empty String:**
   - JSONB `null` vs. missing key vs. empty string `""`
   - `->>'primary_email' IS NOT NULL` checks for key existence
   - Empty string `""` is considered NOT NULL → would update email to `""`

2. **Email Source Priority with NULL:**
   - Business has `email = "found@facebook.com"`, `email_source = "facebook"`
   - LinkedIn enrichment has `primary_email = null`
   - ✅ Email preserved (CASE doesn't update)
   - ✅ BUT: `linkedin_enriched = TRUE` still set!
   - ⚠️ Confusing state: "LinkedIn enriched but email from Facebook"

3. **Bouncer Verification with NULL Email:**
   ```python
   # Enrichment saved with null email
   save_linkedin_enrichment(..., {"primary_email": None, ...})

   # Later try to verify
   update_linkedin_verification(business_id, {
       "email": None,  # ❌ Can't verify NULL!
       "status": "unknown"
   })
   ```

**Mitigation:**
```sql
-- Handle empty strings
UPDATE gmaps_businesses
SET
    email = CASE
        WHEN p_enrichment_data->>'primary_email' IS NOT NULL
         AND p_enrichment_data->>'primary_email' != ''
        THEN p_enrichment_data->>'primary_email'
        ELSE email
    END,
    email_source = CASE
        WHEN p_enrichment_data->>'primary_email' IS NOT NULL
         AND p_enrichment_data->>'primary_email' != ''
        THEN 'linkedin'
        ELSE email_source
    END
```

### 2.4 Concurrent Updates to Same Campaign (Cost Tracking)

#### Scenario: Parallel Cost Tracking
```javascript
// Worker 1: Track Google Maps cost
Promise.all([
  supabase.rpc('track_api_cost_tx', {
    p_campaign_id: campaignId,
    p_service: 'google_maps',
    p_cost_data: { cost_usd: 50.00, items_processed: 1000 }
  }),

  // Worker 2: Track Facebook cost (simultaneous!)
  supabase.rpc('track_api_cost_tx', {
    p_campaign_id: campaignId,
    p_service: 'facebook',
    p_cost_data: { cost_usd: 30.00, items_processed: 500 }
  })
]);
```

**Without Row Locking (RACE CONDITION):**
```
Time | Worker 1                          | Worker 2
-----|-----------------------------------|----------------------------------
T0   | SELECT costs (GM:0, FB:0)        |
T1   |                                   | SELECT costs (GM:0, FB:0)
T2   | INSERT cost record (GM: $50)     |
T3   |                                   | INSERT cost record (FB: $30)
T4   | UPDATE (GM:$50, actual:$50)      |
T5   |                                   | UPDATE (FB:$30, actual:$30) ❌ WRONG!
T6   | COMMIT                            |
T7   |                                   | COMMIT
```

**Result:** `actual_cost = $30` (should be $80) - **DATA LOSS**!

**With Row Locking (SELECT FOR UPDATE):**
```
Time | Worker 1                          | Worker 2
-----|-----------------------------------|----------------------------------
T0   | SELECT costs FOR UPDATE           |
T1   |   (row locked)                    | SELECT costs FOR UPDATE (BLOCKED)
T2   | INSERT cost record (GM: $50)     |   (waiting for lock...)
T3   | UPDATE (GM:$50, actual:$50)      |   (still waiting...)
T4   | COMMIT (lock released)            |
T5   |                                   | SELECT costs (GM:$50, FB:0)
T6   |                                   | INSERT cost record (FB: $30)
T7   |                                   | UPDATE (FB:$30, actual:$80) ✅ CORRECT
T8   |                                   | COMMIT
```

**Result:** `actual_cost = $80` ✅

**Performance Impact:**
- 🔒 Worker 2 blocked until Worker 1 commits
- ⏱️ Serialization adds latency (10-50ms per blocked operation)
- 📊 Under high concurrency, queue of waiting workers grows

**Edge Cases:**

1. **Lock Timeout:**
   - Worker 1 locks row for 30+ seconds
   - Worker 2 times out waiting
   - Error: `canceling statement due to lock timeout`

2. **Deadlock (if multiple campaigns):**
   ```
   Worker 1: Lock Campaign A, then Campaign B
   Worker 2: Lock Campaign B, then Campaign A
   → DEADLOCK detected, one transaction rolled back
   ```

3. **Long-Running Transaction:**
   - Worker locks campaign for slow enrichment operation
   - Cost tracking blocked for entire duration
   - Other workers pile up waiting

**Mitigation:**
1. ✅ Keep transactions SHORT (< 100ms)
2. ✅ Retry on lock timeout with exponential backoff
3. ✅ Monitor lock wait times (alert if > 500ms)
4. ✅ Consider queue-based cost aggregation (async)

### 2.5 Race Conditions in Email Source Priority

#### Scenario: Concurrent Enrichments
```python
# T0: Business has email = None, email_source = "not_found"

# T1: Facebook enrichment starts
save_facebook_enrichment(business_id, {
  "primary_email": "fb@company.com"
})

# T2: LinkedIn enrichment starts (simultaneously!)
save_linkedin_enrichment(business_id, {
  "primary_email": "li@company.com"
})
```

**Desired Priority:** LinkedIn > Facebook > Google Maps

**Race Condition Outcomes:**

**Case 1: Facebook Commits First**
```
T0: email = None, source = "not_found"
T1: [FB] UPDATE email = "fb@company.com", source = "facebook"
T2: [FB] COMMIT
T3: [LI] UPDATE email = "li@company.com", source = "linkedin"
T4: [LI] COMMIT
Result: email = "li@company.com", source = "linkedin" ✅ CORRECT
```

**Case 2: LinkedIn Commits First**
```
T0: email = None, source = "not_found"
T1: [LI] UPDATE email = "li@company.com", source = "linkedin"
T2: [LI] COMMIT
T3: [FB] UPDATE email = "fb@company.com", source = "facebook"
T4: [FB] COMMIT
Result: email = "fb@company.com", source = "facebook" ❌ WRONG!
```

**Problem:** Last write wins, regardless of priority!

**Mitigation Options:**

**Option 1: Conditional Update (Preserve Higher Priority)**
```sql
-- In save_facebook_enrichment_tx:
UPDATE gmaps_businesses
SET
    email = CASE
        WHEN p_enrichment_data->>'primary_email' IS NOT NULL
         AND email_source NOT IN ('linkedin')  -- Don't overwrite LinkedIn!
        THEN p_enrichment_data->>'primary_email'
        ELSE email
    END,
    email_source = CASE
        WHEN p_enrichment_data->>'primary_email' IS NOT NULL
         AND email_source NOT IN ('linkedin')
        THEN 'facebook'
        ELSE email_source
    END
WHERE id = p_business_id;
```

**Option 2: Priority-Based Update Function**
```sql
CREATE OR REPLACE FUNCTION update_business_email_if_better(
    p_business_id UUID,
    p_new_email TEXT,
    p_new_source VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_source VARCHAR(50);
    v_priority_order TEXT[] := ARRAY['linkedin', 'facebook', 'google_maps', 'not_found'];
BEGIN
    SELECT email_source INTO v_current_source
    FROM gmaps_businesses
    WHERE id = p_business_id
    FOR UPDATE;  -- Lock to prevent concurrent updates

    -- Only update if new source has higher priority
    IF array_position(v_priority_order, p_new_source) <=
       array_position(v_priority_order, v_current_source) THEN
        UPDATE gmaps_businesses
        SET email = p_new_email, email_source = p_new_source
        WHERE id = p_business_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;  -- Skipped due to lower priority
END;
$$ LANGUAGE plpgsql;
```

**Option 3: Serialize Enrichments (Application Logic)**
```python
# Campaign manager ensures LinkedIn runs AFTER Facebook
async def enrich_campaign(campaign_id):
    # Phase 1: Facebook enrichment (all businesses)
    await enrich_facebook(campaign_id)

    # Phase 2: LinkedIn enrichment (all businesses)
    # This will overwrite Facebook emails with LinkedIn emails
    await enrich_linkedin(campaign_id)
```

**Recommendation:** Implement Option 1 (conditional update) in stored functions + Option 3 (serialization) in campaign manager.

### 2.6 Very Large Batch Operations

#### Scenario: Campaign with 1000+ ZIP Codes
```javascript
await supabase.rpc('create_campaign_with_coverage_tx', {
  p_campaign_data: campaignData,
  p_coverage_data: zipCodes  // Array of 1000 JSONB objects
});
```

**Risks:**

1. **Transaction Timeout:**
   - PostgreSQL `statement_timeout` (default: none, but RLS may add timeout)
   - Supabase connection timeout (default: 60s)
   - Loop inserting 1000 records may exceed timeout

2. **Memory Pressure:**
   - 1000-element JSONB array in memory
   - Each iteration allocates new record
   - May cause OOM on small Postgres instances

3. **Lock Duration:**
   - Campaign row locked during entire batch insert
   - Other operations on campaign blocked
   - Increases deadlock risk

4. **Network Payload Size:**
   - Supabase API request size limit
   - Large JSONB payload may be rejected
   - Typical limit: 1-2MB per request

**Edge Cases:**

1. **1000 ZIP codes:**
   - ~5ms per INSERT = 5000ms total
   - ✅ Likely OK (under 10s timeout)

2. **5000 ZIP codes (aggressive coverage):**
   - ~5ms per INSERT = 25,000ms (25s)
   - ⚠️ Approaching timeout limits
   - May fail intermittently

3. **10,000+ ZIP codes (edge case):**
   - Would require >50s
   - ❌ Definitely fails

**Mitigation Strategies:**

**Option 1: Batch Size Limit**
```sql
-- In stored function, add validation:
IF array_length(p_coverage_data, 1) > 5000 THEN
    RAISE EXCEPTION 'Too many coverage records: %. Maximum 5000 allowed.',
        array_length(p_coverage_data, 1);
END IF;
```

**Option 2: Chunked Insertion**
```javascript
// Application-level chunking
async function createCampaignWithCoverage(campaignData, allZipCodes) {
    // First, create campaign
    const { data: campaign } = await supabase.rpc('create_campaign_with_coverage_tx', {
        p_campaign_data: campaignData,
        p_coverage_data: []  // Empty array
    });

    // Then, add coverage in chunks
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allZipCodes.length; i += CHUNK_SIZE) {
        const chunk = allZipCodes.slice(i, i + CHUNK_SIZE);
        await supabase.rpc('add_coverage_batch_tx', {
            p_campaign_id: campaign.campaign_id,
            p_coverage_data: chunk
        });
    }
}
```

**Option 3: Bulk INSERT (PostgreSQL COPY)**
```sql
-- Use PostgreSQL's faster COPY mechanism
CREATE OR REPLACE FUNCTION create_campaign_with_coverage_tx(...)
RETURNS JSONB AS $$
BEGIN
    -- Insert campaign
    INSERT INTO gmaps_campaigns (...) VALUES (...) RETURNING id INTO v_campaign_id;

    -- Bulk insert coverage (much faster than loop)
    INSERT INTO gmaps_campaign_coverage (campaign_id, zip_code, ...)
    SELECT
        v_campaign_id,
        (elem->>'zip_code')::VARCHAR,
        ...
    FROM unnest(p_coverage_data) AS elem;

    -- Verify count
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
END;
$$ LANGUAGE plpgsql;
```

**Recommendation:** Implement Option 3 (bulk INSERT with unnest) for best performance.

---

## 3. Data Migration Risks

### 3.1 Schema Compatibility

**Good News:** ✅ No schema changes required!

The stored function migration is **additive only**:
- ✅ No ALTER TABLE statements
- ✅ No column additions/removals
- ✅ No data type changes
- ✅ Only CREATE FUNCTION statements

**Risk Level:** 🟢 LOW

**Verification:**
```sql
-- Check existing data will work with new functions
SELECT
    COUNT(*) AS total_businesses,
    COUNT(CASE WHEN email IS NULL THEN 1 END) AS null_emails,
    COUNT(CASE WHEN email = '' THEN 1 END) AS empty_emails,
    COUNT(CASE WHEN email_source NOT IN ('google_maps', 'facebook', 'linkedin', 'not_found') THEN 1 END) AS invalid_sources
FROM gmaps_businesses;
```

### 3.2 Existing Data Quality Issues

#### Issue 1: Orphaned Enrichment Records

**Current State:**
```sql
-- Find enrichments without corresponding business
SELECT COUNT(*)
FROM gmaps_facebook_enrichments fb
LEFT JOIN gmaps_businesses b ON fb.business_id = b.id
WHERE b.id IS NULL;
```

**Risk:**
- Stored functions have FK constraints
- Will fail if trying to update non-existent business
- ⚠️ Could cause failures if orphaned records exist

**Mitigation:**
```sql
-- Clean up orphaned records before deployment
DELETE FROM gmaps_facebook_enrichments
WHERE business_id NOT IN (SELECT id FROM gmaps_businesses);

DELETE FROM gmaps_linkedin_enrichments
WHERE business_id NOT IN (SELECT id FROM gmaps_businesses);
```

#### Issue 2: Invalid Email Sources

**Current State:**
```sql
SELECT DISTINCT email_source
FROM gmaps_businesses
WHERE email_source NOT IN ('google_maps', 'facebook', 'linkedin', 'not_found');
```

**Risk:**
- Stored functions assume specific email sources
- Conditional updates may not work correctly
- Priority logic may break

**Mitigation:**
```sql
-- Normalize email sources
UPDATE gmaps_businesses
SET email_source = 'not_found'
WHERE email_source IS NULL OR email_source NOT IN ('google_maps', 'facebook', 'linkedin');
```

#### Issue 3: Inconsistent Campaign Statistics

**Current State:**
```sql
-- Find campaigns where statistics don't match actual counts
SELECT
    c.id,
    c.total_businesses_found AS reported,
    COUNT(b.id) AS actual
FROM gmaps_campaigns c
LEFT JOIN gmaps_businesses b ON b.campaign_id = c.id
GROUP BY c.id, c.total_businesses_found
HAVING c.total_businesses_found != COUNT(b.id);
```

**Risk:**
- Statistics update function will recalculate
- May reveal previous data quality issues
- Users may notice sudden changes in metrics

**Mitigation:**
```sql
-- Recalculate all campaign statistics before deployment
-- This way, changes are attributed to cleanup, not new system
SELECT update_campaign_statistics_tx(id)
FROM gmaps_campaigns;
```

#### Issue 4: NULL vs. Empty Arrays

**Current State:**
```sql
-- Check for NULL arrays that should be empty
SELECT COUNT(*)
FROM gmaps_linkedin_enrichments
WHERE emails_generated IS NULL;  -- Should be ARRAY[]::TEXT[]
```

**Risk:**
- JSONB parsing in stored functions expects arrays
- `ARRAY(SELECT jsonb_array_elements_text(...))` fails on NULL
- Would cause transaction rollback

**Mitigation:**
```sql
-- Convert NULL arrays to empty arrays
UPDATE gmaps_linkedin_enrichments
SET emails_generated = ARRAY[]::TEXT[]
WHERE emails_generated IS NULL;

UPDATE gmaps_facebook_enrichments
SET emails = ARRAY[]::TEXT[]
WHERE emails IS NULL;
```

### 3.3 Backward Compatibility

**Question:** Can old code and new code coexist during gradual rollout?

**Answer:** ✅ YES - with caveats

**Coexistence Strategy:**

1. **Deploy stored functions first:**
   ```sql
   -- Functions deployed but not yet used
   -- Old code continues using direct table operations
   ```

2. **Gradual migration:**
   ```javascript
   // Feature flag approach
   const USE_STORED_FUNCTIONS = process.env.USE_STORED_FUNCTIONS === 'true';

   async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
       if (USE_STORED_FUNCTIONS) {
           return this.saveFacebookEnrichmentTx(businessId, campaignId, enrichmentData);
       } else {
           return this.saveFacebookEnrichmentDirect(businessId, campaignId, enrichmentData);
       }
   }
   ```

3. **Monitor both paths:**
   - Compare success rates
   - Compare performance metrics
   - Validate data consistency

4. **Rollback capability:**
   - Keep old functions intact
   - Can switch flag back if issues arise

**Data Consistency During Migration:**

**Scenario:** Old code and new code both writing to database

- Old code: Direct INSERT + UPDATE (no transaction)
- New code: RPC with transaction

**Risk:** Minimal - both write to same tables, just different paths

**Edge Case:** Cost tracking
- Old code: May have race conditions
- New code: Uses row locks
- ⚠️ If old code updates costs while new code has lock → old code UPDATE blocked

**Mitigation:** Migrate cost tracking LAST, after other functions proven stable.

---

## 4. Performance Risk Analysis

### 4.1 Row Locking Contention

#### High-Risk Operation: Cost Tracking

**Current Performance (No Locks):**
```
Concurrent updates: 10 workers × 100 cost tracking calls = 1000 updates
Duration: ~50ms per update
Total time: ~50ms (parallel execution)
Throughput: 20 updates/second/worker
```

**New Performance (With SELECT FOR UPDATE):**
```
Concurrent updates: 10 workers blocked serially
Duration: ~50ms per update × 10 workers = 500ms total
Throughput: 2 updates/second (serialized)
```

**Impact:** 📉 **10x throughput reduction** for concurrent cost tracking!

**Real-World Scenario:**
```
Campaign: 100 ZIP codes, 4 enrichment phases
Total cost tracking calls: 100 ZIPs × 4 phases = 400 calls

Without locks: ~20 seconds (parallel)
With locks: ~20 seconds (if serial) or variable (if some parallelism)
```

**Mitigation Strategies:**

1. **Batch Cost Tracking:**
   ```python
   # Instead of tracking cost per business
   track_api_cost(campaign_id, 'linkedin', 1, 0.10)  # 100 times

   # Track cost per batch
   track_api_cost(campaign_id, 'linkedin', 100, 10.00)  # Once
   ```

2. **Async Cost Aggregation:**
   ```python
   # Write costs to queue
   cost_queue.append({
       'campaign_id': campaign_id,
       'service': 'linkedin',
       'cost': 0.10
   })

   # Separate worker aggregates and writes
   async def aggregate_costs():
       while True:
           costs = await cost_queue.batch(100, timeout=10s)
           total_cost = sum(c['cost'] for c in costs)
           track_api_cost_tx(campaign_id, 'linkedin', 100, total_cost)
   ```

3. **Optimistic Locking (for non-critical):**
   ```sql
   -- Don't lock for LinkedIn enrichment saves (no cost impact)
   -- Only lock for explicit cost tracking operations
   ```

**Recommendation:** Implement batch cost tracking to reduce lock contention by 100x.

#### Medium-Risk Operation: Status Transitions

**Scenario:** Multiple workers checking campaign status
```python
# Worker 1: Check if campaign running
status = get_campaign_status(campaign_id)
if status == 'running':
    continue_processing()

# Worker 2: Try to update status to 'paused'
update_campaign_status_tx(campaign_id, 'paused')  # Locks row
```

**Impact:**
- Worker 1 blocked during status check if Worker 2 has lock
- Status checks are frequent (every ZIP code completion)
- Lock duration: 10-20ms per status update

**Mitigation:**
```python
# Don't lock for reads, only writes
def get_campaign_status(campaign_id):
    # Direct SELECT, no lock
    return supabase.from('gmaps_campaigns').select('status').eq('id', campaign_id).single()

def update_campaign_status(campaign_id, new_status):
    # Use stored function with lock
    return supabase.rpc('update_campaign_status_tx', {...})
```

### 4.2 Transaction Duration Impact

**PostgreSQL Transaction Overhead:**
- BEGIN: ~1ms
- COMMIT: ~5-10ms (fsync to disk)
- ROLLBACK: ~1-2ms

**Stored Function Overhead:**
- Function call setup: ~1-2ms
- JSONB parsing: ~1-5ms (depends on size)
- Return JSONB encoding: ~1-5ms

**Expected Durations:**

| Operation | Direct Query | Stored Function | Overhead |
|-----------|--------------|-----------------|----------|
| Facebook Enrichment | 10-15ms | 20-30ms | +10-15ms |
| LinkedIn Enrichment | 10-15ms | 20-30ms | +10-15ms |
| Campaign Creation (10 ZIPs) | 15-25ms | 30-50ms | +15-25ms |
| Campaign Creation (100 ZIPs) | 80-150ms | 150-300ms | +70-150ms |
| Email Verification | 5-10ms | 15-25ms | +10-15ms |
| Statistics Update (1k businesses) | 30-50ms | 50-100ms | +20-50ms |
| Cost Tracking | 5-10ms | 15-25ms | +10-15ms (+ lock wait) |
| Coverage Update | 5-10ms | 15-20ms | +10ms |
| Status Transition | 5-10ms | 15-20ms | +10ms (+ lock wait) |

**Acceptable Thresholds:**
- 🟢 < 50ms: Excellent
- 🟡 50-200ms: Acceptable
- 🔴 > 200ms: Concerning

**High-Risk Operations:**
- Campaign creation with 500+ ZIPs: May exceed 500ms
- Statistics update for 100k+ businesses: May exceed 1000ms

**Mitigation:**

1. **Timeout Configuration:**
   ```sql
   -- Set reasonable timeouts
   SET statement_timeout = '10s';  -- For stored functions
   SET lock_timeout = '5s';  -- For row locks
   ```

2. **Chunking Large Operations:**
   ```javascript
   // Campaign creation
   if (zipCodes.length > 500) {
       // Create campaign with first 500
       // Add remaining in batches
   }
   ```

3. **Async Statistics:**
   ```python
   # Don't block on statistics update
   asyncio.create_task(update_campaign_statistics_tx(campaign_id))
   ```

### 4.3 JSONB Parsing Overhead

**Concern:** JSONB parsing in stored functions vs. direct column access

**Benchmark (Estimated):**

```sql
-- Direct column access
INSERT INTO gmaps_businesses (name, email, ...)
VALUES ('Business', 'email@test.com', ...);
-- Duration: ~5ms

-- JSONB parsing
INSERT INTO gmaps_businesses (name, email, ...)
VALUES (
    p_data->>'name',
    p_data->>'email',
    ...
);
-- Duration: ~10-15ms (+5-10ms overhead)
```

**Impact:**
- 📊 50-100% overhead for JSONB parsing
- 📊 Acceptable for <100 fields
- 📊 Problematic for large JSONB objects (>1KB)

**Mitigation:**

1. **Minimize JSONB Size:**
   ```javascript
   // Don't pass entire raw_data
   const enrichmentData = {
       primary_email: result.email,
       facebook_url: result.url,
       // ... only essential fields
       // raw_data: result  // ❌ Don't pass 10KB+ object
   };
   ```

2. **Lazy JSONB Extraction:**
   ```sql
   -- Extract once, reuse variable
   v_email := p_enrichment_data->>'primary_email';
   v_facebook_url := p_enrichment_data->>'facebook_url';

   -- Use variables in queries
   INSERT INTO ... VALUES (v_email, v_facebook_url, ...);
   ```

3. **Avoid Nested JSONB:**
   ```javascript
   // ❌ Bad: Nested JSONB
   {
       enrichment: {
           data: {
               results: {
                   email: "test@email.com"
               }
           }
       }
   }

   // ✅ Good: Flat structure
   {
       primary_email: "test@email.com",
       facebook_url: "https://...",
       ...
   }
   ```

### 4.4 Index Coverage Analysis

**Critical:** Ensure all queries in stored functions use indexes

**Required Indexes:**

```sql
-- Business lookups (used in all enrichment functions)
CREATE INDEX idx_gmaps_businesses_id ON gmaps_businesses(id);  -- ✅ PRIMARY KEY
CREATE INDEX idx_gmaps_businesses_place_id ON gmaps_businesses(place_id);  -- ✅ UNIQUE

-- Campaign lookups
CREATE INDEX idx_gmaps_campaigns_id ON gmaps_campaigns(id);  -- ✅ PRIMARY KEY

-- Foreign key lookups (used in aggregate queries)
CREATE INDEX idx_gmaps_businesses_campaign_id ON gmaps_businesses(campaign_id);  -- ⚠️ VERIFY EXISTS
CREATE INDEX idx_gmaps_facebook_enrichments_campaign_id ON gmaps_facebook_enrichments(campaign_id);  -- ⚠️ VERIFY EXISTS
CREATE INDEX idx_gmaps_linkedin_enrichments_campaign_id ON gmaps_linkedin_enrichments(campaign_id);  -- ⚠️ VERIFY EXISTS
CREATE INDEX idx_gmaps_linkedin_enrichments_business_id ON gmaps_linkedin_enrichments(business_id);  -- ⚠️ VERIFY EXISTS
CREATE INDEX idx_gmaps_facebook_enrichments_business_id ON gmaps_facebook_enrichments(business_id);  -- ⚠️ VERIFY EXISTS

-- Coverage lookups
CREATE INDEX idx_gmaps_campaign_coverage_campaign_zip ON gmaps_campaign_coverage(campaign_id, zip_code);  -- ⚠️ VERIFY EXISTS

-- Email verification lookups
CREATE INDEX idx_gmaps_email_verifications_business_id ON gmaps_email_verifications(business_id);  -- ⚠️ CHECK IF EXISTS
```

**Verification Query:**
```sql
-- Check if indexes exist
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'gmaps_%'
ORDER BY tablename, indexname;
```

**Missing Index Impact:**

**Without index on `gmaps_businesses.campaign_id`:**
```sql
-- Statistics update query
SELECT COUNT(*) FROM gmaps_businesses WHERE campaign_id = '...';
-- Scans entire table (Seq Scan) → 1000ms for 100k businesses
```

**With index:**
```sql
-- Uses index (Index Scan) → 10ms
```

**Mitigation:** Run index verification BEFORE deploying stored functions.

### 4.5 Connection Pool Exhaustion

**Concern:** Transactions hold connections longer than direct queries

**Current Connection Usage:**
```javascript
// Direct query: holds connection for ~10ms
const { data } = await supabase.from('businesses').insert(...);
// Connection released

// Stored function: holds connection for ~30ms
const { data } = await supabase.rpc('save_enrichment_tx', ...);
// Connection released
```

**Impact:**
- 3x longer connection hold time
- Connection pool may exhaust faster
- Especially under concurrent load

**Risk Scenario:**
```
Connection pool: 20 connections
Concurrent enrichments: 50 workers
Transaction duration: 30ms

Without stored functions: 20 × (1000ms / 10ms) = 2000 req/s capacity
With stored functions: 20 × (1000ms / 30ms) = 666 req/s capacity
```

**Degradation:** 📉 66% capacity reduction!

**Mitigation:**

1. **Increase Pool Size:**
   ```javascript
   const supabase = createClient(url, key, {
       db: {
           poolSize: 50  // Increase from default 20
       }
   });
   ```

2. **Connection Timeout Configuration:**
   ```javascript
   const supabase = createClient(url, key, {
       db: {
           poolSize: 30,
           idleTimeout: 30000,  // 30s
           connectionTimeout: 10000  // 10s
       }
   });
   ```

3. **Monitor Pool Metrics:**
   ```javascript
   // Log pool usage
   setInterval(() => {
       console.log('Pool stats:', supabase.getPoolStats());
   }, 60000);
   ```

4. **Batch Operations:**
   - Reduce total number of transactions
   - Aggregate multiple enrichments into one call

---

## 5. Rollback Strategy

### 5.1 Pre-Deployment Checklist

**Before deploying stored functions:**

```bash
# 1. Backup current database state
pg_dump -h $SUPABASE_HOST -U postgres -d postgres \
    --schema=public \
    --table='gmaps_*' \
    --file=backup_before_stored_functions_$(date +%Y%m%d).sql

# 2. Verify no orphaned records
psql -c "SELECT COUNT(*) FROM gmaps_facebook_enrichments fb
         LEFT JOIN gmaps_businesses b ON fb.business_id = b.id
         WHERE b.id IS NULL;"

# 3. Normalize email sources
psql -c "UPDATE gmaps_businesses
         SET email_source = 'not_found'
         WHERE email_source NOT IN ('google_maps', 'facebook', 'linkedin');"

# 4. Convert NULL arrays to empty arrays
psql -c "UPDATE gmaps_linkedin_enrichments
         SET emails_generated = ARRAY[]::TEXT[]
         WHERE emails_generated IS NULL;"

# 5. Verify all indexes exist
psql -c "SELECT tablename, indexname FROM pg_indexes
         WHERE schemaname = 'public' AND tablename LIKE 'gmaps_%';"

# 6. Test stored functions in staging
npm run test:stored-functions
```

### 5.2 Gradual Rollout Plan

**Phase 0: Preparation (Week 1)**
- ✅ Deploy stored functions to database (not yet used)
- ✅ Verify functions exist and are callable
- ✅ Run unit tests against functions
- ✅ No application code changes yet

**Phase 1: Low-Risk Functions First (Week 1-2)**
- ✅ Migrate email verification functions (4-6)
  - Low traffic volume
  - Low concurrency
  - Easy to rollback
- Monitor:
  - Success rate (should be >99%)
  - Transaction duration (<50ms)
  - Error types

**Phase 2: Medium-Risk Functions (Week 2-3)**
- ✅ Migrate enrichment save functions (1, 2)
  - Medium traffic volume
  - Some concurrency
  - Critical for data integrity
- Monitor:
  - Data consistency (no orphaned records)
  - Performance impact (<30ms overhead)
  - Lock contention (should be minimal)

**Phase 3: High-Risk Functions (Week 3-4)**
- ✅ Migrate cost tracking (8)
  - High concurrency
  - Row locking impact
  - Critical for billing accuracy
- Monitor:
  - Lock wait times (<100ms)
  - Throughput reduction
  - Cost calculation accuracy
- ⚠️ ROLLBACK TRIGGER: Lock wait times >500ms

**Phase 4: Complex Functions (Week 4-5)**
- ✅ Migrate campaign creation (3)
  - Large batch operations
  - Timeout risk
  - User-facing operation
- Monitor:
  - Transaction duration (especially for large campaigns)
  - Success rate for 100+ ZIP campaigns
  - User experience (latency)

**Phase 5: Remaining Functions (Week 5-6)**
- ✅ Migrate statistics update (7)
- ✅ Migrate coverage update (9)
- ✅ Migrate status transitions (10)
- Monitor:
  - System stability
  - Overall performance
  - Data consistency across all operations

### 5.3 Rollback Triggers

**Automatic Rollback Conditions:**

1. **Error Rate Spike:**
   - Threshold: Error rate >5% for any function
   - Action: Disable stored function via feature flag
   - Revert to direct queries

2. **Performance Degradation:**
   - Threshold: P95 latency increases >200%
   - Action: Rollback affected function

3. **Data Consistency Issues:**
   - Threshold: Any orphaned enrichment records detected
   - Action: IMMEDIATE rollback + investigation

4. **Lock Contention:**
   - Threshold: Lock wait times >1000ms sustained
   - Action: Rollback cost tracking function

**Rollback Procedures:**

```javascript
// Feature flag approach
const STORED_FUNCTION_CONFIG = {
    save_facebook_enrichment: process.env.USE_FB_ENRICHMENT_TX === 'true',
    save_linkedin_enrichment: process.env.USE_LI_ENRICHMENT_TX === 'true',
    track_api_cost: process.env.USE_COST_TRACKING_TX === 'true',
    // ... other functions
};

async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
    if (STORED_FUNCTION_CONFIG.save_facebook_enrichment) {
        try {
            return await this.saveFacebookEnrichmentTx(businessId, campaignId, enrichmentData);
        } catch (error) {
            // Log error and fall back to direct query
            console.error('Stored function failed, falling back to direct query:', error);
            return await this.saveFacebookEnrichmentDirect(businessId, campaignId, enrichmentData);
        }
    } else {
        return await this.saveFacebookEnrichmentDirect(businessId, campaignId, enrichmentData);
    }
}
```

### 5.4 Emergency Rollback Procedure

**If critical issues arise:**

**Step 1: Immediate Mitigation (< 5 minutes)**
```bash
# Disable all stored functions via environment variables
export USE_STORED_FUNCTIONS=false
pm2 restart all  # Restart Node.js backend
systemctl restart gunicorn  # Restart Python backend
```

**Step 2: Verify Direct Queries Working (< 10 minutes)**
```bash
# Test critical operations
npm run test:database-operations

# Check logs for errors
tail -f /var/log/app.log | grep ERROR
```

**Step 3: Database Cleanup (< 30 minutes)**
```sql
-- Drop stored functions if causing issues
DROP FUNCTION IF EXISTS save_facebook_enrichment_tx(UUID, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS save_linkedin_enrichment_tx(UUID, UUID, JSONB) CASCADE;
-- ... drop all 10 functions

-- Verify RLS policies still intact
SELECT * FROM pg_policies WHERE tablename LIKE 'gmaps_%';
```

**Step 4: Data Consistency Check (< 1 hour)**
```sql
-- Check for any data corruption during rollback window
SELECT COUNT(*) FROM gmaps_facebook_enrichments fb
LEFT JOIN gmaps_businesses b ON fb.business_id = b.id
WHERE b.id IS NULL
  AND fb.created_at > NOW() - INTERVAL '2 hours';

-- Recalculate campaign statistics
SELECT update_campaign_statistics_tx(id) FROM gmaps_campaigns WHERE status = 'running';
```

**Step 5: Incident Review (< 24 hours)**
- Document what went wrong
- Analyze logs and metrics
- Identify root cause
- Plan fixes before retry

### 5.5 Partial Rollback

**Scenario:** One function causing issues, others working fine

**Strategy:** Disable only the problematic function

```javascript
// config/stored-functions.js
module.exports = {
    features: {
        facebook_enrichment: true,  // ✅ Working
        linkedin_enrichment: true,  // ✅ Working
        cost_tracking: false,  // ❌ ROLLED BACK - causing lock contention
        campaign_creation: true,  // ✅ Working
        // ... other functions
    }
};
```

**Benefits:**
- Maintain benefits of working functions
- Minimize disruption
- Isolate problematic function for debugging

---

## 6. Deployment Strategy

### 6.1 Step-by-Step Deployment

**Step 1: Deploy Functions to Database**
```bash
# Apply migration
psql -h $SUPABASE_HOST -U postgres -d postgres \
    -f migrations/schema/20251012_001_add_transaction_stored_procedures.sql

# Verify functions created
psql -c "\df+ save_facebook_enrichment_tx"
psql -c "\df+ save_linkedin_enrichment_tx"
# ... verify all 10 functions
```

**Step 2: Test Functions Directly**
```sql
-- Test Facebook enrichment
SELECT save_facebook_enrichment_tx(
    '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- business_id
    '123e4567-e89b-12d3-a456-426614174001'::UUID,  -- campaign_id
    '{
        "facebook_url": "https://facebook.com/test",
        "primary_email": "test@email.com",
        "emails": ["test@email.com"],
        "phone_numbers": ["+1234567890"],
        "success": true
    }'::JSONB
);

-- Expected result: {"success": true, "enrichment_id": "...", "business_id": "..."}
```

**Step 3: Deploy Application Code (Node.js)**
```bash
# Update supabase-db.js with new RPC calls
git checkout feature/stored-functions-migration
npm run test
npm run build
pm2 restart backend
```

**Step 4: Deploy Application Code (Python)**
```bash
# Update gmaps_supabase_manager.py
git checkout feature/stored-functions-migration
pytest tests/test_stored_functions.py
systemctl restart gunicorn
```

**Step 5: Monitor and Validate**
```bash
# Real-time monitoring
watch -n 5 'psql -c "SELECT * FROM pg_stat_user_functions WHERE funcname LIKE '\''%_tx'\'';"'

# Check for errors
tail -f /var/log/postgres/postgresql.log | grep ERROR

# Validate data consistency
psql -c "SELECT COUNT(*) FROM gmaps_facebook_enrichments fb
         LEFT JOIN gmaps_businesses b ON fb.business_id = b.id
         WHERE b.id IS NULL;"
```

### 6.2 Monitoring Dashboard

**Key Metrics to Track:**

```sql
-- Transaction success rate
SELECT
    funcname,
    calls AS total_calls,
    total_time / calls AS avg_duration_ms,
    (calls - nullif(self_time, 0)) / NULLIF(calls, 0) AS failure_rate
FROM pg_stat_user_functions
WHERE funcname LIKE '%_tx'
ORDER BY calls DESC;

-- Lock wait times
SELECT
    query,
    wait_event,
    wait_event_type,
    state_change - query_start AS wait_duration
FROM pg_stat_activity
WHERE wait_event IS NOT NULL
  AND query LIKE '%_tx%'
ORDER BY wait_duration DESC;

-- Row lock contention
SELECT
    locktype,
    relation::regclass AS table,
    mode,
    COUNT(*) AS lock_count
FROM pg_locks
WHERE locktype = 'tuple'
GROUP BY locktype, relation, mode
ORDER BY lock_count DESC;
```

**Alerting Rules:**

1. **Error rate >5%:**
   ```sql
   SELECT COUNT(*) FILTER (WHERE NOT (result->>'success')::BOOLEAN) * 100.0 / COUNT(*) AS error_rate
   FROM stored_function_calls_log
   WHERE timestamp > NOW() - INTERVAL '5 minutes';
   -- Alert if error_rate > 5.0
   ```

2. **Transaction duration >200ms (P95):**
   ```sql
   SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY total_time / calls) AS p95_duration
   FROM pg_stat_user_functions
   WHERE funcname LIKE '%_tx';
   -- Alert if p95_duration > 200
   ```

3. **Lock wait time >500ms:**
   ```sql
   SELECT MAX(EXTRACT(EPOCH FROM (state_change - query_start))) * 1000 AS max_wait_ms
   FROM pg_stat_activity
   WHERE wait_event LIKE 'Lock%';
   -- Alert if max_wait_ms > 500
   ```

### 6.3 Canary Deployment

**Strategy:** Route 10% of traffic to stored functions, monitor, then increase gradually

```javascript
// Canary rollout
function shouldUseStoredFunction(operationId) {
    const hash = crypto.createHash('sha256').update(operationId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const percentage = hashValue % 100;

    const canaryPercentage = parseInt(process.env.STORED_FUNCTION_CANARY_PERCENT || '0');
    return percentage < canaryPercentage;
}

async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
    const operationId = `${businessId}_${Date.now()}`;

    if (shouldUseStoredFunction(operationId)) {
        // Canary: Use stored function
        return await this.saveFacebookEnrichmentTx(businessId, campaignId, enrichmentData);
    } else {
        // Baseline: Use direct query
        return await this.saveFacebookEnrichmentDirect(businessId, campaignId, enrichmentData);
    }
}
```

**Rollout Schedule:**
```
Week 1: 10% canary
Week 2: 25% canary (if metrics good)
Week 3: 50% canary
Week 4: 75% canary
Week 5: 100% (full rollout)
```

---

## 7. Testing Strategy

### 7.1 Unit Tests for Stored Functions

```javascript
// tests/stored-functions/test_facebook_enrichment.js
describe('save_facebook_enrichment_tx', () => {
    it('should save enrichment and update business atomically', async () => {
        // Setup: Create test business
        const business = await createTestBusiness();

        // Execute: Call stored function
        const { data, error } = await supabase.rpc('save_facebook_enrichment_tx', {
            p_business_id: business.id,
            p_campaign_id: testCampaignId,
            p_enrichment_data: {
                facebook_url: 'https://facebook.com/test',
                primary_email: 'test@email.com',
                emails: ['test@email.com'],
                phone_numbers: [],
                success: true
            }
        });

        // Assert: Function succeeded
        expect(data.success).toBe(true);
        expect(data.enrichment_id).toBeDefined();

        // Assert: Enrichment created
        const enrichment = await getEnrichmentById(data.enrichment_id);
        expect(enrichment.primary_email).toBe('test@email.com');

        // Assert: Business updated
        const updatedBusiness = await getBusinessById(business.id);
        expect(updatedBusiness.email).toBe('test@email.com');
        expect(updatedBusiness.email_source).toBe('facebook');
        expect(updatedBusiness.enrichment_status).toBe('enriched');
    });

    it('should rollback on business update failure', async () => {
        // Setup: Non-existent business
        const fakeBusinessId = '00000000-0000-0000-0000-000000000000';

        // Execute: Call stored function
        const { data, error } = await supabase.rpc('save_facebook_enrichment_tx', {
            p_business_id: fakeBusinessId,
            p_campaign_id: testCampaignId,
            p_enrichment_data: { ... }
        });

        // Assert: Function failed
        expect(data.success).toBe(false);
        expect(data.error).toContain('Business with id');

        // Assert: No enrichment created
        const enrichments = await getEnrichmentsByBusinessId(fakeBusinessId);
        expect(enrichments.length).toBe(0);
    });
});
```

### 7.2 Integration Tests

```javascript
// tests/integration/test_enrichment_workflow.js
describe('Full Enrichment Workflow', () => {
    it('should handle Facebook then LinkedIn enrichment with correct priority', async () => {
        // Setup: Create campaign and scrape businesses
        const campaign = await createTestCampaign();
        const businesses = await scrapeTestBusinesses(campaign.id);

        // Phase 1: Facebook enrichment
        await enrichFacebook(campaign.id);
        const afterFB = await getBusinessById(businesses[0].id);
        expect(afterFB.email_source).toBe('facebook');
        expect(afterFB.email).toBe('fb@company.com');

        // Phase 2: LinkedIn enrichment (should override)
        await enrichLinkedIn(campaign.id);
        const afterLI = await getBusinessById(businesses[0].id);
        expect(afterLI.email_source).toBe('linkedin');
        expect(afterLI.email).toBe('li@company.com');  // LinkedIn priority

        // Verify: Both enrichments exist
        const fbEnrichments = await getFacebookEnrichments(campaign.id);
        const liEnrichments = await getLinkedInEnrichments(campaign.id);
        expect(fbEnrichments.length).toBeGreaterThan(0);
        expect(liEnrichments.length).toBeGreaterThan(0);
    });
});
```

### 7.3 Concurrency Tests

```javascript
// tests/concurrency/test_cost_tracking.js
describe('Concurrent Cost Tracking', () => {
    it('should handle concurrent cost updates without race conditions', async () => {
        const campaign = await createTestCampaign();

        // Simulate 10 workers tracking costs concurrently
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                supabase.rpc('track_api_cost_tx', {
                    p_campaign_id: campaign.id,
                    p_service: 'google_maps',
                    p_cost_data: {
                        cost_usd: 10.00,
                        items_processed: 100
                    }
                })
            );
        }

        // Execute all concurrently
        await Promise.all(promises);

        // Verify: All costs recorded
        const costRecords = await getCostRecords(campaign.id);
        expect(costRecords.length).toBe(10);

        // Verify: Campaign actual_cost is correct (no race condition)
        const updatedCampaign = await getCampaignById(campaign.id);
        expect(updatedCampaign.actual_cost).toBe(100.00);  // 10 × $10
    });
});
```

### 7.4 Performance Tests

```javascript
// tests/performance/test_transaction_duration.js
describe('Transaction Performance', () => {
    it('should complete enrichment save in <50ms', async () => {
        const business = await createTestBusiness();

        const start = Date.now();
        await supabase.rpc('save_facebook_enrichment_tx', { ... });
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(50);
    });

    it('should handle large campaign creation (500 ZIPs) in <500ms', async () => {
        const zipCodes = generateTestZipCodes(500);

        const start = Date.now();
        await supabase.rpc('create_campaign_with_coverage_tx', {
            p_campaign_data: { ... },
            p_coverage_data: zipCodes
        });
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(500);
    });
});
```

---

## Summary & Recommendations

### Risk Levels by Category

| Category | Risk Level | Priority |
|----------|-----------|----------|
| **Breaking Changes** | 🟡 MEDIUM | HIGH - Requires code updates in 2 backends |
| **Edge Cases** | 🟠 MEDIUM-HIGH | CRITICAL - Empty arrays, duplicates, NULL handling |
| **Data Migration** | 🟢 LOW | MEDIUM - Data cleanup required, but low risk |
| **Performance** | 🟠 MEDIUM-HIGH | HIGH - Row locking, batch operations need optimization |
| **Rollback** | 🟢 LOW | LOW - Easy to revert, minimal disruption |

### Top 5 Risks

1. **🔴 Cost Tracking Lock Contention** (HIGH)
   - **Impact:** 10x throughput reduction
   - **Mitigation:** Batch cost tracking, reduce call frequency
   - **Priority:** CRITICAL - must implement before rollout

2. **🟠 Empty Coverage Arrays** (MEDIUM-HIGH)
   - **Impact:** Campaign creation fails for edge cases
   - **Mitigation:** Handle NULL array_length in stored function
   - **Priority:** HIGH - easy fix, prevents failures

3. **🟠 Duplicate Business Upserts** (MEDIUM-HIGH)
   - **Impact:** Email data loss from overwrites
   - **Mitigation:** Smart upsert logic (preserve higher-value data)
   - **Priority:** HIGH - not directly related to stored functions, but critical

4. **🟡 Large Batch Timeouts** (MEDIUM)
   - **Impact:** Campaign creation fails for 500+ ZIP campaigns
   - **Mitigation:** Use bulk INSERT, implement chunking
   - **Priority:** MEDIUM - affects 5% of campaigns

5. **🟡 Return Value Format Changes** (MEDIUM)
   - **Impact:** Frontend expects full records, gets JSONB summary
   - **Mitigation:** Update callers or modify functions to return full records
   - **Priority:** MEDIUM - breaking change, but predictable

### Recommended Implementation Order

**Week 1: Preparation & Low-Risk Functions**
1. ✅ Data cleanup (orphaned records, NULL arrays, invalid sources)
2. ✅ Index verification
3. ✅ Deploy stored functions (not yet used)
4. ✅ Unit test all functions
5. ✅ Migrate email verification functions (4-6)

**Week 2: Enrichment Functions with Fixes**
1. ✅ Implement smart upsert for business saves
2. ✅ Migrate Facebook enrichment (1)
3. ✅ Migrate LinkedIn enrichment (2)
4. ✅ Validate email source priority
5. ✅ Performance monitoring

**Week 3: Cost Tracking with Optimization**
1. ✅ Implement batch cost tracking
2. ✅ Migrate cost tracking function (8)
3. ✅ Monitor lock contention
4. ✅ Adjust batching based on metrics

**Week 4: Complex Functions**
1. ✅ Fix empty array handling
2. ✅ Implement bulk INSERT for coverage
3. ✅ Migrate campaign creation (3)
4. ✅ Test with large campaigns (500+ ZIPs)

**Week 5: Remaining & Validation**
1. ✅ Migrate statistics update (7)
2. ✅ Migrate coverage update (9)
3. ✅ Migrate status transitions (10)
4. ✅ Full integration testing
5. ✅ Production rollout at 100%

### Success Criteria

**Pre-Deployment:**
- ✅ All unit tests passing (100% coverage for functions)
- ✅ Data cleanup completed (zero orphaned records)
- ✅ Index verification passed
- ✅ Performance benchmarks documented

**Post-Deployment:**
- ✅ Error rate <1% (target: <0.1%)
- ✅ Transaction duration <50ms P95
- ✅ Lock wait times <100ms P95
- ✅ Zero orphaned enrichment records
- ✅ Cost calculations 100% accurate
- ✅ Campaign statistics match actual counts

### Go/No-Go Decision Points

**Deploy stored functions IF:**
- ✅ All data cleanup completed
- ✅ All indexes verified
- ✅ Unit tests passing
- ✅ Rollback plan documented and tested

**DO NOT deploy IF:**
- ❌ Orphaned records exist
- ❌ Missing critical indexes
- ❌ Test failure rate >1%
- ❌ Rollback procedure not tested

---

**Next Steps:**
1. Review this analysis with team
2. Implement critical mitigations (empty arrays, cost batching)
3. Begin Week 1 preparation phase
4. Schedule deployment for Week 5

**Document Status:** COMPLETE ✅
**Last Updated:** 2025-10-13
**Next Review:** After Phase 1 deployment
