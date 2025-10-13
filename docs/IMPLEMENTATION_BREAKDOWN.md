# PostgreSQL Stored Functions Implementation Breakdown

**Created**: 2025-10-13
**Purpose**: Parallelizable task breakdown for implementing 8 atomic transaction boundaries
**Total Functions**: 10 (8 critical + 2 supporting)
**Total Code Locations**: 18 locations across 4 files

---

## Executive Summary

**Implementation Groups**: 8 independent groups (can be parallelized)
**Estimated Total Time**: 24-32 hours (sequential) OR 8-12 hours (parallel with 4 agents)
**Risk Level**: Medium-High (database atomicity changes require careful testing)
**Dependencies**: Groups 1-8 are mostly independent; application code updates depend on stored function completion

---

## Group 1: Campaign Creation Function

### Function Specifications

**Function Name**: `create_campaign_with_coverage_tx`

**Purpose**: Atomically create campaign + all ZIP coverage records

**Parameters**:
```sql
p_campaign_data JSONB -- Campaign metadata
p_coverage_data JSONB[] -- Array of ZIP code coverage records
```

**Returns**: `JSONB { success, campaign_id, coverage_count }`

**Transaction Scope**:
1. INSERT into `gmaps_campaigns`
2. INSERT batch into `gmaps_campaign_coverage` (loop through ZIP array)
3. Verify all coverage records inserted
4. COMMIT or ROLLBACK both

**Tables Modified**:
- `gmaps_campaigns` (1 INSERT)
- `gmaps_campaign_coverage` (N INSERTs where N = number of ZIP codes)

**Dependencies**:
- None (independent group)
- Campaign and coverage tables already exist

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 299-400):
- Use `FOREACH v_coverage_record IN ARRAY p_coverage_data`
- Track `v_inserted_count` to verify all ZIPs inserted
- Raise exception if count mismatch
- Return campaign_id on success

**Complexity**: Medium (batch insert with verification)

**Estimated Time**: 3-4 hours
- SQL function: 1.5 hours
- Testing: 1 hour
- Integration: 1 hour
- Edge cases: 0.5 hours

**Risk Factors**:
- Large campaigns (500+ ZIPs) may timeout (monitor duration)
- Unique constraint on (campaign_id, zip_code) prevents duplicates

### Code Update Locations

**JavaScript (supabase-db.js)**:
1. **Location 1**: `gmapsCampaigns.create()` - Lines 45-95
   - Current: Separate INSERT for campaign + coverage
   - New: Single RPC call to `create_campaign_with_coverage_tx`
   - Impact: Replace ~50 lines with ~15 lines RPC wrapper
   - Signature: Keep same (backward compatible)

**API Endpoint (simple-server.js)**:
2. **Location 17**: POST `/api/gmaps/campaigns/create` - Line 2794
   - No direct changes (calls supabase-db.js)
   - Verify response structure after migration
   - Test ZIP code analysis integration

**Test Files**:
3. `tests/test_campaign_manager.py` - Lines 86-99: `test_campaign_creation()`
4. `tests/integration/test_gmaps_integration.py` - Lines 132-161: `test_create_campaign()`
5. `tests/integration/test_complete_flow.py` - Campaign creation tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Create campaign with 1 ZIP code → SUCCESS
2. Create campaign with 100 ZIP codes → SUCCESS
3. Create campaign with duplicate ZIP codes → FAIL (unique constraint)
4. Create campaign with invalid data → ROLLBACK
5. Campaign creation fails but coverage already inserted → VERIFY ROLLBACK

**Integration Tests** (Application-level):
1. Frontend creates campaign via API → Verify campaign + coverage in DB
2. Create campaign with ZIP analysis → Verify all ZIPs saved atomically
3. Campaign creation timeout → Verify no partial data
4. Create campaign, then query coverage → Verify consistency

**Performance Tests**:
1. Create campaign with 10 ZIPs → Measure duration (should be <50ms)
2. Create campaign with 100 ZIPs → Measure duration (should be <200ms)
3. Create campaign with 500 ZIPs → Measure duration (should be <500ms)
4. Concurrent campaign creation → Verify no deadlocks

**Rollback Tests**:
1. Simulate coverage insert failure → Verify campaign not created
2. Simulate campaign insert failure → Verify coverage not created
3. Network interruption during transaction → Verify clean state

---

## Group 2: Facebook Enrichment Function

### Function Specifications

**Function Name**: `save_facebook_enrichment_tx`

**Purpose**: Atomically save Facebook enrichment + update business record

**Parameters**:
```sql
p_business_id UUID
p_campaign_id UUID
p_enrichment_data JSONB
```

**Returns**: `JSONB { success, enrichment_id, business_id }`

**Transaction Scope**:
1. INSERT into `gmaps_facebook_enrichments`
2. UPDATE `gmaps_businesses` (email, email_source, enrichment_status, enrichment_attempts)
3. Verify business exists (raise exception if not found)
4. COMMIT or ROLLBACK both

