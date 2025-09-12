#!/usr/bin/env node

const axios = require('axios');

// API key (normally you'd load this from environment)
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testEmailEnrichment() {
  console.log('🧪 Testing Cascading Email Enrichment Strategy\n');
  console.log('='.repeat(60));
  
  // Test data - dentists in New York City
  // Testing with large sample size
  const testLocation = 'New York, NY';
  const testQueries = ['dentist'];
  const maxResults = 100;
  
  console.log('📍 Test Location:', testLocation);
  console.log('🔍 Search Query:', testQueries[0]);
  console.log('🎯 Max Results:', maxResults, '(large sample size)\n');
  
  // Step 1: Run Google Maps scraper directly
  console.log('Phase 1: Google Maps Scraping with Contact Details');
  console.log('-'.repeat(50));
  
  const googleMapsActorId = 'WnMxbsRLNbPeYL6ge';
  
  try {
    // Start the Google Maps scraper
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${googleMapsActorId}/runs`,
      {
        searchStringsArray: testQueries,
        locationQuery: testLocation,
        maxCrawledPlacesPerSearch: maxResults,
        language: 'en',
        deeperCitySearch: false,
        skipClosedPlaces: false,
        scrapeDirectEmails: true,
        scrapeWebsiteEmails: true,
        placeMinimumStars: "",
        website: "allPlaces",
        searchMatching: "all"
      },
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const runId = runResponse.data.data.id;
    console.log(`✅ Started Google Maps scraper: ${runId}`);
    console.log('⏳ Waiting for completion...');
    
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
    
    console.log('\n✅ Google Maps scraping complete!\n');
    
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
    console.log(`📊 Found ${businesses.length} businesses\n`);
    
    // Debug: Show what fields are available in the first business
    if (businesses.length > 0) {
      console.log('📋 Sample business data structure:');
      const sample = businesses[0];
      console.log(`  - Title: ${sample.title}`);
      console.log(`  - Has 'email' field: ${!!sample.email} (value: ${sample.email || 'none'})`);
      console.log(`  - Has 'emails' field: ${!!sample.emails} (type: ${typeof sample.emails}, length: ${Array.isArray(sample.emails) ? sample.emails.length : 'N/A'})`);
      if (Array.isArray(sample.emails) && sample.emails.length > 0) {
        console.log(`    First email: ${sample.emails[0]}`);
      }
      console.log(`  - Has 'directEmails' field: ${!!sample.directEmails} (length: ${sample.directEmails?.length || 0})`);
      console.log(`  - Has 'additionalInfo.email': ${!!(sample.additionalInfo?.email)}`);
      console.log(`  - Has 'facebooks' field: ${!!sample.facebooks} (length: ${sample.facebooks?.length || 0})`);
      if (sample.facebooks && sample.facebooks.length > 0) {
        console.log(`    First Facebook: ${sample.facebooks[0]}`);
      }
      console.log();
    }
    
    // Analyze the data for email enrichment categorization
    console.log('Phase 2: Categorizing Businesses for Enrichment');
    console.log('-'.repeat(50));
    
    const businessesWithEmail = [];
    const businessesNoEmailWithFB = [];
    const businessesNoEmailNoFB = [];
    
    businesses.forEach(business => {
      // Get the business name from any available field
      const businessName = business.title || business.name || business.businessName || business.placeName || 'Unknown';
      
      // Check all possible email fields - emails is an array!
      const hasEmail = !!(business.email || 
                         (Array.isArray(business.emails) && business.emails.length > 0 && business.emails[0]) ||
                         (business.directEmails && business.directEmails.length > 0) ||
                         (business.additionalInfo && business.additionalInfo.email));
      const hasFacebook = !!(business.facebooks && 
                            Array.isArray(business.facebooks) && 
                            business.facebooks.length > 0);
      
      if (hasEmail) {
        // Get the email from whichever field has it - emails is an array!
        const email = business.email || 
                     (Array.isArray(business.emails) && business.emails[0]) || 
                     (business.directEmails && business.directEmails[0]) ||
                     (business.additionalInfo && business.additionalInfo.email);
        businessesWithEmail.push({
          title: businessName,
          email: email
        });
      } else if (hasFacebook) {
        businessesNoEmailWithFB.push({
          title: businessName,
          facebook: business.facebooks[0]
        });
      } else {
        businessesNoEmailNoFB.push({
          title: businessName,
          website: business.website
        });
      }
    });
    
    // Display categorization results
    console.log('📊 Business Categorization Results:');
    console.log(`  ✅ With Email (skip enrichment): ${businessesWithEmail.length}`);
    console.log(`  📘 No Email, Has Facebook (Phase 2A): ${businessesNoEmailWithFB.length}`);
    console.log(`  ❌ No Email, No Facebook (Phase 2B): ${businessesNoEmailNoFB.length}`);
    console.log();
    
    // Show examples from each category
    if (businessesWithEmail.length > 0) {
      console.log('Examples - Already have email (no enrichment needed):');
      businessesWithEmail.slice(0, 3).forEach(b => {
        console.log(`  • ${b.title}: ${b.email}`);
      });
      console.log();
    }
    
    if (businessesNoEmailWithFB.length > 0) {
      console.log('Examples - Need Facebook enrichment:');
      businessesNoEmailWithFB.slice(0, 3).forEach(b => {
        console.log(`  • ${b.title}: ${b.facebook}`);
      });
      console.log();
    }
    
    if (businessesNoEmailNoFB.length > 0) {
      console.log('Examples - Need Facebook search + enrichment:');
      businessesNoEmailNoFB.slice(0, 3).forEach(b => {
        console.log(`  • ${b.title}: ${b.website || 'No website'}`);
      });
      console.log();
    }
    
    // Calculate enrichment efficiency
    console.log('💰 Enrichment Efficiency Analysis:');
    console.log('-'.repeat(50));
    const totalBusinesses = businesses.length;
    const skipEnrichment = businessesWithEmail.length;
    const needEnrichment = businessesNoEmailWithFB.length + businessesNoEmailNoFB.length;
    const savingsPercent = ((skipEnrichment / totalBusinesses) * 100).toFixed(1);
    
    console.log(`  Total businesses: ${totalBusinesses}`);
    console.log(`  Skip enrichment: ${skipEnrichment} (${savingsPercent}% API cost saved)`);
    console.log(`  Need enrichment: ${needEnrichment}`);
    console.log(`    - Direct Facebook scraping: ${businessesNoEmailWithFB.length}`);
    console.log(`    - Search + Facebook scraping: ${businessesNoEmailNoFB.length}`);
    
    // Phase 2A - Facebook enrichment for businesses with Facebook but no email
    if (businessesNoEmailWithFB.length > 0) {
      console.log('\n📘 Phase 2A: Facebook Pages Scraper');
      console.log('-'.repeat(50));
      console.log(`Scraping ${businessesNoEmailWithFB.length} Facebook pages...`);
      
      try {
        // Deduplicate Facebook URLs
        const uniqueFbUrls = new Set();
        const fbUrlBusinessMap = new Map();
        
        businessesNoEmailWithFB.forEach(business => {
          if (business.facebook) {
            // Normalize URL - lowercase for consistent matching
            let normalizedUrl = business.facebook.split('?')[0].replace(/\/$/, '').toLowerCase();
            if (!normalizedUrl.startsWith('http')) {
              normalizedUrl = 'https://' + normalizedUrl;
            }
            uniqueFbUrls.add(normalizedUrl);
            
            if (!fbUrlBusinessMap.has(normalizedUrl)) {
              fbUrlBusinessMap.set(normalizedUrl, []);
            }
            fbUrlBusinessMap.get(normalizedUrl).push(business);
          }
        });
        
        const fbUrlsToEnrich = Array.from(uniqueFbUrls);
        console.log(`  Deduped to ${fbUrlsToEnrich.length} unique Facebook pages`);
        
        // Run Facebook Pages Scraper
        const fbActorId = '4Hv5RhChiaDk6iwad';
        const fbResponse = await axios.post(
          `https://api.apify.com/v2/acts/${fbActorId}/runs`,
          {
            startUrls: fbUrlsToEnrich.map(url => ({ url })),
            maxPagesToScrap: 1,
            scrapeAbout: true,
            scrapeReviews: false,
            scrapePosts: false,
            scrapeServices: true,
            scrapeAdditionalInfo: true,
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
        
        const fbRunId = fbResponse.data.data.id;
        console.log(`  Started Facebook scraper: ${fbRunId}`);
        
        // Wait for completion
        let fbStatus = 'RUNNING';
        while (fbStatus === 'RUNNING' || fbStatus === 'READY') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          const statusResponse = await axios.get(
            `https://api.apify.com/v2/acts/${fbActorId}/runs/${fbRunId}`,
            {
              headers: {
                'Authorization': `Bearer ${APIFY_API_KEY}`
              }
            }
          );
          fbStatus = statusResponse.data.data.status;
          process.stdout.write('.');
        }
        
        console.log('\n  ✅ Facebook scraping complete!');
        
        // Get results
        const fbDatasetId = fbResponse.data.data.defaultDatasetId;
        const fbResultsResponse = await axios.get(
          `https://api.apify.com/v2/datasets/${fbDatasetId}/items`,
          {
            headers: {
              'Authorization': `Bearer ${APIFY_API_KEY}`
            }
          }
        );
        
        const fbResults = fbResultsResponse.data;
        let emailsFound = 0;
        
        console.log(`  📊 Received ${fbResults.length} Facebook results`);
        
        // Debug: Show what URLs we're looking for
        console.log(`  📍 URL Map contains:`)
        fbUrlBusinessMap.forEach((businesses, url) => {
          console.log(`    - ${url} => ${businesses[0].title}`);
        });
        
        fbResults.forEach(fbItem => {
          // Try multiple URL fields - pageUrl is what Facebook scraper returns
          const resultUrl = fbItem.pageUrl || fbItem.url || fbItem.facebookUrl || '';
          const normalizedResultUrl = resultUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
          
          console.log(`    Checking result: ${fbItem.title || 'Unknown'} - URL: ${normalizedResultUrl}`);
          if (fbItem.email) {
            console.log(`      Has email: ${fbItem.email}`);
          }
          
          // Try to find matching businesses
          let matchedBusinesses = [];
          
          // Try exact match first
          fbUrlBusinessMap.forEach((businesses, url) => {
            const normalizedMapUrl = url.split('?')[0].replace(/\/$/, '').toLowerCase();
            if (normalizedMapUrl === normalizedResultUrl || 
                normalizedResultUrl.includes(normalizedMapUrl) ||
                normalizedMapUrl.includes(normalizedResultUrl)) {
              matchedBusinesses.push(...businesses);
              console.log(`      Matched to business: ${businesses[0].title}`);
            }
          });
          
          matchedBusinesses.forEach(business => {
            if (fbItem.email && fbItem.email.trim()) {
              business.email = fbItem.email.trim();
              emailsFound++;
              console.log(`  ✉️ Found email for ${business.title}: ${fbItem.email}`);
            }
          });
          
          // Also show if we got a result but couldn't match it
          if (matchedBusinesses.length === 0 && fbItem.email) {
            console.log(`  ⚠️ Found email for ${fbItem.title} but couldn't match to business: ${fbItem.email}`);
          }
        });
        
        console.log(`  📊 Found ${emailsFound} emails from Facebook pages`);
        
      } catch (error) {
        console.error('  ❌ Facebook enrichment failed:', error.message);
      }
    }
    
    // Phase 2B - Search + Facebook enrichment for businesses with no email and no Facebook
    if (businessesNoEmailNoFB.length > 0) {
      console.log('\n🔍 Phase 2B: Google Search + Facebook Scraper');
      console.log('-'.repeat(50));
      console.log(`Searching for Facebook pages for ${businessesNoEmailNoFB.length} businesses...`);
      
      try {
        const searchActorId = 'nFJndFXA5zjCTuudP'; // Google Search Results Scraper
        const foundFacebookUrls = [];
        
        // Search in batches
        const batchSize = 3;
        for (let i = 0; i < businessesNoEmailNoFB.length; i += batchSize) {
          const batch = businessesNoEmailNoFB.slice(i, i + batchSize);
          console.log(`  Searching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(businessesNoEmailNoFB.length/batchSize)}`);
          
          // Create search queries
          const queries = batch.map(b => 
            `site:facebook.com "${b.title}" ${testLocation}`
          ).join('\n');
          
          const searchResponse = await axios.post(
            `https://api.apify.com/v2/acts/${searchActorId}/runs`,
            {
              queries: queries,
              maxPagesPerQuery: 1,
              resultsPerPage: 5,
              languageCode: 'en',
              mobileResults: false
            },
            {
              headers: {
                'Authorization': `Bearer ${APIFY_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const searchRunId = searchResponse.data.data.id;
          
          // Wait for completion
          let searchStatus = 'RUNNING';
          while (searchStatus === 'RUNNING' || searchStatus === 'READY') {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const statusResponse = await axios.get(
              `https://api.apify.com/v2/acts/${searchActorId}/runs/${searchRunId}`,
              {
                headers: {
                  'Authorization': `Bearer ${APIFY_API_KEY}`
                }
              }
            );
            searchStatus = statusResponse.data.data.status;
          }
          
          // Get search results
          const searchDatasetId = searchResponse.data.data.defaultDatasetId;
          const searchResultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${searchDatasetId}/items`,
            {
              headers: {
                'Authorization': `Bearer ${APIFY_API_KEY}`
              }
            }
          );
          
          const searchResults = searchResultsResponse.data;
          
          // Process search results
          searchResults.forEach(result => {
            const query = result.searchQuery?.term || '';
            const organicResults = result.organicResults || [];
            
            const business = batch.find(b => query.includes(b.title));
            
            if (business) {
              for (const organic of organicResults) {
                const url = organic.url || '';
                if (url.includes('facebook.com') && !url.includes('/directory/')) {
                  business.facebook = url;
                  foundFacebookUrls.push({ business, url });
                  console.log(`    ✓ Found Facebook for ${business.title}: ${url}`);
                  break;
                }
              }
            }
          });
          
          if (i + batchSize < businessesNoEmailNoFB.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log(`  📊 Found ${foundFacebookUrls.length} Facebook pages via search`);
        
        // Now run Facebook scraper on the found pages
        if (foundFacebookUrls.length > 0) {
          console.log(`  📘 Enriching ${foundFacebookUrls.length} newly found Facebook pages...`);
          
          const fbUrlsToEnrich = foundFacebookUrls.map(f => f.url);
          
          const fbActorId = '4Hv5RhChiaDk6iwad';
          const fbResponse = await axios.post(
            `https://api.apify.com/v2/acts/${fbActorId}/runs`,
            {
              startUrls: fbUrlsToEnrich.map(url => ({ url })),
              maxPagesToScrap: 1,
              scrapeAbout: true,
              scrapeReviews: false,
              scrapePosts: false,
              scrapeServices: true,
              scrapeAdditionalInfo: true,
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
          
          const fbRunId = fbResponse.data.data.id;
          
          // Wait for completion
          let fbStatus = 'RUNNING';
          while (fbStatus === 'RUNNING' || fbStatus === 'READY') {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const statusResponse = await axios.get(
              `https://api.apify.com/v2/acts/${fbActorId}/runs/${fbRunId}`,
              {
                headers: {
                  'Authorization': `Bearer ${APIFY_API_KEY}`
                }
              }
            );
            fbStatus = statusResponse.data.data.status;
            process.stdout.write('.');
          }
          
          console.log('\n  ✅ Facebook enrichment complete!');
          
          // Get results
          const fbDatasetId = fbResponse.data.data.defaultDatasetId;
          const fbResultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${fbDatasetId}/items`,
            {
              headers: {
                'Authorization': `Bearer ${APIFY_API_KEY}`
              }
            }
          );
          
          const fbResults = fbResultsResponse.data;
          let emailsFound = 0;
          
          console.log(`  📊 Received ${fbResults.length} results from Facebook scraper`);
          
          // Debug: Show what URLs we're looking for (same as Phase 2A)
          console.log(`  📍 URLs we're searching for:`)
          foundFacebookUrls.forEach(f => {
            console.log(`    - ${f.url} => ${f.business.title}`);
          });
          
          // Use the EXACT same matching logic as Phase 2A
          fbResults.forEach(fbItem => {
            // Try multiple URL fields - pageUrl is what Facebook scraper returns
            const resultUrl = fbItem.pageUrl || fbItem.url || fbItem.facebookUrl || '';
            const normalizedResultUrl = resultUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
            
            console.log(`    Checking result: ${fbItem.title || 'Unknown'} - URL: ${normalizedResultUrl}`);
            if (fbItem.email) {
              console.log(`      Has email: ${fbItem.email}`);
            }
            
            // Match using the same approach as Phase 2A
            let matchedBusiness = null;
            foundFacebookUrls.forEach(f => {
              const normalizedSearchUrl = f.url.split('?')[0].replace(/\/$/, '').toLowerCase();
              if (normalizedSearchUrl === normalizedResultUrl || 
                  normalizedResultUrl.includes(normalizedSearchUrl) ||
                  normalizedSearchUrl.includes(normalizedResultUrl)) {
                matchedBusiness = f.business;
                console.log(`      Matched to business: ${f.business.title}`);
              }
            });
            
            if (matchedBusiness) {
              if (fbItem.email && fbItem.email.trim()) {
                matchedBusiness.email = fbItem.email.trim();
                emailsFound++;
                console.log(`    ✉️ Found email for ${matchedBusiness.title}: ${fbItem.email}`);
              }
            } else {
              if (fbItem.email) {
                console.log(`      ⚠️ Found email but couldn't match to business: ${fbItem.email}`);
              } else {
                console.log(`      ❌ No email found for this Facebook page`);
              }
            }
          });
          
          console.log(`  📊 Found ${emailsFound} emails from newly discovered Facebook pages`);
        }
        
      } catch (error) {
        console.error('  ❌ Search & enrichment failed:', error.message);
      }
    }
    
    // Final Summary with Email Breakdown
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL EMAIL BREAKDOWN BY SOURCE');
    console.log('='.repeat(60));
    
    // Count emails from original Google Maps results
    let googleMapsEmails = businessesWithEmail.length;
    
    // Count emails from Facebook enrichment (Phase 2A)
    let facebookDirectEmails = 0;
    businessesNoEmailWithFB.forEach(business => {
      if (business.email) {
        facebookDirectEmails++;
      }
    });
    
    // Count emails from Facebook search + enrichment (Phase 2B)
    let facebookSearchEmails = 0;
    businessesNoEmailNoFB.forEach(business => {
      if (business.email) {
        facebookSearchEmails++;
      }
    });
    
    let totalEmails = googleMapsEmails + facebookDirectEmails + facebookSearchEmails;
    
    console.log(`📍 Phase 1 - Google Maps:       ${googleMapsEmails} emails`);
    console.log(`📘 Phase 2A - Facebook Direct:  ${facebookDirectEmails} emails`);
    console.log(`🔍 Phase 2B - Facebook Search:  ${facebookSearchEmails} emails`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`📧 TOTAL EMAILS COLLECTED:      ${totalEmails}/${businesses.length} (${((totalEmails/businesses.length)*100).toFixed(1)}%)`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Cascading Email Enrichment Test Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testEmailEnrichment();