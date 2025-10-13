# PostgreSQL Stored Functions Migration Catalog

**Created**: 2025-10-12
**Purpose**: Comprehensive catalog of all code locations that need updates to use new PostgreSQL stored functions for atomic operations

---

## Executive Summary

**Total Code Locations Requiring Updates**: 15 primary locations
**Files Affected**: 4 core files + 7 test files
**Estimated Lines to Change**: ~150-200 lines
**Risk Level**: Medium (requires careful testing due to database atomicity changes)

---

## 1. JavaScript Integration Points (supabase-db.js)

### 1.1 Campaign Creation with Coverage (HIGHEST PRIORITY)

**File**: `/Users/tristanwaite/n8n test/supabase-db.js`

#### Location 1: gmapsCampaigns.create() - Lines 45-95
**Current Implementation**:
```javascript
async create(campaignData) {
  // First insert the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('gmaps_campaigns')
    .insert({...})
    .select()
    .single();

  if (campaignError) handleError(campaignError, 'Failed to create campaign');

  // Insert ZIP codes into campaign_coverage if provided
  if (campaignData.zipCodes && campaignData.zipCodes.length > 0) {
    const coverageData = campaignData.zipCodes.map(zip => ({...}));
    const { error: coverageError } = await supabase
      .from('gmaps_campaign_coverage')
      .insert(coverageData);

    if (coverageError) {
      console.error('Failed to insert ZIP codes:', coverageError);
    }
  }
  return campaign;
}
```

**Required Changes**:
- Replace with RPC call to `create_campaign_with_coverage`
- Function signature: `create_campaign_with_coverage(campaign_data jsonb, coverage_data jsonb[])`
- Will handle campaign + coverage insertion atomically
- Remove manual ZIP code insertion logic

**Current Signature**:
```javascript
async create(campaignData: Object): Promise<Campaign>
```

**New Signature** (after migration):
```javascript
async create(campaignData: Object): Promise<Campaign>
// Internal implementation changes to use RPC
```

**Called From**:
1. `simple-server.js` - Line 2794: Campaign creation endpoint
2. Frontend via API: `/api/gmaps/campaigns/create`

---

### 1.2 Business Batch Saving

**File**: `/Users/tristanwaite/n8n test/supabase-db.js`

#### Location 2: businesses.saveBusinesses() - Lines 144-189
**Current Implementation**:
```javascript
async saveBusinesses(campaignId, businessesData, zipCode = null) {
  const businessRecords = businessesData.map(biz => ({
    campaign_id: campaignId,
    zip_code: zipCode || biz.postalCode,
    place_id: biz.placeId || biz.place_id,
    // ... 20+ fields mapped
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
  }
  return data || [];
}
```

**Required Changes**:
- Replace with RPC call to `batch_upsert_businesses_atomic`
- Function signature: `batch_upsert_businesses_atomic(businesses jsonb[])`
- Will handle batch upsert with proper deduplication and statistics update
- Includes automatic campaign statistics update

**Current Signature**:
```javascript
async saveBusinesses(campaignId: string, businessesData: Object[], zipCode?: string): Promise<Business[]>
```

**Called From**:
1. `simple-server.js` - Line 3629: Campaign execution endpoint
2. `gmaps_campaign_manager.py` - Lines 290, 802: Python campaign manager

---

### 1.3 Facebook Enrichment Saving

**File**: `/Users/tristanwaite/n8n test/supabase-db.js`

#### Location 3: businesses.saveFacebookEnrichment() - Lines 227-246
**Current Implementation**:
```javascript
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
      raw_data: enrichmentData.rawData || enrichmentData
    })
    .select()
    .single();

  if (error) handleError(error, 'Failed to save Facebook enrichment');
  return data;
}
```

**Required Changes**:
- Replace with RPC call to `save_facebook_enrichment_atomic`
- Function signature: `save_facebook_enrichment_atomic(p_business_id uuid, p_campaign_id uuid, p_enrichment_data jsonb)`
- Will handle enrichment insert + business update + campaign statistics update atomically

