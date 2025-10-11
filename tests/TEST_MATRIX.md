# Test Matrix - Lead Generation System

Comprehensive test coverage documentation for the lead generation pipeline.

## Overview

This document outlines all tests for the system, their coverage, pass/fail status, and performance benchmarks.

**Last Updated:** 2025-10-10
**Test Suite Version:** 1.0.0

---

## Test Coverage Summary

| Component | Test File | Tests | Coverage | Status |
|-----------|-----------|-------|----------|--------|
| **Full Integration** | `test_integration_full.js` | 10 | End-to-end flow | ⏳ Pending |
| **Campaign Manager** | `test_campaign_manager.py` | 6 | State & costs | ⏳ Pending |
| **Enrichment Sources** | `test_enrichment_sources.js` | 5 | Email tracking | ⏳ Pending |
| **Frontend** | `test_frontend_campaigns.js` | 5 | UI workflows | ⏳ Pending |

**Overall Coverage:** 26 tests across 4 test suites

---

## 1. Full Integration Tests (`test_integration_full.js`)

Tests the complete campaign execution pipeline from creation to export.

### Test Cases

| # | Test Name | Description | Status | Performance |
|---|-----------|-------------|--------|-------------|
| 1 | Campaign Creation | Creates campaign with AI coverage analysis | ⏳ | Target: <5s |
| 2 | Coverage Analysis | Validates ZIP code selection | ⏳ | Target: <10s |
| 3 | Phase 1: Google Maps | Scrapes businesses from Google Maps | ⏳ | Target: <120s |
| 4 | Phase 2A: Facebook First | First pass Facebook enrichment | ⏳ | Target: <60s |
| 5 | Phase 2B: Google Search | Searches for Facebook pages | ⏳ | Target: <30s |
| 6 | Phase 2C: Facebook Second | Second pass Facebook enrichment | ⏳ | Target: <60s |
| 7 | Phase 2.5: LinkedIn | LinkedIn enrichment with verification | ⏳ | Target: <90s |
| 8 | Data Flow | Validates data between phases | ⏳ | Target: <5s |
| 9 | CSV Export | Tests export with pagination | ⏳ | Target: <10s |
| 10 | Error Recovery | Tests retry logic and error handling | ⏳ | Target: <5s |

### Coverage Areas

- ✅ Campaign lifecycle (create → execute → complete)
- ✅ All scraping phases (1, 2A, 2B, 2C, 2.5)
- ✅ Data persistence across phases
- ✅ Cost tracking for all services
- ✅ Export functionality with pagination
- ✅ Error handling and recovery

### What's Not Covered

- ⚠️ Campaign pause/resume during execution
- ⚠️ Parallel campaign execution
- ⚠️ Very large datasets (10,000+ businesses)
- ⚠️ Network failure scenarios
- ⚠️ Rate limiting behavior

### Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Campaign creation | <5s | TBD | ⏳ |
| Phase 1 (50 businesses) | <120s | TBD | ⏳ |
| Phase 2 enrichment | <60s per 50 | TBD | ⏳ |
| Phase 2.5 LinkedIn | <90s per 20 | TBD | ⏳ |
| Total for 50 businesses | <7 min | TBD | ⏳ |
| Export (1000 records) | <10s | TBD | ⏳ |

---

## 2. Campaign Manager Tests (`test_campaign_manager.py`)

Tests campaign state management, cost tracking, and coverage profiles.

### Test Cases

| # | Test Name | Description | Status | Performance |
|---|-----------|-------------|--------|-------------|
| 1 | Campaign Creation | Creates campaign with coverage analysis | ⏳ | Target: <5s |
| 2 | State Transitions | Tests draft→running→paused→completed | ⏳ | Target: <2s |
| 3 | Cost Tracking | Validates accurate cost tracking | ⏳ | Target: <3s |
| 4 | Coverage Profiles | Tests budget/balanced/aggressive | ⏳ | Target: <30s |
| 5 | Pause/Resume | Tests pause and resume functionality | ⏳ | Target: <3s |
| 6 | Error Handling | Tests invalid inputs and recovery | ⏳ | Target: <5s |

