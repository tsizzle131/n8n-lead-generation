# Database Verification Test Flow Diagram

## Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE VERIFICATION TEST SUITE                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Find Campaign  │
                            │ "Miami Restau"  │
                            └─────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────────────┐
              │                                               │
              │  Get 10 businesses without LinkedIn data     │
              │                                               │
              └───────────────────────────────────────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║           TEST 1: LinkedIn Parallel Scraper               ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Run LinkedIn   │ │ Run LinkedIn   │ │ Run LinkedIn   │
        │ Scraper on     │ │ Scraper on     │ │ Scraper on     │
        │ Business 1-3   │ │ Business 4-6   │ │ Business 7-10  │
        └────────────────┘ └────────────────┘ └────────────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Verify Data Saved To:          │
                    │  ✓ gmaps_linkedin_enrichments   │
                    │  ✓ gmaps_businesses (URLs)      │
                    │  ✓ gmaps_email_verifications    │
                    └─────────────────────────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║         TEST 2: Facebook Email Verification               ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Count Facebook │ │ Query Email    │ │ Calculate      │
        │ Enrichments    │ │ Verifications  │ │ Coverage %     │
        └────────────────┘ └────────────────┘ └────────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║       TEST 3: Google Maps Email Verification              ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Count GMaps    │ │ Query Email    │ │ Calculate      │
        │ Emails         │ │ Verifications  │ │ Coverage %     │
        └────────────────┘ └────────────────┘ └────────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║          TEST 4: Data Integrity Checks                    ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ No Orphaned  ││ No Orphaned  ││ No Orphaned  ││ All Records  ││ Foreign Key  │
│ LinkedIn     ││ Facebook     ││ Email Verif. ││ Have         ││ Relationships│
│ Records      ││ Records      ││ Records      ││ campaign_id  ││ Valid        │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║        TEST 5: Verification Coverage by Source            ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ Google Maps  ││ Facebook     ││ LinkedIn     ││ Deliverable  ││ Undeliverable│
│ Source       ││ Source       ││ Source       ││ Counts       ││ Counts       │
│ Count        ││ Count        ││ Count        ││              ││              │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
                                      │
                                      ▼
        ╔═══════════════════════════════════════════════════════════╗
        ║         TEST 6: Export Data Completeness                  ║
        ╚═══════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Simulate CSV   │ │ Verify All     │ │ Check Sample   │
        │ Export Query   │ │ Sources        │ │ Records        │
        │                │ │ Included       │ │                │
        └────────────────┘ └────────────────┘ └────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │                                 │
                    │     GENERATE SUMMARY REPORT     │
                    │                                 │
                    │  • Test Results (Pass/Fail)     │
                    │  • Overall Statistics           │
                    │  • Coverage Percentages         │
                    │  • Failed Test Details          │
                    │  • JSON Report File             │
                    │                                 │
                    └─────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                                   ▼
          ┌──────────────────┐              ┌──────────────────┐
          │  ALL TESTS PASS  │              │  SOME TESTS FAIL │
          │       ✓          │              │       ✗          │
          │   Exit Code 0    │              │   Exit Code 1    │
          └──────────────────┘              └──────────────────┘
