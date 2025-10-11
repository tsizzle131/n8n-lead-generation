# Test Results Directory

This directory contains test results and reports for the lead generation system.

## Available Tests

### Phase 1 - Google Maps Scraping

**Status:** ✅ PASSED

**Test Script:** `/test_phase1_gmaps.js`

**Run Test:**
```bash
node test_phase1_gmaps.js
```

**Reports:**
- `phase1-test-summary.md` - Executive summary
- `/PHASE_1_TEST_REPORT.md` - Detailed technical report

**Test Campaign:**
- Campaign ID: `4de99819-1543-4ada-9e04-fbaee5c378d5`
- Location: 10598 (Yorktown Heights, NY)
- Results: 74 businesses found

---

## Quick Commands

### Check Campaign Status
```bash
curl http://localhost:5001/api/gmaps/campaigns/4de99819-1543-4ada-9e04-fbaee5c378d5 | jq
```

### View Businesses
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ndrqixjdddcozjlevieo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec'
);
(async () => {
  const { data } = await supabase
    .from('gmaps_businesses')
    .select('name, phone, website, email')
    .eq('campaign_id', '4de99819-1543-4ada-9e04-fbaee5c378d5')
    .limit(10);
  console.table(data);
})();
"
```

### Export Results
```bash
curl http://localhost:5001/api/gmaps/campaigns/4de99819-1543-4ada-9e04-fbaee5c378d5/export > phase1-results.csv
```

---

## Linear Issues

- **REI-10** - Phase 1 test completed (Done)
- **REI-11** - Fix ZIP code AI analysis (Backlog, High Priority)
- **REI-12** - Fix campaign status updates (Backlog, Urgent)

---

## Next Tests

- [ ] Phase 2A - Facebook enrichment
- [ ] Phase 2B - Google search for Facebook URLs
- [ ] Phase 2C - Facebook second pass enrichment
- [ ] Phase 2.5 - LinkedIn enrichment
- [ ] Email verification (Bouncer API)
- [ ] Full end-to-end campaign test
