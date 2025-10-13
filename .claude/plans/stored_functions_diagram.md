# Stored Functions Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────┐         ┌──────────────────────────┐         │
│  │   JavaScript (Node.js)    │         │   Python (FastAPI)       │         │
│  │   simple-server.js        │         │   gmaps_campaign_manager │         │
│  ├──────────────────────────┤         ├──────────────────────────┤         │
│  │  supabase-db.js          │         │  gmaps_supabase_manager  │         │
│  │  - gmapsCampaigns        │         │  - create_campaign()     │         │
│  │  - gmapsBusinesses       │         │  - save_businesses()     │         │
│  │  - gmapsCosts            │         │  - track_cost()          │         │
│  │  - gmapsExport           │         │  - get_businesses()      │         │
│  └──────────┬───────────────┘         └──────────┬───────────────┘         │
│             │                                     │                         │
│             │ supabase.rpc()                      │ client.rpc()            │
│             │                                     │                         │
└─────────────┼─────────────────────────────────────┼─────────────────────────┘
              │                                     │
              └─────────────────┬───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STORED FUNCTIONS LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 1: create_campaign_with_coverage()                        │   │
│  │  - Transaction: READ COMMITTED                                      │   │
│  │  - Inserts: gmaps_campaigns + gmaps_campaign_coverage              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 2: insert_businesses_batch()                              │   │
│  │  - Transaction: READ COMMITTED                                      │   │
│  │  - Upsert: gmaps_businesses (ON CONFLICT place_id)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 3: update_campaign_statistics()                           │   │
│  │  - Transaction: READ COMMITTED + SELECT FOR UPDATE                  │   │
│  │  - Updates: gmaps_campaigns (totals from aggregation)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 4: track_campaign_cost() ⚠️ CRITICAL                      │   │
│  │  - Transaction: SERIALIZABLE + SELECT FOR UPDATE                    │   │
│  │  - Inserts: gmaps_api_costs                                         │   │
│  │  - Updates: gmaps_campaigns (cost rollup)                           │   │
│  │  ⚠️ MUST use SERIALIZABLE to prevent lost cost updates              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 5: update_coverage_status()                               │   │
│  │  - Transaction: READ COMMITTED                                      │   │
│  │  - Updates: gmaps_campaign_coverage (single row)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 6: update_enrichment_batch()                              │   │
│  │  - Transaction: READ COMMITTED                                      │   │
│  │  - Inserts: gmaps_facebook_enrichments OR gmaps_linkedin_enrichments│   │
│  │  - Updates: gmaps_businesses (email, enrichment_status)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 7: update_email_verification()                            │   │
│  │  - Transaction: READ COMMITTED                                      │   │
│  │  - Inserts: gmaps_email_verifications                               │   │
│  │  - Updates: gmaps_linkedin_enrichments OR gmaps_facebook_enrichments│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Function 8: get_businesses_for_enrichment()                        │   │
│  │  - Transaction: READ COMMITTED (read-only)                          │   │
│  │  - Queries: gmaps_businesses (with filters)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐   │
│  │  gmaps_campaigns      │  │  gmaps_businesses     │  │ gmaps_api_costs│   │
│  ├──────────────────────┤  ├──────────────────────┤  ├────────────────┤   │
│  │ - id (PK)            │  │ - id (PK)            │  │ - id (PK)      │   │
│  │ - name               │  │ - place_id (UNIQUE)  │  │ - campaign_id  │   │
│  │ - status             │  │ - campaign_id (FK)   │  │ - service      │   │
│  │ - total_businesses   │  │ - name, address      │  │ - cost_usd     │   │
│  │ - total_emails       │  │ - email, email_source│  │ - items        │   │
│  │ - actual_cost ⚠️     │  │ - enrichment_status  │  │ - incurred_at  │   │
│  │ - google_maps_cost   │  │ - needs_enrichment   │  └────────────────┘   │
│  │ - facebook_cost      │  │ - linkedin_enriched  │                        │
│  │ - linkedin_cost      │  └──────────────────────┘                        │
│  └──────────────────────┘                                                   │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │ gmaps_campaign_coverage   │  │ gmaps_facebook_enrichments│               │
│  ├──────────────────────────┤  ├──────────────────────────┤               │
│  │ - id (PK)                │  │ - id (PK)                │               │
│  │ - campaign_id (FK)       │  │ - business_id (FK)       │               │
│  │ - zip_code               │  │ - campaign_id (FK)       │               │
│  │ - scraped                │  │ - facebook_url           │               │
│  │ - businesses_found       │  │ - primary_email          │               │
│  │ - emails_found           │  │ - emails (array)         │               │
│  │ - actual_cost            │  │ - bouncer_status         │               │
│  └──────────────────────────┘  └──────────────────────────┘               │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │ gmaps_linkedin_enrichments│  │ gmaps_email_verifications │               │
│  ├──────────────────────────┤  ├──────────────────────────┤               │
│  │ - id (PK)                │  │ - id (PK)                │               │
│  │ - business_id (FK)       │  │ - business_id (FK)       │               │
│  │ - campaign_id (FK)       │  │ - email                  │               │
│  │ - linkedin_url           │  │ - status                 │               │
│  │ - primary_email          │  │ - score                  │               │
│  │ - person_name            │  │ - is_safe                │               │
│  │ - bouncer_status         │  │ - verified_at            │               │
│  └──────────────────────────┘  └──────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Transaction Flow Diagram

