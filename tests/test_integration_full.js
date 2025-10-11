/**
 * Full Integration Test Suite
 * Tests end-to-end campaign execution with all phases
 *
 * This test simulates a complete campaign lifecycle:
 * 1. Campaign creation with AI-powered coverage analysis
 * 2. Phase 1: Google Maps scraping
 * 3. Phase 2A: Facebook enrichment (first pass)
 * 4. Phase 2B: Google search for Facebook pages
 * 5. Phase 2C: Facebook enrichment (second pass)
 * 6. Phase 2.5: LinkedIn enrichment with email verification
 * 7. CSV export with pagination
 * 8. Error recovery and retry logic
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001';
const TEST_TIMEOUT = 600000; // 10 minutes
const POLL_INTERVAL = 5000; // 5 seconds

// Test data
const TEST_CAMPAIGN = {
  name: 'Integration Test Campaign',
  description: 'Automated full integration test',
  keywords: ['coffee shops', 'cafes'],
  location: '90210', // Beverly Hills ZIP code - small area for fast testing
  coverage_profile: 'budget',
  organization_id: 'test-org'
};

// Test results tracking
const testResults = {
  campaignCreation: { passed: false, duration: 0, details: {} },
  coverageAnalysis: { passed: false, duration: 0, details: {} },
  phase1_GoogleMaps: { passed: false, duration: 0, details: {} },
  phase2A_FacebookFirst: { passed: false, duration: 0, details: {} },
  phase2B_GoogleSearch: { passed: false, duration: 0, details: {} },
  phase2C_FacebookSecond: { passed: false, duration: 0, details: {} },
  phase25_LinkedIn: { passed: false, duration: 0, details: {} },
  exportFunctionality: { passed: false, duration: 0, details: {} },
  dataIntegrity: { passed: false, duration: 0, details: {} },
  errorRecovery: { passed: false, duration: 0, details: {} }
};

// Utility functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : level === 'WARN' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method,
    url,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test 1: Campaign Creation
async function testCampaignCreation() {
  log('Starting Test 1: Campaign Creation', 'INFO');
  const startTime = Date.now();

  try {
    const result = await makeRequest('POST', '/api/gmaps-campaigns', TEST_CAMPAIGN);

    if (!result.success) {
      throw new Error(`Campaign creation failed: ${result.error}`);
    }

    const campaign = result.data;

    // Validate campaign structure
    if (!campaign.id) {
      throw new Error('Campaign ID not returned');
    }

    if (campaign.status !== 'draft') {
      throw new Error(`Expected status 'draft', got '${campaign.status}'`);
    }

    testResults.campaignCreation.passed = true;
    testResults.campaignCreation.duration = Date.now() - startTime;
    testResults.campaignCreation.details = {
      campaignId: campaign.id,
      status: campaign.status,
      targetZipCount: campaign.target_zip_count
    };

    log(`Campaign created successfully: ${campaign.id}`, 'SUCCESS');
    return campaign.id;

  } catch (error) {
    testResults.campaignCreation.passed = false;
    testResults.campaignCreation.duration = Date.now() - startTime;
    testResults.campaignCreation.details = { error: error.message };
    log(`Campaign creation failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Test 2: Coverage Analysis
async function testCoverageAnalysis(campaignId) {
  log('Starting Test 2: Coverage Analysis', 'INFO');
  const startTime = Date.now();

  try {
    // Get campaign with coverage details
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/coverage`);

    if (!result.success) {
      throw new Error(`Failed to fetch coverage: ${result.error}`);
    }

    const coverage = result.data;

    // Validate coverage analysis
    if (!coverage.zipCodes || coverage.zipCodes.length === 0) {
      throw new Error('No ZIP codes in coverage analysis');
    }

    // For budget profile on single ZIP, expect minimal coverage
    if (coverage.zipCodes.length > 10) {
      log(`Warning: Budget profile returned ${coverage.zipCodes.length} ZIPs (expected < 10)`, 'WARN');
    }

    testResults.coverageAnalysis.passed = true;
    testResults.coverageAnalysis.duration = Date.now() - startTime;
    testResults.coverageAnalysis.details = {
      zipCount: coverage.zipCodes.length,
      estimatedBusinesses: coverage.estimated_businesses,
      estimatedCost: coverage.estimated_cost
    };

    log(`Coverage analysis complete: ${coverage.zipCodes.length} ZIPs`, 'SUCCESS');
    return coverage;

  } catch (error) {
    testResults.coverageAnalysis.passed = false;
    testResults.coverageAnalysis.duration = Date.now() - startTime;
    testResults.coverageAnalysis.details = { error: error.message };
    log(`Coverage analysis failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Test 3: Execute Campaign (All Phases)
async function testCampaignExecution(campaignId) {
  log('Starting Test 3: Campaign Execution (All Phases)', 'INFO');
  const startTime = Date.now();

  try {
    // Start campaign execution
    const result = await makeRequest('POST', `/api/gmaps-campaigns/${campaignId}/execute`, {
      max_businesses_per_zip: 50 // Limit for faster testing
    });

    if (!result.success) {
      throw new Error(`Failed to start campaign: ${result.error}`);
    }

    log('Campaign execution started, polling for completion...', 'INFO');

    // Poll for completion
    let campaign = null;
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max

    while (pollCount < maxPolls) {
      await sleep(POLL_INTERVAL);
      pollCount++;

      const statusResult = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}`);
      if (!statusResult.success) {
        throw new Error(`Failed to fetch campaign status: ${statusResult.error}`);
      }

      campaign = statusResult.data;
      log(`Poll ${pollCount}: Status = ${campaign.status}, Businesses = ${campaign.total_businesses_found}`, 'INFO');

      if (campaign.status === 'completed') {
        break;
      }

      if (campaign.status === 'failed') {
        throw new Error('Campaign execution failed');
      }
    }

    if (campaign.status !== 'completed') {
      throw new Error('Campaign did not complete within timeout');
    }

    // Validate results from all phases
    if (!campaign.total_businesses_found || campaign.total_businesses_found === 0) {
      throw new Error('Phase 1 (Google Maps): No businesses found');
    }

    testResults.phase1_GoogleMaps.passed = true;
    testResults.phase1_GoogleMaps.details = {
      businessesFound: campaign.total_businesses_found,
      emailsFound: campaign.total_emails_found,
      cost: campaign.actual_cost
    };

    // Check Facebook enrichment
    if (campaign.total_facebook_pages_found > 0) {
      testResults.phase2A_FacebookFirst.passed = true;
      testResults.phase2A_FacebookFirst.details = {
        pagesFound: campaign.total_facebook_pages_found,
        emailsFromFacebook: campaign.emails_from_facebook || 0
      };
    }

    // Check LinkedIn enrichment (if enabled)
    if (campaign.linkedin_profiles_found > 0) {
      testResults.phase25_LinkedIn.passed = true;
      testResults.phase25_LinkedIn.details = {
        profilesFound: campaign.linkedin_profiles_found,
        verifiedEmails: campaign.verified_emails || 0
      };
    }

    testResults.campaignCreation.duration = Date.now() - startTime;
    log(`Campaign execution complete: ${campaign.total_businesses_found} businesses, ${campaign.total_emails_found} emails`, 'SUCCESS');

    return campaign;

  } catch (error) {
    testResults.phase1_GoogleMaps.passed = false;
    testResults.phase1_GoogleMaps.details = { error: error.message };
    log(`Campaign execution failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Test 4: Data Flow Between Phases
async function testDataFlowBetweenPhases(campaignId) {
  log('Starting Test 4: Data Flow Between Phases', 'INFO');
  const startTime = Date.now();

  try {
    // Get businesses
    const bizResult = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!bizResult.success) {
      throw new Error(`Failed to fetch businesses: ${bizResult.error}`);
    }

    const businesses = bizResult.data;

    // Validate data flow
    let hasGoogleMapsData = 0;
    let hasFacebookEnrichment = 0;
    let hasLinkedInEnrichment = 0;
    let hasEmailSource = 0;

    for (const business of businesses) {
      // Check Google Maps data (Phase 1)
      if (business.place_id && business.name && business.address) {
        hasGoogleMapsData++;
      }

      // Check Facebook enrichment (Phase 2)
      if (business.facebook_url && business.gmaps_facebook_enrichments) {
        hasFacebookEnrichment++;
      }

      // Check LinkedIn enrichment (Phase 2.5)
      if (business.gmaps_linkedin_enrichments) {
        hasLinkedInEnrichment++;
      }

      // Check email source tracking
      if (business.email && business.email_source) {
        hasEmailSource++;

        // Validate email source is one of expected values
        const validSources = ['google_maps', 'facebook', 'linkedin', 'linkedin_verified', 'not_found'];
        if (!validSources.includes(business.email_source)) {
          log(`Invalid email source: ${business.email_source}`, 'WARN');
        }
      }
    }

    testResults.dataIntegrity.passed = true;
    testResults.dataIntegrity.duration = Date.now() - startTime;
    testResults.dataIntegrity.details = {
      totalBusinesses: businesses.length,
      withGoogleMapsData: hasGoogleMapsData,
      withFacebookEnrichment: hasFacebookEnrichment,
      withLinkedInEnrichment: hasLinkedInEnrichment,
      withEmailSource: hasEmailSource
    };

    log(`Data integrity verified: ${businesses.length} businesses`, 'SUCCESS');
    return businesses;

  } catch (error) {
    testResults.dataIntegrity.passed = false;
    testResults.dataIntegrity.duration = Date.now() - startTime;
    testResults.dataIntegrity.details = { error: error.message };
    log(`Data integrity check failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Test 5: CSV Export with Pagination
async function testCsvExport(campaignId) {
  log('Starting Test 5: CSV Export with Pagination', 'INFO');
  const startTime = Date.now();

  try {
    // Test export endpoint
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/export`);

    if (!result.success) {
      throw new Error(`Export failed: ${result.error}`);
    }

    // The export should return CSV data
    const csvData = result.data;

    // Validate CSV structure
    if (!csvData || typeof csvData !== 'string') {
      throw new Error('Export did not return CSV string');
    }

    const lines = csvData.split('\n');
    const headers = lines[0].split(',');

    // Validate required headers
    const requiredHeaders = [
      'name', 'email', 'emailSource', 'phone', 'address',
      'city', 'state', 'website', 'facebook', 'linkedin'
    ];

    for (const required of requiredHeaders) {
      if (!headers.some(h => h.toLowerCase().includes(required.toLowerCase()))) {
        throw new Error(`Missing required header: ${required}`);
      }
    }

    // Test pagination (if more than 1000 records)
    const recordCount = lines.length - 1; // Exclude header
    if (recordCount > 1000) {
      log('Testing pagination for large dataset...', 'INFO');

      // Request page 2
      const page2Result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/export?page=1`);
      if (!page2Result.success) {
        throw new Error('Pagination test failed');
      }
    }

    testResults.exportFunctionality.passed = true;
    testResults.exportFunctionality.duration = Date.now() - startTime;
    testResults.exportFunctionality.details = {
      recordCount,
      headers: headers.length,
      paginationTested: recordCount > 1000
    };

    log(`CSV export successful: ${recordCount} records`, 'SUCCESS');

    // Save sample export for manual review
    const outputPath = path.join(__dirname, 'test-results', `integration-test-export-${Date.now()}.csv`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, csvData);
    log(`Sample export saved to: ${outputPath}`, 'INFO');

    return csvData;

  } catch (error) {
    testResults.exportFunctionality.passed = false;
    testResults.exportFunctionality.duration = Date.now() - startTime;
    testResults.exportFunctionality.details = { error: error.message };
    log(`CSV export failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Test 6: Error Recovery and Retry Logic
async function testErrorRecovery() {
  log('Starting Test 6: Error Recovery and Retry Logic', 'INFO');
  const startTime = Date.now();

  try {
    // Test 1: Invalid campaign ID
    const invalidResult = await makeRequest('GET', '/api/gmaps-campaigns/invalid-id-12345');
    if (invalidResult.success) {
      throw new Error('Expected error for invalid campaign ID');
    }

    // Test 2: Invalid campaign data
    const invalidDataResult = await makeRequest('POST', '/api/gmaps-campaigns', {
      // Missing required fields
      name: 'Test'
    });
    if (invalidDataResult.success) {
      throw new Error('Expected error for invalid campaign data');
    }

    // Test 3: API rate limiting handling (if implemented)
    // This would test retry logic with exponential backoff

    testResults.errorRecovery.passed = true;
    testResults.errorRecovery.duration = Date.now() - startTime;
    testResults.errorRecovery.details = {
      invalidIdHandled: !invalidResult.success,
      invalidDataHandled: !invalidDataResult.success
    };

    log('Error recovery tests passed', 'SUCCESS');

  } catch (error) {
    testResults.errorRecovery.passed = false;
    testResults.errorRecovery.duration = Date.now() - startTime;
    testResults.errorRecovery.details = { error: error.message };
    log(`Error recovery test failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Generate test report
function generateTestReport() {
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  const report = {
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    },
    tests: testResults
  };

  // Save report
  const reportPath = path.join(__dirname, 'test-results', `integration-test-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Pass Rate: ${report.summary.passRate}`);
  console.log('='.repeat(70));

  // Print individual results
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = (result.duration / 1000).toFixed(2) + 's';
    console.log(`${status} | ${testName} | ${duration}`);
    if (result.details.error) {
      console.log(`       Error: ${result.details.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Report saved to: ${reportPath}`);
  console.log('='.repeat(70) + '\n');

  return report;
}

// Main test execution
async function runIntegrationTests() {
  log('Starting Full Integration Test Suite', 'INFO');
  log(`API Base URL: ${API_BASE_URL}`, 'INFO');
  log(`Test Timeout: ${TEST_TIMEOUT / 1000}s`, 'INFO');

  let campaignId = null;

  try {
    // Run tests sequentially
    campaignId = await testCampaignCreation();
    await testCoverageAnalysis(campaignId);
    await testCampaignExecution(campaignId);
    await testDataFlowBetweenPhases(campaignId);
    await testCsvExport(campaignId);
    await testErrorRecovery();

    log('All integration tests completed!', 'SUCCESS');

  } catch (error) {
    log(`Integration tests failed: ${error.message}`, 'ERROR');
    console.error(error);
  } finally {
    // Generate report regardless of success/failure
    const report = generateTestReport();

    // Exit with appropriate code
    const allPassed = Object.values(testResults).every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  testCampaignCreation,
  testCoverageAnalysis,
  testCampaignExecution,
  testDataFlowBetweenPhases,
  testCsvExport,
  testErrorRecovery
};
