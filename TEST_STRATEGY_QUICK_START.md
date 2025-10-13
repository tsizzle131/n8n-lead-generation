# Test Strategy Quick Start Guide

**Created**: 2025-10-13
**Purpose**: Quick reference for testing PostgreSQL stored functions before production deployment

---

## Overview

This guide provides a streamlined path to validating 8 critical PostgreSQL stored functions that implement atomic transaction boundaries for the Google Maps Lead Generation system.

**Total Test Time**: 4 hours
**Success Criteria**: 100% passing tests
**Prerequisite**: Functions deployed to database

---

## The 8 Functions Under Test

1. `save_facebook_enrichment_tx()` - Facebook enrichment + business update
2. `save_linkedin_enrichment_tx()` - LinkedIn enrichment + business update + verification
3. `create_campaign_with_coverage_tx()` - Campaign + coverage records atomically
4. `update_email_verification_tx()` - Email verification for all sources
5. `update_campaign_statistics_tx()` - Calculate campaign aggregates
6. `track_api_cost_tx()` - Cost tracking with locking
7. `update_coverage_status_tx()` - Update after ZIP scraping
8. `update_campaign_status_tx()` - Status transitions with validation

---

## Quick Test Checklist

### Phase 1: Unit Tests (1.5 hours)
```bash
# Run SQL-level tests in Supabase SQL Editor
cd tests/stored_functions/unit
# Execute each .sql file manually or via psql
```

**Critical Test Cases**:
- ✅ Success path for each function
- ✅ Rollback on errors (no orphaned records)
- ✅ FK constraint violations handled
- ✅ Invalid transitions rejected (status function)
- ✅ Concurrent cost updates (locking test)

### Phase 2: Integration Tests (1 hour)
```bash
# JavaScript tests
npm test tests/stored_functions/integration/test_rpc_functions.js

# Python tests
python -m pytest tests/stored_functions/integration/test_rpc_python.py -v
python -m pytest tests/stored_functions/integration/test_campaign_manager_rpc.py -v
```

**Critical Test Cases**:
- ✅ RPC calls work from JavaScript
- ✅ RPC calls work from Python
- ✅ Full campaign workflow completes
- ✅ Error handling returns {success: false}
- ✅ Business records updated atomically

### Phase 3: Concurrency Tests (30 minutes)
```bash
# Race condition tests
node tests/stored_functions/concurrency/test_cost_tracking_race.js
python tests/stored_functions/concurrency/test_email_source_race.py
node tests/stored_functions/concurrency/test_statistics_race.js
```

**Critical Test Cases**:
- ✅ Cost tracking has no race conditions
- ✅ Email source priority maintained
- ✅ SELECT FOR UPDATE locks work

### Phase 4: Performance Tests (45 minutes)
```bash
# Performance benchmarks
node tests/stored_functions/performance/test_rpc_vs_direct.js
psql $DATABASE_URL -f tests/stored_functions/performance/test_jsonb_parsing.sql
node tests/stored_functions/performance/test_batch_scalability.js
```

**Acceptance Criteria**:
- ✅ RPC overhead < 30% vs direct queries
- ✅ JSONB parsing < 10ms per operation
- ✅ Batch operations scale linearly
- ✅ No queries > 500ms for typical operations

### Phase 5: Regression Tests (45 minutes)
```bash
# Verify no existing functionality broken
bash tests/stored_functions/regression/run_baseline_tests.sh
bash tests/stored_functions/regression/run_post_migration_tests.sh
node tests/stored_functions/regression/test_behavior_preservation.js
psql $DATABASE_URL -f tests/stored_functions/regression/data_integrity_checks.sql
```

**Acceptance Criteria**:
- ✅ Pass rate ≥ 94.12% (baseline from existing tests)
- ✅ Email source priority still correct
- ✅ Chain business deduplication works
- ✅ Campaign statistics match actual counts
- ✅ No orphaned enrichments
- ✅ Cost calculations accurate

---

## Run All Tests

```bash
# Single command to run complete test suite
bash tests/stored_functions/run_all_stored_function_tests.sh
```

