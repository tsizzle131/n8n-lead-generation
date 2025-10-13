# Database Transaction Documentation

This directory contains comprehensive documentation for implementing atomic transaction boundaries in the Google Maps Lead Generation system.

## Documentation Set

### 📋 [TRANSACTION_IMPLEMENTATION_SUMMARY.md](./TRANSACTION_IMPLEMENTATION_SUMMARY.md)
**Start here** - Executive summary with implementation roadmap, success metrics, and next steps.

**Contents:**
- Current state analysis (problems with no transactions)
- 8 critical operations requiring atomicity
- Implementation roadmap (Phases 1-4)
- Testing checklist
- Risk assessment
- Performance benchmarks
- Rollback plan

---

### 📊 [DATABASE_SCHEMA_MAPPING.md](./DATABASE_SCHEMA_MAPPING.md)
**Complete reference** - Full database schema documentation with all tables, columns, relationships, and constraints.

**Contents:**
- Table schemas (6 core tables)
- Column details for each operation
- Foreign key relationships (with cascade behaviors)
- Indexes and performance optimization
- RLS policies
- Triggers and functions
- Data integrity considerations
- Concurrency issues and solutions

**Use this for:**
- Understanding table structure
- Writing migration files
- Debugging data issues
- Performance optimization

---

### 🎨 [DATABASE_RELATIONSHIPS_DIAGRAM.md](./DATABASE_RELATIONSHIPS_DIAGRAM.md)
**Visual guide** - Entity-relationship diagrams and operation flow charts.

**Contents:**
- ASCII ER diagrams
- Parent-child cascade delete visualization
- Transaction boundary flow diagrams for each operation
- Data flow through campaign lifecycle
- Critical relationships summary

**Use this for:**
- Understanding table dependencies
- Visualizing data flow
- Explaining system architecture
- Identifying cascade impacts

---

### 🔧 [TRANSACTION_REQUIREMENTS.md](./TRANSACTION_REQUIREMENTS.md)
**Implementation guide** - Detailed transaction specifications with complete SQL stored procedure code.

**Contents:**
- 10 stored procedure implementations (ready to use)
- Atomicity requirements
- Consistency rules
- Isolation level recommendations
- Concurrency concerns and locking strategies
- Error handling and retry logic
- Performance considerations

**Use this for:**
- Copy-paste SQL for stored procedures
- Understanding transaction isolation levels
- Implementing error handling
- Debugging transaction issues

---

## Quick Reference

### The 8 Critical Operations

1. **Facebook Enrichment Save** - Insert enrichment + update business email
2. **LinkedIn Enrichment Save** - Insert enrichment + update business email/LinkedIn URL
3. **Campaign Creation** - Insert campaign + insert all coverage records
4. **Email Verification (Facebook)** - Update Facebook enrichment + insert verification log
5. **Email Verification (LinkedIn)** - Update LinkedIn enrichment + insert verification log
6. **Email Verification (Google Maps)** - Update business + insert verification log
7. **Campaign Statistics Update** - Read aggregates + update campaign counters
8. **API Cost Tracking** - Insert cost record + update campaign costs (with locking)

**Additional Operations:**
- Coverage Update After Scraping
- Campaign Status Transitions (with validation)

---

### Database Tables

**Core Tables (public schema):**
- `gmaps_campaigns` - Campaign metadata and aggregates
- `gmaps_campaign_coverage` - ZIP code coverage
- `gmaps_businesses` - Business records from Google Maps
- `gmaps_facebook_enrichments` - Facebook enrichment data
- `gmaps_linkedin_enrichments` - LinkedIn enrichment with email verification
- `gmaps_api_costs` - API cost tracking log

**Optional:**
- `gmaps_email_verifications` - Verification audit log

---

### Foreign Key Hierarchy

```
gmaps_campaigns
    ├── gmaps_campaign_coverage (ON DELETE CASCADE)
    ├── gmaps_businesses (ON DELETE CASCADE)
    │   ├── gmaps_facebook_enrichments (ON DELETE CASCADE)
    │   └── gmaps_linkedin_enrichments (ON DELETE CASCADE)
    └── gmaps_api_costs (ON DELETE CASCADE)
```

---

## Implementation Phases

### Phase 1: Database (Week 1)
- [ ] Create migration file with 10 stored procedures
- [ ] Test in Supabase SQL Editor
- [ ] Apply to staging database
- [ ] Verify procedures callable via RPC

