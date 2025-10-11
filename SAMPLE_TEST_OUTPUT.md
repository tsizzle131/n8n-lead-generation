# Sample Test Output

This document shows what you'll see when running the database verification test.

## Successful Test Run

```
================================================================================================
DATABASE VERIFICATION TEST SUITE
================================================================================================

This test will:
  1. Find the Miami Restaurants campaign
  2. Run LinkedIn parallel scraper on 10 businesses
  3. Verify all data saved to database tables:
     - gmaps_linkedin_enrichments
     - gmaps_facebook_enrichments
     - gmaps_email_verifications
     - gmaps_businesses (updated with URLs)
  4. Check data integrity and foreign key relationships
  5. Generate detailed coverage report

Test results will be saved to: test_results/database_verification_report_*.json

Press Enter to start test...

================================================================================
DATABASE VERIFICATION TEST SUITE
================================================================================

Test started: 2025-10-10T14:30:15.123456
Target campaign: Miami Restaurants

✓ Found campaign: Miami Restaurants
  Campaign ID: 550e8400-e29b-41d4-a716-446655440000
  Status: completed
  Created: 2025-09-15T08:00:00.000000

================================================================================
TEST 1: LinkedIn Parallel Scraper Database Saving
================================================================================

✓ Found 10 businesses to enrich
  1. Joe's Stone Crab - 11 Washington Ave, Miami Beach, FL
  2. Versailles Restaurant - 3555 SW 8th St, Miami, FL
  3. La Caretta - 3632 SW 8th St, Miami, FL

LinkedIn enrichments before: 145

Running LinkedIn parallel scraper...
[2025-10-10 14:31:20] Starting parallel LinkedIn enrichment for 10 businesses...
[2025-10-10 14:31:20] Processing batch 1: businesses 0-2
[2025-10-10 14:31:22] ✓ Joe's Stone Crab - Found LinkedIn profile
[2025-10-10 14:31:24] ✓ Versailles Restaurant - Found LinkedIn profile
[2025-10-10 14:31:26] ✓ La Caretta - Found LinkedIn profile
[2025-10-10 14:31:26] Processing batch 2: businesses 3-5
[2025-10-10 14:31:28] ✓ Garcia's Seafood - Found LinkedIn profile
[2025-10-10 14:31:30] ✗ Casablanca Seafood - No LinkedIn profile found
[2025-10-10 14:31:32] ✓ Kush Restaurant - Found LinkedIn profile
[2025-10-10 14:31:32] Processing batch 3: businesses 6-9
[2025-10-10 14:31:34] ✓ Yardbird Southern Table - Found LinkedIn profile
[2025-10-10 14:31:36] ✓ Michael's Genuine - Found LinkedIn profile
[2025-10-10 14:31:38] ✗ Zuma Miami - No LinkedIn profile found
[2025-10-10 14:31:40] ✓ Zak the Baker - Found LinkedIn profile

✓ Scraper completed
  Total processed: 10
  Successful: 8
  Failed: 2

✓ PASS: LinkedIn Scraper - Enrichments Saved
  Created 8 new enrichment records (before: 145, after: 153)

✓ PASS: LinkedIn Scraper - Business Records Updated
  153 businesses now have LinkedIn URLs

✓ PASS: LinkedIn Scraper - Email Verifications Saved
  16 LinkedIn email verifications recorded

Sample LinkedIn enrichment record:
  Business: Joe's Stone Crab
  LinkedIn URL: https://linkedin.com/company/joes-stone-crab
  Emails found: 2
  Status: success

================================================================================
TEST 2: Facebook Email Verification
================================================================================

Total Facebook enrichments: 198

✓ PASS: Facebook Email Verifications - Records Exist
  186 Facebook email verifications found

✓ PASS: Facebook Email Verifications - Coverage
  93.9% of Facebook enrichments have verification data

Sample Facebook verification:
  Business: Versailles Restaurant
  Email: info@versaillesrestaurant.com
  Status: deliverable
  Result: {"score": 0.95, "reason": "accepted_email"}
  Facebook URL: https://facebook.com/versaillescuban

================================================================================
TEST 3: Google Maps Email Verification
================================================================================

Businesses with Google Maps emails: 234

✓ PASS: Google Maps Email Verifications - Records Exist
  227 Google Maps email verifications found

✓ PASS: Google Maps Email Verifications - Coverage
  97.0% of Google Maps emails have verification data

Sample Google Maps verification:
  Business: La Caretta
  Email: contact@lacaretta.com
  Status: deliverable
  Result: {"score": 0.92, "reason": "accepted_email"}

================================================================================
TEST 4: Data Integrity & Foreign Key Relationships
================================================================================

✓ PASS: Data Integrity - No Orphaned LinkedIn Enrichments
  Found 0 orphaned LinkedIn enrichments (should be 0)

✓ PASS: Data Integrity - No Orphaned Facebook Enrichments
  Found 0 orphaned Facebook enrichments (should be 0)

✓ PASS: Data Integrity - No Orphaned Email Verifications
  Found 0 orphaned email verifications (should be 0)

✓ PASS: Data Integrity - LinkedIn Records Have Campaign ID
  Found 0 LinkedIn records without campaign_id (should be 0)

✓ PASS: Data Integrity - Facebook Records Have Campaign ID
  Found 0 Facebook records without campaign_id (should be 0)

✓ PASS: Data Integrity - Verification Records Have Campaign ID
  Found 0 verification records without campaign_id (should be 0)

================================================================================
TEST 5: Email Verification Coverage by Source
================================================================================

Email Verification Coverage by Source:
--------------------------------------------------------------------------------

GOOGLE_MAPS:
  Total verifications: 227
  Deliverable: 198 (87.2%)
  Undeliverable: 18
  Risky: 8
  Unknown: 3

FACEBOOK:
  Total verifications: 186
  Deliverable: 162 (87.1%)
  Undeliverable: 15
  Risky: 6
  Unknown: 3

LINKEDIN:
  Total verifications: 16
  Deliverable: 14 (87.5%)
  Undeliverable: 1
  Risky: 1
  Unknown: 0

✓ PASS: Verification Coverage - All Sources Present
  Found 3 verification sources (expected: google_maps, facebook, linkedin)

✓ PASS: Verification Coverage - Total Verifications
  Total email verifications across all sources: 429

================================================================================
TEST 6: Export Data Completeness
================================================================================

Sample export records:
--------------------------------------------------------------------------------

1. Joe's Stone Crab
   Google Maps Email: info@joesstonecrab.com
   LinkedIn URL: https://linkedin.com/company/joes-stone-crab
   Facebook URL: https://facebook.com/joesstonecrab
   Facebook Emails: 1
   LinkedIn Emails: 2
   Total Verifications: 3

2. Versailles Restaurant
   Google Maps Email: info@versaillesrestaurant.com
   LinkedIn URL: https://linkedin.com/company/versailles-restaurant
   Facebook URL: https://facebook.com/versaillescuban
   Facebook Emails: 2
   LinkedIn Emails: 1
   Total Verifications: 3

3. La Caretta
   Google Maps Email: contact@lacaretta.com
   LinkedIn URL: https://linkedin.com/company/la-caretta
   Facebook URL: https://facebook.com/lacarettarestaurant
   Facebook Emails: 1
   LinkedIn Emails: 2
   Total Verifications: 3

4. Garcia's Seafood
   Google Maps Email: info@garciasseafood.com
   LinkedIn URL: https://linkedin.com/company/garcias-seafood
   Facebook URL: N/A
   Facebook Emails: 0
   LinkedIn Emails: 1
   Total Verifications: 2

5. Kush Restaurant
   Google Maps Email: hello@kushrestaurant.com
   LinkedIn URL: https://linkedin.com/company/kush-restaurant
   Facebook URL: https://facebook.com/kushmiami
   Facebook Emails: 1
   LinkedIn Emails: 2
   Total Verifications: 3

✓ PASS: Export Completeness - LinkedIn Data Included
  4/5 sample businesses have LinkedIn data

✓ PASS: Export Completeness - Facebook Data Included
  4/5 sample businesses have Facebook data

✓ PASS: Export Completeness - Verification Data Included
  5/5 sample businesses have verification data

================================================================================
TEST SUMMARY REPORT
================================================================================

Campaign: Miami Restaurants (ID: 550e8400-e29b-41d4-a716-446655440000)

Overall Statistics:
  Total Businesses: 425
  LinkedIn Enrichments: 153
  Facebook Enrichments: 198
  Total Email Verifications: 429

Email Verifications by Source:
  Google Maps: 227
  Facebook: 186
  LinkedIn: 16

Enrichment Coverage:
  LinkedIn: 36.0%
  Facebook: 46.6%
  Email Verifications: 100.9% (may exceed 100% due to multiple emails per business)

Test Results:
  Total Tests: 15
  Passed: 15 ✓
  Failed: 0 ✗
  Success Rate: 100.0%

✓ Detailed report saved to: test_results/database_verification_report_20251010_143045.json

================================================================================
ALL TESTS PASSED ✓
================================================================================
```

