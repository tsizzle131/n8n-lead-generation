# Stored Functions Architecture - Executive Summary

## Overview

This document provides a high-level overview of the PostgreSQL stored functions architecture designed to replace application-level database operations with atomic, transaction-safe database operations.

## The 8 Core Functions

### 1. `create_campaign_with_coverage(p_campaign_data JSONB, p_zip_codes JSONB)`
**Purpose:** Atomically create a campaign and insert all associated ZIP codes
**Returns:** Campaign ID, ZIP count, success status
**Transaction:** READ COMMITTED (no locking needed)

### 2. `insert_businesses_batch(p_campaign_id UUID, p_zip_code VARCHAR, p_businesses JSONB)`
**Purpose:** Batch insert businesses with automatic deduplication via place_id
**Returns:** Insert/update/skip counts
**Transaction:** READ COMMITTED with ON CONFLICT clause

### 3. `update_campaign_statistics(p_campaign_id UUID)`
**Purpose:** Recalculate and update campaign totals (businesses, emails, Facebook pages)
**Returns:** Updated statistics
**Transaction:** READ COMMITTED + SELECT FOR UPDATE (prevents concurrent statistics updates)

### 4. `track_campaign_cost(p_campaign_id UUID, p_service VARCHAR, p_items_processed INT, p_cost_usd NUMERIC, p_metadata JSONB)`
**Purpose:** Record API cost and atomically update campaign total cost
**Returns:** Cost ID, new total cost
**Transaction:** SERIALIZABLE + SELECT FOR UPDATE (CRITICAL - prevents lost cost updates)
**⚠️ WARNING:** This is the MOST CRITICAL function. Must use SERIALIZABLE isolation to prevent race conditions.

### 5. `update_coverage_status(p_campaign_id UUID, p_zip_code VARCHAR, p_businesses_found INT, p_emails_found INT, p_actual_cost NUMERIC)`
**Purpose:** Mark ZIP code as scraped with results
**Returns:** Success status
**Transaction:** READ COMMITTED (single row update)

### 6. `update_enrichment_batch(p_enrichment_type VARCHAR, p_enrichments JSONB)`
**Purpose:** Batch update enrichment data (Facebook or LinkedIn)
**Returns:** Update/fail counts
**Transaction:** READ COMMITTED (independent batch updates)

### 7. `update_email_verification(p_business_id UUID, p_email VARCHAR, p_verification_data JSONB)`
**Purpose:** Update email verification status (Bouncer API results)
**Returns:** Verification status
**Transaction:** READ COMMITTED (single email verification)

### 8. `get_businesses_for_enrichment(p_campaign_id UUID, p_enrichment_type VARCHAR, p_limit INT, p_offset INT)`
**Purpose:** Fetch businesses needing enrichment with pagination
**Returns:** TABLE of business records
**Transaction:** READ COMMITTED (read-only query)

## Critical Design Decisions

### 1. SERIALIZABLE Isolation for Cost Tracking
**Why:** Multiple processes (Google Maps scraper, Facebook enricher, LinkedIn enricher, Bouncer verifier) update campaign costs concurrently. Without SERIALIZABLE isolation, cost updates can be lost.

**Race Condition Example:**
```
Process A: Read total_cost = $10.00
Process B: Read total_cost = $10.00
Process A: Update total_cost = $15.00 (adds $5.00)
Process B: Update total_cost = $13.00 (adds $3.00)
Result: Lost Process A's $5.00 update!
```

**Solution:** SERIALIZABLE isolation + SELECT FOR UPDATE ensures sequential cost updates.

### 2. Row-Level Locking for Statistics
**Why:** Campaign statistics are updated frequently during campaign execution. Row-level locking (SELECT FOR UPDATE) prevents concurrent updates to the same campaign while allowing updates to different campaigns.

### 3. JSONB Return Values
**Why:** Uniform response format across all functions, including error details, retry recommendations, and extensible fields.

**Standard Response:**
```json
{
  "success": true/false,
  "error": "Error message (if failed)",
  "error_code": "PostgreSQL SQLSTATE",
  "retry_recommended": true/false,
  ...additional fields
}
```

### 4. Retry Logic in Application Code
**Why:** Database operations can fail due to deadlocks, serialization failures, or lock timeouts. Application code should automatically retry these operations.

**Retry Strategy:**
- Max 3-5 retries (configurable per function)
- Exponential backoff (1s, 2s, 4s)
- Only retry when `retry_recommended: true`

## Integration with Existing Code

### JavaScript (supabase-db.js)

```javascript
// Generic wrapper with retry logic
async function callStoredFunction(functionName, params, options = {}) {
    const maxRetries = options.retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { data, error } = await supabase.rpc(functionName, params);

        if (!data.success && data.retry_recommended && attempt < maxRetries) {
            await sleep(1000 * attempt); // Exponential backoff
            continue;
        }

        return data;
    }
}

// Example usage
const result = await callStoredFunction('create_campaign_with_coverage', {
    p_campaign_data: campaignData,
    p_zip_codes: zipCodes
});
```