### Coverage Areas

- ✅ Campaign CRUD operations
- ✅ State machine (draft, running, paused, completed, failed)
- ✅ Cost tracking (Google Maps, Facebook, LinkedIn, Bouncer)
- ✅ Coverage profile differences
- ✅ Pause/resume behavior
- ✅ Error handling for invalid inputs

### What's Not Covered

- ⚠️ Concurrent campaign updates
- ⚠️ Database transaction rollback scenarios
- ⚠️ Campaign deletion with active enrichments
- ⚠️ Cost calculation accuracy for large campaigns

### Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Create campaign | <5s | TBD | ⏳ |
| State transition | <1s | TBD | ⏳ |
| Cost tracking update | <500ms | TBD | ⏳ |
| Coverage analysis (city) | <10s | TBD | ⏳ |
| Coverage analysis (state) | <60s | TBD | ⏳ |

---

## 3. Enrichment Sources Tests (`test_enrichment_sources.js`)

Tests email source tracking, deduplication, and data quality.

### Test Cases

| # | Test Name | Description | Status | Performance |
|---|-----------|-------------|--------|-------------|
| 1 | Email Source Tracking | Validates email source tags | ⏳ | Target: <3s |
| 2 | Deduplication | Tests duplicate business handling | ⏳ | Target: <5s |
| 3 | Email Prioritization | Validates verified email priority | ⏳ | Target: <3s |
| 4 | Data Quality | Validates email/phone formats | ⏳ | Target: <5s |
| 5 | Source Integration | Tests enrichment phase integration | ⏳ | Target: <3s |

### Coverage Areas

- ✅ Email source tracking (google_maps, facebook, linkedin, linkedin_verified)
- ✅ Deduplication by place_id, email, name+address
- ✅ Email prioritization (verified > unverified)
- ✅ Data validation (email format, phone format, address)
- ✅ Integration between enrichment phases

### What's Not Covered

- ⚠️ Email verification accuracy (Bouncer API)
- ⚠️ Facebook URL normalization edge cases
- ⚠️ LinkedIn profile matching accuracy
- ⚠️ Duplicate detection across campaigns

### Quality Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Email source accuracy | 100% | All emails must have valid source |
| Deduplication rate | 100% | No duplicate place_ids |
| Email format validity | 95%+ | Valid email format |
| Phone format validity | 80%+ | Valid phone format |
| Address completeness | 90%+ | Complete address data |
| Enrichment rate | 10%+ | At least 10% enriched |

---

## 4. Frontend Tests (`test_frontend_campaigns.js`)

Tests React UI workflows using Playwright MCP.

### Test Cases

| # | Test Name | Description | Status | Type |
|---|-----------|-------------|--------|------|
| 1 | Campaign Creation Flow | UI workflow for creating campaign | ⏳ | Manual/MCP |
| 2 | Campaign Dashboard | Monitoring and metrics display | ⏳ | Manual/MCP |
| 3 | Export Functionality | CSV download from UI | ⏳ | Manual/MCP |
| 4 | Error Handling | Form validation and error display | ⏳ | Manual/MCP |
| 5 | Real-time Updates | Live campaign progress updates | ⏳ | Manual/MCP |

### Coverage Areas

- ✅ Campaign creation form
- ✅ Campaign list/dashboard
- ✅ Campaign details view
- ✅ Export/download functionality
- ✅ Error messages and validation
- ✅ Real-time updates (polling)

### What's Not Covered

- ⚠️ Mobile/responsive design
- ⚠️ Browser compatibility (only Chromium tested)
- ⚠️ Accessibility (a11y) testing
- ⚠️ Performance under load
- ⚠️ Offline behavior

### UI Quality Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Console errors | 0 | No JavaScript errors |
| Form validation | 100% | All fields validated |
| Load time | <3s | Page interactive |
| Update latency | <5s | Real-time updates |

---

## Test Execution

### Prerequisites

