# Test Suite Quick Start Guide

Get up and running with the test suite in 5 minutes.

## Prerequisites Check

Before running tests, verify you have:

```bash
# 1. Node.js installed
node --version  # Should be v16+

# 2. Python installed
python --version  # Should be 3.8+

# 3. Dependencies installed
npm list axios 2>/dev/null | grep axios  # Should show axios
python -c "import requests; print('✓ requests installed')"

# 4. Environment variables set
echo $SUPABASE_URL      # Should show your Supabase URL
echo $APIFY_API_KEY     # Should show your Apify key
echo $OPENAI_API_KEY    # Should show your OpenAI key
```

If any check fails, see [README.md](./README.md) for full setup instructions.

---

## Quick Test Run

### Test 1: Integration Test (10-15 min)

Tests the full pipeline from campaign creation to CSV export.

```bash
# Start services
./start-dev.sh

# In a new terminal:
cd tests
node test_integration_full.js
```

**Expected output:**
```
[2025-10-10T...] ℹ️ Starting Full Integration Test Suite
[2025-10-10T...] ℹ️ API Base URL: http://localhost:5001
[2025-10-10T...] ✅ Campaign created successfully: abc-123
[2025-10-10T...] ✅ Campaign execution complete: 50 businesses, 15 emails
...
======================================================================
INTEGRATION TEST SUMMARY
======================================================================
Total Tests: 10
Passed: 10 ✅
Failed: 0 ❌
Pass Rate: 100.00%
```

**Troubleshooting:**
- If backend connection fails: Check `./start-dev.sh` is running
- If Apify errors: Check your API key and credits
- If OpenAI errors: Check your API key and quota
- If Supabase errors: Verify `SUPABASE_URL` and `SUPABASE_KEY`

---

### Test 2: Campaign Manager (2-3 min)

Tests campaign state transitions and cost tracking.

```bash
cd tests
python test_campaign_manager.py
```

**Expected output:**
```
[2025-10-10T...] ℹ️ Starting Campaign Manager Test Suite
[2025-10-10T...] ✅ Campaign created: abc-123 with 5 ZIPs
[2025-10-10T...] ✅ All state transitions validated
[2025-10-10T...] ✅ Cost tracking validated: $20.50
...
======================================================================
CAMPAIGN MANAGER TEST SUMMARY
======================================================================
Total Tests: 6
Passed: 6 ✅
```

---

### Test 3: Enrichment Sources (1-2 min)

Tests email tracking and data quality.

```bash
# First get a campaign ID from Test 1 or create one:
# Example: abc-123-def-456

cd tests
node test_enrichment_sources.js abc-123-def-456
```

**Expected output:**
```
[2025-10-10T...] ℹ️ Starting Enrichment Sources Test Suite
[2025-10-10T...] ✅ Email source tracking: PASS ✅
[2025-10-10T...] ✅ Deduplication: PASS ✅
...
======================================================================
ENRICHMENT SOURCES TEST SUMMARY
======================================================================
Total Tests: 5
Passed: 5 ✅
```

---

### Test 4: Frontend Tests (5-10 min)

Tests UI workflows using Playwright MCP.

**Setup:**
1. Ensure frontend is running: `http://localhost:3000`
2. Open Claude Code with Playwright MCP enabled

**Run:**
```
Ask Claude Code:

"Run the frontend tests using Playwright MCP. Navigate to http://localhost:3000
and execute the test scenarios from tests/test_frontend_campaigns.js. Take
screenshots at key points and report results for each test."
```

**What to expect:**
- Claude will navigate to the frontend
- Fill out campaign creation form
- Test dashboard and monitoring
- Test export functionality
- Verify real-time updates
- Report pass/fail for each scenario

---

## Viewing Test Results

All test results are saved to `tests/test-results/`:

```bash
cd tests/test-results

# View latest integration test report
cat integration-test-report-*.json | jq '.summary'

# View latest campaign manager report
cat campaign-manager-test-report-*.json | jq '.summary'

# View sample export (first 10 lines)
head -10 integration-test-export-*.csv
```