**Tables Modified**:
- `gmaps_facebook_enrichments` (1 INSERT)
- `gmaps_businesses` (1 UPDATE)

**Dependencies**:
- None (independent group)
- Business record must exist (FK constraint)

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 22-148):
- Extract fields from JSONB using `->>`
- Convert arrays using `ARRAY(SELECT jsonb_array_elements_text(...))`
- Update email ONLY if `primary_email IS NOT NULL`
- Set `email_source = 'facebook'` when email found
- Increment `enrichment_attempts` by 1

**Complexity**: Medium (JSONB parsing, conditional updates)

**Estimated Time**: 3-4 hours
- SQL function: 2 hours
- Testing: 1 hour
- Integration: 1 hour

**Risk Factors**:
- Email source priority: Facebook should NOT override LinkedIn emails (add WHERE clause)
- Chain businesses sharing same Facebook URL (handled by deduplication)

### Code Update Locations

**JavaScript (supabase-db.js)**:
1. **Location 3**: `businesses.saveFacebookEnrichment()` - Lines 227-246
   - Current: Direct INSERT into enrichments (no business update)
   - New: Single RPC call to `save_facebook_enrichment_tx`
   - Impact: Replace ~20 lines with ~10 lines RPC wrapper

**Python (gmaps_supabase_manager.py)**:
2. **Location 4**: `save_facebook_enrichment()` - Lines 320-361
   - Current: INSERT enrichment + separate UPDATE business
   - New: Single RPC call via `.rpc()`
   - Impact: Replace ~40 lines with ~15 lines RPC wrapper

**Campaign Manager (gmaps_campaign_manager.py)**:
3. **Location 11**: `execute_campaign()` - Line 517
   - No direct changes (calls supabase_manager method)
   - Verify statistics updated by stored function

**API Endpoint (simple-server.js)**:
4. **Location 18**: Campaign execution endpoint - Line 3638
   - No direct changes (calls supabase-db.js)
   - Verify saved business ID mapping still works

**Test Files**:
5. `tests/integration/test_email_enrichment.py` - Facebook enrichment tests
6. `tests/test_email_source_tracking.py` - Email source attribution tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Save enrichment with email → Business email updated
2. Save enrichment without email → Business enrichment_status = 'failed'
3. Save enrichment for non-existent business → RAISE EXCEPTION
4. Save enrichment when business already has LinkedIn email → Business email unchanged
5. Enrichment insert fails → Business not updated (ROLLBACK)

**Integration Tests** (Application-level):
1. Python campaign manager saves Facebook enrichment → Verify atomicity
2. Facebook scraper finds email → Verify business email + enrichment saved together
3. Facebook scraper fails → Verify enrichment_status = 'failed'
4. Chain businesses sharing Facebook URL → Verify all businesses updated
5. Concurrent Facebook enrichments → Verify no counter drift

**Performance Tests**:
1. Save single enrichment → Measure duration (should be <20ms)
2. Save 100 enrichments sequentially → Measure total duration
3. Concurrent enrichment saves → Verify no deadlocks

**Rollback Tests**:
1. Business UPDATE fails → Verify enrichment not saved
2. Enrichment INSERT fails → Verify business not updated
3. Network failure during transaction → Verify clean state

---

## Group 3: LinkedIn Enrichment Function

### Function Specifications

**Function Name**: `save_linkedin_enrichment_tx`

**Purpose**: Atomically save LinkedIn enrichment + update business record

**Parameters**:
```sql
p_business_id UUID
p_campaign_id UUID
p_enrichment_data JSONB
```

**Returns**: `JSONB { success, enrichment_id, business_id }`

**Transaction Scope**:
1. INSERT into `gmaps_linkedin_enrichments`
2. UPDATE `gmaps_businesses` (email, email_source, linkedin_enriched, linkedin_url)
3. Verify business exists
4. COMMIT or ROLLBACK both

**Tables Modified**:
- `gmaps_linkedin_enrichments` (1 INSERT)
- `gmaps_businesses` (1 UPDATE)

**Dependencies**:
- None (independent group)
- Business record must exist (FK constraint)

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 150-294):
- Parse extensive JSONB (25+ fields including Bouncer verification)
- LinkedIn emails ALWAYS take priority (unconditional UPDATE)
- Set `linkedin_enriched = TRUE` flag
- Update `email_source = 'linkedin'`

**Complexity**: High (many fields, Bouncer integration, email verification)

**Estimated Time**: 4-5 hours
- SQL function: 2.5 hours (many fields)
- Testing: 1.5 hours
- Integration: 1 hour

**Risk Factors**:
- Bouncer verification data must be saved atomically
- Email quality tier tracking (generated vs found vs verified)
- Multiple email arrays: emails_found, emails_generated

### Code Update Locations

**Python (gmaps_supabase_manager.py)**:
1. **Location 5**: `save_linkedin_enrichment()` - Lines 382-455
   - Current: INSERT enrichment + separate UPDATE business
   - New: Single RPC call via `.rpc()`
   - Impact: Replace ~75 lines with ~20 lines RPC wrapper