### Scenario 1: Campaign Creation

```
┌─────────────┐
│ User Action │ Create campaign with 5 ZIP codes
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ JavaScript: gmapsCampaigns.create(campaignData, zipCodes)   │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ supabase.rpc('create_campaign_with_coverage', {...})
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Stored Function: create_campaign_with_coverage()            │
│ Transaction: READ COMMITTED                                  │
│                                                              │
│ BEGIN TRANSACTION;                                           │
│   INSERT INTO gmaps_campaigns (...);                        │
│   -- Returns campaign_id                                     │
│                                                              │
│   INSERT INTO gmaps_campaign_coverage (...)                 │
│   VALUES (zip1), (zip2), (zip3), (zip4), (zip5);           │
│   -- Returns 5 rows                                          │
│                                                              │
│ COMMIT;                                                      │
│                                                              │
│ RETURN { success: true, campaign_id: ..., zip_count: 5 }   │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ JavaScript: Log success, return campaign object              │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 2: Cost Tracking (Concurrent Updates) ⚠️ CRITICAL

```
Process A (Google Maps)          Process B (Facebook)          Database
─────────────────────────────────────────────────────────────────────────

track_cost($10)                  track_cost($5)
    │                                │
    │                                │
    ▼                                ▼
BEGIN TRANSACTION;               BEGIN TRANSACTION;
SET TRANSACTION ISOLATION        SET TRANSACTION ISOLATION
  LEVEL SERIALIZABLE;              LEVEL SERIALIZABLE;
    │                                │
    ▼                                │
SELECT * FROM campaigns              │
  WHERE id = X                       │
  FOR UPDATE;                        │
    │                                │
[LOCK ACQUIRED]                      │
    │                                ▼
    │                            SELECT * FROM campaigns
    │                              WHERE id = X
    │                              FOR UPDATE;
    │                                │
    │                            [BLOCKS - WAITING]
    │                                │
INSERT INTO api_costs               │
  (service='google_maps',            │
   cost_usd=10);                     │
    │                                │
UPDATE campaigns                     │
  SET google_maps_cost = 10,         │
      actual_cost = 10               │
  WHERE id = X;                      │
    │                                │
COMMIT;                              │
    │                                │
[LOCK RELEASED]                      │
    │                                │
    │                                ▼
    │                            [UNBLOCKED]
    │                                │
    │                            SELECT returns:
    │                              actual_cost = 10
    │                                │
    │                            INSERT INTO api_costs
    │                              (service='facebook',
    │                               cost_usd=5);
    │                                │
    │                            UPDATE campaigns
    │                              SET facebook_cost = 5,
    │                                  actual_cost = 15
    │                              WHERE id = X;
    │                                │
    │                            COMMIT;
    │                                │
    ▼                                ▼
Result: actual_cost = 15 ✅ CORRECT!

