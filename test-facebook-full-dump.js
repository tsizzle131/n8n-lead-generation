#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testFacebookFullDump() {
  console.log('🔍 Facebook Scraper FULL DATA DUMP\n');
  console.log('='.repeat(60));
  
  // Test with Facebook pages that should have emails
  const testUrls = [
    'https://www.facebook.com/kickbuttcoffee',
    'https://www.facebook.com/ArwaYemeniCoffee',
    'https://www.facebook.com/SummerMoonCoffee'  // Adding one that likely has email
  ];
  
  console.log('Testing Facebook pages:');
  testUrls.forEach(url => console.log(`  - ${url}`));
  console.log();
  
  try {
    // Run Facebook Pages Scraper with ALL options enabled
    const fbActorId = '4Hv5RhChiaDk6iwad';
    const fbResponse = await axios.post(
      `https://api.apify.com/v2/acts/${fbActorId}/runs`,
      {
        startUrls: testUrls.map(url => ({ url })),
        maxPagesToScrap: 1,
        scrapeAbout: true,      // This should get contact info
        scrapeReviews: false,
        scrapePosts: false,
        scrapeServices: true,    // Enable services
        scrapeAdditionalInfo: true  // Try to get additional info
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
    console.log('Waiting for completion...');
    
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
    
    console.log('\n✅ Facebook scraping complete!\n');
    
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
    
    // Save full response to file for inspection
    fs.writeFileSync('facebook-scraper-output.json', JSON.stringify(fbResults, null, 2));
    console.log('📁 Full response saved to facebook-scraper-output.json\n');
    
    console.log('📊 ANALYZING RESULTS FOR EMAILS:');
    console.log('='.repeat(60));
    console.log(`Found ${fbResults.length} results\n`);
    
    // Deep search for emails in every field
    fbResults.forEach((fbItem, index) => {
      console.log(`\nResult #${index + 1}: ${fbItem.title || fbItem.name || 'Unknown'}`);
      console.log(`URL: ${fbItem.url || fbItem.facebookUrl || fbItem.pageUrl}`);
      console.log('\n🔍 SEARCHING FOR EMAILS IN ALL FIELDS:');
      
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = new Set();
      
      // Recursive function to find emails in any field
      function findEmails(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              foundEmails.add(email);
              console.log(`  ⭐ Found email at ${path}: ${email}`);
            });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => findEmails(item, `${path}[${i}]`));
        } else if (typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            findEmails(obj[key], path ? `${path}.${key}` : key);
          });
        }
      }
      
      // Search entire object
      findEmails(fbItem);
      
      if (foundEmails.size === 0) {
        console.log('  ❌ No emails found in any field');
        
        // Show what fields DO exist
        console.log('\n  Available top-level fields:');
        Object.keys(fbItem).forEach(key => {
          const value = fbItem[key];
          const type = typeof value;
          if (type === 'string' && value.length < 50) {
            console.log(`    ${key}: "${value}"`);
          } else if (type === 'object' && value !== null) {
            if (Array.isArray(value)) {
              console.log(`    ${key}: [array with ${value.length} items]`);
            } else {
              console.log(`    ${key}: [object with keys: ${Object.keys(value).slice(0, 5).join(', ')}${Object.keys(value).length > 5 ? '...' : ''}]`);
            }
          } else {
            console.log(`    ${key}: [${type}]`);
          }
        });
      } else {
        console.log(`\n  📧 UNIQUE EMAILS FOUND: ${Array.from(foundEmails).join(', ')}`);
      }
      
      console.log('\n' + '-'.repeat(60));
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    let totalPagesWithEmail = 0;
    const allEmailsFound = new Set();
    
    fbResults.forEach(fbItem => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const jsonStr = JSON.stringify(fbItem);
      const matches = jsonStr.match(emailRegex);
      if (matches) {
        totalPagesWithEmail++;
        matches.forEach(email => allEmailsFound.add(email));
      }
    });
    
    console.log(`  ${totalPagesWithEmail}/${fbResults.length} pages contain email addresses`);
    console.log(`  Total unique emails found: ${allEmailsFound.size}`);
    if (allEmailsFound.size > 0) {
      console.log('  Emails found:', Array.from(allEmailsFound));
    }
    
    console.log('\n💡 Check facebook-scraper-output.json for the complete response structure');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testFacebookFullDump();