**Campaign Manager (gmaps_campaign_manager.py)**:
2. **Location 12**: `execute_campaign()` - Line 625
   - No direct changes (calls supabase_manager method)
   - Verify Bouncer verification data included

3. **Location 13**: `execute_campaign()` - Line 666 (not found records)
   - Same pattern as Location 12

**Test Files**:
4. `tests/integration/test_linkedin_enrichment_full.py` - LinkedIn enrichment tests
5. `tests/integration/test_email_enrichment.py` - LinkedIn enrichment tests
6. `tests/test_email_source_tracking.py` - Email source priority tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Save LinkedIn enrichment with email → Business email updated to LinkedIn source
2. Save LinkedIn enrichment without email → Business linkedin_enriched = TRUE
3. Save LinkedIn enrichment over Facebook email → LinkedIn takes priority
4. Save enrichment with Bouncer verification → All Bouncer fields saved
5. Save enrichment for non-existent business → RAISE EXCEPTION
6. Enrichment insert fails → Business not updated (ROLLBACK)

**Integration Tests** (Application-level):
1. Python campaign manager saves LinkedIn enrichment → Verify atomicity
2. LinkedIn scraper finds email → Verify business email + enrichment saved together
3. LinkedIn enrichment with Bouncer verification → Verify all fields saved
4. Parallel LinkedIn enrichments (batch_size=15) → Verify no conflicts
5. LinkedIn email overwrites Facebook email → Verify email_source = 'linkedin'

**Performance Tests**:
1. Save single LinkedIn enrichment → Measure duration (should be <20ms)
2. Save 15 enrichments in parallel → Measure duration (batch processing)
3. Concurrent enrichment saves → Verify no deadlocks

**Rollback Tests**:
1. Business UPDATE fails → Verify enrichment not saved
2. Enrichment INSERT fails → Verify business not updated
3. Bouncer data invalid → Verify full rollback

---

## Group 4-6: Email Verification Functions (3 Variants)

### Function Specifications

**Function Name**: `update_email_verification_tx`

**Purpose**: Atomically update email verification + insert audit log

**Parameters**:
```sql
p_source VARCHAR(50) -- 'google_maps', 'facebook', 'linkedin'
p_target_id UUID -- business_id or enrichment_id
p_verification_data JSONB
```

**Returns**: `JSONB { success, business_id, source }`

**Transaction Scope**:
1. IF source = 'facebook':
   - SELECT business_id from gmaps_facebook_enrichments
   - UPDATE gmaps_facebook_enrichments (Bouncer fields)
   - INSERT into gmaps_email_verifications
2. IF source = 'linkedin':
   - SELECT business_id from gmaps_linkedin_enrichments
   - UPDATE gmaps_linkedin_enrichments (Bouncer fields)
   - INSERT into gmaps_email_verifications
3. IF source = 'google_maps':
   - UPDATE gmaps_businesses (Bouncer fields)
   - INSERT into gmaps_email_verifications
4. COMMIT or ROLLBACK all

**Tables Modified**:
- `gmaps_facebook_enrichments` (1 UPDATE for Facebook)
- `gmaps_linkedin_enrichments` (1 UPDATE for LinkedIn)
- `gmaps_businesses` (1 UPDATE for Google Maps)
- `gmaps_email_verifications` (1 INSERT for all)

**Dependencies**:
- None (independent group)
- Can be implemented as single function with IF/ELSE logic
- Or 3 separate functions (simpler but more code)

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 429-654):
- Single function with source-based branching
- Bouncer fields: status, score, reason, is_safe, is_disposable, is_role_based, is_free_email
- Verification log: tracks all verification attempts (allows duplicates)
- Set `email_verified = TRUE` and `bouncer_verified_at = NOW()`

**Complexity**: Medium (conditional logic, 3 code paths)

**Estimated Time**: 3-4 hours
- SQL function: 2 hours (3 code paths)
- Testing: 1 hour
- Integration: 1 hour