**Current Signature**:
```javascript
async saveFacebookEnrichment(businessId: string, campaignId: string, enrichmentData: Object): Promise<Enrichment>
```

**Called From**:
1. `simple-server.js` - Line 3638: Campaign execution endpoint (after Facebook scraping)

---

## 2. Python Integration Points (gmaps_supabase_manager.py)

### 2.1 Facebook Enrichment Saving

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_supabase_manager.py`

#### Location 4: save_facebook_enrichment() - Lines 320-361
**Current Implementation**:
```python
def save_facebook_enrichment(self, business_id: str, campaign_id: str,
                             enrichment_data: Dict[str, Any]) -> bool:
    try:
        record = {
            "business_id": business_id,
            "campaign_id": campaign_id,
            "facebook_url": enrichment_data.get("facebook_url"),
            "page_name": enrichment_data.get("page_name"),
            "emails": enrichment_data.get("emails", []),
            # ... more fields
        }

        result = self.client.table("gmaps_facebook_enrichments").insert(record).execute()

        if result.data:
            # Update business enrichment status AND email_source
            update_data = {
                "enrichment_status": "enriched" if enrichment_data.get("success") else "failed",
                "enrichment_attempts": 1,
                "last_enrichment_attempt": datetime.now().isoformat()
            }

            # If Facebook enrichment found an email, update email and email_source
            if enrichment_data.get("primary_email"):
                update_data["email"] = enrichment_data.get("primary_email")
                update_data["email_source"] = "facebook"

            self.client.table("gmaps_businesses").update(update_data).eq("id", business_id).execute()

            return True
        return False
```

**Required Changes**:
- Replace with RPC call to `save_facebook_enrichment_atomic`
- Use Supabase Python client's `.rpc()` method
- Pass enrichment_data as JSONB
- Will handle enrichment insert + business update + campaign stats atomically

**Current Signature**:
```python
def save_facebook_enrichment(self, business_id: str, campaign_id: str,
                             enrichment_data: Dict[str, Any]) -> bool
```

**Called From**:
1. `gmaps_campaign_manager.py` - Line 517: During Phase 2 Facebook enrichment

---

### 2.2 LinkedIn Enrichment Saving

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_supabase_manager.py`

#### Location 5: save_linkedin_enrichment() - Lines 382-455
**Current Implementation**:
```python
def save_linkedin_enrichment(self, business_id: str, campaign_id: str,
                            enrichment_data: Dict[str, Any]) -> bool:
    try:
        record = {
            "business_id": business_id,
            "campaign_id": campaign_id,
            "linkedin_url": enrichment_data.get("linkedin_url"),
            "profile_type": enrichment_data.get("profile_type"),
            "person_name": enrichment_data.get("person_name"),
            # ... 20+ fields including Bouncer verification
        }

        result = self.client.table("gmaps_linkedin_enrichments").insert(record).execute()

        if result.data:
            # Update business with LinkedIn URL
            update_data = {
                "linkedin_url": enrichment_data.get("linkedin_url"),
                "linkedin_enriched": True
            }

            # If LinkedIn enrichment found an email, update email and email_source
            if enrichment_data.get("primary_email"):
                update_data["email"] = enrichment_data.get("primary_email")
                # Use specific email_source based on quality tier
                if enrichment_data.get("email_verified_source") == "linkedin_public":
                    update_data["email_source"] = "linkedin"
                # ... more email_source logic

            self.client.table("gmaps_businesses").update(update_data).eq("id", business_id).execute()

            return True
        return False
```

**Required Changes**:
- Replace with RPC call to `save_linkedin_enrichment_atomic`
- Use Supabase Python client's `.rpc()` method
- Pass enrichment_data as JSONB
- Will handle enrichment insert + business update + campaign stats atomically

**Current Signature**:
```python
def save_linkedin_enrichment(self, business_id: str, campaign_id: str,
                            enrichment_data: Dict[str, Any]) -> bool
```

**Called From**:
1. `gmaps_campaign_manager.py` - Lines 625, 666: During Phase 2.5 LinkedIn enrichment

