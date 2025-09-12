#!/usr/bin/env node

const axios = require('axios');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function testFacebookDebug() {
  console.log('🔍 Facebook Scraper Field Debug Test\n');
  console.log('='.repeat(60));
  
  // Test with a known Facebook page that likely has email
  const testUrls = [
    'https://www.facebook.com/kickbuttcoffee',
    'https://www.facebook.com/ArwaYemeniCoffee'
  ];
  
  console.log('Testing Facebook pages:');
  testUrls.forEach(url => console.log(`  - ${url}`));
  console.log();
  
  try {
    // Run Facebook Pages Scraper
    const fbActorId = '4Hv5RhChiaDk6iwad';
    const fbResponse = await axios.post(
      `https://api.apify.com/v2/acts/${fbActorId}/runs`,
      {
        startUrls: testUrls.map(url => ({ url })),
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
    
    console.log('📊 FACEBOOK SCRAPER RESULTS ANALYSIS:');
    console.log('='.repeat(60));
    console.log(`Found ${fbResults.length} results\n`);
    
    fbResults.forEach((fbItem, index) => {
      console.log(`Result #${index + 1}: ${fbItem.title || fbItem.name || 'Unknown'}`);
      console.log(`  URL: ${fbItem.url}`);
      console.log('  ALL AVAILABLE FIELDS:');
      
      // Show ALL fields with their values
      const fields = Object.keys(fbItem).sort();
      fields.forEach(field => {
        const value = fbItem[field];
        const type = typeof value;
        
        // Show everything to find where email might be hiding
        if (type === 'string' && value.length < 100) {
          console.log(`  ${field}: "${value}"`);
        } else if (type === 'string') {
          console.log(`  ${field}: [long string, ${value.length} chars]`);
          // Check if this long string contains email
          if (value.includes('@')) {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emails = value.match(emailRegex);
            if (emails) {
              console.log(`    ⭐ Contains emails: ${emails.join(', ')}`);
            }
          }
        } else if (type === 'object' && value !== null) {
          console.log(`  ${field}: [${type}] ${JSON.stringify(value).substring(0, 100)}...`);
        } else {
          console.log(`  ${field}: [${type}] ${value}`);
        }
      });
      
      // Check specific email-related fields
      console.log('\n  Email field checks:');
      console.log(`    - email: ${fbItem.email || 'NOT FOUND'}`);
      console.log(`    - emails: ${fbItem.emails || 'NOT FOUND'}`);
      console.log(`    - contactEmail: ${fbItem.contactEmail || 'NOT FOUND'}`);
      console.log(`    - businessEmail: ${fbItem.businessEmail || 'NOT FOUND'}`);
      
      // Check if email might be in other fields
      if (fbItem.about) {
        const aboutStr = typeof fbItem.about === 'string' ? fbItem.about : JSON.stringify(fbItem.about);
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailsInAbout = aboutStr.match(emailRegex);
        if (emailsInAbout) {
          console.log(`    - Emails found in 'about': ${emailsInAbout.join(', ')}`);
        }
      }
      
      if (fbItem.info) {
        console.log('\n  📍 INFO OBJECT STRUCTURE:');
        console.log(`    Type: ${typeof fbItem.info}`);
        if (typeof fbItem.info === 'object') {
          console.log('    Fields:', Object.keys(fbItem.info));
          
          // Check if it's an array-like object
          if (fbItem.info['0']) {
            console.log('    Info appears to be array-like, checking each element:');
            Object.keys(fbItem.info).forEach(key => {
              const item = fbItem.info[key];
              console.log(`    [${key}]:`, JSON.stringify(item).substring(0, 200));
              
              // Check if this item has email
              if (typeof item === 'object' && item !== null) {
                if (item.email) {
                  console.log(`      ⭐ Found email in info[${key}].email: ${item.email}`);
                }
                if (item.name && item.name.toLowerCase().includes('email')) {
                  console.log(`      ⭐ Found email field in info[${key}]: ${JSON.stringify(item)}`);
                }
                // Check for email pattern in values
                Object.values(item).forEach(val => {
                  if (typeof val === 'string' && val.includes('@')) {
                    console.log(`      ⭐ Found email value in info[${key}]: ${val}`);
                  }
                });
              }
            });
          }
          
          // Check for email in info object
          if (fbItem.info.email) {
            console.log(`    ⭐ info.email: ${fbItem.info.email}`);
          }
          if (fbItem.info.emails) {
            console.log(`    ⭐ info.emails: ${JSON.stringify(fbItem.info.emails)}`);
          }
        }
        const infoStr = typeof fbItem.info === 'string' ? fbItem.info : JSON.stringify(fbItem.info);
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailsInInfo = infoStr.match(emailRegex);
        if (emailsInInfo) {
          console.log(`    - Emails found in 'info': ${emailsInInfo.join(', ')}`);
        }
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    // Summary
    console.log('SUMMARY:');
    let emailCount = 0;
    fbResults.forEach(fbItem => {
      if (fbItem.email || fbItem.emails || fbItem.contactEmail || fbItem.businessEmail) {
        emailCount++;
      }
    });
    console.log(`  ${emailCount}/${fbResults.length} pages have email data`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testFacebookDebug();