# PostgreSQL Stored Functions - Quick Reference

**Created**: 2025-10-13
**Purpose**: Quick reference guide for parallel implementation strategy

---

## 8 Implementation Groups (Parallel-Ready)

| Group | Function Name | Complexity | Time Est. | Risk | Dependencies |
|-------|--------------|------------|-----------|------|--------------|
| 1 | `create_campaign_with_coverage_tx` | Medium | 3-4h | High | None |
| 2 | `save_facebook_enrichment_tx` | Medium | 3-4h | Med | None |
| 3 | `save_linkedin_enrichment_tx` | High | 4-5h | Med | None |
| 4-6 | `update_email_verification_tx` | Medium | 3-4h | Med | None |
| 5 | `update_campaign_statistics_tx` | Medium | 2-3h | Med | None |
| 6 | `batch_upsert_businesses_atomic` | High | 4-5h | High | None |
| 7 | `update_coverage_status_tx` | Low | 1-2h | Low | None |
| 8 | `update_campaign_status_tx` | Medium | 2-3h | Low | Helper function |

**Total Sequential**: 24-32 hours
**Total Parallel (4 agents)**: 8-12 hours

---

## 4-Agent Parallel Strategy

### Agent 1: Campaign Lifecycle (6-9 hours)
```
✓ Group 1: Campaign Creation (3-4h)
✓ Group 8: Status Transition (2-3h)
✓ Group 7: Coverage Update (1-2h)
```

**Deliverables**:
- `create_campaign_with_coverage_tx(campaign_data, coverage_data[])`
- `update_campaign_status_tx(campaign_id, new_status, metadata)`
- `update_coverage_status_tx(campaign_id, zip_code, results)`
- Helper: `is_valid_status_transition(current, new)`

**Code Updates**:
- `supabase-db.js`: `gmapsCampaigns.create()` (lines 45-95)
- `simple-server.js`: Campaign creation endpoint (line 2794)

### Agent 2: Enrichment Operations (7-9 hours)
```
✓ Group 2: Facebook Enrichment (3-4h)
✓ Group 3: LinkedIn Enrichment (4-5h)
```

**Deliverables**:
- `save_facebook_enrichment_tx(business_id, campaign_id, enrichment_data)`
- `save_linkedin_enrichment_tx(business_id, campaign_id, enrichment_data)`

**Code Updates**:
- `supabase-db.js`: `saveFacebookEnrichment()` (lines 227-246)
- `gmaps_supabase_manager.py`: `save_facebook_enrichment()` (lines 320-361)
- `gmaps_supabase_manager.py`: `save_linkedin_enrichment()` (lines 382-455)

### Agent 3: Email Verification (5-7 hours)
```
✓ Group 4-6: Email Verification (3-4h)
✓ Group 5: Campaign Statistics (2-3h)
```

**Deliverables**:
- `update_email_verification_tx(source, target_id, verification_data)`
- `update_campaign_statistics_tx(campaign_id)`

**Code Updates**:
- `gmaps_supabase_manager.py`: 3 verification methods (lines 457-639)
- Statistics update method (if exists)

### Agent 4: Batch Operations (4-5 hours)
```
✓ Group 6: Batch Operations (4-5h)
```

**Deliverables**:
- `batch_upsert_businesses_atomic(businesses[])`

**Code Updates**:
- `supabase-db.js`: `saveBusinesses()` (lines 144-189)
- `gmaps_campaign_manager.py`: Business saving calls (lines 290, 802)

---

## Code Location Summary

### 18 Total Code Locations

**JavaScript (supabase-db.js)**: 3 methods
- Location 1: `gmapsCampaigns.create()` - Lines 45-95
- Location 2: `businesses.saveBusinesses()` - Lines 144-189
- Location 3: `businesses.saveFacebookEnrichment()` - Lines 227-246

**Python (gmaps_supabase_manager.py)**: 5 methods
- Location 4: `save_facebook_enrichment()` - Lines 320-361
- Location 5: `save_linkedin_enrichment()` - Lines 382-455
- Location 6: `update_linkedin_verification()` - Lines 457-519
- Location 7: `update_facebook_verification()` - Lines 521-586
- Location 8: `update_google_maps_verification()` - Lines 588-639

**Python (gmaps_campaign_manager.py)**: 8 call sites
- Location 9: Business saving - Line 290
- Location 10: Business saving (duplicate) - Line 802
- Location 11: Facebook enrichment - Line 517
- Location 12: LinkedIn enrichment - Line 625
- Location 13: LinkedIn enrichment (not found) - Line 666
- Location 14: Google Maps verification - Line 323
- Location 15: Facebook verification - Line 542
- Location 16: LinkedIn verification - Line 656