---

### 2.3 Email Verification Updates

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_supabase_manager.py`

#### Location 6: update_linkedin_verification() - Lines 457-519
**Current Implementation**:
```python
def update_linkedin_verification(self, business_id: str,
                                verification_data: Dict[str, Any]) -> bool:
    try:
        # Get the LinkedIn enrichment record
        enrichment_result = (self.client.table("gmaps_linkedin_enrichments")
                           .select("id")
                           .eq("business_id", business_id)
                           .execute())

        if not enrichment_result.data:
            return False

        enrichment_id = enrichment_result.data[0]["id"]

        # Update with verification results
        update_data = {
            "email_verified": True,
            "bouncer_status": verification_data.get("status"),
            # ... more Bouncer fields
        }

        result = (self.client.table("gmaps_linkedin_enrichments")
                 .update(update_data)
                 .eq("id", enrichment_id)
                 .execute())

        # Also save to email verifications table for logging
        verification_record = {...}
        self.client.table("gmaps_email_verifications").insert(verification_record).execute()

        return len(result.data) > 0
```

**Required Changes**:
- Consider creating new RPC: `update_email_verification_atomic`
- Or incorporate into LinkedIn enrichment RPC
- Will handle verification update + logging atomically

**Current Signature**:
```python
def update_linkedin_verification(self, business_id: str,
                                verification_data: Dict[str, Any]) -> bool
```

**Called From**:
1. `gmaps_campaign_manager.py` - Line 656: After Bouncer email verification

---

#### Location 7: update_facebook_verification() - Lines 521-586
**Similar structure to update_linkedin_verification()**

**Current Signature**:
```python
def update_facebook_verification(self, business_id: str,
                                 verification_data: Dict[str, Any]) -> bool
```

**Called From**:
1. `gmaps_campaign_manager.py` - Line 542: After Bouncer email verification for Facebook emails

---

#### Location 8: update_google_maps_verification() - Lines 588-639
**Similar structure to update_linkedin_verification()**

**Current Signature**:
```python
def update_google_maps_verification(self, business_id: str,
                                    verification_data: Dict[str, Any]) -> bool
```

**Called From**:
1. `gmaps_campaign_manager.py` - Lines 323, 835: After Bouncer email verification for Google Maps emails

---

## 3. Campaign Manager Integration (gmaps_campaign_manager.py)

### 3.1 Business Saving During Phase 1

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_campaign_manager.py`

#### Location 9: execute_campaign() - Line 290
**Context**:
```python
if businesses:
    # Save businesses to database
    saved_count = self.db.save_businesses(businesses, campaign_id, zip_code)

    # CRITICAL FIX: Query actual count from database instead of trusting return value
    actual_count_result = self.db.client.table("gmaps_businesses")\
        .select("id", count="exact")\
        .eq("campaign_id", campaign_id)\
        .eq("zip_code", zip_code)\
        .execute()
```

**Required Changes**:
- Update call to use new RPC-based save_businesses method
- The post-save count verification may no longer be needed with atomic operations
- Monitor for any issues with deduplication counts

---

#### Location 10: _execute_phase_1_google_maps() - Line 802
**Same pattern as Location 9** - duplicate method for timeout handling

---

### 3.2 Facebook Enrichment During Phase 2

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_campaign_manager.py`

#### Location 11: execute_campaign() - Line 517
**Context**:
```python
# Save to database - ALWAYS save, even if no email found
success = self.db.save_facebook_enrichment(
    business_id=business["id"],
    campaign_id=campaign_id,
    enrichment_data=enrichment
)

if success:
    if enrichment.get("primary_email"):
        enriched_count += 1
        # ... verification logic
```

**Required Changes**:
- Update call to use new RPC-based save_facebook_enrichment method
- Verify that statistics are properly updated by the stored function
- Test deduplication handling for chain businesses

---

### 3.3 LinkedIn Enrichment During Phase 2.5

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/gmaps_campaign_manager.py`

