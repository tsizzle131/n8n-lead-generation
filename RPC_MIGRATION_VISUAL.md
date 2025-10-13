# PostgreSQL Stored Functions Migration - Visual Reference

## Current Architecture (Non-Atomic)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                  GoogleMapsCampaigns.tsx                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP POST /api/gmaps/campaigns/create
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS API (simple-server.js)                │
│                         Line 2794                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ gmapsCampaigns.create(campaignData)
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│              JAVASCRIPT DB LAYER (supabase-db.js)                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ gmapsCampaigns.create() - Lines 45-95                    │  │
│  │                                                            │  │
│  │ 1. INSERT INTO gmaps_campaigns ← NOT ATOMIC!             │  │
│  │ 2. INSERT INTO gmaps_campaign_coverage ← Separate TX!    │  │
│  │                                                            │  │
│  │ ⚠️  Problem: If step 2 fails, orphan campaign exists!   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Separate INSERT statements
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
│                                                                   │
│  ┌─────────────────────┐      ┌──────────────────────────┐     │
│  │  gmaps_campaigns    │      │ gmaps_campaign_coverage  │     │
│  │                     │      │                          │     │
│  │  ❌ Created first  │ ... │  ❌ May fail to create  │     │
│  └─────────────────────┘      └──────────────────────────┘     │
│                                                                   │
│  Result: INCONSISTENT STATE POSSIBLE                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Architecture (Atomic with Stored Functions)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                  GoogleMapsCampaigns.tsx                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP POST /api/gmaps/campaigns/create
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS API (simple-server.js)                │
│                         Line 2794                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ gmapsCampaigns.create(campaignData)
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│              JAVASCRIPT DB LAYER (supabase-db.js)                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ gmapsCampaigns.create() - UPDATED                        │  │
│  │                                                            │  │
│  │ supabase.rpc('create_campaign_with_coverage', {          │  │
│  │   campaign_data: {...},                                   │  │
│  │   coverage_data: [...]                                    │  │
│  │ })                                                         │  │
│  │                                                            │  │
│  │ ✅ Single RPC call - All or nothing!                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Single RPC call
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   create_campaign_with_coverage() STORED FUNCTION          │ │
│  │                                                              │ │
│  │   BEGIN;  ← Transaction starts                              │ │
│  │                                                              │ │
│  │   1. INSERT INTO gmaps_campaigns                            │ │
│  │   2. INSERT INTO gmaps_campaign_coverage (bulk)             │ │
│  │   3. RETURN campaign data                                   │ │
│  │                                                              │ │
│  │   COMMIT;  ← All succeed or all rollback                    │ │
│  │                                                              │ │
│  │   ✅ ATOMIC - Guaranteed consistency!                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────┐      ┌──────────────────────────┐     │
│  │  gmaps_campaigns    │      │ gmaps_campaign_coverage  │     │
│  │                     │      │                          │     │
│  │  ✅ Both created   │ ←──→ │  ✅ Both created        │     │
│  │     together        │      │     together             │     │
│  └─────────────────────┘      └──────────────────────────┘     │
│                                                                   │
│  Result: ALWAYS CONSISTENT                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Python Campaign Manager Flow (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON CAMPAIGN MANAGER                             │
│          gmaps_campaign_manager.py                               │
│                                                                   │
│  Phase 1: Google Maps Scraping                                   │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 290: self.db.save_businesses(            │             │
│  │              businesses, campaign_id, zip)     │             │
│  │                                                 │             │
│  │  ❌ Issue: Multiple INSERT statements          │             │
│  │  ❌ Issue: Manual count queries needed         │             │
│  │  ❌ Issue: Statistics updated separately       │             │
│  └────────────────────────────────────────────────┘             │
│                          ↓                                        │
│  Phase 2: Facebook Enrichment                                    │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 517: self.db.save_facebook_enrichment(   │             │
│  │              business_id, campaign_id, data)   │             │
│  │                                                 │             │
│  │  ❌ Issue: Enrichment insert separate from     │             │
│  │           business update                       │             │
│  │  ❌ Issue: Campaign stats updated after        │             │
│  └────────────────────────────────────────────────┘             │
│                          ↓                                        │
│  Phase 2.5: LinkedIn Enrichment                                  │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 625: self.db.save_linkedin_enrichment(   │             │
│  │              business_id, campaign_id, data)   │             │
│  │                                                 │             │
│  │  ❌ Issue: Complex multi-table update          │             │
│  │  ❌ Issue: Bouncer verification separate TX    │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│         PYTHON SUPABASE MANAGER (gmaps_supabase_manager.py)      │
│                                                                   │
│  save_businesses() - Lines 222-301                               │
│  ┌────────────────────────────────────────────────┐             │
│  │  for i in range(0, len(records), batch_size):  │             │
│  │      batch = records[i:i + batch_size]         │             │
│  │      result = client.table("gmaps_businesses") │             │
│  │                .upsert(batch, on_conflict...)   │             │
│  │                                                 │             │
│  │  ❌ 50 separate transactions for 2500 biz     │             │
│  │  ❌ No automatic statistics update             │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_facebook_enrichment() - Lines 320-361                      │
│  ┌────────────────────────────────────────────────┐             │
│  │  1. INSERT INTO gmaps_facebook_enrichments     │             │
│  │  2. UPDATE gmaps_businesses (email, status)    │             │
│  │                                                 │             │
│  │  ❌ Two separate operations - not atomic      │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_linkedin_enrichment() - Lines 382-455                      │
│  ┌────────────────────────────────────────────────┐             │
│  │  1. INSERT INTO gmaps_linkedin_enrichments     │             │
│  │  2. UPDATE gmaps_businesses (url, email)       │             │
│  │                                                 │             │
│  │  ❌ Two separate operations - not atomic      │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Python Campaign Manager Flow (Target with RPCs)

```
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON CAMPAIGN MANAGER                             │
│          gmaps_campaign_manager.py                               │
│                                                                   │
│  Phase 1: Google Maps Scraping                                   │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 290: self.db.save_businesses(            │             │
│  │              businesses, campaign_id, zip)     │             │
│  │                                                 │             │
│  │  ✅ Single RPC call for entire batch          │             │
│  │  ✅ Automatic statistics update                │             │
│  │  ✅ Proper deduplication handling              │             │
│  └────────────────────────────────────────────────┘             │
│                          ↓                                        │
│  Phase 2: Facebook Enrichment                                    │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 517: self.db.save_facebook_enrichment(   │             │
│  │              business_id, campaign_id, data)   │             │
│  │                                                 │             │
│  │  ✅ Atomic enrichment + business update        │             │
│  │  ✅ Automatic campaign stats update            │             │
│  └────────────────────────────────────────────────┘             │
│                          ↓                                        │
│  Phase 2.5: LinkedIn Enrichment                                  │
│  ┌────────────────────────────────────────────────┐             │
│  │  Line 625: self.db.save_linkedin_enrichment(   │             │
│  │              business_id, campaign_id, data)   │             │
│  │                                                 │             │
│  │  ✅ Atomic enrichment + business + stats       │             │
│  │  ✅ Includes Bouncer verification              │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│         PYTHON SUPABASE MANAGER (gmaps_supabase_manager.py)      │
│                                                                   │
│  save_businesses() - UPDATED                                     │
│  ┌────────────────────────────────────────────────┐             │
│  │  result = client.rpc(                          │             │
│  │      'batch_upsert_businesses_atomic',         │             │
│  │      {'businesses': business_records}          │             │
│  │  )                                              │             │
│  │                                                 │             │
│  │  ✅ Single atomic operation                    │             │
│  │  ✅ Automatic statistics calculation           │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_facebook_enrichment() - UPDATED                            │
│  ┌────────────────────────────────────────────────┐             │
│  │  result = client.rpc(                          │             │
│  │      'save_facebook_enrichment_atomic',        │             │
│  │      {                                          │             │
│  │          'p_business_id': business_id,         │             │
│  │          'p_campaign_id': campaign_id,         │             │
│  │          'p_enrichment_data': enrichment_data  │             │
│  │      }                                          │             │
│  │  )                                              │             │
│  │                                                 │             │
│  │  ✅ Atomic enrichment + business + campaign   │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_linkedin_enrichment() - UPDATED                            │
│  ┌────────────────────────────────────────────────┐             │
│  │  result = client.rpc(                          │             │
│  │      'save_linkedin_enrichment_atomic',        │             │
│  │      {                                          │             │
│  │          'p_business_id': business_id,         │             │
│  │          'p_campaign_id': campaign_id,         │             │
│  │          'p_enrichment_data': enrichment_data  │             │
│  │      }                                          │             │
│  │  )                                              │             │
│  │                                                 │             │
│  │  ✅ Atomic enrichment + business + campaign   │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL STORED FUNCTIONS                   │
│                                                                   │
│  batch_upsert_businesses_atomic()                                │
│  ┌────────────────────────────────────────────────┐             │
│  │  BEGIN;                                         │             │
│  │    1. UPSERT businesses (with deduplication)   │             │
│  │    2. UPDATE campaign statistics               │             │
│  │    3. RETURN business IDs and stats            │             │
│  │  COMMIT;                                        │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_facebook_enrichment_atomic()                               │
│  ┌────────────────────────────────────────────────┐             │
│  │  BEGIN;                                         │             │
│  │    1. INSERT enrichment record                 │             │
│  │    2. UPDATE business (email, status)          │             │
│  │    3. UPDATE campaign stats                    │             │
│  │    4. RETURN enrichment result                 │             │
│  │  COMMIT;                                        │             │
│  └────────────────────────────────────────────────┘             │
│                                                                   │
│  save_linkedin_enrichment_atomic()                               │
│  ┌────────────────────────────────────────────────┐             │
│  │  BEGIN;                                         │             │
│  │    1. INSERT enrichment record                 │             │
│  │    2. UPDATE business (url, email, status)     │             │
│  │    3. UPDATE campaign stats                    │             │
│  │    4. RETURN enrichment result                 │             │
│  │  COMMIT;                                        │             │
│  └────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Update Priority Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRIORITY MATRIX                              │
│                                                                   │
│  Priority 1: CRITICAL - Campaign Creation                        │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • supabase-db.js: gmapsCampaigns.create()       │            │
│  │   Lines 45-95                                    │            │
│  │                                                   │            │
│  │ Risk: HIGH - Used by frontend                    │            │
│  │ Impact: HIGH - Inconsistent campaigns            │            │
│  │ Effort: MEDIUM - ~60 lines                       │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Priority 2: CRITICAL - Business Batch Saving                    │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • supabase-db.js: businesses.saveBusinesses()   │            │
│  │   Lines 144-189                                  │            │
│  │ • gmaps_supabase_manager.py: save_businesses()  │            │
│  │   Lines 222-301                                  │            │
│  │ • gmaps_campaign_manager.py: Lines 290, 802     │            │
│  │                                                   │            │
│  │ Risk: HIGH - Core scraping function              │            │
│  │ Impact: HIGH - Deduplication + statistics        │            │
│  │ Effort: HIGH - ~90 lines + testing               │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Priority 3: HIGH - Facebook Enrichment                          │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • supabase-db.js: saveFacebookEnrichment()      │            │
│  │   Lines 227-246                                  │            │
│  │ • gmaps_supabase_manager.py:                    │            │
│  │   save_facebook_enrichment() Lines 320-361      │            │
│  │ • gmaps_campaign_manager.py: Line 517           │            │
│  │                                                   │            │
│  │ Risk: MEDIUM - Enrichment phase                  │            │
│  │ Impact: MEDIUM - Email attribution               │            │
│  │ Effort: MEDIUM - ~50 lines                       │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Priority 4: HIGH - LinkedIn Enrichment                          │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • gmaps_supabase_manager.py:                    │            │
│  │   save_linkedin_enrichment() Lines 382-455      │            │
│  │ • gmaps_campaign_manager.py: Lines 625, 666     │            │
│  │                                                   │            │
│  │ Risk: MEDIUM - Complex enrichment                │            │
│  │ Impact: HIGH - Bouncer verification included     │            │
│  │ Effort: HIGH - ~70 lines + verification          │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Priority 5: MEDIUM - Email Verification Updates                 │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • gmaps_supabase_manager.py:                    │            │
│  │   - update_linkedin_verification() 457-519      │            │
│  │   - update_facebook_verification() 521-586      │            │
│  │   - update_google_maps_verification() 588-639   │            │
│  │ • gmaps_campaign_manager.py: Lines 323, 542,    │            │
│  │   656, 835                                       │            │
│  │                                                   │            │
│  │ Risk: LOW - Verification phase                   │            │
│  │ Impact: MEDIUM - Email quality tracking          │            │
│  │ Effort: MEDIUM - ~60 lines                       │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Priority 6: LOW - Test File Updates                             │
│  ┌─────────────────────────────────────────────────┐            │
│  │ • 7 test files                                   │            │
│  │ • ~15 test methods                               │            │
│  │                                                   │            │
│  │ Risk: LOW - Test code                            │            │
│  │ Impact: HIGH - Ensure correctness                │            │
│  │ Effort: LOW - ~50 lines                          │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Rollout Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1: Preparation                         │
│                       Duration: 1 day                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Create feature flags in app config                           │
│  2. Add RPC wrappers (keep old methods)                          │
│  3. Unit test RPC functions in PostgreSQL                        │
│  4. Review this catalog with team                                │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 2: Campaign Creation                      │
│                       Duration: 2 days                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Update supabase-db.js gmapsCampaigns.create()                │
│  2. Test in development environment                              │
│  3. Enable feature flag: ENABLE_RPC_CAMPAIGN_CREATE              │
│  4. Monitor for 24 hours                                         │
│  5. Rollback if issues, otherwise proceed                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 3: Business Saving                       │
│                       Duration: 3 days                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Update Python save_businesses()                              │
│  2. Update JavaScript saveBusinesses()                           │
│  3. Test with small batch (10 businesses)                        │
│  4. Test with large batch (1000 businesses)                      │
│  5. Enable feature flag: ENABLE_RPC_BUSINESS_SAVE                │
│  6. Monitor for 48 hours                                         │
│  7. Verify statistics accuracy                                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 4: Enrichment Saving                     │
│                       Duration: 3 days                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Update save_facebook_enrichment()                            │
│  2. Update save_linkedin_enrichment()                            │
│  3. Test Facebook enrichment flow                                │
│  4. Test LinkedIn enrichment flow                                │
│  5. Test Bouncer verification integration                        │
│  6. Enable feature flag: ENABLE_RPC_ENRICHMENT_SAVE              │
│  7. Monitor for 48 hours                                         │
│  8. Verify email attribution accuracy                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 5: Verification Updates                    │
│                       Duration: 2 days                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Update verification update methods                           │
│  2. Test all three verification paths                            │
│  3. Enable feature flag: ENABLE_RPC_VERIFICATION_UPDATE          │
│  4. Monitor for 24 hours                                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 6: Test Updates                        │
│                       Duration: 2 days                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Update unit tests                                            │
│  2. Update integration tests                                     │
│  3. Add rollback scenario tests                                  │
│  4. Run full test suite                                          │
│  5. Verify all tests pass                                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                PHASE 7: Production Validation                    │
│                       Duration: 1 week                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Run complete campaign end-to-end                             │
│  2. Verify all statistics                                        │
│  3. Check for performance improvements                           │
│  4. Monitor error rates                                          │
│  5. Get team sign-off                                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 8: Cleanup & Documentation               │
│                       Duration: 1 day                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Remove old non-RPC code                                      │
│  2. Remove feature flags                                         │
│  3. Update documentation                                         │
│  4. Archive migration documents                                  │
│  5. Team knowledge transfer                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                  ✅ MIGRATION COMPLETE
```

---

## File Dependency Graph

```
                    ┌─────────────────────┐
                    │   FRONTEND (React)  │
                    │  GoogleMapsCampaigns│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   simple-server.js  │
                    │   API Endpoints     │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
    │ supabase-   │   │ gmaps_campaign │   │   Test Files   │
    │ db.js       │   │ _manager.py    │   │   (7 files)    │
    │             │   │                │   │                │
    │ • create()  │   │ • execute()    │   │ • integration  │
    │ • saveBiz() │   │ • enrichment() │   │ • unit tests   │
    │ • saveFB()  │   └───────┬────────┘   └────────────────┘
    └─────┬───────┘           │
          │                   │
          │          ┌────────▼────────┐
          │          │ gmaps_supabase  │
          │          │ _manager.py     │
          │          │                 │
          │          │ • save_biz()    │
          │          │ • save_fb()     │
          │          │ • save_li()     │
          │          │ • update_verif()│
          │          └────────┬────────┘
          │                   │
          └───────────────────┼───────────────────────┐
                              │                       │
                     ┌────────▼────────┐    ┌─────────▼─────────┐
                     │   PostgreSQL    │    │  Stored Functions │
                     │   Tables        │    │                   │
                     │                 │    │ • create_campaign │
                     │ • gmaps_        │◄───┤ • batch_upsert   │
                     │   campaigns     │    │ • save_fb_atomic │
                     │ • gmaps_        │    │ • save_li_atomic │
                     │   businesses    │    └───────────────────┘
                     │ • gmaps_fb_     │
                     │   enrichments   │
                     │ • gmaps_li_     │
                     │   enrichments   │
                     └─────────────────┘

Update Order (Bottom-Up):
1. Create stored functions in PostgreSQL
2. Update gmaps_supabase_manager.py (Python DB layer)
3. Update supabase-db.js (JavaScript DB layer)
4. Update gmaps_campaign_manager.py (Campaign orchestration)
5. Update simple-server.js (API endpoints) - minimal changes
6. Update test files
7. Frontend - no changes needed
```

---

## Benefits Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                      BEFORE MIGRATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Campaign Creation:                                              │
│  ┌──────┐  ┌──────┐  ❌ 2 separate transactions                │
│  │Step 1│  │Step 2│                                              │
│  └──┬───┘  └──┬───┘  ⚠️  If Step 2 fails = orphan campaign     │
│     │         │                                                  │
│  Business Saving (2500 businesses):                              │
│  ┌──┐ ┌──┐ ┌──┐ ... ┌──┐  ❌ 50 separate transactions          │
│  │50│ │50│ │50│ ... │50│                                        │
│  └──┘ └──┘ └──┘     └──┘  ⚠️  Slow + potential inconsistency   │
│                                                                   │
│  Facebook Enrichment (500 businesses):                           │
│  ┌──────┐  ┌──────┐  ❌ 1000 separate operations               │
│  │Insert│  │Update│  ⚠️  Business update may fail               │
│  └──────┘  └──────┘                                              │
│                                                                   │
│  Statistics Updates:                                             │
│  Manual queries after each operation  ⚠️  May drift out of sync │
│                                                                   │
│  Error Handling:                                                 │
│  Try-catch with partial rollback  ⚠️  Complex recovery          │
│                                                                   │
│  Performance:                                                    │
│  Slow due to network round-trips  ⚠️  High latency              │
└─────────────────────────────────────────────────────────────────┘

                            ↓ MIGRATION ↓

┌─────────────────────────────────────────────────────────────────┐
│                       AFTER MIGRATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Campaign Creation:                                              │
│  ┌──────────────┐  ✅ 1 atomic transaction                      │
│  │  Single RPC  │                                                │
│  └──────────────┘  ✅ All or nothing                            │
│                                                                   │
│  Business Saving (2500 businesses):                              │
│  ┌────────────────────────┐  ✅ 1 atomic transaction            │
│  │   Single bulk upsert   │                                      │
│  └────────────────────────┘  ✅ Fast + consistent               │
│                                                                   │
│  Facebook Enrichment (500 businesses):                           │
│  ┌──────────────┐  ✅ 500 atomic operations                     │
│  │  Single RPC  │  ✅ Insert + Update guaranteed together       │
│  └──────────────┘                                                │
│                                                                   │
│  Statistics Updates:                                             │
│  Automatic within stored function  ✅ Always accurate            │
│                                                                   │
│  Error Handling:                                                 │
│  PostgreSQL automatic rollback  ✅ Simple + reliable            │
│                                                                   │
│  Performance:                                                    │
│  Fast (server-side logic)  ✅ Low latency                        │
└─────────────────────────────────────────────────────────────────┘

Performance Gains:
• Campaign Creation: 2 operations → 1 operation (50% fewer)
• Business Saving: 50 transactions → 1 transaction (98% fewer)
• Enrichment: 2 operations → 1 operation (50% fewer)
• Statistics: Always accurate (no drift)
• Error Handling: Automatic (no complex recovery)
```

---

**Visual Reference Version**: 1.0
**Last Updated**: 2025-10-12
**Companion to**: RPC_MIGRATION_CATALOG.md