**JavaScript (simple-server.js)**: 2 endpoints
- Location 17: Campaign creation endpoint - Line 2794
- Location 18: Campaign execution endpoint - Lines 3629, 3638

---

## Migration File Structure

### Create: `migrations/schema/20251013_001_add_transaction_stored_procedures.sql`

```sql
-- ======================================
-- PostgreSQL Stored Functions for Atomic Operations
-- Created: 2025-10-13
-- Purpose: Add transaction boundaries to critical operations
-- ======================================

-- Function 1: Campaign Creation with Coverage
CREATE OR REPLACE FUNCTION create_campaign_with_coverage_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 299-400
$$;

-- Function 2: Facebook Enrichment
CREATE OR REPLACE FUNCTION save_facebook_enrichment_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 22-148
$$;

-- Function 3: LinkedIn Enrichment
CREATE OR REPLACE FUNCTION save_linkedin_enrichment_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 150-294
$$;

-- Function 4-6: Email Verification (Generic for all sources)
CREATE OR REPLACE FUNCTION update_email_verification_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 429-654
$$;

-- Function 7: Campaign Statistics
CREATE OR REPLACE FUNCTION update_campaign_statistics_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 677-759
$$;

-- Function 8: API Cost Tracking
CREATE OR REPLACE FUNCTION track_api_cost_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 792-897
$$;

-- Function 9: Coverage Update
CREATE OR REPLACE FUNCTION update_coverage_status_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 927-980
$$;

-- Function 10: Campaign Status Transition
CREATE OR REPLACE FUNCTION update_campaign_status_tx(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 1002-1069
$$;

-- Helper Function: Status Validation
CREATE OR REPLACE FUNCTION is_valid_status_transition(...)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
  -- Implementation from TRANSACTION_REQUIREMENTS.md lines 1071-1088
$$;
```

**Total Lines**: ~800 lines SQL

---

## Testing Strategy Summary

### SQL-Level Unit Tests (60-80 test cases)
```sql
-- tests/test_stored_procedures.sql

-- Test Group 1: Campaign Creation
SELECT test_create_campaign_with_1_zip();
SELECT test_create_campaign_with_100_zips();
SELECT test_create_campaign_with_duplicate_zips();
SELECT test_create_campaign_rollback();

-- Test Group 2: Facebook Enrichment
SELECT test_save_facebook_enrichment_with_email();
SELECT test_save_facebook_enrichment_without_email();
SELECT test_save_facebook_enrichment_rollback();

-- ... 60-80 total test cases
```

### Application-Level Integration Tests (30-40 test cases)
```python
# tests/test_transaction_integration.py

def test_campaign_creation_atomic():
    """Test campaign + coverage created atomically"""
    pass

def test_facebook_enrichment_atomic():
    """Test enrichment + business update atomic"""
    pass

def test_concurrent_enrichments():
    """Test parallel enrichments don't cause counter drift"""
    pass

# ... 30-40 total test cases
```

### Rollback Scenario Tests (15-20 test cases)
```python
# tests/test_transaction_rollback.py

def test_campaign_creation_rollback():
    """Test campaign creation rollback on coverage failure"""
    pass

def test_enrichment_rollback():
    """Test enrichment rollback on business update failure"""
    pass

# ... 15-20 total test cases
```

---

## RPC Call Patterns

### JavaScript Pattern
```javascript
// Before: Direct SQL
const { data, error } = await supabase
  .from('gmaps_campaigns')
  .insert(campaignData)
  .select()
  .single();

// After: RPC call
const { data, error } = await supabase.rpc(
  'create_campaign_with_coverage_tx',
  {
    p_campaign_data: campaignData,
    p_coverage_data: coverageArray
  }
);

if (error || !data.success) {
  throw new Error(data.error || 'Operation failed');
}

return data;
```

### Python Pattern
```python
# Before: Direct SQL
result = self.client.table("gmaps_facebook_enrichments").insert(record).execute()
self.client.table("gmaps_businesses").update(update_data).eq("id", business_id).execute()

# After: RPC call
result = self.client.rpc(
    'save_facebook_enrichment_tx',
    {
        'p_business_id': business_id,
        'p_campaign_id': campaign_id,
        'p_enrichment_data': enrichment_data
    }
).execute()

if not result.data.get('success'):
    raise Exception(result.data.get('error', 'Operation failed'))

return result.data
```

---

## Performance Targets

| Operation | Target Duration | Max Acceptable |
|-----------|----------------|----------------|
| Campaign Creation (10 ZIPs) | <30ms | 200ms |
| Campaign Creation (100 ZIPs) | <150ms | 500ms |
| Facebook Enrichment | <20ms | 100ms |
| LinkedIn Enrichment | <20ms | 100ms |
| Email Verification | <15ms | 100ms |
| Statistics Update (1k businesses) | <50ms | 200ms |
| Statistics Update (100k businesses) | <500ms | 1000ms |
| Batch Upsert (100 businesses) | <100ms | 300ms |
| Coverage Update | <10ms | 50ms |
| Status Transition | <10ms | 50ms |

