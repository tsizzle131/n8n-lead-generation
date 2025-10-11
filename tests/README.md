# Lead Generation System - Test Suite

Comprehensive integration tests for the entire lead generation pipeline.

## Overview

This test suite validates the complete lead generation workflow from campaign creation through all enrichment phases to final CSV export. Tests are designed to catch regressions, validate data integrity, and ensure proper error handling.

## Quick Start

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   cd ..
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_KEY=your_supabase_key
   export APIFY_API_KEY=your_apify_key
   export OPENAI_API_KEY=your_openai_key
   export LINKEDIN_ACTOR_ID=your_linkedin_actor_id
   export BOUNCER_API_KEY=your_bouncer_key
   ```

3. **Start services:**
   ```bash
   ./start-dev.sh
   ```

### Run All Tests

```bash
# 1. Full integration test
node tests/test_integration_full.js

# 2. Campaign manager test
python tests/test_campaign_manager.py

# 3. Enrichment sources test (use campaign ID from step 1)
node tests/test_enrichment_sources.js <campaign_id>

# 4. Frontend tests (via Claude Code + Playwright MCP)
# See test_frontend_campaigns.js for instructions
```

---

## Test Files

### 1. `test_integration_full.js` - Full Pipeline Integration

**Purpose:** End-to-end testing of complete campaign execution

**Tests:**
- Campaign creation with AI-powered coverage analysis
- All phases: Google Maps, Facebook (3 passes), LinkedIn enrichment
- Data flow between phases
- CSV export with pagination
- Error recovery and retry logic

**Usage:**
```bash
node tests/test_integration_full.js
```

**Duration:** ~10-15 minutes (full campaign with 50 businesses)

---

### 2. `test_campaign_manager.py` - Campaign State Management

**Purpose:** Test campaign lifecycle, state transitions, and cost tracking

**Tests:**
- Campaign creation with different coverage profiles
- State transitions (draft → running → paused → completed)
- Cost tracking accuracy across all services
- Pause/resume functionality
- Error handling for invalid inputs

**Usage:**
```bash
python tests/test_campaign_manager.py
```

**Duration:** ~2-3 minutes

---

### 3. `test_enrichment_sources.js` - Data Quality & Tracking

**Purpose:** Validate email source tracking, deduplication, and data quality

**Tests:**
- Email source tracking (google_maps, facebook, linkedin, linkedin_verified)
- Deduplication by place_id, email, and name+address
- Email prioritization (verified emails first)
- Data quality validation (formats, completeness)
- Integration between enrichment sources

**Usage:**
```bash
# First, create and complete a campaign
node tests/test_integration_full.js

# Note the campaign ID from output, then:
node tests/test_enrichment_sources.js <campaign_id>
```

**Duration:** ~1-2 minutes

---

### 4. `test_frontend_campaigns.js` - UI Workflow Tests

**Purpose:** Test React frontend using Playwright MCP

**Tests:**
- Campaign creation flow
- Campaign monitoring dashboard
- Export functionality
- Error handling and validation
- Real-time updates

**Usage:**

These tests require Claude Code with Playwright MCP enabled.

```bash
# Ask Claude Code:
"Run the frontend tests using Playwright MCP. Follow the instructions
in tests/test_frontend_campaigns.js to test all UI workflows."
```

**Duration:** ~5-10 minutes (manual with MCP)

---

## Test Results

Results are saved in `tests/test-results/` directory:

- `integration-test-report-*.json` - Full integration test results
- `campaign-manager-test-report-*.json` - Campaign manager results
- `integration-test-export-*.csv` - Sample export for manual review

### Interpreting Results

Each test report includes:

```json
{
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1,
    "passRate": "90.00%",
    "timestamp": "2025-10-10T..."
  },
  "tests": {
    "testName": {
      "passed": true,
      "duration": 1234,
      "details": {
        // Test-specific metrics
      }
    }
  }
}
```

---

## Coverage Matrix

See [TEST_MATRIX.md](./TEST_MATRIX.md) for detailed coverage information.

**Summary:**
- **26 total tests** across 4 test suites
- **End-to-end coverage** of all phases
- **Performance benchmarks** for each component
- **Quality thresholds** for data validation

---

## Directory Structure

```
tests/
├── test_integration_full.js      # Full pipeline integration tests
├── test_campaign_manager.py      # Campaign lifecycle tests
├── test_enrichment_sources.js    # Email tracking and quality tests
├── test_frontend_campaigns.js    # UI workflow tests (Playwright MCP)
├── TEST_MATRIX.md                # Detailed test coverage documentation
├── README.md                     # This file
├── test-results/                 # Test output and reports
│   ├── integration-test-report-*.json
│   ├── campaign-manager-test-report-*.json
│   └── integration-test-export-*.csv
├── integration/                  # Legacy integration tests
├── unit/                        # Legacy unit tests
├── scrapers/                    # Legacy scraper tests
├── coverage_analysis/           # Legacy coverage tests
└── archived/                    # Deprecated tests
```

---

## Writing New Tests

### Adding to Integration Test

```javascript
// tests/test_integration_full.js

async function testNewFeature(campaignId) {
  log('Starting Test: New Feature');
  const startTime = Date.now();

  try {
    // Your test logic
    const result = await makeRequest('GET', `/api/endpoint`);

    // Validations
    if (!result.success) {
      throw new Error('Request failed');
    }

    // Record success
    testResults.newFeature.passed = true;
    testResults.newFeature.duration = Date.now() - startTime;
    testResults.newFeature.details = { /* metrics */ };

    log('Test passed ✅', 'SUCCESS');
  } catch (error) {
    testResults.newFeature.passed = false;
    testResults.newFeature.details = { error: error.message };
    log(`Test failed: ${error.message}`, 'ERROR');
  }
}
```

---

## Debugging Failed Tests

### Common Issues

**1. Services Not Running**
```bash
# Check if services are up
curl http://localhost:5001/health  # Backend
curl http://localhost:3000         # Frontend
```

**2. Missing Environment Variables**
```bash
# Verify all keys are set
echo $SUPABASE_URL
echo $APIFY_API_KEY
echo $OPENAI_API_KEY
```

**3. Database Issues**
```bash
# Check Supabase connection
# Use Supabase MCP tools or direct query
```

**4. API Rate Limits**
```bash
# Check Apify credits
# Check OpenAI quota
# Reduce test data size
```

---

## Performance Benchmarks

### Target Performance

| Operation | Target | Status |
|-----------|--------|--------|
| Campaign creation | <5s | ⏳ |
| Coverage analysis (city) | <10s | ⏳ |
| Google Maps (50 businesses) | <120s | ⏳ |
| Facebook enrichment (50 pages) | <60s | ⏳ |
| LinkedIn enrichment (20 profiles) | <90s | ⏳ |
| CSV export (1000 records) | <10s | ⏳ |

---

## CI/CD Integration (TODO)

```yaml
# .github/workflows/tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Run tests
        run: |
          npm install
          node tests/test_integration_full.js
```

---

## Contributing

### Adding New Tests

1. Follow existing test patterns
2. Include clear descriptions and comments
3. Add performance benchmarks
4. Update TEST_MATRIX.md
5. Submit PR with test results

---

## Resources

- **Test Matrix:** [TEST_MATRIX.md](./TEST_MATRIX.md)
- **CLAUDE.md:** Main project instructions
- **Supabase Schema:** [../migrations/](../migrations/)

---

*Last updated: 2025-10-10*
