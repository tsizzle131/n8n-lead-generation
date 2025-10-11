# Database Verification Test Suite

## Overview

This comprehensive test script verifies that all database saving and email verification works correctly across all enrichment sources (LinkedIn, Facebook, Google Maps).

## What It Tests

### 1. LinkedIn Parallel Scraper Database Saving
- Finds 10 businesses without LinkedIn enrichment in Miami Restaurants campaign
- Runs the parallel scraper on those businesses
- Verifies records saved to `gmaps_linkedin_enrichments` table
- Verifies `gmaps_businesses` table updated with LinkedIn URLs
- Verifies email verifications saved to `gmaps_email_verifications` table
- Shows before/after counts and sample records

### 2. Facebook Email Verification
- Counts total Facebook enrichments for campaign
- Checks if Facebook emails have verification data in `gmaps_email_verifications`
- Calculates verification coverage percentage
- Shows sample Facebook verification record with all fields

### 3. Google Maps Email Verification
- Counts businesses with emails from initial Google Maps scrape
- Checks if Google Maps emails have verification data
- Calculates verification coverage percentage
- Shows sample Google Maps verification record

### 4. Data Integrity & Foreign Key Relationships
Tests for data integrity issues:
- **No orphaned LinkedIn enrichments** - All LinkedIn records link to valid businesses
- **No orphaned Facebook enrichments** - All Facebook records link to valid businesses
- **No orphaned email verifications** - All verification records link to valid businesses
- **All records have campaign_id** - Ensures proper campaign association
- **Foreign key relationships** - Verifies all joins work correctly

### 5. Email Verification Coverage by Source
- Breaks down verifications by source (google_maps, facebook, linkedin)
- Shows counts for each verification status:
  - Deliverable
  - Undeliverable
  - Risky
  - Unknown
- Calculates deliverable percentage per source
- Ensures all sources are represented

### 6. Export Data Completeness
- Simulates the export query that would be used for CSV export
- Verifies that export would include:
  - Google Maps emails
  - LinkedIn URLs and emails
  - Facebook URLs and emails
  - Email verification data
- Shows 5 sample export records with all fields populated
- Ensures data from all sources is accessible in export

## Running the Test

### Option 1: Using the Runner Script (Recommended)
```bash
./run_database_verification_test.sh
```

This provides a user-friendly interface with:
- Clear explanation of what will be tested
- Confirmation prompt before running
- Color-coded pass/fail output
- Summary of results

### Option 2: Direct Python Execution
```bash
python3 test_database_verification_complete.py
```

## Test Output

### Console Output
The test provides detailed console output including:
- Test setup and campaign selection
- Each test as it runs with pass/fail status
- Detailed statistics and sample records
- Final summary report with overall pass/fail

### Example Output:
```
================================================================================
DATABASE VERIFICATION TEST SUITE
================================================================================

Test started: 2025-10-10T10:30:00
Target campaign: Miami Restaurants

✓ Found campaign: Miami Restaurants
  Campaign ID: abc-123-def
  Status: completed
  Created: 2025-09-15T08:00:00

================================================================================
TEST 1: LinkedIn Parallel Scraper Database Saving
================================================================================

✓ Found 10 businesses to enrich
  1. Joe's Pizza - 123 Main St, Miami, FL
  2. Cafe Delight - 456 Oak Ave, Miami, FL
  3. Taco Palace - 789 Beach Rd, Miami, FL

LinkedIn enrichments before: 45

Running LinkedIn parallel scraper...

✓ Scraper completed
  Total processed: 10
  Successful: 8
  Failed: 2

✓ PASS: LinkedIn Scraper - Enrichments Saved
  Created 8 new enrichment records (before: 45, after: 53)

✓ PASS: LinkedIn Scraper - Business Records Updated
  53 businesses now have LinkedIn URLs

✓ PASS: LinkedIn Scraper - Email Verifications Saved
  12 LinkedIn email verifications recorded

Sample LinkedIn enrichment record:
  Business: Joe's Pizza
  LinkedIn URL: https://linkedin.com/company/joes-pizza
  Emails found: 2
  Status: success

... (additional tests)

================================================================================
TEST SUMMARY REPORT
================================================================================

Campaign: Miami Restaurants (ID: abc-123-def)

Overall Statistics:
  Total Businesses: 150
  LinkedIn Enrichments: 53
  Facebook Enrichments: 82
  Total Email Verifications: 245

Email Verifications by Source:
  Google Maps: 98
  Facebook: 95
  LinkedIn: 52

Enrichment Coverage:
  LinkedIn: 35.3%
  Facebook: 54.7%
  Email Verifications: 163.3% (may exceed 100% due to multiple emails per business)

Test Results:
  Total Tests: 15
  Passed: 15 ✓
  Failed: 0 ✗
  Success Rate: 100.0%

✓ Detailed report saved to: test_results/database_verification_report_20251010_103045.json

================================================================================
ALL TESTS PASSED ✓
================================================================================
```

### JSON Report File
A detailed JSON report is saved to `test_results/database_verification_report_*.json`:

