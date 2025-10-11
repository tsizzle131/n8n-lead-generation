# Database Verification Test Suite

> Comprehensive testing framework to verify all database saving and email verification works correctly across LinkedIn, Facebook, and Google Maps enrichment sources.

## Quick Start

```bash
./run_database_verification_test.sh
```

## What This Tests

✅ **LinkedIn Parallel Scraper** - Verifies data saves to all tables correctly
✅ **Facebook Email Verification** - Confirms verifications are recorded
✅ **Google Maps Email Verification** - Validates verification pipeline
✅ **Data Integrity** - Checks foreign keys and relationships
✅ **Campaign ID Propagation** - Ensures all records linked to campaigns
✅ **Verification Coverage** - Analyzes deliverable rates by source
✅ **Export Completeness** - Validates CSV export includes all data

**15 comprehensive tests** covering all aspects of database operations.

## Expected Results

```
ALL TESTS PASSED ✓

Test Results:
  Total Tests: 15
  Passed: 15 ✓
  Failed: 0 ✗
  Success Rate: 100.0%

Overall Statistics:
  Total Businesses: 425
  LinkedIn Enrichments: 153 (36.0%)
  Facebook Enrichments: 198 (46.6%)
  Email Verifications: 429 (100.9%)
```

## What Success Means

- All enrichment data being saved correctly
- All email verifications recorded with proper source tracking
- No orphaned records or foreign key issues
- Campaign exports include all enrichment data
- System ready for production use

## Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| **QUICK_TEST_GUIDE.md** | Quick reference | 2 min |
| **DATABASE_VERIFICATION_TEST_SUMMARY.md** | Complete overview | 5 min |
| **DATABASE_VERIFICATION_TEST_README.md** | Full documentation | 15 min |
| **TEST_FLOW_DIAGRAM.md** | Visual diagrams | 10 min |
| **SAMPLE_TEST_OUTPUT.md** | Example outputs | 8 min |
| **DATABASE_TEST_INDEX.md** | Navigation guide | 3 min |

## Files Created

```
Database Verification Test Suite/
├── test_database_verification_complete.py  (~600 lines, 25KB)
├── run_database_verification_test.sh       (Runner script, 1.7KB)
├── QUICK_TEST_GUIDE.md                     (Quick start, 2.3KB)
├── DATABASE_VERIFICATION_TEST_SUMMARY.md   (Overview, 11KB)
├── DATABASE_VERIFICATION_TEST_README.md    (Full docs, 12KB)
├── TEST_FLOW_DIAGRAM.md                    (Diagrams, 28KB)
├── SAMPLE_TEST_OUTPUT.md                   (Examples, 18KB)
├── DATABASE_TEST_INDEX.md                  (Navigation, 10KB)
└── test_results/                           (Generated reports)
    └── database_verification_report_*.json

Total: 8 files | ~110KB | 100+ pages of documentation
```

## Key Features

### Comprehensive Testing
- Tests all 4 database tables involved in enrichment
- Verifies foreign key relationships
- Checks data integrity across tables
- Validates campaign_id propagation
- Analyzes verification coverage by source

### Real LinkedIn Scraping
- Runs actual LinkedIn parallel scraper
- Tests with 10 real businesses
- Verifies all save operations
- Checks email verification pipeline
- Validates business record updates

### Detailed Reporting
- Real-time console output
- Sample records shown
- Coverage statistics
- JSON report file generated
- Pass/fail for each assertion

### CI/CD Ready
- Exit codes for automation
- Machine-readable JSON output
- Configurable test parameters
- Fast failure detection
- Detailed error reporting

## Database Tables Tested

```
gmaps_businesses
├── Updated with LinkedIn URLs
├── Updated with Facebook URLs
└── Contains verified emails

gmaps_linkedin_enrichments
├── New records from scraper
└── Linked via foreign keys

gmaps_facebook_enrichments
├── Email verification data
└── Proper campaign association

gmaps_email_verifications
├── Google Maps source
├── Facebook source
└── LinkedIn source
```

## Test Execution Flow

```
1. Find Miami Restaurants campaign
   ↓
2. Get 10 businesses without LinkedIn
   ↓
3. Run LinkedIn parallel scraper
   ↓
4. Verify all data saved correctly
   ↓
5. Check verification coverage
   ↓
6. Validate data integrity
   ↓
7. Test export completeness
   ↓
8. Generate detailed report
```

## Use Cases

### Pre-Deployment
```bash
./run_database_verification_test.sh
# Verify 100% pass before deploying
```

### After Schema Changes
```bash
# Apply migration, then:
./run_database_verification_test.sh
# Ensure no regressions
```

### Regular Health Checks
```bash
# Weekly or bi-weekly
./run_database_verification_test.sh
# Monitor verification rates
```

### CI/CD Integration
```yaml
- name: Database Verification
  run: python3 test_database_verification_complete.py
```

## Customization

### Test Different Campaign
```python
# Line 32 in test_database_verification_complete.py
self.campaign_name = "Your Campaign Name"
```

### Test More Businesses
```python
# Line 86
LIMIT 10  # Change to 20, 50, etc.
```

### Add Custom Tests
See `DATABASE_VERIFICATION_TEST_README.md` for detailed instructions.

## Troubleshooting

### Common Issues

**No campaign found**
- Check campaign name matches
- View available campaigns in output

**No businesses to test**
- Campaign already fully enriched
- Use different campaign

**Tests fail**
- Review failed test output
- Check JSON report for details
- See `SAMPLE_TEST_OUTPUT.md` for interpretation

## Support

1. **Quick help:** Read `QUICK_TEST_GUIDE.md`
2. **Full details:** Read `DATABASE_VERIFICATION_TEST_README.md`
3. **Visual guide:** View `TEST_FLOW_DIAGRAM.md`
4. **Example output:** Check `SAMPLE_TEST_OUTPUT.md`
5. **Navigation:** Use `DATABASE_TEST_INDEX.md`

## Requirements

- Python 3.7+
- Supabase credentials configured
- Apify API key in `.app-state.json`
- Campaign with businesses to test
- Dependencies:
  - `gmaps_supabase_manager.py`
  - `linkedin_scraper_parallel.py`
  - Standard library modules

## Output

### Console
Real-time test execution with pass/fail for each test.

### JSON Report
`test_results/database_verification_report_YYYYMMDD_HHMMSS.json`
- Complete test results
- Campaign statistics
- Failed test details
- Machine-readable format

## Performance

**Expected duration:** ~20 minutes
- Setup: 2 seconds
- LinkedIn scraping: 10-15 minutes
- Database queries: 5 seconds per test
- Report generation: 2 seconds

## Success Criteria

Required for production deployment:
- ✅ All 15 tests pass
- ✅ No orphaned records
- ✅ All campaign_ids set
- ✅ Verification coverage > 90%
- ✅ All sources present

## Next Steps

### First Time
1. Read `QUICK_TEST_GUIDE.md`
2. Run `./run_database_verification_test.sh`
3. Review results
4. Check `SAMPLE_TEST_OUTPUT.md`

### Going Deeper
1. Read `DATABASE_VERIFICATION_TEST_SUMMARY.md`
2. View `TEST_FLOW_DIAGRAM.md`
3. Study `DATABASE_VERIFICATION_TEST_README.md`

### Integration
1. Add to CI/CD pipeline
2. Set up regular health checks
3. Monitor verification rates
4. Track enrichment coverage

---

**Ready to test?**

```bash
./run_database_verification_test.sh
```

**Need help?**

See `DATABASE_TEST_INDEX.md` for complete navigation.