**Risk Factors**:
- Verification log is optional (could skip INSERT if table doesn't exist)
- Idempotent operation (checking if already verified before calling)

### Code Update Locations

**Python (gmaps_supabase_manager.py)**:
1. **Location 6**: `update_linkedin_verification()` - Lines 457-519
2. **Location 7**: `update_facebook_verification()` - Lines 521-586
3. **Location 8**: `update_google_maps_verification()` - Lines 588-639
   - All three: Current separate UPDATE + INSERT
   - New: Single RPC call to `update_email_verification_tx`
   - Impact: Replace ~160 lines total with ~40 lines RPC wrapper

**Campaign Manager (gmaps_campaign_manager.py)**:
4. **Location 14**: `execute_campaign()` - Line 323 (Google Maps emails)
5. **Location 15**: `execute_campaign()` - Line 542 (Facebook emails)
6. **Location 16**: `execute_campaign()` - Line 656 (LinkedIn emails)
   - No direct changes (calls supabase_manager methods)

**Test Files**:
7. `tests/integration/test_email_enrichment.py` - Email verification tests
8. `tests/test_email_source_tracking.py` - Verification tracking tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Verify Google Maps email → Business Bouncer fields updated + log inserted
2. Verify Facebook email → Enrichment Bouncer fields updated + log inserted
3. Verify LinkedIn email → Enrichment Bouncer fields updated + log inserted
4. Verify email for non-existent business → RAISE EXCEPTION
5. Verify email for non-existent enrichment → RAISE EXCEPTION
6. Verification update fails → Log not inserted (ROLLBACK)

**Integration Tests** (Application-level):
1. Python campaign manager verifies email → Verify atomicity
2. Bouncer API returns verification → Verify all fields saved
3. Verify same email twice → Verification log allows duplicates
4. Concurrent verifications → Verify no conflicts

**Performance Tests**:
1. Verify single email → Measure duration (should be <15ms)
2. Verify 100 emails sequentially → Measure total duration
3. Concurrent verifications → Verify no deadlocks

**Rollback Tests**:
1. Verification log INSERT fails → Enrichment not updated (ROLLBACK)
2. Enrichment UPDATE fails → Log not inserted (ROLLBACK)
3. Invalid verification data → Full rollback

---

## Group 5: Campaign Statistics Function

### Function Specifications

**Function Name**: `update_campaign_statistics_tx`

**Purpose**: Atomically calculate and update campaign counters

**Parameters**:
```sql
p_campaign_id UUID
```

**Returns**: `JSONB { success, campaign_id, statistics }`

**Transaction Scope**:
1. SELECT COUNT(*) from gmaps_businesses WHERE campaign_id = ?
2. SELECT COUNT(*) from gmaps_facebook_enrichments WHERE campaign_id = ?
3. SELECT COUNT(*) from gmaps_linkedin_enrichments WHERE campaign_id = ?
4. Calculate verified email count
5. UPDATE gmaps_campaigns with all calculated statistics
6. COMMIT (READ COMMITTED isolation ensures consistent snapshot)

**Tables Read**:
- `gmaps_businesses`
- `gmaps_facebook_enrichments`
- `gmaps_linkedin_enrichments`
- `gmaps_campaign_coverage` (optional)

**Tables Modified**:
- `gmaps_campaigns` (1 UPDATE)

**Dependencies**:
- None (independent group)
- READ COMMITTED isolation level (not SERIALIZABLE)

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 677-759):
- Multiple SELECT COUNT aggregates
- All reads happen at same snapshot within transaction
- UPDATE campaign with consistent counts
- Acceptable for statistics that tolerate eventual consistency

**Complexity**: Medium (multiple aggregates, performance sensitive)

**Estimated Time**: 2-3 hours
- SQL function: 1 hour
- Testing: 1 hour
- Performance optimization: 1 hour

**Risk Factors**:
- COUNT aggregates may be slow for campaigns with 100k+ businesses
- Concurrent enrichments may cause slight drift (acceptable)
- Consider caching or approximate counts for large datasets

### Code Update Locations

**Python (gmaps_supabase_manager.py)**:
- May have `update_campaign_statistics()` method (not in catalog)
- Add new RPC-based method

**Campaign Manager (gmaps_campaign_manager.py)**:
- Called after each phase completion
- Replace direct UPDATE with RPC call

**Test Files**:
- `tests/test_campaign_manager.py` - Campaign statistics tests
- `tests/integration/test_gmaps_integration.py` - Statistics validation

### Test Strategy

**Unit Tests** (SQL-level):
1. Update statistics for empty campaign → All counts = 0
2. Update statistics for campaign with 100 businesses → Verify counts
3. Update statistics for campaign with enrichments → Verify Facebook/LinkedIn counts
4. Update statistics for non-existent campaign → RAISE EXCEPTION
5. Concurrent enrichments during statistics update → Verify eventual consistency

**Integration Tests** (Application-level):
1. Campaign completes Phase 1 → Statistics updated correctly
2. Campaign completes Phase 2 → Facebook counts updated
3. Campaign completes Phase 2.5 → LinkedIn counts updated
4. Export campaign data → Verify statistics match actual counts

**Performance Tests**:
1. Update statistics for campaign with 1k businesses → Measure duration (should be <50ms)
2. Update statistics for campaign with 10k businesses → Measure duration (should be <200ms)
3. Update statistics for campaign with 100k businesses → Measure duration (may need caching)
4. Concurrent statistics updates → Verify no deadlocks

**Rollback Tests**:
- Not critical (informational data, can be recalculated)

---

## Group 6: Batch Operations Function

### Function Specifications

**Function Name**: `batch_upsert_businesses_atomic`

**Purpose**: Atomically upsert multiple businesses with deduplication

**Parameters**:
```sql
businesses JSONB[] -- Array of business records
```