---

## Failed Test Run Example

Here's what it looks like when tests fail:

```
================================================================================
DATABASE VERIFICATION TEST SUITE
================================================================================

Test started: 2025-10-10T15:45:30.123456
Target campaign: Miami Restaurants

✓ Found campaign: Miami Restaurants
  Campaign ID: 550e8400-e29b-41d4-a716-446655440000
  Status: completed
  Created: 2025-09-15T08:00:00.000000

================================================================================
TEST 1: LinkedIn Parallel Scraper Database Saving
================================================================================

✓ Found 10 businesses to enrich
  1. Joe's Stone Crab - 11 Washington Ave, Miami Beach, FL
  2. Versailles Restaurant - 3555 SW 8th St, Miami, FL
  3. La Caretta - 3632 SW 8th St, Miami, FL

LinkedIn enrichments before: 145

Running LinkedIn parallel scraper...
[2025-10-10 15:46:35] Starting parallel LinkedIn enrichment for 10 businesses...
[2025-10-10 15:46:35] Processing batch 1: businesses 0-2
[2025-10-10 15:46:38] ✓ Joe's Stone Crab - Found LinkedIn profile
[2025-10-10 15:46:40] ✓ Versailles Restaurant - Found LinkedIn profile
[2025-10-10 15:46:42] ✓ La Caretta - Found LinkedIn profile
... (processing continues)

✓ Scraper completed
  Total processed: 10
  Successful: 8
  Failed: 2

✗ FAIL: LinkedIn Scraper - Enrichments Saved
  Created 0 new enrichment records (before: 145, after: 145)

✗ FAIL: LinkedIn Scraper - Business Records Updated
  145 businesses now have LinkedIn URLs (expected increase)

✗ FAIL: LinkedIn Scraper - Email Verifications Saved
  0 LinkedIn email verifications recorded

================================================================================
TEST 4: Data Integrity & Foreign Key Relationships
================================================================================

✓ PASS: Data Integrity - No Orphaned LinkedIn Enrichments
  Found 0 orphaned LinkedIn enrichments (should be 0)

✗ FAIL: Data Integrity - LinkedIn Records Have Campaign ID
  Found 12 LinkedIn records without campaign_id (should be 0)

✓ PASS: Data Integrity - Facebook Records Have Campaign ID
  Found 0 Facebook records without campaign_id (should be 0)

✗ FAIL: Data Integrity - Verification Records Have Campaign ID
  Found 8 verification records without campaign_id (should be 0)

================================================================================
TEST SUMMARY REPORT
================================================================================

Campaign: Miami Restaurants (ID: 550e8400-e29b-41d4-a716-446655440000)

Overall Statistics:
  Total Businesses: 425
  LinkedIn Enrichments: 145
  Facebook Enrichments: 198
  Total Email Verifications: 413

Test Results:
  Total Tests: 15
  Passed: 10 ✓
  Failed: 5 ✗
  Success Rate: 66.7%

Failed Tests:
  - LinkedIn Scraper - Enrichments Saved
    Created 0 new enrichment records (before: 145, after: 145)

  - LinkedIn Scraper - Business Records Updated
    145 businesses now have LinkedIn URLs (expected increase)

  - LinkedIn Scraper - Email Verifications Saved
    0 LinkedIn email verifications recorded

  - Data Integrity - LinkedIn Records Have Campaign ID
    Found 12 LinkedIn records without campaign_id (should be 0)

  - Data Integrity - Verification Records Have Campaign ID
    Found 8 verification records without campaign_id (should be 0)

✓ Detailed report saved to: test_results/database_verification_report_20251010_154545.json

================================================================================
SOME TESTS FAILED ✗
================================================================================
```

