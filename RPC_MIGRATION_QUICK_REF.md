# PostgreSQL Stored Functions Migration - Quick Reference

**Last Updated**: 2025-10-12
**Status**: Ready for Implementation

---

## 📋 Quick Stats

- **Files to Update**: 11 files
- **Methods to Update**: 32 methods
- **Lines to Change**: ~240 lines
- **Estimated Duration**: 2 weeks
- **Risk Level**: Medium-High

---

## 🎯 Top Priority Updates

### 1. Campaign Creation (CRITICAL)
**File**: `supabase-db.js`
**Method**: `gmapsCampaigns.create()` (Lines 45-95)
**RPC**: `create_campaign_with_coverage(campaign_data, coverage_data)`
**Why**: Used by frontend, prevents orphaned campaigns

### 2. Business Batch Saving (CRITICAL)
**Files**:
- `supabase-db.js` → `businesses.saveBusinesses()` (Lines 144-189)
- `gmaps_supabase_manager.py` → `save_businesses()` (Lines 222-301)

**RPC**: `batch_upsert_businesses_atomic(businesses)`
**Why**: Core scraping function, handles deduplication + statistics

### 3. Facebook Enrichment (HIGH)
**Files**:
- `supabase-db.js` → `saveFacebookEnrichment()` (Lines 227-246)
- `gmaps_supabase_manager.py` → `save_facebook_enrichment()` (Lines 320-361)

**RPC**: `save_facebook_enrichment_atomic(business_id, campaign_id, enrichment_data)`
**Why**: Atomic enrichment + business update

### 4. LinkedIn Enrichment (HIGH)
**File**: `gmaps_supabase_manager.py`
**Method**: `save_linkedin_enrichment()` (Lines 382-455)
**RPC**: `save_linkedin_enrichment_atomic(business_id, campaign_id, enrichment_data)`
**Why**: Complex multi-table update with Bouncer verification

---

## 📝 Code Update Checklist

### JavaScript (supabase-db.js)
```javascript
// ✅ Update 1: Campaign Creation
async create(campaignData) {
  const { data, error } = await supabase.rpc('create_campaign_with_coverage', {
    campaign_data: {...},
    coverage_data: campaignData.zipCodes || []
  });
  if (error) handleError(error);
  return data;
}

// ✅ Update 2: Business Saving
async saveBusinesses(campaignId, businessesData, zipCode) {
  const businessRecords = businessesData.map(biz => ({...}));
  const { data, error } = await supabase.rpc('batch_upsert_businesses_atomic', {
    businesses: businessRecords
  });
  if (error) handleError(error);
  return data;
}

// ✅ Update 3: Facebook Enrichment
async saveFacebookEnrichment(businessId, campaignId, enrichmentData) {
  const { data, error } = await supabase.rpc('save_facebook_enrichment_atomic', {
    p_business_id: businessId,
    p_campaign_id: campaignId,
    p_enrichment_data: enrichmentData
  });
  if (error) handleError(error);
  return data;
}
```

### Python (gmaps_supabase_manager.py)
```python
# ✅ Update 1: Business Saving
def save_businesses(self, businesses: List[Dict], campaign_id: str, zip_code: str) -> int:
    business_records = [...]  # Format records
    result = self.client.rpc('batch_upsert_businesses_atomic', {
        'businesses': business_records
    }).execute()
    return len(result.data) if result.data else 0

# ✅ Update 2: Facebook Enrichment
def save_facebook_enrichment(self, business_id: str, campaign_id: str,
                             enrichment_data: Dict[str, Any]) -> bool:
    result = self.client.rpc('save_facebook_enrichment_atomic', {
        'p_business_id': business_id,
        'p_campaign_id': campaign_id,
        'p_enrichment_data': enrichment_data
    }).execute()
    return len(result.data) > 0

# ✅ Update 3: LinkedIn Enrichment
def save_linkedin_enrichment(self, business_id: str, campaign_id: str,
                            enrichment_data: Dict[str, Any]) -> bool:
    result = self.client.rpc('save_linkedin_enrichment_atomic', {
        'p_business_id': business_id,
        'p_campaign_id': campaign_id,
        'p_enrichment_data': enrichment_data
    }).execute()
    return len(result.data) > 0
```