**Returns**: `TABLE (business_id uuid, place_id text, created boolean)`

**Transaction Scope**:
1. LOOP through businesses array
2. For each business:
   - INSERT ... ON CONFLICT (place_id) DO UPDATE
   - Track whether created or updated
3. Return all business_ids with created flag
4. Optionally update campaign statistics
5. COMMIT or ROLLBACK all

**Tables Modified**:
- `gmaps_businesses` (N UPSERTs)
- `gmaps_campaigns` (1 UPDATE for statistics - optional)

**Dependencies**:
- None (independent group)
- Complex due to deduplication logic

### Implementation Details

**Complexity**: High (batch operations, deduplication, statistics)

**Estimated Time**: 4-5 hours
- SQL function: 2.5 hours (complex logic)
- Testing: 1.5 hours (deduplication edge cases)
- Performance optimization: 1 hour

**Risk Factors**:
- Large batches (1000+ businesses) may timeout
- place_id deduplication across multiple campaigns
- Counter drift on concurrent batch operations

### Code Update Locations

**JavaScript (supabase-db.js)**:
1. **Location 2**: `businesses.saveBusinesses()` - Lines 144-189
   - Current: Direct UPSERT with onConflict
   - New: RPC call to `batch_upsert_businesses_atomic`
   - Impact: Replace ~45 lines with ~15 lines RPC wrapper

**Python (gmaps_supabase_manager.py)**:
- May have `save_businesses()` method
- Replace with RPC call

**Campaign Manager (gmaps_campaign_manager.py)**:
2. **Location 9**: `execute_campaign()` - Line 290
3. **Location 10**: `_execute_phase_1_google_maps()` - Line 802
   - No direct changes (calls supabase_manager method)
   - Post-save count verification may no longer be needed

**API Endpoint (simple-server.js)**:
4. **Location 18**: Campaign execution endpoint - Line 3629
   - No direct changes (calls supabase-db.js)
   - Verify saved business ID mapping

**Test Files**:
5. `tests/integration/test_gmaps_integration.py` - Business saving tests
6. `tests/integration/test_complete_flow.py` - Full flow tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Batch upsert 10 new businesses → All created = TRUE
2. Batch upsert 10 existing businesses → All created = FALSE
3. Batch upsert mix of new/existing → Verify created flags
4. Batch upsert with duplicate place_ids → Verify deduplication
5. Batch upsert fails mid-batch → Verify full rollback

**Integration Tests** (Application-level):
1. Campaign Phase 1 saves businesses → Verify all saved atomically
2. Campaign scrapes same ZIP twice → Verify deduplication
3. Concurrent campaign executions → Verify no counter drift
4. Large campaign (1000+ businesses) → Verify performance

**Performance Tests**:
1. Batch upsert 10 businesses → Measure duration (should be <20ms)
2. Batch upsert 100 businesses → Measure duration (should be <100ms)
3. Batch upsert 1000 businesses → Measure duration (should be <500ms)
4. Concurrent batch upserts → Verify no deadlocks

**Rollback Tests**:
1. Business insert fails mid-batch → Verify none saved (ROLLBACK)
2. Statistics update fails → Verify businesses still saved (separate transaction)

---

## Group 7: Coverage Update Function

### Function Specifications

**Function Name**: `update_coverage_status_tx`

**Purpose**: Atomically update ZIP coverage after scraping

**Parameters**:
```sql
p_campaign_id UUID
p_zip_code VARCHAR(10)
p_results JSONB
```

**Returns**: `JSONB { success, campaign_id, zip_code }`

**Transaction Scope**:
1. UPDATE gmaps_campaign_coverage (scraped, scraped_at, businesses_found, emails_found, actual_cost)
2. Optionally update campaign statistics (separate call recommended)
3. COMMIT or ROLLBACK

**Tables Modified**:
- `gmaps_campaign_coverage` (1 UPDATE)

**Dependencies**:
- None (independent group)
- Simple single-table update

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 927-980):
- Single UPDATE on coverage table
- WHERE campaign_id = ? AND zip_code = ?
- Raise exception if coverage record not found
- Campaign statistics update should be separate transaction

**Complexity**: Low (single table update)

**Estimated Time**: 1-2 hours
- SQL function: 0.5 hours
- Testing: 0.5 hours
- Integration: 0.5 hours

**Risk Factors**:
- Minimal - straightforward operation
- UNIQUE(campaign_id, zip_code) prevents conflicts

### Code Update Locations

**Python (gmaps_supabase_manager.py)**:
- May have coverage update method
- Add RPC-based method

**Campaign Manager (gmaps_campaign_manager.py)**:
- Called after each ZIP scraping completes
- Replace direct UPDATE with RPC call

**Test Files**:
- `tests/integration/test_gmaps_integration.py` - Coverage tracking tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Update coverage for scraped ZIP → scraped = TRUE
2. Update coverage for non-existent ZIP → RAISE EXCEPTION
3. Update coverage with results data → Verify all fields updated
4. Concurrent coverage updates → Verify no conflicts

