#!/usr/bin/env node

const axios = require('axios');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testFullEnrichment30() {
  console.log('🚀 FULL EMAIL ENRICHMENT TEST - 30 BUSINESSES\n');
  console.log('='.repeat(60));
  
  const testLocation = 'Austin, TX';
  const testQueries = ['restaurant'];
  
  console.log('📍 Location:', testLocation);
  console.log('🔍 Query:', testQueries[0]);
  console.log('🎯 Target: 30 businesses\n');
  
  const stats = {
    totalBusinesses: 0,
    phase1_googleMapsEmails: 0,
    phase2a_facebookEmails: 0,
    phase2b_searchEmails: 0,
    finalNoEmail: 0
  };
  
  // Phase 1: Google Maps
  console.log('PHASE 1: Google Maps Scraping');
  console.log('-'.repeat(50));
  
  const googleMapsActorId = 'WnMxbsRLNbPeYL6ge';
  
  try {
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/${googleMapsActorId}/runs`,
      {
        searchStringsArray: [`${testQueries[0]} ${testLocation}`],
        maxCrawledPlacesPerSearch: 30,
        language: 'en',
        deeperCitySearch: false,
        skipClosedPlaces: true,
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
    console.log(`Started Google Maps scraper: ${runId}`);
    console.log('Waiting for completion...');
    
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
    
    console.log('\n✅ Google Maps complete!\n');
    
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
    stats.totalBusinesses = businesses.length;
    
    // Categorize businesses
    const businessesWithEmail = [];
    const businessesNoEmailWithFB = [];
    const businessesNoEmailNoFB = [];
    
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
      
      // Store business data
      const bizData = {
        name: business.title || business.name,
        email: email,
        facebook: facebookUrl
      };
      
      if (email) {
        businessesWithEmail.push(bizData);
        stats.phase1_googleMapsEmails++;
      } else if (facebookUrl) {
        businessesNoEmailWithFB.push(bizData);
      } else {
        businessesNoEmailNoFB.push(bizData);
      }
    });
    
    console.log('📊 Phase 1 Results:');
    console.log(`  Total businesses: ${stats.totalBusinesses}`);
    console.log(`  ✅ With email: ${businessesWithEmail.length} (${((businessesWithEmail.length/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log(`  📘 No email, has Facebook: ${businessesNoEmailWithFB.length}`);
    console.log(`  ❌ No email, no Facebook: ${businessesNoEmailNoFB.length}`);
    console.log();
    
    // Phase 2A: Facebook enrichment
    if (businessesNoEmailWithFB.length > 0) {
      console.log('PHASE 2A: Facebook Pages Scraper');
      console.log('-'.repeat(50));
      console.log(`Enriching ${businessesNoEmailWithFB.length} Facebook pages...`);
      
      try {
        // Deduplicate Facebook URLs
        const uniqueFbUrls = new Set();
        const fbUrlBusinessMap = new Map();
        
        businessesNoEmailWithFB.forEach(business => {
          if (business.facebook) {
            let normalizedUrl = business.facebook.split('?')[0].replace(/\/$/, '');
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
        console.log(`Deduped to ${fbUrlsToEnrich.length} unique Facebook pages`);
        
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
            scrapeServices: false
          },
          {
            headers: {
              'Authorization': `Bearer ${APIFY_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const fbRunId = fbResponse.data.data.id;
        console.log(`Started Facebook scraper: ${fbRunId}`);
        
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
        
        console.log('\n✅ Facebook scraping complete!');
        
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
        
        fbResults.forEach(fbItem => {
          const normalizedResultUrl = (fbItem.url || '').split('?')[0].replace(/\/$/, '');
          const businesses = fbUrlBusinessMap.get(normalizedResultUrl) || [];
          
          businesses.forEach(business => {
            if (fbItem.email && fbItem.email.trim()) {
              business.email = fbItem.email.trim();
              stats.phase2a_facebookEmails++;
              console.log(`  ✉️ Found email for ${business.name}: ${fbItem.email}`);
            }
          });
        });
        
        console.log(`📊 Phase 2A: Found ${stats.phase2a_facebookEmails} emails from Facebook`);
        
      } catch (error) {
        console.error('❌ Facebook enrichment failed:', error.message);
      }
      console.log();
    }
    
    // Phase 2B: Search for Facebook pages
    if (businessesNoEmailNoFB.length > 0) {
      console.log('PHASE 2B: Google Search + Facebook Scraper');
      console.log('-'.repeat(50));
      console.log(`Searching for Facebook pages for ${businessesNoEmailNoFB.length} businesses...`);
      
      try {
        const searchActorId = 'nFJndFXA5zjCTuudP';
        const foundFacebookUrls = [];
        
        // Search in batches
        const batchSize = 5;
        for (let i = 0; i < businessesNoEmailNoFB.length; i += batchSize) {
          const batch = businessesNoEmailNoFB.slice(i, i + batchSize);
          console.log(`Searching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(businessesNoEmailNoFB.length/batchSize)}`);
          
          // Create search queries
          const queries = batch.map(b => 
            `site:facebook.com "${b.name}" ${testLocation}`
          ).join('\n');
          
          const searchResponse = await axios.post(
            `https://api.apify.com/v2/acts/${searchActorId}/runs`,
            {
              queries: queries,
              maxPagesPerQuery: 1,
              resultsPerPage: 3,
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
            await new Promise(resolve => setTimeout(resolve, 2000));
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
            
            const business = batch.find(b => query.includes(b.name));
            
            if (business) {
              for (const organic of organicResults) {
                const url = organic.url || '';
                if (url.includes('facebook.com') && !url.includes('/directory/')) {
                  business.facebook = url;
                  foundFacebookUrls.push({ business, url });
                  console.log(`  ✓ Found Facebook for ${business.name}`);
                  break;
                }
              }
            }
          });
          
          if (i + batchSize < businessesNoEmailNoFB.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log(`Found ${foundFacebookUrls.length} Facebook pages via search`);
        
        // Now run Facebook scraper on found pages
        if (foundFacebookUrls.length > 0) {
          console.log(`Enriching ${foundFacebookUrls.length} newly found Facebook pages...`);
          
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
              scrapeServices: false
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
          
          console.log('\n✅ Facebook enrichment complete!');
          
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
          
          fbResults.forEach(fbItem => {
            const found = foundFacebookUrls.find(f => 
              f.url === fbItem.url || f.url.includes(fbItem.url)
            );
            
            if (found && found.business && fbItem.email && fbItem.email.trim()) {
              found.business.email = fbItem.email.trim();
              stats.phase2b_searchEmails++;
              console.log(`  ✉️ Found email for ${found.business.name}: ${fbItem.email}`);
            }
          });
        }
        
        console.log(`📊 Phase 2B: Found ${stats.phase2b_searchEmails} emails via search + Facebook`);
        
      } catch (error) {
        console.error('❌ Search & enrichment failed:', error.message);
      }
    }
    
    // Calculate final stats
    stats.finalNoEmail = stats.totalBusinesses - 
                        (stats.phase1_googleMapsEmails + 
                         stats.phase2a_facebookEmails + 
                         stats.phase2b_searchEmails);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total businesses processed: ${stats.totalBusinesses}`);
    console.log();
    console.log('Emails by Phase:');
    console.log(`  Phase 1 (Google Maps):     ${stats.phase1_googleMapsEmails} emails (${((stats.phase1_googleMapsEmails/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log(`  Phase 2A (Facebook):       ${stats.phase2a_facebookEmails} emails (${((stats.phase2a_facebookEmails/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log(`  Phase 2B (Search+FB):      ${stats.phase2b_searchEmails} emails (${((stats.phase2b_searchEmails/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log();
    console.log(`TOTAL EMAILS FOUND:          ${stats.phase1_googleMapsEmails + stats.phase2a_facebookEmails + stats.phase2b_searchEmails} / ${stats.totalBusinesses} (${(((stats.phase1_googleMapsEmails + stats.phase2a_facebookEmails + stats.phase2b_searchEmails)/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log(`Businesses without email:    ${stats.finalNoEmail} (${((stats.finalNoEmail/stats.totalBusinesses)*100).toFixed(1)}%)`);
    console.log();
    console.log('Cost Efficiency:');
    console.log(`  Saved ${((stats.phase1_googleMapsEmails/stats.totalBusinesses)*100).toFixed(1)}% in enrichment costs`);
    console.log(`  Only ${stats.totalBusinesses - stats.phase1_googleMapsEmails} businesses needed enrichment`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testFullEnrichment30();