---

## 🔍 Where Functions Are Called

### JavaScript Call Sites
1. `simple-server.js:2794` → `gmapsCampaigns.create()` (Campaign creation endpoint)
2. `simple-server.js:3629` → `businesses.saveBusinesses()` (Campaign execution)
3. `simple-server.js:3638` → `businesses.saveFacebookEnrichment()` (After scraping)

### Python Call Sites
1. `gmaps_campaign_manager.py:290` → `save_businesses()` (Phase 1 - Google Maps)
2. `gmaps_campaign_manager.py:517` → `save_facebook_enrichment()` (Phase 2 - Facebook)
3. `gmaps_campaign_manager.py:625` → `save_linkedin_enrichment()` (Phase 2.5 - LinkedIn)
4. `gmaps_campaign_manager.py:666` → `save_linkedin_enrichment()` (Not found records)
5. `gmaps_campaign_manager.py:323` → `update_google_maps_verification()` (Bouncer)
6. `gmaps_campaign_manager.py:542` → `update_facebook_verification()` (Bouncer)
7. `gmaps_campaign_manager.py:656` → `update_linkedin_verification()` (Bouncer)

---

## 🧪 Test Files to Update

1. `tests/test_campaign_manager.py` - Campaign lifecycle tests
2. `tests/integration/test_gmaps_integration.py` - Full integration tests
3. `tests/integration/test_complete_flow.py` - End-to-end tests
4. `tests/test_email_source_tracking.py` - Email attribution tests
5. `tests/integration/test_email_enrichment.py` - Enrichment tests
6. `tests/integration/test_linkedin_enrichment_full.py` - LinkedIn tests
7. `tests/test_update_campaign.py` - Campaign update tests

---

## 📊 RPC Function Signatures

```sql
-- 1. Campaign Creation with Coverage
CREATE OR REPLACE FUNCTION create_campaign_with_coverage(
    campaign_data jsonb,
    coverage_data jsonb[]
) RETURNS jsonb;

-- 2. Batch Business Upsert
CREATE OR REPLACE FUNCTION batch_upsert_businesses_atomic(
    businesses jsonb[]
) RETURNS TABLE (business_id uuid, place_id text, created boolean);

-- 3. Facebook Enrichment
CREATE OR REPLACE FUNCTION save_facebook_enrichment_atomic(
    p_business_id uuid,
    p_campaign_id uuid,
    p_enrichment_data jsonb
) RETURNS jsonb;

-- 4. LinkedIn Enrichment
CREATE OR REPLACE FUNCTION save_linkedin_enrichment_atomic(
    p_business_id uuid,
    p_campaign_id uuid,
    p_enrichment_data jsonb
) RETURNS jsonb;

-- 5. Email Verification Update (to be created)
CREATE OR REPLACE FUNCTION update_email_verification_atomic(
    p_business_id uuid,
    p_enrichment_type text,
    p_verification_data jsonb
) RETURNS boolean;
```

---

## 🚀 Migration Phases

### Phase 1: Preparation (1 day)
- Create feature flags
- Add RPC wrappers (keep old code)
- Unit test stored functions

### Phase 2: Campaign Creation (2 days)
- Update `supabase-db.js` campaign creation
- Test in dev
- Enable feature flag
- Monitor 24h

### Phase 3: Business Saving (3 days)
- Update Python + JavaScript business saving
- Test small batches (10 biz)
- Test large batches (1000 biz)
- Enable feature flag
- Monitor 48h

### Phase 4: Enrichment (3 days)
- Update Facebook + LinkedIn enrichment
- Test enrichment flows
- Enable feature flag
- Monitor 48h

