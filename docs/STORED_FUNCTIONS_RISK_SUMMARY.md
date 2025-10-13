# Stored Functions Risk Analysis - Executive Summary

**Date:** 2025-10-13
**Analysis:** COMPLETE ✅
**Full Report:** `STORED_FUNCTIONS_RISK_ANALYSIS.md`

---

## Overall Assessment

**Risk Level:** 🟡 MEDIUM-HIGH
**Recommendation:** ✅ PROCEED with implementation, subject to critical mitigations

The migration from direct table operations to PostgreSQL stored procedures is **technically sound** and addresses critical data integrity issues. However, several high-impact risks require mitigation before deployment.

---

## Critical Risks (MUST FIX before deployment)

### 1. Cost Tracking Lock Contention 🔴 HIGH
**Impact:** 10x throughput reduction for concurrent cost updates
**Root Cause:** `SELECT FOR UPDATE` serializes all cost tracking
**Mitigation:** Batch cost tracking calls (100 calls → 1 call = 100x improvement)
**Status:** ⚠️ NOT YET IMPLEMENTED

### 2. Empty Coverage Arrays 🟠 MEDIUM-HIGH
**Impact:** Campaign creation fails for campaigns with 0 ZIP codes
**Root Cause:** `array_length([], 1)` returns NULL, breaks validation
**Mitigation:** Add NULL check in stored function
**Status:** ⚠️ NOT YET IMPLEMENTED

### 3. Duplicate Business Email Overwrites 🟠 MEDIUM-HIGH
**Impact:** Enrichment emails lost when business re-scraped
**Root Cause:** UPSERT blindly overwrites email with NULL
**Mitigation:** Implement smart upsert (preserve higher-value data)
**Status:** ⚠️ NOT YET IMPLEMENTED (affects current system too!)

---

## Breaking Changes Summary

| Change | Impact | Affected Code | Mitigation Effort |
|--------|--------|---------------|-------------------|
| Return format (full record → JSONB) | HIGH | Node.js + Python backends | 2-3 days |
| Error handling (exceptions → JSONB) | MEDIUM | All RPC callers | 1-2 days |
| Partial failures impossible | MEDIUM | Error handling logic | 1 day |
| Row locking impact | HIGH | Cost tracking performance | 3-5 days |

**Total Migration Effort:** 7-11 days for code updates + testing

---

## Edge Cases Identified (12 total)

**Critical (Must Test):**
1. Empty input arrays (campaign with 0 ZIPs)
2. Duplicate business place_id handling
3. NULL email values in enrichment
4. Concurrent cost updates (race conditions)
5. Email source priority violations
6. Very large batch operations (1000+ ZIPs)

**Medium Priority:**
7. Empty strings vs NULL emails
8. Lock timeouts under high load
9. Transaction duration for large campaigns
10. JSONB parsing overhead
11. Connection pool exhaustion
12. Orphaned enrichment records

---

## Data Migration Risks

**Good News:** 🟢 LOW RISK - Migration is additive only

- ✅ No ALTER TABLE statements
- ✅ No data type changes
- ✅ No backfill required
- ✅ Can coexist with old code during rollout

**Pre-Deployment Cleanup Required:**
```sql
-- 1. Remove orphaned enrichments
DELETE FROM gmaps_facebook_enrichments WHERE business_id NOT IN (SELECT id FROM gmaps_businesses);
DELETE FROM gmaps_linkedin_enrichments WHERE business_id NOT IN (SELECT id FROM gmaps_businesses);

-- 2. Normalize email sources
UPDATE gmaps_businesses SET email_source = 'not_found'
WHERE email_source NOT IN ('google_maps', 'facebook', 'linkedin');

-- 3. Fix NULL arrays
UPDATE gmaps_linkedin_enrichments SET emails_generated = ARRAY[]::TEXT[]
WHERE emails_generated IS NULL;
```

**Estimated Cleanup Time:** 30 minutes

---

## Performance Impact

### Expected Changes

| Operation | Current | With Stored Functions | Change |
|-----------|---------|----------------------|--------|
| Facebook Enrichment | 10-15ms | 20-30ms | +100% latency |
| LinkedIn Enrichment | 10-15ms | 20-30ms | +100% latency |
| Campaign Creation (100 ZIPs) | 80-150ms | 150-300ms | +100% latency |
| Cost Tracking (parallel) | 20 req/s | 2 req/s | **-90% throughput** ⚠️ |
| Email Verification | 5-10ms | 15-25ms | +150% latency |

### Critical Performance Fixes

**Must Implement:**
1. **Batch cost tracking:** Reduces calls by 100x → restores throughput
2. **Bulk INSERT for coverage:** Use `unnest()` instead of loop → 10x faster
3. **Connection pool increase:** 20 → 50 connections to handle longer transactions

