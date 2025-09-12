#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testFacebookRawDump() {
  console.log('🔍 Facebook Scraper RAW RESPONSE DUMP\n');
  console.log('='.repeat(60));
  
  // Test with Facebook pages that should have emails
  const testUrls = [
    'https://www.facebook.com/kickbuttcoffee',
    'https://www.facebook.com/ArwaYemeniCoffee',
    'https://www.facebook.com/SummerMoonCoffee',
    'https://www.facebook.com/bubbsseltzer'
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
    
    // Save full response to file
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const filename = `facebook-raw-dump-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(fbResults, null, 2));
    console.log(`📁 Full response saved to ${filename}\n`);
    
    console.log('📊 ANALYZING EACH RESULT FOR EMAILS:');
    console.log('='.repeat(60));
    console.log(`Found ${fbResults.length} results\n`);
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    fbResults.forEach((fbItem, index) => {
      console.log(`\n📘 Result #${index + 1}: ${fbItem.title || fbItem.name || 'Unknown'}`);
      console.log(`URL: ${fbItem.url || fbItem.facebookUrl || fbItem.pageUrl}`);
      console.log('\n🔍 SEARCHING ALL FIELDS FOR EMAILS:');
      
      const foundEmails = new Set();
      const emailLocations = [];
      
      // Recursive function to find emails in any field
      function findEmails(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              if (!foundEmails.has(email)) {
                foundEmails.add(email);
                emailLocations.push({ path, email, value: obj.substring(0, 200) });
              }
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
      
      if (foundEmails.size > 0) {
        console.log(`\n✅ FOUND ${foundEmails.size} UNIQUE EMAIL(S):`);
        emailLocations.forEach(loc => {
          console.log(`  📧 Email: ${loc.email}`);
          console.log(`     Path: ${loc.path}`);
          console.log(`     Context: "${loc.value.substring(0, 100)}..."`);
        });
      } else {
        console.log('  ❌ No emails found in any field');
      }
      
      // Show top-level fields for debugging
      console.log('\n📋 Top-level fields present:');
      Object.keys(fbItem).forEach(key => {
        const value = fbItem[key];
        const type = typeof value;
        if (type === 'string' && value.length < 100) {
          console.log(`  ${key}: "${value}"`);
        } else if (type === 'string') {
          console.log(`  ${key}: [string, ${value.length} chars]`);
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: [array, ${value.length} items]`);
        } else if (type === 'object' && value !== null) {
          console.log(`  ${key}: [object, keys: ${Object.keys(value).slice(0, 5).join(', ')}${Object.keys(value).length > 5 ? '...' : ''}]`);
        } else {
          console.log(`  ${key}: [${type}]`);
        }
      });
      
      console.log('\n' + '-'.repeat(60));
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    let totalPagesWithEmail = 0;
    const allEmailsFound = new Set();
    const emailsByField = {};
    
    fbResults.forEach(fbItem => {
      const foundEmails = new Set();
      
      function findEmailsForSummary(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              foundEmails.add(email);
              allEmailsFound.add(email);
              if (!emailsByField[path]) {
                emailsByField[path] = new Set();
              }
              emailsByField[path].add(email);
            });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => findEmailsForSummary(item, `${path}[${i}]`));
        } else if (typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            findEmailsForSummary(obj[key], path ? `${path}.${key}` : key);
          });
        }
      }
      
      findEmailsForSummary(fbItem);
      if (foundEmails.size > 0) {
        totalPagesWithEmail++;
      }
    });
    
    console.log(`  ${totalPagesWithEmail}/${fbResults.length} pages contain email addresses`);
    console.log(`  Total unique emails found: ${allEmailsFound.size}`);
    
    if (allEmailsFound.size > 0) {
      console.log('\n📧 All unique emails found:');
      Array.from(allEmailsFound).forEach(email => {
        console.log(`  - ${email}`);
      });
      
      console.log('\n📍 Email field locations:');
      Object.entries(emailsByField).forEach(([field, emails]) => {
        console.log(`  ${field}: ${emails.size} email(s)`);
        Array.from(emails).forEach(email => {
          console.log(`    - ${email}`);
        });
      });
    }
    
    console.log('\n💡 Check ' + filename + ' for the complete response structure');
    console.log('💡 Look for the field paths above to update the extraction logic');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testFacebookRawDump();