### Phase 5: Verification (2 days)
- Update verification methods
- Test all verification paths
- Enable feature flag
- Monitor 24h

### Phase 6: Tests (2 days)
- Update all test files
- Add rollback tests
- Run full test suite

### Phase 7: Production (1 week)
- End-to-end campaign test
- Verify statistics
- Monitor performance
- Get team sign-off

### Phase 8: Cleanup (1 day)
- Remove old code
- Remove feature flags
- Update documentation

---

## ⚠️ Risk Areas

### High Risk
1. **Campaign Creation** - Used by frontend, must maintain compatibility
2. **Business Deduplication** - Complex `place_id` logic
3. **Statistics Updates** - Multiple counters must stay in sync
4. **Chain Businesses** - Multiple businesses sharing Facebook URL

### Medium Risk
1. **Email Verification** - Three separate update methods
2. **Parallel Processing** - LinkedIn batch operations
3. **Cost Tracking** - Must remain accurate

### Mitigation
- Feature flags for gradual rollout
- Keep old code as fallback during migration
- Comprehensive testing at each phase
- Monitor statistics accuracy
- Have rollback plan ready

---

## ✅ Success Criteria

- [ ] All RPC functions created and tested
- [ ] All JavaScript methods updated
- [ ] All Python methods updated
- [ ] All test files updated and passing
- [ ] Statistics remain accurate
- [ ] No performance regression
- [ ] Complete campaign runs successfully
- [ ] All enrichment phases work atomically
- [ ] Error handling works correctly
- [ ] Rollback scenarios tested

---

## 📞 Quick Commands

```bash
# Check current code
grep -n "gmapsCampaigns.create" supabase-db.js
grep -n "save_businesses" lead_generation/modules/gmaps_supabase_manager.py
grep -n "save_facebook_enrichment" lead_generation/modules/gmaps_supabase_manager.py
grep -n "save_linkedin_enrichment" lead_generation/modules/gmaps_supabase_manager.py

# Run tests
python tests/test_campaign_manager.py
python tests/integration/test_gmaps_integration.py

# Check stored functions exist
psql -d your_database -c "\df create_campaign_with_coverage"
psql -d your_database -c "\df batch_upsert_businesses_atomic"
psql -d your_database -c "\df save_facebook_enrichment_atomic"
psql -d your_database -c "\df save_linkedin_enrichment_atomic"
```

---

## 📚 Related Documents

- `RPC_MIGRATION_CATALOG.md` - Comprehensive catalog with full details
- `RPC_MIGRATION_VISUAL.md` - Visual diagrams and flowcharts
- `migrations/20250101_001_create_stored_functions.sql` - SQL migration file

---

## 🔗 Key Relationships

```
Campaign
  └─ Coverage Records (1:many)
  └─ Businesses (1:many)
      └─ Facebook Enrichment (1:1)
      └─ LinkedIn Enrichment (1:1)
      └─ Email Verifications (1:many)
```

**Atomic Requirements**:
- Campaign + Coverage must be created together
- Business + Statistics must be updated together
- Enrichment + Business + Statistics must be updated together
- Verification + Enrichment must be updated together

---

## 💡 Pro Tips

1. **Test with small batches first** - Start with 10 businesses before testing 1000
2. **Monitor statistics closely** - Verify counts match at each phase
3. **Use feature flags** - Easy rollback if issues occur
4. **Keep old code temporarily** - Safety net during migration
5. **Log everything** - Detailed logging helps debug issues
6. **Verify deduplication** - Test chain businesses (same Facebook URL)
7. **Check parallel operations** - LinkedIn uses batch_size=15, max_parallel=3

---

**Quick Reference Version**: 1.0
**For Detailed Info**: See RPC_MIGRATION_CATALOG.md
**For Visuals**: See RPC_MIGRATION_VISUAL.md
