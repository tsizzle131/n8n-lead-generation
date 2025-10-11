# Quick Test Guide - Database Verification

## TL;DR - Run This Now

```bash
./run_database_verification_test.sh
```

## What It Does

Tests that all database saving and email verification works across:
- ✓ LinkedIn parallel scraper
- ✓ Facebook enrichment
- ✓ Google Maps scraping
- ✓ Email verifications from all sources

## Key Tests (15 Total)

1. **LinkedIn scraper saves to database** - Runs on 10 businesses, verifies data saved
2. **Facebook verifications recorded** - Checks email verifications exist
3. **Google Maps verifications recorded** - Checks email verifications exist
4. **No orphaned records** - All foreign keys valid
5. **All records have campaign_id** - Data integrity check
6. **Verification coverage by source** - Breakdown of deliverable/undeliverable
7. **Export includes all data** - Simulates CSV export query

## Expected Output

```
✓ PASS: LinkedIn Scraper - Enrichments Saved
✓ PASS: LinkedIn Scraper - Business Records Updated
✓ PASS: LinkedIn Scraper - Email Verifications Saved
✓ PASS: Facebook Email Verifications - Records Exist
✓ PASS: Google Maps Email Verifications - Records Exist
✓ PASS: Data Integrity - No Orphaned Records
... (15 tests total)

ALL TESTS PASSED ✓
```

## What Success Means

- All enrichment data is being saved to database
- All email verifications are being recorded
- Foreign key relationships are valid
- Campaign exports will include all data
- System is working correctly end-to-end

## What Failure Means

Check the failed test output for specifics:
- **Enrichments not saved** → Check scraper save logic
- **Orphaned records** → Check foreign key setup
- **Missing verifications** → Check verification save logic
- **Missing campaign_id** → Check campaign_id parameter passing

## Files Created

1. `test_database_verification_complete.py` - Main test script
2. `run_database_verification_test.sh` - Runner script
3. `DATABASE_VERIFICATION_TEST_README.md` - Full documentation
4. `test_results/database_verification_report_*.json` - Test results

## View Results

After running, check:
- Console output for immediate pass/fail
- `test_results/database_verification_report_*.json` for detailed report

## Need More Info?

See `DATABASE_VERIFICATION_TEST_README.md` for:
- Detailed explanation of each test
- How to customize tests
- Troubleshooting guide
- Integration with CI/CD