#### Location 12: execute_campaign() - Line 625
**Context**:
```python
# Save LinkedIn enrichment to database
try:
    success = self.db.save_linkedin_enrichment(
        business_id=business_id,
        campaign_id=campaign_id,
        enrichment_data=enrichment
    )

    if success:
        logging.debug(f"  ✅ Saved LinkedIn enrichment for business {business_id}")
```

**Required Changes**:
- Update call to use new RPC-based save_linkedin_enrichment method
- Verify Bouncer verification data is properly included
- Test with parallel enrichment (batch_size=15, max_parallel=3)

---

#### Location 13: execute_campaign() - Line 666
**Same pattern as Location 12** - for "not found" records

---

### 3.4 Email Verification Updates

#### Location 14: execute_campaign() - Line 323 (Google Maps emails)
**Context**:
```python
# Save verification
self.db.update_google_maps_verification(
    business_id=business["id"],
    verification_data=verification
)
```

---

#### Location 15: execute_campaign() - Line 542 (Facebook emails)
**Context**:
```python
# Save verification
self.db.update_facebook_verification(
    business_id=business["id"],
    verification_data=verification
)
```

---

#### Location 16: execute_campaign() - Line 656 (LinkedIn emails)
**Context**:
```python
# Update LinkedIn enrichment with verification results
self.db.update_linkedin_verification(
    business_id=business_id,
    verification_data=verification
)
```

---

## 4. API Endpoint Integration (simple-server.js)

### 4.1 Campaign Creation Endpoint

**File**: `/Users/tristanwaite/n8n test/simple-server.js`

#### Location 17: POST /api/gmaps/campaigns/create - Line 2794
**Context**:
```javascript
const campaignData = {
  name,
  location,
  keywords: keywordsArray,
  coverage_profile,
  description,
  // ... more fields
  zipCodes: zipAnalysis?.zip_codes || []
};

try {
  const newCampaign = await gmapsCampaigns.create(campaignData);

  res.status(201).json({
    campaign: newCampaign,
    message: 'Campaign created successfully',
    zipAnalysis: zipAnalysis
  });
}
```

**Required Changes**:
- No direct changes needed (calls supabase-db.js gmapsCampaigns.create)
- Verify response structure after RPC migration
- Test ZIP code analysis integration

---

### 4.2 Campaign Execution Endpoint

**File**: `/Users/tristanwaite/n8n test/simple-server.js`

#### Location 18: Business Saving During Execution - Line 3629
**Context**:
```javascript
// Save each ZIP's businesses
for (const [zipCode, zipBusinesses] of Object.entries(businessesByZip)) {
  if (zipBusinesses && zipBusinesses.length > 0) {
    const savedBusinesses = await gmapsBusinesses.saveBusinesses(campaignId, zipBusinesses, zipCode);

    // Save Facebook enrichment data for businesses that have it
    for (let i = 0; i < zipBusinesses.length; i++) {
      const business = zipBusinesses[i];
      const savedBusiness = savedBusinesses[i];

      if (business.facebookData && business.email && savedBusiness) {
        try {
          await gmapsBusinesses.saveFacebookEnrichment(savedBusiness.id, campaignId, {
            facebookUrl: business.facebookUrl,
            email: business.email,
            emails: [business.email],
            // ... more fields
          });
        }
      }
    }
  }
}
```

**Required Changes**:
- Update calls to use new RPC-based methods
- Verify saved business ID mapping still works with atomic operations
- Test error handling with new atomic transactions

---

## 5. Test Files Requiring Updates

### Test Files That Call Database Methods Directly:

1. **`/Users/tristanwaite/n8n test/tests/test_campaign_manager.py`**
   - Lines 86-99: `test_campaign_creation()` - Creates campaigns
   - Lines 189-204: `test_cost_tracking()` - Uses `track_api_cost()`
   - **Impact**: Medium - Tests campaign lifecycle