### Python (gmaps_supabase_manager.py)

```python
class GmapsSupabaseManager:
    def _call_stored_function(self, function_name, params, max_retries=3):
        """Generic wrapper with retry logic"""
        for attempt in range(1, max_retries + 1):
            result = self.client.rpc(function_name, params).execute()
            response = result.data

            if not response.get('success') and response.get('retry_recommended'):
                if attempt < max_retries:
                    time.sleep(attempt)  # Exponential backoff
                    continue

            return response

    def create_campaign(self, campaign_data, zip_codes):
        """Create campaign with ZIP codes"""
        return self._call_stored_function('create_campaign_with_coverage', {
            'p_campaign_data': campaign_data,
            'p_zip_codes': zip_codes
        })
```

## Error Handling

All functions use consistent error handling:

| SQLSTATE | Error Type | Retry? | User Message |
|----------|-----------|--------|--------------|
| 23505 | unique_violation | No | "Duplicate record detected" |
| 23503 | foreign_key_violation | No | "Referenced record not found" |
| 40P01 | deadlock_detected | Yes (3x) | "Operation conflict, please retry" |
| 40001 | serialization_failure | Yes (3x) | "Concurrent modification, please retry" |
| 55P03 | lock_not_available | Yes (3x) | "Resource busy, please retry" |

## Performance Considerations

### Function Execution Times (Expected)
- `create_campaign_with_coverage`: <500ms (for 100 ZIP codes)
- `insert_businesses_batch`: <1s (for 50 businesses)
- `update_campaign_statistics`: <200ms
- `track_campaign_cost`: <100ms (CRITICAL path, optimized)
- `update_coverage_status`: <50ms
- `update_enrichment_batch`: <1s (for 50 enrichments)
- `update_email_verification`: <50ms
- `get_businesses_for_enrichment`: <500ms (for 100 businesses)

### Index Requirements
All required indexes already exist:
- `idx_businesses_campaign_id` on `gmaps_businesses(campaign_id)`
- `idx_businesses_place_id` on `gmaps_businesses(place_id)` (UNIQUE)
- `idx_campaign_coverage_campaign_id` on `gmaps_campaign_coverage(campaign_id)`
- `idx_api_costs_campaign_id` on `gmaps_api_costs(campaign_id)`

## Testing Strategy

### 1. Unit Tests
Test each function in isolation with:
- Valid inputs (success case)
- Invalid inputs (error handling)
- Edge cases (empty arrays, null values)

### 2. Integration Tests
Test functions with application code:
- JavaScript integration (supabase-db.js)
- Python integration (gmaps_supabase_manager.py)

### 3. Concurrency Tests
Test with multiple processes:
- 10 concurrent cost tracking operations (verify no lost updates)
- 5 concurrent statistics updates (verify no conflicts)
- 20 concurrent business insertions (verify no duplicate place_ids)

### 4. Performance Tests
Test with large datasets:
- 1,000 businesses batch insert
- 10,000 ZIP codes campaign creation
- 100 concurrent cost tracking operations

## Rollout Plan

### Phase 1: Implementation (Week 1)
- ✅ Design complete (this document)
- [ ] Implement all 8 functions
- [ ] Create migration file
- [ ] Unit tests for each function

### Phase 2: Integration (Week 2)
- [ ] Update JavaScript wrappers
- [ ] Update Python wrappers
- [ ] Integration tests
- [ ] Concurrency tests

### Phase 3: Soft Launch (Week 3)
- [ ] Deploy functions to production
- [ ] Keep application logic as fallback
- [ ] Monitor function performance
- [ ] Switch 25% of operations to functions

### Phase 4: Full Migration (Week 4)
- [ ] Switch 100% to stored functions
- [ ] Remove old application logic
- [ ] Monitor and optimize
- [ ] Document final results

## Success Metrics

Functions are production-ready when:

✅ All 8 functions implemented and tested
✅ Integration tests pass in both JavaScript and Python
✅ Concurrency tests show no data corruption
✅ Performance benchmarks met (<1s for most operations)
✅ Error handling verified with all error scenarios
✅ Zero cost tracking discrepancies in production

## Risk Mitigation

### Risk 1: Cost Tracking Race Conditions
**Mitigation:** SERIALIZABLE isolation + extensive concurrency testing
**Fallback:** Revert to application-level cost tracking with advisory locks

### Risk 2: Performance Degradation
**Mitigation:** Performance benchmarks before and after deployment
**Fallback:** Optimize queries, add indexes, or revert specific functions

### Risk 3: Deployment Issues
**Mitigation:** Migration file tested in staging environment
**Fallback:** Drop functions and revert to application logic

## Questions & Support

For questions or issues:
1. Review full architecture document: `/Users/tristanwaite/n8n test/.claude/plans/stored_functions_architecture.md`
2. Check migration file: `/Users/tristanwaite/n8n test/migrations/create_stored_functions.sql` (to be created in Wave 3)
3. Review integration examples in architecture document

---

**Status:** Design Complete - Ready for Implementation (Wave 3)
**Next Step:** Implement all 8 stored functions in migration file