```

## Database Tables Tested

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ gmaps_businesses                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                │
│ • campaign_id (FK) ──────────┐                                          │
│ • business_name               │                                          │
│ • email (from Google Maps)    │                                          │
│ • linkedin_url ◄──────────────┼───── Updated by LinkedIn scraper        │
│ • facebook_url                │                                          │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┬──────────────────┐
                │               │               │                  │
                ▼               ▼               ▼                  ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ gmaps_linkedin_        │ │ gmaps_facebook_        │ │ gmaps_email_           │
│ enrichments            │ │ enrichments            │ │ verifications          │
├────────────────────────┤ ├────────────────────────┤ ├────────────────────────┤
│ • id (PK)              │ │ • id (PK)              │ │ • id (PK)              │
│ • business_id (FK) ────┼─┤ • business_id (FK) ────┼─┤ • business_id (FK) ────┤
│ • campaign_id (FK)     │ │ • campaign_id (FK)     │ │ • campaign_id (FK)     │
│ • linkedin_url         │ │ • facebook_url         │ │ • email                │
│ • emails_found []      │ │ • emails_found []      │ │ • source               │
│ • status               │ │ • status               │ │   - google_maps        │
│ • created_at           │ │ • created_at           │ │   - facebook           │
│                        │ │                        │ │   - linkedin           │
│                        │ │                        │ │ • status               │
│                        │ │                        │ │   - deliverable        │
│                        │ │                        │ │   - undeliverable      │
│                        │ │                        │ │   - risky              │
│                        │ │                        │ │   - unknown            │
│                        │ │                        │ │ • result               │
│                        │ │                        │ │ • created_at           │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

## Test Assertions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WHAT GETS VERIFIED                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ LinkedIn Scraper Tests                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BEFORE: Count enrichments                                               │
│     ↓                                                                    │
│  RUN: LinkedIn parallel scraper on 10 businesses                         │
│     ↓                                                                    │
│  AFTER: Count enrichments                                                │
│     ↓                                                                    │
│  ASSERT: new_count > old_count                                          │
│  ASSERT: gmaps_businesses.linkedin_url IS NOT NULL                      │
│  ASSERT: gmaps_email_verifications WHERE source='linkedin' > 0          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Facebook Verification Tests                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  COUNT: Facebook enrichments                                             │
│  COUNT: Email verifications WHERE source='facebook'                      │
│     ↓                                                                    │
│  ASSERT: verifications > 0                                              │
│  ASSERT: coverage_percentage > 0                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Data Integrity Tests                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  QUERY: Enrichments WHERE business_id NOT IN (SELECT id FROM businesses) │
│     ↓                                                                    │
│  ASSERT: orphaned_count == 0                                            │
│                                                                          │
│  QUERY: Enrichments WHERE campaign_id IS NULL                           │
│     ↓                                                                    │
│  ASSERT: missing_campaign_id_count == 0                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Coverage Tests                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GROUP BY: source                                                        │
│  COUNT: status = 'deliverable', 'undeliverable', 'risky', 'unknown'     │
│     ↓                                                                    │
│  ASSERT: all_sources_present >= 2                                       │
│  ASSERT: total_verifications > 0                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Export Completeness Tests                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  JOIN: businesses + linkedin_enrichments + facebook_enrichments          │
│        + email_verifications                                             │
│     ↓                                                                    │
│  ASSERT: linkedin_data_present > 0                                      │
│  ASSERT: facebook_data_present > 0                                      │
│  ASSERT: verification_data_present > 0                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Expected Timeline

```
Time    Action                                      Status
─────────────────────────────────────────────────────────────────────
0:00    Find Miami Restaurants campaign             ✓
0:01    Query 10 businesses without LinkedIn        ✓
0:02    Start LinkedIn parallel scraper             Running...
0:05    - Scraping business 1-3 (parallel)         Running...
0:08    - Scraping business 4-6 (parallel)         Running...
0:11    - Scraping business 7-10 (parallel)        Running...
0:14    Verify LinkedIn data saved                  ✓
0:15    Test Facebook verifications                 ✓
0:16    Test Google Maps verifications              ✓
0:17    Test data integrity (5 checks)             ✓
0:18    Test verification coverage                  ✓
0:19    Test export completeness                    ✓
0:20    Generate summary report                     ✓
0:21    Save JSON report file                       ✓
─────────────────────────────────────────────────────────────────────
TOTAL: ~21 minutes (mostly LinkedIn scraping)
```

## Success Criteria Summary

```
┌────────────────────────────────────────────────────────────┐
│                    ✓ ALL TESTS PASS                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  15 Assertions Verified:                                   │
│                                                            │
│  [✓] LinkedIn enrichments saved to database                │
│  [✓] Business records updated with LinkedIn URLs           │
│  [✓] LinkedIn email verifications recorded                 │
│  [✓] Facebook email verifications exist                    │
│  [✓] Facebook verification coverage > 0%                   │
│  [✓] Google Maps email verifications exist                 │
│  [✓] Google Maps verification coverage > 0%                │
│  [✓] No orphaned LinkedIn records                          │
│  [✓] No orphaned Facebook records                          │
│  [✓] No orphaned verification records                      │
│  [✓] All LinkedIn records have campaign_id                 │
│  [✓] All Facebook records have campaign_id                 │
│  [✓] All verification records have campaign_id             │
│  [✓] All verification sources present                      │
│  [✓] Export query includes all data sources                │
│                                                            │
│  Database Status: ✓ HEALTHY                                │
│  Data Integrity: ✓ VALID                                   │
│  Export Ready: ✓ YES                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```