**Estimated Performance After Fixes:**
- Cost tracking throughput: 2 req/s → 20 req/s (back to baseline)
- Campaign creation (1000 ZIPs): 5s → 500ms

---

## Rollback Strategy

**Rollback Risk:** 🟢 LOW - Can revert safely

### Feature Flag Approach
```javascript
const USE_STORED_FUNCTIONS = process.env.USE_STORED_FUNCTIONS === 'true';

if (USE_STORED_FUNCTIONS) {
    return await saveFacebookEnrichmentTx(...);  // Stored function
} else {
    return await saveFacebookEnrichmentDirect(...);  // Direct query
}
```

### Rollback Triggers
- Error rate >5% sustained for 10 minutes → AUTO ROLLBACK
- Lock wait times >1000ms sustained → AUTO ROLLBACK
- Data consistency issues detected → IMMEDIATE ROLLBACK

### Emergency Rollback Time
- **Immediate:** 5 minutes (set env var + restart services)
- **Full:** 30 minutes (drop functions, verify consistency)

---

## Deployment Plan

### Recommended Rollout (5 weeks)

**Week 1: Preparation**
- Deploy functions (not used yet)
- Data cleanup
- Unit testing

**Week 2: Low-Risk Functions**
- Email verification (3 functions)
- Monitor: Error rate, latency

**Week 3: Enrichment Functions**
- Facebook enrichment
- LinkedIn enrichment
- Monitor: Data consistency

**Week 4: High-Risk Functions**
- Cost tracking (with batching!)
- Monitor: Lock contention

**Week 5: Complex Functions**
- Campaign creation
- Statistics update
- Full rollout at 100%

### Canary Rollout
- Week 1: 10% traffic
- Week 2: 25% traffic
- Week 3: 50% traffic
- Week 4: 75% traffic
- Week 5: 100% traffic

---

## Success Metrics

**Pre-Deployment:**
- ✅ All unit tests passing (10 functions × 5 tests = 50 tests)
- ✅ Zero orphaned records
- ✅ All indexes verified
- ✅ Performance benchmarks documented

**Post-Deployment:**
- ✅ Error rate <1% (target: <0.1%)
- ✅ Transaction duration P95 <50ms
- ✅ Lock wait time P95 <100ms
- ✅ Zero orphaned enrichments
- ✅ Cost calculations 100% accurate

---

## Go/No-Go Decision

### ✅ PROCEED IF:
- All critical mitigations implemented
- Data cleanup completed
- Unit tests passing at >99%
- Rollback tested in staging

### ❌ DO NOT PROCEED IF:
- Cost batching not implemented (throughput loss unacceptable)
- Empty array handling not fixed (will cause failures)
- Orphaned records not cleaned (will cause FK violations)
- Rollback not tested (no safety net)

---

## Recommended Next Steps

### Immediate (This Week)
1. ✅ Implement empty array handling in stored functions
2. ✅ Implement batch cost tracking
3. ✅ Implement smart business upsert
4. ✅ Write comprehensive unit tests

### Short-Term (Next Week)
1. ✅ Data cleanup script
2. ✅ Deploy functions to staging
3. ✅ Performance benchmarking
4. ✅ Rollback testing

### Before Production (Week 3)
1. ✅ Code review for all backend changes
2. ✅ Load testing (simulate production traffic)
3. ✅ Monitoring dashboard setup
4. ✅ Incident response plan

---

## Key Takeaways

**Strengths:**
- ✅ Solves critical data integrity issues (orphaned enrichments, race conditions)
- ✅ Easy to rollback (feature flag approach)
- ✅ No schema changes required
- ✅ Can deploy gradually with low risk

**Challenges:**
- ⚠️ Performance impact requires optimization (cost batching, bulk INSERT)
- ⚠️ Breaking changes require code updates in 2 backends
- ⚠️ Edge cases need careful handling (empty arrays, NULL emails)
- ⚠️ Lock contention needs monitoring

**Bottom Line:**
Migration is **feasible and beneficial**, but requires **careful implementation** of critical mitigations before deployment.

---

**Recommendation:** ✅ **APPROVE** implementation with following conditions:

1. Implement batch cost tracking BEFORE deploying cost tracking function
2. Fix empty array handling BEFORE deploying campaign creation
3. Implement smart upsert for business saves (independent of stored functions)
4. Complete data cleanup BEFORE first deployment
5. Follow 5-week gradual rollout plan

**Estimated Timeline:**
- Implementation: 2-3 weeks
- Testing: 1-2 weeks
- Rollout: 5 weeks (gradual)
- **Total: 8-10 weeks** from start to 100% rollout

---

**Document Status:** COMPLETE ✅
**Analysis Confidence:** HIGH (based on comprehensive code review, architecture docs, and PGRST204 incident history)
**Next Review:** After Week 2 (low-risk functions deployed)