---

## JSON Report File Sample

File: `test_results/database_verification_report_20251010_143045.json`

```json
{
  "timestamp": "2025-10-10T14:30:15.123456",
  "tests_passed": 15,
  "tests_failed": 0,
  "tests_total": 15,
  "details": [
    {
      "test": "LinkedIn Scraper - Enrichments Saved",
      "status": "✓ PASS",
      "details": "Created 8 new enrichment records (before: 145, after: 153)"
    },
    {
      "test": "LinkedIn Scraper - Business Records Updated",
      "status": "✓ PASS",
      "details": "153 businesses now have LinkedIn URLs"
    },
    {
      "test": "LinkedIn Scraper - Email Verifications Saved",
      "status": "✓ PASS",
      "details": "16 LinkedIn email verifications recorded"
    },
    {
      "test": "Facebook Email Verifications - Records Exist",
      "status": "✓ PASS",
      "details": "186 Facebook email verifications found"
    },
    {
      "test": "Facebook Email Verifications - Coverage",
      "status": "✓ PASS",
      "details": "93.9% of Facebook enrichments have verification data"
    },
    {
      "test": "Google Maps Email Verifications - Records Exist",
      "status": "✓ PASS",
      "details": "227 Google Maps email verifications found"
    },
    {
      "test": "Google Maps Email Verifications - Coverage",
      "status": "✓ PASS",
      "details": "97.0% of Google Maps emails have verification data"
    },
    {
      "test": "Data Integrity - No Orphaned LinkedIn Enrichments",
      "status": "✓ PASS",
      "details": "Found 0 orphaned LinkedIn enrichments (should be 0)"
    },
    {
      "test": "Data Integrity - No Orphaned Facebook Enrichments",
      "status": "✓ PASS",
      "details": "Found 0 orphaned Facebook enrichments (should be 0)"
    },
    {
      "test": "Data Integrity - No Orphaned Email Verifications",
      "status": "✓ PASS",
      "details": "Found 0 orphaned email verifications (should be 0)"
    },
    {
      "test": "Data Integrity - LinkedIn Records Have Campaign ID",
      "status": "✓ PASS",
      "details": "Found 0 LinkedIn records without campaign_id (should be 0)"
    },
    {
      "test": "Data Integrity - Facebook Records Have Campaign ID",
      "status": "✓ PASS",
      "details": "Found 0 Facebook records without campaign_id (should be 0)"
    },
    {
      "test": "Data Integrity - Verification Records Have Campaign ID",
      "status": "✓ PASS",
      "details": "Found 0 verification records without campaign_id (should be 0)"
    },
    {
      "test": "Verification Coverage - All Sources Present",
      "status": "✓ PASS",
      "details": "Found 3 verification sources (expected: google_maps, facebook, linkedin)"
    },
    {
      "test": "Verification Coverage - Total Verifications",
      "status": "✓ PASS",
      "details": "Total email verifications across all sources: 429"
    }
  ],
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Miami Restaurants"
  },
  "statistics": {
    "total_businesses": 425,
    "linkedin_enrichments": 153,
    "facebook_enrichments": 198,
    "total_verifications": 429,
    "gmaps_verifications": 227,
    "facebook_verifications": 186,
    "linkedin_verifications": 16
  }
}
```