2. **`/Users/tristanwaite/n8n test/tests/integration/test_gmaps_integration.py`**
   - Lines 132-161: `test_create_campaign()` - Campaign creation test
   - Lines 178-224: `test_mini_scrape()` - Scraping execution test
   - **Impact**: High - Full integration test

3. **`/Users/tristanwaite/n8n test/tests/integration/test_complete_flow.py`**
   - Likely tests complete campaign flow
   - **Impact**: High - End-to-end test

4. **`/Users/tristanwaite/n8n test/tests/test_email_source_tracking.py`**
   - Tests email source attribution
   - **Impact**: Medium - Tests enrichment flow

5. **`/Users/tristanwaite/n8n test/tests/integration/test_email_enrichment.py`**
   - Tests Facebook/LinkedIn enrichment
   - **Impact**: High - Tests enrichment methods directly

6. **`/Users/tristanwaite/n8n test/tests/integration/test_linkedin_enrichment_full.py`**
   - Tests LinkedIn enrichment flow
   - **Impact**: High - Tests save_linkedin_enrichment()

7. **`/Users/tristanwaite/n8n test/tests/test_update_campaign.py`**
   - Tests campaign updates
   - **Impact**: Low - May use update_campaign()

---

## 6. Migration Implementation Plan

### Phase 1: JavaScript RPC Wrapper Creation
1. Create RPC wrapper methods in `supabase-db.js`
2. Maintain backward compatibility with current method signatures
3. Test individually with unit tests

### Phase 2: Python RPC Wrapper Creation
1. Add RPC methods to `gmaps_supabase_manager.py`
2. Keep existing methods as fallback
3. Add feature flag for RPC vs. direct calls

### Phase 3: Gradual Rollout
1. Enable RPC for campaign creation first
2. Monitor for errors and performance
3. Enable RPC for business saving
4. Enable RPC for enrichment saving
5. Enable RPC for verification updates

### Phase 4: Test Updates
1. Update all test files to expect atomic behavior
2. Add new tests for rollback scenarios
3. Verify statistics are correctly updated

### Phase 5: Cleanup
1. Remove old direct SQL methods
2. Remove feature flags
3. Update documentation

---

## 7. Function Signature Reference

### Current JavaScript Signatures

```javascript
// supabase-db.js
gmapsCampaigns.create(campaignData: Object): Promise<Campaign>
businesses.saveBusinesses(campaignId: string, businessesData: Object[], zipCode?: string): Promise<Business[]>
businesses.saveFacebookEnrichment(businessId: string, campaignId: string, enrichmentData: Object): Promise<Enrichment>
```

### Current Python Signatures

```python
# gmaps_supabase_manager.py
save_businesses(self, businesses: List[Dict[str, Any]], campaign_id: str, zip_code: str) -> int
save_facebook_enrichment(self, business_id: str, campaign_id: str, enrichment_data: Dict[str, Any]) -> bool
save_linkedin_enrichment(self, business_id: str, campaign_id: str, enrichment_data: Dict[str, Any]) -> bool
update_linkedin_verification(self, business_id: str, verification_data: Dict[str, Any]) -> bool
update_facebook_verification(self, business_id: str, verification_data: Dict[str, Any]) -> bool
update_google_maps_verification(self, business_id: str, verification_data: Dict[str, Any]) -> bool
```

### New RPC Signatures (PostgreSQL)

```sql
-- Campaign creation with coverage
CREATE OR REPLACE FUNCTION create_campaign_with_coverage(
    campaign_data jsonb,
    coverage_data jsonb[]
) RETURNS jsonb

-- Batch business upsert with statistics
CREATE OR REPLACE FUNCTION batch_upsert_businesses_atomic(
    businesses jsonb[]
) RETURNS TABLE (business_id uuid, place_id text, created boolean)

-- Facebook enrichment with business update
CREATE OR REPLACE FUNCTION save_facebook_enrichment_atomic(
    p_business_id uuid,
    p_campaign_id uuid,
    p_enrichment_data jsonb
) RETURNS jsonb

-- LinkedIn enrichment with business update
CREATE OR REPLACE FUNCTION save_linkedin_enrichment_atomic(
    p_business_id uuid,
    p_campaign_id uuid,
    p_enrichment_data jsonb
) RETURNS jsonb

-- Email verification update (to be created)
CREATE OR REPLACE FUNCTION update_email_verification_atomic(
    p_business_id uuid,
    p_enrichment_type text,
    p_verification_data jsonb
) RETURNS boolean
```