WITHOUT SERIALIZABLE:
Result: actual_cost = 10 ❌ WRONG! (Lost $5 update)
```

### Scenario 3: Batch Business Insertion with Deduplication

```
┌─────────────┐
│ User Action │ Scrape 50 businesses from ZIP 90001
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Python: manager.save_businesses_batch(campaignId, '90001',  │
│                                        businesses)           │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ client.rpc('insert_businesses_batch', {...})
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Stored Function: insert_businesses_batch()                   │
│ Transaction: READ COMMITTED                                  │
│                                                              │
│ BEGIN TRANSACTION;                                           │
│                                                              │
│ FOR EACH business IN businesses:                             │
│   INSERT INTO gmaps_businesses (place_id, name, ...)        │
│   VALUES (business.place_id, business.name, ...)            │
│   ON CONFLICT (place_id) DO UPDATE                          │
│     SET name = EXCLUDED.name,                               │
│         email = COALESCE(EXCLUDED.email, gmaps_businesses.email),│
│         updated_at = NOW();                                 │
│                                                              │
│   IF conflict: updated_count++                              │
│   ELSE: inserted_count++                                    │
│                                                              │
│ COMMIT;                                                      │
│                                                              │
│ RETURN { success: true, inserted: 45, updated: 5 }         │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Python: Log success, update campaign statistics              │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Application Code                                             │
│ (JavaScript or Python)                                       │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ callStoredFunction('function_name', params, {retries: 3})
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Stored Function                                              │
│                                                              │
│ BEGIN TRANSACTION;                                           │
│   ... perform operations ...                                 │
│                                                              │
│   ❌ EXCEPTION OCCURS                                        │
│                                                              │
│ AUTOMATIC ROLLBACK (all changes reverted)                   │
│                                                              │
│ EXCEPTION HANDLER:                                           │
│   WHEN unique_violation THEN                                 │
│     RETURN { success: false, error: "Duplicate...",         │
│              retry_recommended: false }                      │
│                                                              │
│   WHEN deadlock_detected THEN                                │
│     RETURN { success: false, error: "Conflict...",          │
│              retry_recommended: true }                       │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ Returns error JSONB
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Application Code                                             │
│                                                              │
│ IF data.success == false:                                    │
│   IF data.retry_recommended && attempt < maxRetries:        │
│     sleep(1000 * attempt)  // Exponential backoff           │
│     RETRY                                                    │
│   ELSE:                                                      │
│     THROW ERROR(data.error)                                  │
└─────────────────────────────────────────────────────────────┘
```

## Concurrency Control Diagram

### Row-Level Locking Strategy

```
Campaign Table (gmaps_campaigns)
┌─────────────────────────────────────────────────────────────┐
│ ID  │ Name        │ Status  │ Total Cost │ Lock Status      │
├─────┼─────────────┼─────────┼────────────┼──────────────────┤
│ A   │ Campaign A  │ running │ $100.00    │ 🔒 Locked by P1  │
│ B   │ Campaign B  │ running │ $50.00     │ 🔒 Locked by P2  │
│ C   │ Campaign C  │ draft   │ $0.00      │ ✅ Unlocked      │
│ D   │ Campaign D  │ running │ $75.00     │ ✅ Unlocked      │
└─────────────────────────────────────────────────────────────┘

Process 1: Updating cost for Campaign A (locks row A only)
Process 2: Updating cost for Campaign B (locks row B only)
Process 3: Can update Campaign C or D (no conflict)

✅ Row-level locking = High concurrency
❌ Table-level locking = Low concurrency (one update at a time)
```

### Lock Ordering to Prevent Deadlocks

```
CORRECT ORDER (prevents deadlocks):
┌──────────────────────────────────────────┐
│ 1. Lock campaign row (gmaps_campaigns)   │
│    SELECT ... FOR UPDATE                  │
│                                          │
│ 2. Update coverage (gmaps_campaign_coverage)│
│                                          │
│ 3. Update businesses (gmaps_businesses)   │
│                                          │
│ 4. Insert costs (gmaps_api_costs)        │
└──────────────────────────────────────────┘

WRONG ORDER (can cause deadlocks):
┌──────────────────────────────────────────┐
│ ❌ Process A: Lock businesses → campaigns │
│ ❌ Process B: Lock campaigns → businesses │
│                                          │
│ Result: DEADLOCK! Both processes waiting │
└──────────────────────────────────────────┘
```

## Performance Optimization Points

```
┌─────────────────────────────────────────────────────────────┐
│ FAST OPERATIONS (<100ms)                                     │
├─────────────────────────────────────────────────────────────┤
│ ✅ track_campaign_cost (single row lock + insert)           │
│ ✅ update_coverage_status (single row update)               │
│ ✅ update_email_verification (single row update)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MEDIUM OPERATIONS (100-500ms)                                │
├─────────────────────────────────────────────────────────────┤
│ ⚡ update_campaign_statistics (aggregation query)           │
│ ⚡ get_businesses_for_enrichment (filtered query with limit)│
│ ⚡ create_campaign_with_coverage (2 table inserts)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SLOW OPERATIONS (500ms-1s+)                                  │
├─────────────────────────────────────────────────────────────┤
│ 🐌 insert_businesses_batch (50+ businesses with upsert)     │
│ 🐌 update_enrichment_batch (50+ enrichments with lookups)   │
│                                                              │
│ OPTIMIZATION: Batch size tuning (50 is optimal)             │
└─────────────────────────────────────────────────────────────┘
```

---

**Legend:**
- ⚠️ = Critical function requiring special attention
- 🔒 = Locked resource (row-level lock)
- ✅ = Unlocked / Available
- ❌ = Error / Wrong approach
- ⚡ = Performance optimized
- 🐌 = Potentially slow operation
