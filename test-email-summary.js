#!/usr/bin/env node

const axios = require('axios');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testEmailEnrichmentSummary() {
  console.log('📊 Email Enrichment Summary Test\n');
  console.log('='.repeat(60));
  
  const testLocation = 'Austin, TX 78701';
  const testQueries = ['coffee shop'];
  
  console.log('📍 Location:', testLocation);
  console.log('🔍 Query:', testQueries[0]);
  console.log('🎯 Max Results: 10\n');
  
  // Phase 1: Google Maps
  console.log('Phase 1: Google Maps Scraping');
  console.log('-'.repeat(50));
  
  const googleMapsActorId = 'WnMxbsRLNbPeYL6ge';
  
  try {
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${googleMapsActorId}/runs`,
      {
        searchStringsArray: testQueries,
        locationQuery: testLocation,
        maxCrawledPlacesPerSearch: 10,
        language: 'en',
        deeperCitySearch: false,
        skipClosedPlaces: false,
        scrapeDirectEmails: true,
        scrapeWebsiteEmails: true
      },
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const runId = runResponse.data.data.id;
    console.log(`Started Google Maps scraper...`);
    
    // Wait for completion
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/acts/${googleMapsActorId}/runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${APIFY_API_KEY}`
          }
        }
      );
      status = statusResponse.data.data.status;
      process.stdout.write('.');
    }
    
    console.log('\n✅ Complete!\n');
    
    // Get results
    const datasetId = runResponse.data.data.defaultDatasetId;
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`
        }
      }
    );
    
    const businesses = resultsResponse.data;
    
    // Count emails by source
    let emailStats = {
      total: 0,
      fromGoogleMaps: 0,
      fromFacebook: 0,
      fromSearch: 0,
      noEmail: 0
    };
    
    let businessCategories = {
      withEmail: [],
      withFacebookNoEmail: [],
      noEmailNoFacebook: []
    };
    
    businesses.forEach(business => {
      // Extract email properly
      let email = '';
      if (business.email && business.email.trim()) {
        email = business.email.trim();
      } else if (Array.isArray(business.emails) && business.emails.length > 0) {
        const validEmail = business.emails.find(e => e && e.trim());
        if (validEmail) {
          email = validEmail.trim();
        }
      } else if (business.directEmail && business.directEmail.trim()) {
        email = business.directEmail.trim();
      }
      
      // Extract Facebook URL
      let facebookUrl = '';
      if (business.facebooks && Array.isArray(business.facebooks) && business.facebooks.length > 0) {
        facebookUrl = business.facebooks[0];
      }
      
      if (email) {
        emailStats.fromGoogleMaps++;
        emailStats.total++;
        businessCategories.withEmail.push({
          name: business.title || business.name,
          email: email
        });
      } else if (facebookUrl) {
        businessCategories.withFacebookNoEmail.push({
          name: business.title || business.name,
          facebook: facebookUrl
        });
      } else {
        businessCategories.noEmailNoFacebook.push({
          name: business.title || business.name
        });
      }
    });
    
    // Display results
    console.log('📊 EMAIL EXTRACTION RESULTS:');
    console.log('='.repeat(60));
    console.log(`Total businesses found: ${businesses.length}`);
    console.log();
    
    console.log('📧 Emails by Stage:');
    console.log(`  ✅ Phase 1 (Google Maps): ${emailStats.fromGoogleMaps} emails`);
    console.log(`  📘 Phase 2A (Facebook scraper): Would enrich ${businessCategories.withFacebookNoEmail.length} businesses`);
    console.log(`  🔍 Phase 2B (Search + Facebook): Would search ${businessCategories.noEmailNoFacebook.length} businesses`);
    console.log();
    
    console.log('💰 Cost Savings:');
    const skipRate = ((emailStats.fromGoogleMaps / businesses.length) * 100).toFixed(1);
    console.log(`  ${skipRate}% of businesses already have emails`);
    console.log(`  ${emailStats.fromGoogleMaps}/${businesses.length} require no enrichment`);
    console.log(`  ${businesses.length - emailStats.fromGoogleMaps} need enrichment`);
    console.log();
    
    console.log('📋 Sample Emails Found:');
    businessCategories.withEmail.slice(0, 5).forEach(b => {
      console.log(`  • ${b.name}: ${b.email}`);
    });
    
    if (businessCategories.withFacebookNoEmail.length > 0) {
      console.log('\n🔄 Would enrich via Facebook:');
      businessCategories.withFacebookNoEmail.slice(0, 3).forEach(b => {
        console.log(`  • ${b.name}`);
      });
    }
    
    if (businessCategories.noEmailNoFacebook.length > 0) {
      console.log('\n🔍 Would search for Facebook then enrich:');
      businessCategories.noEmailNoFacebook.slice(0, 3).forEach(b => {
        console.log(`  • ${b.name}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY: Found', emailStats.fromGoogleMaps, 'emails directly from Google Maps');
    console.log('         Saved', skipRate + '% in API costs by skipping enrichment');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testEmailEnrichmentSummary();