---

## 8. Call Hierarchy

```
Frontend UI (React)
    ↓
API Endpoints (simple-server.js)
    ↓
Database Layer (supabase-db.js)
    ↓
PostgreSQL RPCs (stored functions)
    ↓
Database Tables

Python Campaign Manager (gmaps_campaign_manager.py)
    ↓
Database Manager (gmaps_supabase_manager.py)
    ↓
PostgreSQL RPCs (stored functions)
    ↓
Database Tables
```

### Critical Paths:
1. **Campaign Creation**: Frontend → API → supabase-db.js → create_campaign_with_coverage RPC
2. **Business Saving**: Python Manager → supabase_manager → batch_upsert_businesses_atomic RPC
3. **Facebook Enrichment**: Python Manager → supabase_manager → save_facebook_enrichment_atomic RPC
4. **LinkedIn Enrichment**: Python Manager → supabase_manager → save_linkedin_enrichment_atomic RPC

---

## 9. Estimated Changes Summary

| Component | Files | Methods | Lines Changed | Risk Level |
|-----------|-------|---------|---------------|------------|
| JavaScript DB Layer | 1 | 3 | ~60 | High |
| Python DB Manager | 1 | 6 | ~90 | High |
| Campaign Manager | 1 | 6 | ~30 | Medium |
| API Endpoints | 1 | 2 | ~10 | Low |
| Test Files | 7 | ~15 | ~50 | Medium |
| **TOTAL** | **11** | **32** | **~240** | **Medium-High** |

---

## 10. Risk Assessment

### High Risk Areas:
1. **Campaign Creation**: Used by frontend, must maintain backward compatibility
2. **Business Deduplication**: Complex place_id based deduplication logic
3. **Statistics Updates**: Multiple counters must stay in sync
4. **Chain Business Handling**: Multiple businesses sharing same Facebook URL

### Medium Risk Areas:
1. **Email Verification**: Three separate update methods
2. **Parallel Processing**: LinkedIn batch operations (batch_size=15, max_parallel=3)
3. **Cost Tracking**: Must remain accurate across atomic operations

### Low Risk Areas:
1. **Campaign Status Updates**: Simple field updates
2. **Coverage Updates**: Single record updates
3. **Analytics Queries**: Read-only operations

---

## 11. Testing Strategy

### Unit Tests Required:
1. RPC function testing (SQL-level)
2. JavaScript wrapper testing
3. Python wrapper testing
4. Rollback scenario testing

### Integration Tests Required:
1. Campaign creation with coverage
2. Business batch save with deduplication
3. Facebook enrichment with stats update
4. LinkedIn enrichment with Bouncer verification
5. Complete campaign flow (Phase 1 → 2 → 2.5)

### Performance Tests Required:
1. Batch insert performance (100, 500, 1000 businesses)
2. Concurrent campaign execution
3. Statistics query performance after atomic updates

---

## 12. Rollback Plan

If migration causes issues:

1. **Immediate Rollback**: Feature flag to disable RPC calls
2. **Gradual Rollback**: Disable per-function (campaign, business, enrichment)
3. **Data Integrity Check**: Verify no partial writes occurred
4. **Statistics Recalculation**: Re-run statistics update if needed

---

## Next Steps

1. ✅ Create this catalog
2. ⏭️ Review with stakeholders
3. ⏭️ Create feature flags for gradual rollout
4. ⏭️ Implement JavaScript RPC wrappers
5. ⏭️ Implement Python RPC wrappers
6. ⏭️ Update test files
7. ⏭️ Gradual production rollout
8. ⏭️ Monitor and verify
9. ⏭️ Remove old code and feature flags

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Status**: Ready for Review