**Integration Tests** (Application-level):
1. Campaign scrapes ZIP → Coverage updated immediately
2. Campaign completes → Verify all ZIPs marked as scraped
3. Export coverage data → Verify consistent with scraping results

**Performance Tests**:
1. Update single coverage → Measure duration (should be <10ms)
2. Update 100 coverages sequentially → Measure total duration
3. Concurrent coverage updates → Verify no deadlocks

**Rollback Tests**:
- Minimal risk (single table update)

---

## Group 8: Status Transition Function

### Function Specifications

**Function Name**: `update_campaign_status_tx`

**Purpose**: Atomically update campaign status with state machine validation

**Parameters**:
```sql
p_campaign_id UUID
p_new_status VARCHAR(50)
p_metadata JSONB DEFAULT '{}'::JSONB
```

**Returns**: `JSONB { success, old_status, new_status }`

**Transaction Scope**:
1. SELECT current status FOR UPDATE (row lock)
2. Validate transition with `is_valid_status_transition()`
3. UPDATE campaign (status, started_at/completed_at timestamps)
4. COMMIT (lock released) or ROLLBACK

**Tables Modified**:
- `gmaps_campaigns` (1 UPDATE)

**Dependencies**:
- Requires helper function: `is_valid_status_transition()`
- Independent group otherwise

### Implementation Details

**SQL Implementation** (from TRANSACTION_REQUIREMENTS.md lines 1002-1088):
- SELECT FOR UPDATE ensures serial status changes
- Helper function validates state machine rules
- Valid transitions:
  - draft → running
  - running → paused | completed | failed
  - paused → running
- Set `started_at` when first entering 'running'
- Set `completed_at` when entering 'completed' or 'failed'

**Complexity**: Medium (state machine validation, row locking)

**Estimated Time**: 2-3 hours
- SQL function: 1 hour
- Helper function: 0.5 hours
- Testing: 1 hour
- Integration: 0.5 hours

**Risk Factors**:
- Status is critical - must maintain state machine integrity
- Concurrent status updates must be serialized (row lock)

### Code Update Locations

**Python (gmaps_supabase_manager.py)**:
- May have `update_campaign_status()` method
- Add RPC-based method

**Campaign Manager (gmaps_campaign_manager.py)**:
- Called when campaign starts/pauses/completes
- Replace direct UPDATE with RPC call

**Test Files**:
- `tests/test_campaign_manager.py` - Campaign lifecycle tests
- `tests/test_update_campaign.py` - Campaign update tests

### Test Strategy

**Unit Tests** (SQL-level):
1. Transition draft → running → SUCCESS
2. Transition running → paused → SUCCESS
3. Transition paused → running → SUCCESS
4. Transition running → completed → SUCCESS
5. Transition draft → completed → FAIL (invalid transition)
6. Transition completed → running → FAIL (invalid transition)
7. Concurrent status updates → Verify serial execution

**Integration Tests** (Application-level):
1. Campaign execution starts → Status = 'running', started_at set
2. Campaign execution pauses → Status = 'paused'
3. Campaign execution completes → Status = 'completed', completed_at set
4. Campaign execution fails → Status = 'failed', completed_at set
5. Frontend status transitions → Verify state machine enforced

**Performance Tests**:
1. Single status update → Measure duration (should be <10ms)
2. Concurrent status updates → Verify row locking works
3. Rapid status transitions → Verify no deadlocks

**Rollback Tests**:
1. Invalid status transition → Verify campaign unchanged
2. Status update during execution → Verify lock prevents conflicts

---

## Dependency Graph and Parallelization Strategy

### Independent Groups (Can Run in Parallel)

```
Group 1: Campaign Creation
Group 2: Facebook Enrichment
Group 3: LinkedIn Enrichment
Group 4-6: Email Verification (3 variants)
Group 5: Campaign Statistics
Group 6: Batch Operations
Group 7: Coverage Update
Group 8: Status Transition
```

**Key Insight**: All 8 groups are independent at SQL function level. They can be developed in parallel by different agents.

### Dependency Chain for Application Code

```
Phase 1: SQL Functions (All groups in parallel)
    ↓
Phase 2: JavaScript Integration (Groups 1, 2, 6)
    ↓
Phase 3: Python Integration (Groups 2, 3, 4-6, 5, 7, 8)
    ↓
Phase 4: Test Updates (All groups)
    ↓
Phase 5: Integration Testing (All groups)
```

### Optimal Parallel Strategy (4 Agents)

**Agent 1 (Campaign Lifecycle)**:
- Group 1: Campaign Creation
- Group 8: Status Transition
- Group 7: Coverage Update
- Estimated: 6-9 hours

**Agent 2 (Enrichment Operations)**:
- Group 2: Facebook Enrichment
- Group 3: LinkedIn Enrichment
- Estimated: 7-9 hours

**Agent 3 (Email Verification)**:
- Group 4-6: Email Verification (all 3 variants)
- Group 5: Campaign Statistics
- Estimated: 5-7 hours