---

## Rollback Plan

### Feature Flag Strategy
```javascript
// supabase-db.js
const USE_RPC_FUNCTIONS = process.env.USE_RPC_FUNCTIONS === 'true';

async create(campaignData) {
  if (USE_RPC_FUNCTIONS) {
    return this.createWithRPC(campaignData);
  }
  return this.createLegacy(campaignData);
}
```

### Gradual Rollout
1. Enable RPC for campaign creation (frontend only)
2. Enable RPC for batch operations (Phase 1 only)
3. Enable RPC for Facebook enrichment (Phase 2 only)
4. Enable RPC for LinkedIn enrichment (Phase 2.5 only)
5. Enable RPC for email verification (all phases)
6. Enable RPC for statistics updates
7. Full production rollout
8. Remove legacy code + feature flags

---

## Success Metrics

### Data Integrity (Critical)
- ✅ **Zero orphaned enrichment records** (currently: ~5% failure rate)
- ✅ **100% campaign statistics accuracy** (currently: ~95% due to race conditions)
- ✅ **Consistent cost tracking** (currently: occasional drift on concurrent updates)

### Performance (Target)
- ✅ **<100ms for 99% of transactions** (currently: ~80ms average)
- ✅ **<1% rollback rate** (currently: N/A - no transactions)
- ✅ **Zero deadlocks** (currently: N/A - no locking)

### Code Quality (Improvement)
- ✅ **-200 lines of application code** (simpler, more maintainable)
- ✅ **Better separation of concerns** (SQL logic in database, not application)
- ✅ **Easier to test** (SQL functions testable independently)

---

## Quick Start Commands

### Create Migration File
```bash
cd "/Users/tristanwaite/n8n test"
touch migrations/schema/20251013_001_add_transaction_stored_procedures.sql
```

### Test in Supabase SQL Editor
```sql
-- Test function creation
SELECT create_campaign_with_coverage_tx(
  '{"name": "Test Campaign"}'::jsonb,
  ARRAY['{"zip_code": "12345"}'::jsonb]
);
```

### Apply Migration (Staging)
```bash
# Use Supabase CLI or dashboard
supabase db push --db-url $STAGING_DB_URL
```

### Deploy Feature Flag
```bash
# Environment variable
export USE_RPC_FUNCTIONS=false  # Start disabled
export USE_RPC_FUNCTIONS=true   # Enable after testing
```

### Run Test Suite
```bash
# SQL tests
psql -d $DB_URL -f tests/test_stored_procedures.sql

# Python tests
pytest tests/test_transaction_integration.py
pytest tests/test_transaction_rollback.py

# Full test suite
npm run test:integration
python -m pytest tests/integration/
```

---

## Risk Mitigation Checklist

### Before Deployment
- [ ] All 10 stored procedures created and tested
- [ ] Helper functions implemented
- [ ] Migration file reviewed
- [ ] Application code updated to use RPC
- [ ] Error handling tested (rollback scenarios)
- [ ] Concurrent operations tested (no deadlocks)
- [ ] Performance benchmarked (<100ms)
- [ ] Integration tests passing
- [ ] Feature flags in place
- [ ] Rollback plan documented

### After Deployment
- [ ] Monitor transaction success rate (>99%)
- [ ] Monitor rollback rate (<1%)
- [ ] Check for lock timeouts (minimal)
- [ ] Verify data consistency (no orphans)
- [ ] Confirm statistics accuracy (100%)
- [ ] Validate cost tracking (consistent)
- [ ] Review performance metrics
- [ ] Collect user feedback

---

## Reference Documents

### Full Documentation
- **Implementation Breakdown**: `/docs/IMPLEMENTATION_BREAKDOWN.md`
- **Transaction Requirements**: `/docs/TRANSACTION_REQUIREMENTS.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA_MAPPING.md`
- **Code Locations**: `/RPC_MIGRATION_CATALOG.md`

### Source Files
- **JavaScript DB Layer**: `/supabase-db.js`
- **Python DB Manager**: `/lead_generation/modules/gmaps_supabase_manager.py`
- **Python Campaign Manager**: `/lead_generation/modules/gmaps_campaign_manager.py`
- **API Endpoints**: `/simple-server.js`

### Test Files
- **Database Integrity**: `/tests/test_database_integrity.js`
- **Campaign Manager**: `/tests/test_campaign_manager.py`
- **Integration Tests**: `/tests/integration/`

---

**Status**: Ready for Implementation
**Last Updated**: 2025-10-13
**Recommended Next Step**: Choose parallel or sequential approach, assign work to agents