**Expected Output**:
```
=========================================
Stored Functions Test Suite
=========================================

Phase 1: Running Unit Tests (SQL)...
  ✅ test_save_facebook_enrichment.sql
  ✅ test_save_linkedin_enrichment.sql
  ✅ test_create_campaign_with_coverage.sql
  ✅ test_update_email_verification.sql
  ✅ test_update_campaign_statistics.sql
  ✅ test_track_api_cost.sql
  ✅ test_update_coverage_status.sql
  ✅ test_update_campaign_status.sql
✅ Phase 1 Complete

Phase 2: Running Integration Tests (JavaScript)...
  ✅ 15 tests passed
✅ Phase 2 Complete

Phase 3: Running Integration Tests (Python)...
  ✅ 12 tests passed
✅ Phase 3 Complete

Phase 4: Running Concurrency Tests...
  ✅ Cost tracking race condition test passed
  ✅ Email source priority race test passed
  ✅ Statistics update concurrency test passed
✅ Phase 4 Complete

Phase 5: Running Performance Tests...
  ✅ RPC overhead: 18% (acceptable)
  ✅ JSONB parsing: 7ms avg (acceptable)
  ✅ Batch scalability: Linear (acceptable)
✅ Phase 5 Complete

Phase 6: Running Regression Tests...
  ✅ Pass rate: 95.2% (meets threshold)
  ✅ All behavior preservation tests passed
  ✅ No data integrity issues found
✅ Phase 6 Complete

=========================================
All Tests Complete!
Total: 60+ tests passed
Duration: 3 hours 52 minutes
Status: READY FOR PRODUCTION ✅
=========================================
```

---

## Critical Test Scenarios

### Scenario 1: Facebook Enrichment Atomicity
```sql
-- What gets tested
BEGIN;
  INSERT INTO gmaps_facebook_enrichments (...);
  UPDATE gmaps_businesses SET email = ..., email_source = 'facebook';
COMMIT;

-- If UPDATE fails → INSERT must rollback (no orphaned enrichment)
```

**Why Critical**: Prevents data inconsistency between enrichments and businesses

---

### Scenario 2: Cost Tracking Race Condition
```javascript
// 10 workers simultaneously update campaign costs
// Without locking → race condition (lost updates)
// With SELECT FOR UPDATE → serialized updates (correct total)

// Test verifies: actual_cost = sum of all service costs
```

**Why Critical**: Prevents incorrect cost calculations under concurrent operations

---

### Scenario 3: Email Source Priority
```python
# Concurrent enrichments: Facebook AND LinkedIn
# Expected: LinkedIn email wins (highest priority)

# Test verifies: business.email_source = 'linkedin' after both complete
```

**Why Critical**: Ensures email quality hierarchy is maintained

---

## Monitoring After Deployment

### Daily Health Checks (First Week)
```sql
-- 1. Check function performance
SELECT proname, calls, total_time / calls as avg_time_ms
FROM pg_stat_user_functions
WHERE proname LIKE '%_tx'
ORDER BY calls DESC;

-- 2. Check for lock contention
SELECT COUNT(*) as waiting_locks
FROM pg_locks
WHERE NOT granted;
-- Expected: 0 or very low

-- 3. Check for orphaned enrichments
SELECT COUNT(*) FROM gmaps_facebook_enrichments fe
LEFT JOIN gmaps_businesses b ON b.id = fe.business_id
WHERE b.id IS NULL;
-- Expected: 0

-- 4. Check campaign statistics accuracy
SELECT COUNT(*) as campaigns_with_drift
FROM gmaps_campaigns c
LEFT JOIN (
  SELECT campaign_id, COUNT(*) as actual_count
  FROM gmaps_businesses
  GROUP BY campaign_id
) b ON b.campaign_id = c.id
WHERE ABS(c.total_businesses_found - COALESCE(b.actual_count, 0)) > 0;
-- Expected: 0
```

---

## Rollback Plan

### Emergency Rollback (If Tests Fail)
```sql
-- Disable all stored functions immediately
ALTER FUNCTION save_facebook_enrichment_tx RENAME TO save_facebook_enrichment_tx_disabled;
ALTER FUNCTION save_linkedin_enrichment_tx RENAME TO save_linkedin_enrichment_tx_disabled;
-- Repeat for all 8 functions
```

### Gradual Rollback (Feature Flag)
```bash
# Set environment variable to disable RPC usage
export USE_RPC_FUNCTIONS=false

# Application code checks this flag and falls back to old behavior
# No database changes needed
```

---

## Success Metrics

### Before Deployment
- ✅ All 60+ tests passing (100%)
- ✅ No performance regressions (< 30% overhead)
- ✅ No data integrity issues
- ✅ Concurrent operations safe