**Agent 4 (Batch Operations)**:
- Group 6: Batch Operations
- Integration testing setup
- Estimated: 4-5 hours

**Total Time with 4 Agents**: 8-12 hours (vs 24-32 sequential)

---

## Implementation Order (If Sequential)

### Priority 1 (Critical Path - Week 1):
1. **Group 8: Status Transition** (2-3 hrs) - Simple, low risk
2. **Group 1: Campaign Creation** (3-4 hrs) - High priority, used by frontend
3. **Group 2: Facebook Enrichment** (3-4 hrs) - Common operation

### Priority 2 (Core Operations - Week 1):
4. **Group 3: LinkedIn Enrichment** (4-5 hrs) - Complex but independent
5. **Group 6: Batch Operations** (4-5 hrs) - Critical for Phase 1

### Priority 3 (Supporting Operations - Week 2):
6. **Group 4-6: Email Verification** (3-4 hrs) - 3 variants, one function
7. **Group 5: Campaign Statistics** (2-3 hrs) - Informational, less critical
8. **Group 7: Coverage Update** (1-2 hrs) - Simple, low risk

**Total Sequential Time**: 24-32 hours

---

## File Update Checklist

### JavaScript Files (supabase-db.js)

**Lines to Update**:
1. Lines 45-95: `gmapsCampaigns.create()` → RPC wrapper
2. Lines 144-189: `businesses.saveBusinesses()` → RPC wrapper
3. Lines 227-246: `businesses.saveFacebookEnrichment()` → RPC wrapper

**New Lines to Add**: ~40 lines of RPC wrapper code
**Lines to Remove**: ~100 lines of direct SQL
**Net Change**: -60 lines (more concise)

### Python Files (gmaps_supabase_manager.py)

**Lines to Update**:
1. Lines 320-361: `save_facebook_enrichment()` → RPC wrapper
2. Lines 382-455: `save_linkedin_enrichment()` → RPC wrapper
3. Lines 457-519: `update_linkedin_verification()` → RPC wrapper
4. Lines 521-586: `update_facebook_verification()` → RPC wrapper
5. Lines 588-639: `update_google_maps_verification()` → RPC wrapper

**New Lines to Add**: ~80 lines of RPC wrapper code
**Lines to Remove**: ~240 lines of direct SQL
**Net Change**: -160 lines (much more concise)

### Python Files (gmaps_campaign_manager.py)

**Lines to Update**:
1. Line 290: Business saving call
2. Line 323: Google Maps verification call
3. Line 517: Facebook enrichment call
4. Line 542: Facebook verification call
5. Line 625: LinkedIn enrichment call
6. Line 656: LinkedIn verification call
7. Line 666: LinkedIn enrichment (not found) call
8. Line 802: Business saving call (duplicate method)

**New Lines to Add**: 0 (method calls only)
**Lines to Remove**: 0 (method calls remain same)
**Net Change**: 0 (signature-compatible changes)

### JavaScript Files (simple-server.js)

**Lines to Update**:
1. Line 2794: Campaign creation endpoint
2. Line 3629: Campaign execution endpoint (business saving)
3. Line 3638: Campaign execution endpoint (Facebook enrichment)

**New Lines to Add**: 0 (indirect changes via supabase-db.js)
**Lines to Remove**: 0
**Net Change**: 0 (no direct changes needed)

### SQL Files (migrations/)

**New Files to Create**:
1. `migrations/schema/20251013_001_add_transaction_stored_procedures.sql`
   - All 10 stored procedures
   - Helper function: `is_valid_status_transition()`
   - Estimated: ~800 lines of SQL

### Test Files

**Files to Update**:
1. `tests/test_campaign_manager.py` (10-15 lines)
2. `tests/integration/test_gmaps_integration.py` (20-30 lines)
3. `tests/integration/test_complete_flow.py` (10-20 lines)
4. `tests/test_email_source_tracking.py` (15-20 lines)
5. `tests/integration/test_email_enrichment.py` (20-30 lines)
6. `tests/integration/test_linkedin_enrichment_full.py` (20-30 lines)
7. `tests/test_update_campaign.py` (5-10 lines)

**New Files to Create**:
1. `tests/test_stored_procedures.sql` - SQL-level unit tests (~200 lines)
2. `tests/test_transaction_rollback.py` - Rollback scenario tests (~150 lines)

**Total Test Changes**: ~300-400 lines

---

## Estimated Total Changes

| Component | Files | Lines Added | Lines Removed | Net Change |
|-----------|-------|-------------|---------------|------------|
| SQL Migrations | 1 | 800 | 0 | +800 |
| JavaScript DB | 1 | 40 | 100 | -60 |
| Python DB Manager | 1 | 80 | 240 | -160 |
| Python Campaign Mgr | 1 | 0 | 0 | 0 |
| API Endpoints | 1 | 0 | 0 | 0 |
| Test Files | 9 | 400 | 100 | +300 |
| **TOTAL** | **14** | **1320** | **440** | **+880** |