---

## Interpreting the Output

### What Success Looks Like

**Key Indicators:**
- ✓ All 15 tests pass
- New LinkedIn enrichments created
- Business records updated with URLs
- Email verifications recorded for all sources
- No orphaned records (0 in all integrity checks)
- All records have campaign_id set
- Coverage percentages > 0% for all sources
- Export includes data from all sources

**Green Flags:**
- Deliverable email rate 80-90%
- Verification coverage 90%+
- All sources present (google_maps, facebook, linkedin)
- Foreign key relationships intact

### What Failure Looks Like

**Red Flags:**
- ✗ 0 new enrichment records created → Scraper not saving
- ✗ Orphaned records > 0 → Foreign key issues
- ✗ Missing campaign_id → Parameter not being passed
- ✗ Verification coverage 0% → Verifications not being saved
- ✗ Source missing → That enrichment source broken

**Common Failure Patterns:**

1. **Scraper runs but doesn't save:**
   ```
   ✗ FAIL: LinkedIn Scraper - Enrichments Saved
     Created 0 new enrichment records (before: 145, after: 145)
   ```
   → Check `save_linkedin_enrichment()` method

2. **Data saved but no campaign_id:**
   ```
   ✗ FAIL: Data Integrity - LinkedIn Records Have Campaign ID
     Found 12 LinkedIn records without campaign_id (should be 0)
   ```
   → Check campaign_id parameter passing

3. **Orphaned records:**
   ```
   ✗ FAIL: Data Integrity - No Orphaned LinkedIn Enrichments
     Found 8 orphaned LinkedIn enrichments (should be 0)
   ```
   → Check foreign key constraints and delete cascades

4. **Missing verifications:**
   ```
   ✗ FAIL: LinkedIn Email Verifications - Records Exist
     0 LinkedIn email verifications recorded
   ```
   → Check email verification save logic in scraper

### Next Steps Based on Results

**If 100% pass:**
- System is healthy
- All data being saved correctly
- Export will include all enrichment data
- Ready for production use

**If 80-99% pass:**
- Check specific failed tests
- May be data-dependent (e.g., no Facebook URLs to enrich)
- Review warnings in output

**If <80% pass:**
- Critical issues exist
- Review all failed tests
- Check database schema
- Verify scraper implementations
- Fix and re-run test
