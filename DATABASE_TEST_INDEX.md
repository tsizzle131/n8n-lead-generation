# Database Verification Test - Complete Index

## Start Here

### To Run the Test
```bash
./run_database_verification_test.sh
```

### To Understand What It Does
Read: `QUICK_TEST_GUIDE.md` (2 minute read)

---

## Documentation Structure

```
DATABASE VERIFICATION TEST SUITE
│
├─ 🚀 QUICK_TEST_GUIDE.md
│   └─ TL;DR - Fast overview, run command, what success looks like
│      READ THIS FIRST if you just want to run the test
│
├─ 📊 DATABASE_VERIFICATION_TEST_SUMMARY.md
│   └─ Complete summary of all files, tests, and use cases
│      READ THIS for an overview of everything
│
├─ 📖 DATABASE_VERIFICATION_TEST_README.md
│   └─ Comprehensive documentation with every detail
│      READ THIS for deep understanding and troubleshooting
│
├─ 🎨 TEST_FLOW_DIAGRAM.md
│   └─ Visual diagrams of test flow and database structure
│      READ THIS for visual understanding
│
├─ 📝 SAMPLE_TEST_OUTPUT.md
│   └─ Examples of what test output looks like
│      READ THIS to know what to expect
│
└─ 📑 DATABASE_TEST_INDEX.md (this file)
    └─ Navigation guide to all documentation
```

---

## Quick Navigation

### I want to...

#### **Run the test**
→ Execute: `./run_database_verification_test.sh`
→ Read: `QUICK_TEST_GUIDE.md`

#### **Understand what gets tested**
→ Read: `DATABASE_VERIFICATION_TEST_SUMMARY.md` - "What Gets Tested" section
→ View: `TEST_FLOW_DIAGRAM.md` - Visual flow

#### **See what the output looks like**
→ Read: `SAMPLE_TEST_OUTPUT.md` - Complete examples

#### **Troubleshoot a failure**
→ Read: `DATABASE_VERIFICATION_TEST_README.md` - "Troubleshooting" section
→ Read: `SAMPLE_TEST_OUTPUT.md` - "Interpreting the Output"

#### **Customize the test**
→ Read: `DATABASE_VERIFICATION_TEST_README.md` - "Customization" section
→ Edit: `test_database_verification_complete.py`

#### **Integrate with CI/CD**
→ Read: `DATABASE_VERIFICATION_TEST_README.md` - "Integration with CI/CD"

#### **Understand the database schema**
→ View: `TEST_FLOW_DIAGRAM.md` - "Database Tables Tested" diagram

#### **See test assertions**
→ View: `TEST_FLOW_DIAGRAM.md` - "Test Assertions" section

#### **Check test coverage**
→ Read: `DATABASE_VERIFICATION_TEST_SUMMARY.md` - "15 Comprehensive Tests"

#### **Understand success criteria**
→ Read: `DATABASE_VERIFICATION_TEST_SUMMARY.md` - "Success Criteria"
→ Read: `SAMPLE_TEST_OUTPUT.md` - "What Success Looks Like"

---

## File Purposes

### Executable Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `test_database_verification_complete.py` | Main test script | Run directly with Python |
| `run_database_verification_test.sh` | User-friendly wrapper | Preferred way to run |

### Documentation Files

| File | Audience | Read Time | Purpose |
|------|----------|-----------|---------|
| `QUICK_TEST_GUIDE.md` | Everyone | 2 min | Fast overview and run instructions |
| `DATABASE_VERIFICATION_TEST_SUMMARY.md` | Developers | 5 min | Complete summary of all components |
| `DATABASE_VERIFICATION_TEST_README.md` | Developers | 15 min | Deep dive with all details |
| `TEST_FLOW_DIAGRAM.md` | Visual learners | 10 min | Diagrams and flow charts |
| `SAMPLE_TEST_OUTPUT.md` | Testers | 8 min | Example outputs and interpretation |
| `DATABASE_TEST_INDEX.md` | New users | 3 min | Navigation guide (this file) |

---

## Test Overview

### What It Tests
1. **LinkedIn Scraper** - Saves enrichments, updates URLs, records verifications
2. **Facebook Verification** - Email verifications exist and have coverage
3. **Google Maps Verification** - Email verifications exist and have coverage
4. **Data Integrity** - No orphaned records, valid foreign keys
5. **Campaign ID Propagation** - All records have campaign_id set
6. **Verification Coverage** - All sources present with deliverable counts
7. **Export Completeness** - CSV export includes all enrichment data

### Database Tables Tested
- `gmaps_businesses` - Core business records
- `gmaps_linkedin_enrichments` - LinkedIn enrichment results
- `gmaps_facebook_enrichments` - Facebook enrichment results
- `gmaps_email_verifications` - Email verification results from all sources

### Success Indicators
- ✓ 15/15 tests pass
- ✓ No orphaned records (0 in all checks)
- ✓ All records have campaign_id
- ✓ Verification coverage > 90%
- ✓ Deliverable rate 80-90%
- ✓ All sources present (google_maps, facebook, linkedin)

---

## Common Use Cases

### Pre-Deployment Checklist
```bash
# 1. Run the test
./run_database_verification_test.sh

# 2. Verify 100% pass rate
# Check console output for "ALL TESTS PASSED ✓"

# 3. Review coverage statistics
# Check deliverable email percentages

# 4. Confirm export completeness
# Verify all sources included in sample export

# 5. Save test report
# Copy test_results/database_verification_report_*.json
```

### After Schema Changes
```bash
# 1. Apply migration
# Run your database migration

# 2. Run verification test
./run_database_verification_test.sh

# 3. Check for integrity issues
# Look for orphaned records or FK violations

# 4. Verify campaign_id propagation
# Ensure new fields have campaign_id

# 5. Test export query
# Confirm CSV export still works
```