```bash
# 1. Install dependencies
npm install
cd frontend && npm install

# 2. Set environment variables
export SUPABASE_URL=your_url
export SUPABASE_KEY=your_key
export APIFY_API_KEY=your_key
export OPENAI_API_KEY=your_key

# 3. Start services
./start-dev.sh
```

### Running Tests

#### 1. Full Integration Test

```bash
# Start backend and frontend first
./start-dev.sh

# Run integration tests
node tests/test_integration_full.js

# Results saved to: tests/test-results/integration-test-report-*.json
```

#### 2. Campaign Manager Test

```bash
# Ensure Python environment is set up
python tests/test_campaign_manager.py

# Results saved to: tests/test-results/campaign-manager-test-report-*.json
```

#### 3. Enrichment Sources Test

```bash
# First, create and complete a campaign
node tests/test_integration_full.js

# Then run enrichment tests with campaign ID
node tests/test_enrichment_sources.js <campaign_id>
```

#### 4. Frontend Tests (via Playwright MCP)

```bash
# These are run via Claude Code with Playwright MCP
# See test_frontend_campaigns.js for instructions

# Ask Claude:
# "Run the frontend tests using Playwright MCP. Navigate to localhost:3000
#  and execute each test scenario, taking screenshots at key points."
```

### Continuous Integration

*TODO: Set up GitHub Actions workflow*

```yaml
# .github/workflows/tests.yml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run integration tests
        run: |
          npm install
          npm test
```

---

## Test Results

### Latest Test Run

**Date:** TBD
**Environment:** Local Development
**Version:** 1.0.0

| Test Suite | Status | Pass Rate | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Integration | ⏳ | TBD | TBD | Not yet run |
| Campaign Manager | ⏳ | TBD | TBD | Not yet run |
| Enrichment Sources | ⏳ | TBD | TBD | Not yet run |
| Frontend | ⏳ | TBD | TBD | Not yet run |

### Historical Performance

*No historical data yet - this is the first test run*

---

## Known Issues

### Critical Issues

None identified yet.

### Non-Critical Issues

None identified yet.

### Test Gaps

1. **Network Resilience**
   - Need tests for API timeout handling
   - Network failure recovery
   - Rate limiting behavior

2. **Scale Testing**
   - Large campaigns (1000+ ZIPs)
   - Very large exports (10,000+ businesses)
   - Concurrent campaign execution

3. **Edge Cases**
   - Invalid API responses
   - Partial enrichment failures
   - Database connection issues

4. **Security**
   - API key validation
   - SQL injection prevention
   - XSS vulnerability testing

---

## Future Test Additions

### Priority 1 (Next Sprint)

- [ ] Load/performance tests
- [ ] Network failure simulation
- [ ] Concurrent campaign tests

### Priority 2 (Following Sprint)

- [ ] Security penetration tests
- [ ] Browser compatibility tests
- [ ] Mobile responsive tests

### Priority 3 (Future)

- [ ] Accessibility (a11y) tests
- [ ] Internationalization (i18n) tests
- [ ] API contract tests

---

## Maintenance

### Updating Tests

When making changes to the system:

1. **Add tests first** (TDD approach)
2. Run existing test suite to ensure no regression
3. Update test matrix if coverage changes
4. Document any new test gaps

### Test Review Schedule

- **Weekly:** Review test results and performance
- **Monthly:** Review test coverage and gaps
- **Quarterly:** Update test matrix and priorities

---

## Contact

For questions about testing:

- **Test Lead:** TBD
- **CI/CD:** TBD
- **Issues:** GitHub Issues

---

## Glossary

- **Coverage Profile:** Budget/Balanced/Aggressive ZIP selection strategy
- **Enrichment:** Process of adding contact data from Facebook/LinkedIn
- **Phase 1:** Google Maps scraping
- **Phase 2:** Facebook enrichment (A, B, C)
- **Phase 2.5:** LinkedIn enrichment with email verification
- **MCP:** Model Context Protocol (for Playwright integration)

---

*This document is automatically updated when tests are run. Last generated: 2025-10-10*