### Phase 2: Application Code (Week 1-2)
- [ ] Update `supabase-db.js` (Node.js)
- [ ] Update `gmaps_supabase_manager.py` (Python)
- [ ] Replace direct queries with `supabase.rpc()` calls
- [ ] Implement error handling for JSONB responses

### Phase 3: Testing (Week 2)
- [ ] Update `test_database_integrity.js`
- [ ] Add `test_stored_procedures.js`
- [ ] Integration testing
- [ ] Performance testing
- [ ] Concurrent operations testing

### Phase 4: Deployment (Week 3)
- [ ] Deploy to production
- [ ] Monitor transaction metrics
- [ ] Optimize slow operations
- [ ] Document lessons learned

---

## Key Insights

### Why Transactions Matter

**Current Problems:**
- ❌ Enrichment records saved without business updates (orphaned data)
- ❌ Email source tracking incorrect when operations fail
- ❌ Race conditions on cost calculations
- ❌ Campaign statistics drift from actual counts
- ❌ Partial failures leave database in inconsistent state

**After Transactions:**
- ✅ Atomic operations - all changes succeed or all rollback
- ✅ Data consistency guaranteed
- ✅ No orphaned records
- ✅ Cost calculations safe under concurrency
- ✅ Statistics always accurate

---

### Critical Success Factors

1. **Row-Level Locking for Cost Tracking**
   - Use `SELECT ... FOR UPDATE` to prevent race conditions
   - Cost calculations require current values (must read + write atomically)

2. **Status Transition Validation**
   - Enforce state machine with validation function
   - Prevent invalid transitions (e.g., 'draft' → 'completed')

3. **Error Handling with JSONB**
   - Return `{ success: true/false, error: "message" }`
   - Application can retry safely on transient failures

4. **Isolation Levels**
   - READ COMMITTED for most operations (default)
   - SELECT FOR UPDATE for critical concurrent updates

---

## Common Queries

### Check Stored Procedures
```sql
-- List all stored procedures
SELECT proname, pronargs, proargnames
FROM pg_proc
WHERE proname LIKE '%_tx';

-- Test a procedure
SELECT save_facebook_enrichment_tx(
    'business-uuid'::UUID,
    'campaign-uuid'::UUID,
    '{"facebook_url": "https://facebook.com/test", "primary_email": "test@example.com", "success": true}'::JSONB
);
```

### Monitor Transactions
```sql
-- Active transactions
SELECT * FROM pg_stat_activity
WHERE state = 'active';

-- Lock contention
SELECT * FROM pg_locks
WHERE NOT granted;

-- Procedure statistics
SELECT * FROM pg_stat_user_functions
WHERE funcname LIKE '%_tx';
```

### Data Integrity Checks
```sql
-- Find orphaned enrichments (shouldn't exist after transactions)
SELECT fe.*
FROM gmaps_facebook_enrichments fe
LEFT JOIN gmaps_businesses b ON b.id = fe.business_id
WHERE b.id IS NULL;

-- Verify campaign statistics match reality
SELECT
    c.id,
    c.total_businesses_found,
    COUNT(b.id) as actual_businesses,
    c.total_businesses_found - COUNT(b.id) as drift
FROM gmaps_campaigns c
LEFT JOIN gmaps_businesses b ON b.campaign_id = c.id
GROUP BY c.id, c.total_businesses_found
HAVING c.total_businesses_found != COUNT(b.id);
```

---

## Troubleshooting

### Transaction Failed - How to Debug

1. **Check JSONB response:**
   ```javascript
   const result = await supabase.rpc('save_facebook_enrichment_tx', params);
   if (!result.data.success) {
       console.error('Error:', result.data.error);
       console.error('SQL State:', result.data.error_detail);
   }
   ```

2. **Check PostgreSQL logs:**
   - Look for constraint violations
   - Check for lock timeout errors
   - Verify FK references exist

3. **Verify data:**
   - Does business_id exist in gmaps_businesses?
   - Does campaign_id exist in gmaps_campaigns?
   - Is JSONB data properly formatted?

### Lock Timeout Errors

**Symptoms:** `ERROR: could not obtain lock on row in relation "gmaps_campaigns"`

**Causes:**
- Concurrent cost tracking operations
- Long-running transactions holding locks