### Regular Health Check
```bash
# Weekly or bi-weekly
./run_database_verification_test.sh

# Monitor trends:
# - Verification coverage %
# - Deliverable email rate
# - Enrichment coverage %
# - Data integrity issues
```

---

## Reading Order

### First Time Users
1. `QUICK_TEST_GUIDE.md` - Get started fast
2. `SAMPLE_TEST_OUTPUT.md` - See what to expect
3. Run the test: `./run_database_verification_test.sh`
4. `DATABASE_VERIFICATION_TEST_SUMMARY.md` - Understand the big picture

### Developers
1. `DATABASE_VERIFICATION_TEST_SUMMARY.md` - Overview
2. `TEST_FLOW_DIAGRAM.md` - Visual understanding
3. `DATABASE_VERIFICATION_TEST_README.md` - Deep dive
4. `test_database_verification_complete.py` - Code review

### Troubleshooters
1. `SAMPLE_TEST_OUTPUT.md` - Compare with your output
2. `DATABASE_VERIFICATION_TEST_README.md` - Troubleshooting section
3. Test results JSON file - Check detailed data
4. Create Linear issue with findings

### Visual Learners
1. `TEST_FLOW_DIAGRAM.md` - All diagrams
2. `SAMPLE_TEST_OUTPUT.md` - Example outputs
3. `DATABASE_VERIFICATION_TEST_README.md` - Reference

---

## Quick Reference

### Run Commands
```bash
# Recommended way
./run_database_verification_test.sh

# Direct Python
python3 test_database_verification_complete.py

# Make executable
chmod +x run_database_verification_test.sh
chmod +x test_database_verification_complete.py
```

### Configuration
```python
# In test_database_verification_complete.py

# Line 32 - Change campaign name
self.campaign_name = "Miami Restaurants"

# Line 86 - Change business count
LIMIT 10  # Number of businesses to test
```

### Output Locations
```
Console: Real-time test output
JSON Report: test_results/database_verification_report_YYYYMMDD_HHMMSS.json
```

### Success Criteria
```
✓ All 15 tests pass
✓ No orphaned records
✓ All campaign_ids set
✓ Verification coverage > 0%
✓ All sources present
```

---

## Dependencies

### Python Modules
- `gmaps_supabase_manager.py` - Database operations
- `linkedin_scraper_parallel.py` - LinkedIn enrichment
- `asyncio` - Async execution
- Standard library: `sys`, `pathlib`, `datetime`, `json`

### External Services
- Supabase - Database connection
- Apify - LinkedIn scraping
- Bouncer - Email verification

### Environment
- Python 3.7+
- Supabase credentials configured
- Apify API key in `.app-state.json`
- Campaign with businesses to test

---

## Support

### Getting Help
1. Check documentation in this index
2. Review test output for error details
3. Check JSON report for full data
4. Search Linear for similar issues
5. Create new Linear issue with:
   - Test output (copy/paste)
   - JSON report (attach file)
   - Expected vs actual results
   - Database schema screenshot

### Common Questions

**Q: How long does the test take?**
A: ~20 minutes (mostly LinkedIn scraping)

**Q: Can I test a different campaign?**
A: Yes, edit `campaign_name` on line 32

**Q: What if some tests fail?**
A: Check `SAMPLE_TEST_OUTPUT.md` "Interpreting the Output" section

**Q: Can I add custom tests?**
A: Yes, see `DATABASE_VERIFICATION_TEST_README.md` "Customization" section

**Q: How do I run in CI/CD?**
A: See `DATABASE_VERIFICATION_TEST_README.md` "Integration with CI/CD" section

---

## Complete File Listing

```
Database Verification Test Suite Files:

Executable:
├── test_database_verification_complete.py (Main test script)
└── run_database_verification_test.sh (Runner script)

Documentation:
├── QUICK_TEST_GUIDE.md (Quick start - 2 min read)
├── DATABASE_VERIFICATION_TEST_SUMMARY.md (Complete summary - 5 min read)
├── DATABASE_VERIFICATION_TEST_README.md (Full documentation - 15 min read)
├── TEST_FLOW_DIAGRAM.md (Visual diagrams - 10 min read)
├── SAMPLE_TEST_OUTPUT.md (Example outputs - 8 min read)
└── DATABASE_TEST_INDEX.md (This navigation guide - 3 min read)

Generated:
└── test_results/
    └── database_verification_report_*.json (Test reports)

Total: 8 files
Lines of Code: ~600+ (Python test script)
Documentation Pages: ~100+ (Markdown docs)
```

---

## Next Steps

### To Get Started
1. Read `QUICK_TEST_GUIDE.md` (2 minutes)
2. Run `./run_database_verification_test.sh`
3. Review test output
4. Check `SAMPLE_TEST_OUTPUT.md` to interpret results

### To Learn More
1. Read `DATABASE_VERIFICATION_TEST_SUMMARY.md`
2. View `TEST_FLOW_DIAGRAM.md`
3. Study `DATABASE_VERIFICATION_TEST_README.md`

### To Customize
1. Read "Customization" in `DATABASE_VERIFICATION_TEST_README.md`
2. Edit `test_database_verification_complete.py`
3. Test your changes

### To Integrate
1. Read "Integration with CI/CD" in `DATABASE_VERIFICATION_TEST_README.md`
2. Add to your workflow
3. Set pass/fail criteria

---

**Ready to start?**
```bash
./run_database_verification_test.sh
```

**Need quick help?**
Read: `QUICK_TEST_GUIDE.md`

**Want full details?**
Read: `DATABASE_VERIFICATION_TEST_README.md`

**Prefer visuals?**
View: `TEST_FLOW_DIAGRAM.md`