**Code Quality Impact**: More concise application code, better separation of concerns, atomic guarantees

---

## Risk Assessment by Group

### High Risk:
- **Group 1**: Campaign Creation (used by frontend, backward compatibility critical)
- **Group 6**: Batch Operations (complex deduplication, performance sensitive)

### Medium Risk:
- **Group 2**: Facebook Enrichment (email source priority logic)
- **Group 3**: LinkedIn Enrichment (many fields, Bouncer integration)
- **Group 4-6**: Email Verification (3 code paths, audit logging)
- **Group 5**: Campaign Statistics (performance on large datasets)

### Low Risk:
- **Group 7**: Coverage Update (simple single-table update)
- **Group 8**: Status Transition (well-defined state machine)

---

## Testing Budget

### SQL-Level Unit Tests:
- Per function: 5-10 test cases
- Total: 60-80 test cases
- Estimated time: 8-12 hours

### Application-Level Integration Tests:
- Per function: 3-5 test cases
- Total: 30-40 test cases
- Estimated time: 6-10 hours

### Performance Tests:
- Per function: 2-4 test cases
- Total: 20-30 test cases
- Estimated time: 4-6 hours

### Rollback Tests:
- Per function: 2-3 test cases
- Total: 15-20 test cases
- Estimated time: 3-5 hours

**Total Testing Time**: 21-33 hours

---

## Recommended Implementation Approach

### Option 1: Parallel Development (RECOMMENDED)

**Advantages**:
- Fastest completion (8-12 hours vs 24-32 hours)
- Groups are truly independent
- Can leverage 4 agents working simultaneously

**Disadvantages**:
- Requires coordination
- Integration testing happens after all groups complete

**Timeline**:
- Day 1 (8 hours): All SQL functions developed in parallel
- Day 2 (4 hours): Application code integration in parallel
- Day 3 (8 hours): Testing and integration
- **Total**: 3 days (20 hours)

### Option 2: Sequential by Priority

**Advantages**:
- Lower coordination overhead
- Can test each function before moving to next
- Easier to manage for single developer

**Disadvantages**:
- Slower (24-32 hours)
- May lose momentum

**Timeline**:
- Week 1 (16 hours): Priority 1 + Priority 2 functions
- Week 2 (16 hours): Priority 3 functions + testing
- **Total**: 2 weeks (32 hours)

### Option 3: Hybrid Approach

**Advantages**:
- Start with high-risk functions sequentially
- Parallelize low-risk functions
- Balance speed and risk

**Timeline**:
- Day 1-2 (12 hours): Groups 1, 6 (high risk) sequentially
- Day 3 (8 hours): Groups 2, 3, 8 (medium risk) in parallel
- Day 4 (8 hours): Groups 4-6, 5, 7 (lower risk) in parallel
- Day 5 (8 hours): Integration testing
- **Total**: 5 days (36 hours)

---

## Success Criteria

### Data Integrity:
- ✅ Zero orphaned enrichment records
- ✅ Campaign statistics match actual counts (100% accuracy)
- ✅ Cost calculations consistent across concurrent updates
- ✅ Email source priorities enforced (linkedin > facebook > google_maps)

### Performance:
- ✅ 99% of transactions complete in <100ms
- ✅ <1% rollback rate
- ✅ No deadlocks under concurrent load
- ✅ API response times unchanged or improved

### Reliability:
- ✅ Safe retry logic for transient failures
- ✅ Graceful error handling with clear error messages
- ✅ No data loss during network interruptions
- ✅ Consistent behavior under high concurrency

### Code Quality:
- ✅ Application code reduced by ~200 lines
- ✅ Better separation of concerns (SQL vs application logic)
- ✅ Easier to maintain (atomic operations in single location)
- ✅ Test coverage for all transaction boundaries

---

## Next Steps

### Immediate (This Week):
1. ✅ Review this implementation breakdown
2. ⏭️ Choose implementation approach (parallel vs sequential)
3. ⏭️ Assign groups to agents (if parallel)
4. ⏭️ Create SQL migration file skeleton
5. ⏭️ Set up feature flags for gradual rollout

### Short Term (Next Week):
1. ⏭️ Implement all 10 stored procedures
2. ⏭️ Update application code (JS + Python)
3. ⏭️ Write comprehensive test suite
4. ⏭️ Deploy to staging environment
5. ⏭️ Performance testing and optimization

### Medium Term (Week 3):
1. ⏭️ Deploy to production (gradual rollout)
2. ⏭️ Monitor transaction metrics
3. ⏭️ Optimize based on performance data
4. ⏭️ Document lessons learned
5. ⏭️ Remove old code and feature flags

---

**Status**: Ready for Implementation
**Last Updated**: 2025-10-13
**Recommended Approach**: Parallel Development with 4 Agents (Option 1)
**Estimated Completion**: 3-5 days (20-36 hours depending on approach)