**Solutions:**
- Retry with exponential backoff
- Reduce transaction duration
- Increase `lock_timeout` setting (carefully)

### Rollback Scenarios

**Automatic rollback occurs when:**
- RAISE EXCEPTION thrown
- Constraint violation (FK, unique, NOT NULL)
- Invalid data type cast
- Any unhandled error in stored procedure

**Application should:**
- Check `success` flag in response
- Log error details
- Retry transient failures (network, timeout)
- Report persistent failures (data issues)

---

## Performance Benchmarks

### Expected Transaction Durations

| Operation | Businesses | Expected | Max Acceptable |
|-----------|-----------|----------|----------------|
| Facebook Enrichment | 1 | 5-20ms | 100ms |
| LinkedIn Enrichment | 1 | 5-20ms | 100ms |
| Campaign Creation | 10 ZIPs | 10-30ms | 200ms |
| Campaign Creation | 100 ZIPs | 50-150ms | 500ms |
| Email Verification | 1 | 5-15ms | 100ms |
| Statistics Update | 1,000 | 20-50ms | 200ms |
| Statistics Update | 100,000 | 200-500ms | 1000ms |
| Cost Tracking | 1 | 5-15ms | 50ms |

### Optimization Tips

1. **Indexes:** Ensure FK columns indexed
2. **Batching:** Limit batch size to 50-100 for coverage inserts
3. **Caching:** Consider caching statistics for very large campaigns
4. **Connection Pooling:** Monitor pool exhaustion

---

## Migration File Template

Location: `migrations/schema/20251012_001_add_transaction_stored_procedures.sql`

```sql
-- ============================================================================
-- TRANSACTION STORED PROCEDURES
-- ============================================================================
-- This migration adds atomic transaction boundaries for 10 critical operations
-- See: docs/TRANSACTION_REQUIREMENTS.md for complete specifications
-- ============================================================================

-- Function 1: Save Facebook Enrichment
CREATE OR REPLACE FUNCTION save_facebook_enrichment_tx(
    p_business_id UUID,
    p_campaign_id UUID,
    p_enrichment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- [See TRANSACTION_REQUIREMENTS.md for complete implementation]
$$;

-- Function 2: Save LinkedIn Enrichment
-- [etc...]

-- Function 10: Update Campaign Status
-- [etc...]

-- Helper function: Validate status transitions
CREATE OR REPLACE FUNCTION is_valid_status_transition(
    p_current VARCHAR(50),
    p_new VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
-- [See TRANSACTION_REQUIREMENTS.md for complete implementation]
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_facebook_enrichment_tx TO anon, authenticated;
-- [etc. for all functions]

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
```

---

## Testing Strategy

### Unit Tests (Each Stored Procedure)
- Test success path
- Test rollback on error
- Test validation (status transitions)
- Test FK constraint violations

### Integration Tests
- Full campaign workflow (create → scrape → enrich → verify)
- Verify data consistency at each step
- Test failure scenarios with rollback

### Concurrent Operations Tests
- Parallel enrichments (should not conflict)
- Concurrent cost tracking (should serialize with locks)
- Status transition race conditions (should prevent invalid states)

### Performance Tests
- Measure transaction duration under load
- Test with realistic campaign sizes (100 ZIPs, 10k businesses)
- Monitor lock contention
- Benchmark statistics update on large datasets

---

## Additional Resources

### Related Files
- **Application Code:** `supabase-db.js`, `gmaps_supabase_manager.py`
- **Test Suite:** `tests/test_database_integrity.js`
- **Migration Directory:** `migrations/schema/`
- **Campaign Manager:** `lead_generation/modules/gmaps_campaign_manager.py`

### External Documentation
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Isolation Levels](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Row Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## Changelog

### 2025-10-12 - Initial Documentation
- Created comprehensive database schema mapping
- Documented all 10 transaction operations
- Provided complete SQL implementations
- Created visual ER diagrams
- Established implementation roadmap

---

## Contact

For questions or issues:
1. Check this documentation first
2. Review test suite for examples
3. Examine stored procedure SQL in TRANSACTION_REQUIREMENTS.md
4. Test in Supabase SQL Editor before deploying

**Remember:** This is complete, production-ready documentation. All SQL code is ready to copy-paste and use. Follow the implementation phases carefully and monitor transaction health after deployment.