---

## Common Issues

### Issue: "Cannot connect to localhost:5001"

**Solution:**
```bash
# Check if backend is running
curl http://localhost:5001/health

# If not, start services
./start-dev.sh

# Verify it started
curl http://localhost:5001/health
# Should return: {"status":"ok"}
```

---

### Issue: "Campaign creation failed"

**Possible causes:**

1. **Missing environment variables**
   ```bash
   # Check all required vars
   env | grep -E 'SUPABASE|APIFY|OPENAI'
   ```

2. **Supabase connection issue**
   ```bash
   # Test Supabase connection
   curl "$SUPABASE_URL/rest/v1/" \
     -H "apikey: $SUPABASE_KEY"
   ```

3. **Invalid API keys**
   - Check Apify dashboard for credits
   - Check OpenAI dashboard for quota
   - Verify keys are correct (no extra spaces)

---

### Issue: "Test timeout"

**Solutions:**

1. **Increase timeout**
   ```javascript
   // In test file, find:
   const TEST_TIMEOUT = 600000; // 10 minutes
   // Change to:
   const TEST_TIMEOUT = 1200000; // 20 minutes
   ```

2. **Reduce test data**
   ```javascript
   // In test_integration_full.js, change:
   max_businesses_per_zip: 50
   // To:
   max_businesses_per_zip: 10
   ```

3. **Check API rate limits**
   - Apify: Check rate limits in dashboard
   - OpenAI: Check rate limits in usage dashboard

---

### Issue: "Python import errors"

**Solution:**
```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "from lead_generation.modules.gmaps_campaign_manager import GmapsCampaignManager; print('✓ Imports work')"

# If still fails, check Python path
python -c "import sys; print(sys.path)"
```

---

## What Next?

### Run All Tests

```bash
# Create a test script
cat > run_all_tests.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting all tests..."

echo "Test 1: Integration"
node tests/test_integration_full.js
CAMPAIGN_ID=$(cat tests/test-results/integration-test-report-*.json | jq -r '.tests.campaignCreation.details.campaignId' | tail -1)

echo "Test 2: Campaign Manager"
python tests/test_campaign_manager.py

echo "Test 3: Enrichment Sources"
node tests/test_enrichment_sources.js $CAMPAIGN_ID

echo "All tests complete! ✅"
EOF

chmod +x run_all_tests.sh
./run_all_tests.sh
```

### Set Up CI/CD

See [README.md](./README.md) for GitHub Actions configuration.

### Write Your Own Tests

See [README.md](./README.md) for examples of adding new tests.

---

## Test Coverage

Current coverage:

- ✅ **26 tests** across 4 test suites
- ✅ **End-to-end** campaign execution
- ✅ **All phases** (Google Maps, Facebook, LinkedIn)
- ✅ **Data quality** validation
- ✅ **Frontend UI** workflows

See [TEST_MATRIX.md](./TEST_MATRIX.md) for detailed coverage.

---

## Need Help?

1. **Read the docs:**
   - [README.md](./README.md) - Full documentation
   - [TEST_MATRIX.md](./TEST_MATRIX.md) - Test coverage details
   - [CLAUDE.md](../CLAUDE.md) - System documentation

2. **Check logs:**
   ```bash
   # Backend logs
   tail -f simple-server.log

   # Test output
   cat tests/test-results/*.json | jq .
   ```

3. **Debug mode:**
   ```bash
   # Enable verbose logging
   export DEBUG=true
   node tests/test_integration_full.js
   ```

---

## Success Checklist

- [ ] All services running (`./start-dev.sh`)
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Test 1 (Integration) passes
- [ ] Test 2 (Campaign Manager) passes
- [ ] Test 3 (Enrichment Sources) passes
- [ ] Test 4 (Frontend) passes via Playwright MCP
- [ ] Test results saved to `test-results/`
- [ ] All tests show 100% pass rate

---

*Happy testing! 🚀*