```json
{
  "timestamp": "2025-10-10T10:30:00",
  "tests_passed": 15,
  "tests_failed": 0,
  "tests_total": 15,
  "details": [
    {
      "test": "LinkedIn Scraper - Enrichments Saved",
      "status": "✓ PASS",
      "details": "Created 8 new enrichment records (before: 45, after: 53)"
    },
    // ... more test details
  ],
  "campaign": {
    "id": "abc-123-def",
    "name": "Miami Restaurants"
  },
  "statistics": {
    "total_businesses": 150,
    "linkedin_enrichments": 53,
    "facebook_enrichments": 82,
    "total_verifications": 245,
    "gmaps_verifications": 98,
    "facebook_verifications": 95,
    "linkedin_verifications": 52
  }
}
```

## What Success Looks Like

### All Tests Pass
- ✓ 15/15 tests passed
- ✓ No orphaned records
- ✓ All foreign keys valid
- ✓ All sources have verifications
- ✓ Export includes all data

### Sample Verification Coverage
- Google Maps: 65% of emails verified
- Facebook: 72% of emails verified
- LinkedIn: 68% of emails verified

## What Failure Looks Like

### Common Failure Scenarios

**Missing LinkedIn Enrichments:**
```
✗ FAIL: LinkedIn Scraper - Enrichments Saved
  Created 0 new enrichment records (before: 45, after: 45)
```
→ Indicates LinkedIn scraper is not saving to database

**Orphaned Records:**
```
✗ FAIL: Data Integrity - No Orphaned LinkedIn Enrichments
  Found 12 orphaned LinkedIn enrichments (should be 0)
```
→ Indicates foreign key relationship issues

**Missing Verifications:**
```
✗ FAIL: Facebook Email Verifications - Records Exist
  0 Facebook email verifications found
```
→ Indicates email verification not being saved for Facebook source

**Missing Campaign IDs:**
```
✗ FAIL: Data Integrity - LinkedIn Records Have Campaign ID
  Found 8 LinkedIn records without campaign_id (should be 0)
```
→ Indicates campaign_id not being set during save

## Database Tables Tested

### gmaps_businesses
- Primary business records from Google Maps scrape
- Updated with LinkedIn URLs, Facebook URLs
- Contains initial emails from Google Maps

### gmaps_linkedin_enrichments
- LinkedIn enrichment results
- Linked to businesses via `business_id`
- Contains LinkedIn URLs and emails found
- Must have `campaign_id` set

### gmaps_facebook_enrichments
- Facebook enrichment results
- Linked to businesses via `business_id`
- Contains Facebook URLs and emails found
- Must have `campaign_id` set

### gmaps_email_verifications
- Email verification results from all sources
- Linked to businesses via `business_id`
- Tagged with source: 'google_maps', 'facebook', or 'linkedin'
- Contains verification status and result
- Must have `campaign_id` set

## Requirements

### Python Dependencies
- `gmaps_supabase_manager.py` - Database operations
- `linkedin_scraper_parallel.py` - LinkedIn enrichment
- `asyncio` - Async execution
- Supabase credentials in environment

### Campaign Requirements
- Must have a campaign named "Miami Restaurants" (or modify script)
- Campaign should have businesses already scraped
- Some businesses should be without LinkedIn enrichment for testing

## Customization

### Test Different Campaign
Edit line 32 in `test_database_verification_complete.py`:
```python
self.campaign_name = "Your Campaign Name"
```

### Test More/Fewer Businesses
Edit line 86 (LinkedIn scraper query):
```python
LIMIT 10  # Change to desired number
```

### Add Custom Tests
Add new test methods following the pattern:
```python
async def test_your_custom_test(self):
    """Test X: Description"""
    print("\n" + "=" * 80)
    print("TEST X: Your Test Name")
    print("=" * 80)

    # Run queries
    result = self.db.execute_query("""
        YOUR SQL QUERY
    """, (self.campaign_id,))

    # Assert and log
    self.log_test(
        "Test Name",
        condition,
        "Details about what was tested"
    )
```

Then add to `run_all_tests()`:
```python
await self.test_your_custom_test()
```

## Troubleshooting

### "Could not find campaign"
- Check available campaigns in output
- Update `campaign_name` variable to match existing campaign

### "No businesses found without LinkedIn enrichment"
- Campaign already fully enriched
- Use different campaign
- Or modify query to re-enrich existing businesses

### Database Connection Errors
- Check Supabase credentials in environment
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set
- Test database connection manually

### LinkedIn Scraper Fails
- Check Apify API key is set
- Verify sufficient Apify credits
- Check API rate limits

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Database Verification Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run database verification tests
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python3 test_database_verification_complete.py
```

## Interpreting Results

### 100% Pass Rate
System is working correctly:
- All data being saved
- All foreign keys valid
- All verifications recorded
- Export will include all data

### 80-99% Pass Rate
Minor issues:
- Check failed tests in output
- May be data-dependent (e.g., no Facebook URLs found)
- Review failed test details

### <80% Pass Rate
Significant issues:
- Review all failed tests
- Check database schema
- Verify scraper implementations
- Check foreign key constraints

## Next Steps After Testing

### If Tests Pass
1. Review verification coverage percentages
2. Check deliverable email rates
3. Run campaign export to verify CSV includes all data
4. Monitor production campaigns

### If Tests Fail
1. Review failed test output
2. Check database schema matches expected
3. Verify scraper code saves to correct tables
4. Add logging to identify where save fails
5. Fix issues and re-run test
6. Create Linear issues for bugs found

## Support

For issues or questions:
1. Check console output for error details
2. Review JSON report file for full test data
3. Check database directly using Supabase dashboard
4. Review scraper logs for enrichment failures
5. Create Linear issue with test results attached
