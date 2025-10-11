/**
 * Enrichment Sources Test Suite
 * Tests email source tracking, deduplication, and data quality validation
 *
 * This test validates:
 * 1. Email source tracking (google_maps, facebook, linkedin, linkedin_verified)
 * 2. Deduplication logic across sources
 * 3. Email prioritization (verified > unverified)
 * 4. Data quality validation
 * 5. Integration between enrichment phases
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001';

// Test results
const testResults = {
  emailSourceTracking: { passed: false, details: {} },
  deduplication: { passed: false, details: {} },
  emailPrioritization: { passed: false, details: {} },
  dataQuality: { passed: false, details: {} },
  sourceIntegration: { passed: false, details: {} }
};

/**
 * Utility functions
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios({ method, url, data, timeout: 30000 });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message, data: error.response?.data };
  }
}

/**
 * Test 1: Email Source Tracking
 * Validates that emails are correctly tagged with their source
 */
async function testEmailSourceTracking(campaignId) {
  log('Test 1: Email Source Tracking');

  try {
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!result.success) {
      throw new Error('Failed to fetch businesses');
    }

    const businesses = result.data;
    const sources = {
      google_maps: 0,
      facebook: 0,
      linkedin: 0,
      linkedin_verified: 0,
      not_found: 0,
      invalid: 0
    };

    const validSources = Object.keys(sources).filter(s => s !== 'invalid');

    for (const business of businesses) {
      if (business.email) {
        const source = business.email_source;

        if (validSources.includes(source)) {
          sources[source]++;
        } else {
          sources.invalid++;
          log(`Invalid email source: ${source} for business ${business.name}`, 'ERROR');
        }
      } else {
        sources.not_found++;
      }
    }

    // Validate source tracking
    const totalWithEmail = businesses.filter(b => b.email).length;
    const totalTagged = Object.keys(sources)
      .filter(s => s !== 'not_found' && s !== 'invalid')
      .reduce((sum, s) => sum + sources[s], 0);

    const trackingAccuracy = totalWithEmail > 0 ? (totalTagged / totalWithEmail) * 100 : 0;

    testResults.emailSourceTracking.passed = sources.invalid === 0 && trackingAccuracy === 100;
    testResults.emailSourceTracking.details = {
      total_businesses: businesses.length,
      email_sources: sources,
      tracking_accuracy: trackingAccuracy.toFixed(2) + '%',
      valid_sources_only: sources.invalid === 0
    };

    if (testResults.emailSourceTracking.passed) {
      log('Email source tracking: PASS ✅', 'SUCCESS');
    } else {
      log(`Email source tracking: FAIL (${sources.invalid} invalid sources)`, 'ERROR');
    }

  } catch (error) {
    testResults.emailSourceTracking.passed = false;
    testResults.emailSourceTracking.details = { error: error.message };
    log(`Email source tracking failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 2: Deduplication Logic
 * Validates that duplicate businesses/emails are handled correctly
 */
async function testDeduplication(campaignId) {
  log('Test 2: Deduplication Logic');

  try {
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!result.success) {
      throw new Error('Failed to fetch businesses');
    }

    const businesses = result.data;

    // Check for duplicate place_ids
    const placeIds = businesses.map(b => b.place_id).filter(Boolean);
    const uniquePlaceIds = new Set(placeIds);
    const duplicatePlaceIds = placeIds.length - uniquePlaceIds.size;

    // Check for duplicate emails
    const emails = businesses.map(b => b.email).filter(Boolean);
    const uniqueEmails = new Set(emails);
    const duplicateEmails = emails.length - uniqueEmails.size;

    // Check for duplicate names + addresses (potential duplicates without place_id)
    const nameAddressKeys = businesses.map(b => `${b.name}|${b.address}`).filter(Boolean);
    const uniqueNameAddress = new Set(nameAddressKeys);
    const duplicateNameAddress = nameAddressKeys.length - uniqueNameAddress.size;

    // Validate enrichment deduplication
    // Each business should have at most one Facebook enrichment and one LinkedIn enrichment
    let multipleEnrichments = 0;
    for (const business of businesses) {
      const fbCount = business.gmaps_facebook_enrichments?.length || 0;
      const liCount = business.gmaps_linkedin_enrichments?.length || 0;

      if (fbCount > 1 || liCount > 1) {
        multipleEnrichments++;
        log(`Business ${business.name} has multiple enrichments: FB=${fbCount}, LI=${liCount}`, 'ERROR');
      }
    }

    testResults.deduplication.passed = (
      duplicatePlaceIds === 0 &&
      duplicateEmails <= 5 &&  // Allow some duplicate emails (different businesses)
      multipleEnrichments === 0
    );

    testResults.deduplication.details = {
      total_businesses: businesses.length,
      duplicate_place_ids: duplicatePlaceIds,
      duplicate_emails: duplicateEmails,
      duplicate_name_address: duplicateNameAddress,
      multiple_enrichments: multipleEnrichments,
      deduplication_effective: duplicatePlaceIds === 0
    };

    if (testResults.deduplication.passed) {
      log('Deduplication: PASS ✅', 'SUCCESS');
    } else {
      log(`Deduplication: FAIL (${duplicatePlaceIds} duplicate place_ids, ${multipleEnrichments} multiple enrichments)`, 'ERROR');
    }

  } catch (error) {
    testResults.deduplication.passed = false;
    testResults.deduplication.details = { error: error.message };
    log(`Deduplication test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 3: Email Prioritization
 * Validates that verified emails are prioritized over unverified
 */
async function testEmailPrioritization(campaignId) {
  log('Test 3: Email Prioritization');

  try {
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!result.success) {
      throw new Error('Failed to fetch businesses');
    }

    const businesses = result.data;
    let correctPrioritization = 0;
    let incorrectPrioritization = 0;

    for (const business of businesses) {
      // Check if business has both LinkedIn (verified) and other sources
      const hasLinkedIn = business.gmaps_linkedin_enrichments?.length > 0;
      const hasFacebook = business.gmaps_facebook_enrichments?.length > 0;

      if (hasLinkedIn && hasFacebook) {
        const linkedInEmail = business.gmaps_linkedin_enrichments[0].primary_email;
        const linkedInVerified = business.gmaps_linkedin_enrichments[0].is_safe;
        const currentEmail = business.email;
        const currentSource = business.email_source;

        // If LinkedIn email is verified and safe, it should be prioritized
        if (linkedInEmail && linkedInVerified) {
          if (currentSource === 'linkedin_verified' && currentEmail === linkedInEmail) {
            correctPrioritization++;
          } else {
            incorrectPrioritization++;
            log(`Business ${business.name}: LinkedIn verified email not prioritized (using ${currentSource})`, 'ERROR');
          }
        }
      }
    }

    const totalTestable = correctPrioritization + incorrectPrioritization;
    const prioritizationRate = totalTestable > 0 ? (correctPrioritization / totalTestable) * 100 : 100;

    testResults.emailPrioritization.passed = incorrectPrioritization === 0;
    testResults.emailPrioritization.details = {
      total_testable: totalTestable,
      correct_prioritization: correctPrioritization,
      incorrect_prioritization: incorrectPrioritization,
      prioritization_rate: prioritizationRate.toFixed(2) + '%'
    };

    if (testResults.emailPrioritization.passed) {
      log('Email prioritization: PASS ✅', 'SUCCESS');
    } else {
      log(`Email prioritization: FAIL (${incorrectPrioritization} incorrect)`, 'ERROR');
    }

  } catch (error) {
    testResults.emailPrioritization.passed = false;
    testResults.emailPrioritization.details = { error: error.message };
    log(`Email prioritization test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 4: Data Quality Validation
 * Validates email format, phone format, and address completeness
 */
async function testDataQuality(campaignId) {
  log('Test 4: Data Quality Validation');

  try {
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!result.success) {
      throw new Error('Failed to fetch businesses');
    }

    const businesses = result.data;
    const quality = {
      valid_emails: 0,
      invalid_emails: 0,
      valid_phones: 0,
      invalid_phones: 0,
      complete_addresses: 0,
      incomplete_addresses: 0
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

    for (const business of businesses) {
      // Validate email
      if (business.email) {
        if (emailRegex.test(business.email)) {
          quality.valid_emails++;
        } else {
          quality.invalid_emails++;
          log(`Invalid email format: ${business.email} for ${business.name}`, 'ERROR');
        }
      }

      // Validate phone
      if (business.phone) {
        if (phoneRegex.test(business.phone)) {
          quality.valid_phones++;
        } else {
          quality.invalid_phones++;
        }
      }

      // Validate address completeness
      if (business.address && business.city && business.state && business.postal_code) {
        quality.complete_addresses++;
      } else if (business.address) {
        quality.incomplete_addresses++;
      }
    }

    const emailQualityRate = quality.valid_emails + quality.invalid_emails > 0
      ? (quality.valid_emails / (quality.valid_emails + quality.invalid_emails)) * 100
      : 100;

    const phoneQualityRate = quality.valid_phones + quality.invalid_phones > 0
      ? (quality.valid_phones / (quality.valid_phones + quality.invalid_phones)) * 100
      : 100;

    const addressCompleteness = quality.complete_addresses + quality.incomplete_addresses > 0
      ? (quality.complete_addresses / (quality.complete_addresses + quality.incomplete_addresses)) * 100
      : 100;

    testResults.dataQuality.passed = (
      emailQualityRate >= 95 &&
      phoneQualityRate >= 80 &&
      addressCompleteness >= 90
    );

    testResults.dataQuality.details = {
      email_quality: emailQualityRate.toFixed(2) + '%',
      phone_quality: phoneQualityRate.toFixed(2) + '%',
      address_completeness: addressCompleteness.toFixed(2) + '%',
      invalid_emails: quality.invalid_emails,
      invalid_phones: quality.invalid_phones
    };

    if (testResults.dataQuality.passed) {
      log('Data quality: PASS ✅', 'SUCCESS');
    } else {
      log(`Data quality: FAIL (Email: ${emailQualityRate.toFixed(1)}%, Phone: ${phoneQualityRate.toFixed(1)}%)`, 'ERROR');
    }

  } catch (error) {
    testResults.dataQuality.passed = false;
    testResults.dataQuality.details = { error: error.message };
    log(`Data quality test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Test 5: Source Integration
 * Validates that enrichment sources work together correctly
 */
async function testSourceIntegration(campaignId) {
  log('Test 5: Source Integration');

  try {
    const result = await makeRequest('GET', `/api/gmaps-campaigns/${campaignId}/businesses`);
    if (!result.success) {
      throw new Error('Failed to fetch businesses');
    }

    const businesses = result.data;
    const integration = {
      google_maps_only: 0,
      google_plus_facebook: 0,
      google_plus_linkedin: 0,
      all_three_sources: 0,
      enrichment_improved_emails: 0
    };

    for (const business of businesses) {
      const hasGoogleMaps = Boolean(business.place_id);
      const hasFacebook = business.gmaps_facebook_enrichments?.length > 0;
      const hasLinkedIn = business.gmaps_linkedin_enrichments?.length > 0;

      if (hasGoogleMaps && !hasFacebook && !hasLinkedIn) {
        integration.google_maps_only++;
      } else if (hasGoogleMaps && hasFacebook && !hasLinkedIn) {
        integration.google_plus_facebook++;
      } else if (hasGoogleMaps && hasLinkedIn && !hasFacebook) {
        integration.google_plus_linkedin++;
      } else if (hasGoogleMaps && hasFacebook && hasLinkedIn) {
        integration.all_three_sources++;
      }

      // Check if enrichment improved email coverage
      if (business.email_source === 'facebook' || business.email_source === 'linkedin' || business.email_source === 'linkedin_verified') {
        integration.enrichment_improved_emails++;
      }
    }

    const enrichmentRate = businesses.length > 0
      ? ((integration.google_plus_facebook + integration.google_plus_linkedin + integration.all_three_sources) / businesses.length) * 100
      : 0;

    testResults.sourceIntegration.passed = enrichmentRate >= 10; // At least 10% should have enrichment

    testResults.sourceIntegration.details = {
      total_businesses: businesses.length,
      source_breakdown: integration,
      enrichment_rate: enrichmentRate.toFixed(2) + '%',
      enrichment_improved_emails: integration.enrichment_improved_emails
    };

    if (testResults.sourceIntegration.passed) {
      log('Source integration: PASS ✅', 'SUCCESS');
    } else {
      log(`Source integration: FAIL (only ${enrichmentRate.toFixed(1)}% enriched)`, 'ERROR');
    }

  } catch (error) {
    testResults.sourceIntegration.passed = false;
    testResults.sourceIntegration.details = { error: error.message };
    log(`Source integration test failed: ${error.message}`, 'ERROR');
  }
}

/**
 * Generate test report
 */
function generateReport() {
  const total = Object.keys(testResults).length;
  const passed = Object.values(testResults).filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n' + '='.repeat(70));
  console.log('ENRICHMENT SOURCES TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(2)}%`);
  console.log('='.repeat(70));

  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${testName}`);
    if (result.details.error) {
      console.log(`       Error: ${result.details.error}`);
    } else {
      console.log(`       ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n       ')}`);
    }
  }

  console.log('='.repeat(70) + '\n');

  return {
    summary: { total, passed, failed, passRate: `${((passed / total) * 100).toFixed(2)}%` },
    tests: testResults
  };
}

/**
 * Main test execution
 */
async function runEnrichmentTests(campaignId) {
  log('Starting Enrichment Sources Test Suite');

  if (!campaignId) {
    log('Error: Campaign ID required', 'ERROR');
    log('Usage: node test_enrichment_sources.js <campaign_id>', 'ERROR');
    process.exit(1);
  }

  try {
    await testEmailSourceTracking(campaignId);
    await testDeduplication(campaignId);
    await testEmailPrioritization(campaignId);
    await testDataQuality(campaignId);
    await testSourceIntegration(campaignId);

    const report = generateReport();
    const allPassed = Object.values(testResults).every(r => r.passed);
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    log(`Test suite failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  const campaignId = process.argv[2];
  runEnrichmentTests(campaignId);
}

module.exports = {
  runEnrichmentTests,
  testEmailSourceTracking,
  testDeduplication,
  testEmailPrioritization,
  testDataQuality,
  testSourceIntegration
};