### After Deployment (Week 1)
- ✅ No orphaned enrichments
- ✅ Campaign statistics accurate
- ✅ Cost calculations correct
- ✅ No lock timeouts
- ✅ Function execution time < 100ms (p95)
- ✅ Error rate < 0.1%

---

## Documentation References

### Detailed Documentation
- **STORED_FUNCTIONS_TEST_STRATEGY.md** - Complete test specification (60+ test cases)
- **TRANSACTION_REQUIREMENTS.md** - Detailed transaction specifications
- **TRANSACTION_README.md** - Implementation guide
- **DATABASE_SCHEMA_MAPPING.md** - Complete schema reference
- **RPC_MIGRATION_CATALOG.md** - Code locations requiring updates

### Quick References
- **RPC_MIGRATION_QUICK_REF.md** - Function signatures and migration phases
- **DATABASE_RELATIONSHIPS_DIAGRAM.md** - Visual ER diagrams

---

## Common Issues & Solutions

### Issue 1: Test Fails - "Business with id X not found"
**Cause**: FK constraint violation - business doesn't exist
**Solution**: Verify test setup creates business before enrichment

### Issue 2: Performance Test Shows > 30% Overhead
**Cause**: JSONB parsing or network latency
**Solution**:
- Check EXPLAIN ANALYZE for slow queries
- Verify indexes exist on FK columns
- Consider connection pooling

### Issue 3: Concurrent Cost Tracking Test Fails
**Cause**: Race condition (SELECT FOR UPDATE not working)
**Solution**:
- Verify function uses `SELECT ... FOR UPDATE`
- Check for deadlocks in PostgreSQL logs
- Increase lock_timeout if needed

### Issue 4: Regression Tests Show < 94.12% Pass Rate
**Cause**: RPC migration broke existing functionality
**Solution**:
- Compare failing tests before/after
- Check JSONB parameter formatting
- Verify error handling returns correct format

---

## Next Steps

1. **Create Test Files** (Day 1)
   - Copy test cases from STORED_FUNCTIONS_TEST_STRATEGY.md
   - Create 60+ test files in `tests/stored_functions/`
   - Set up test fixtures and utilities

2. **Run Unit Tests** (Day 1)
   - Execute SQL tests in Supabase SQL Editor
   - Verify all functions work in isolation
   - Fix any issues found

3. **Run Integration Tests** (Day 2)
   - Test JavaScript RPC calls
   - Test Python RPC calls
   - Test full campaign workflow
   - Verify error handling

4. **Run Concurrency & Performance Tests** (Day 2)
   - Validate no race conditions
   - Benchmark performance
   - Identify slow queries

5. **Run Regression Tests** (Day 3)
   - Compare before/after pass rates
   - Verify behavior preservation
   - Check data integrity

6. **Deploy to Staging** (Day 3)
   - Deploy functions to staging database
   - Run complete test suite
   - Monitor for 24 hours

7. **Deploy to Production** (Week 2)
   - Deploy during low-traffic window
   - Enable monitoring alerts
   - Run health checks daily for 1 week

---

## Contact

For questions or issues:
1. **Test Strategy**: See `docs/STORED_FUNCTIONS_TEST_STRATEGY.md`
2. **Transaction Specs**: See `docs/TRANSACTION_REQUIREMENTS.md`
3. **Implementation Guide**: See `docs/TRANSACTION_README.md`
4. **Schema Reference**: See `docs/DATABASE_SCHEMA_MAPPING.md`

---

## Validation Checklist

Before marking this as complete, verify:

- [ ] All 8 stored functions deployed to database
- [ ] Test files created (60+ test cases)
- [ ] Unit tests passing (100%)
- [ ] Integration tests passing (100%)
- [ ] Concurrency tests passing (no race conditions)
- [ ] Performance tests passing (< 30% overhead)
- [ ] Regression tests passing (≥ 94.12% pass rate)
- [ ] Data integrity checks passing (no orphans, no drift)
- [ ] Monitoring dashboard set up
- [ ] Rollback plan documented and tested
- [ ] Team trained on new RPC functions
- [ ] Production deployment scheduled

---

**Document Version**: 1.0
**Last Updated**: 2025-10-13
**Status**: Ready for Implementation
**Estimated Total Time**: 3 days (test creation) + 4 hours (test execution)
