#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function analyzeSpecificRun() {
  console.log('🔍 Analyzing Specific Facebook Scraper Run\n');
  console.log('='.repeat(60));
  
  // The run ID from your URL
  const runId = '6It0F1rfjeC4Yj31V';
  const actorId = '4Hv5RhChiaDk6iwad'; // Facebook Pages Scraper
  
  console.log(`Run ID: ${runId}`);
  console.log(`Actor: Facebook Pages Scraper\n`);
  
  try {
    // First get run info to find the dataset
    console.log('Fetching run information...');
    const runResponse = await axios.get(
      `https://api.apify.com/v2/acts/${actorId}/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`
        }
      }
    );
    
    const runData = runResponse.data.data;
    console.log(`Status: ${runData.status}`);
    console.log(`Dataset ID: ${runData.defaultDatasetId}`);
    
    // Get the input that was used
    console.log('\n📋 RUN INPUT PARAMETERS:');
    console.log('='.repeat(40));
    if (runData.options && runData.options.input) {
      console.log(JSON.stringify(runData.options.input, null, 2));
    } else {
      console.log('Could not retrieve input parameters');
    }
    
    // Get results from the dataset
    console.log('\n📊 FETCHING RESULTS...\n');
    const datasetId = runData.defaultDatasetId;
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_KEY}`
        }
      }
    );
    
    const results = resultsResponse.data;
    
    // Save full response
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const filename = `run-analysis-${runId}-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`📁 Full response saved to ${filename}\n`);
    
    console.log(`Found ${results.length} results\n`);
    
    // Analyze each result
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    results.forEach((item, index) => {
      console.log(`\n📘 Result #${index + 1}: ${item.title || item.name || 'Unknown'}`);
      console.log(`URL: ${item.url || item.facebookUrl || item.pageUrl}`);
      
      // List ALL top-level fields
      console.log('\n📋 ALL TOP-LEVEL FIELDS:');
      const fields = Object.keys(item).sort();
      fields.forEach(field => {
        const value = item[field];
        const type = typeof value;
        
        if (field.toLowerCase().includes('email')) {
          console.log(`  ⭐ ${field}: ${JSON.stringify(value)}`);
        } else if (type === 'string' && value.length < 100) {
          console.log(`  ${field}: "${value}"`);
        } else if (type === 'string') {
          // Check for emails in long strings
          const emails = value.match(emailRegex);
          if (emails) {
            console.log(`  ${field}: [contains emails: ${emails.join(', ')}]`);
          } else {
            console.log(`  ${field}: [string, ${value.length} chars]`);
          }
        } else if (Array.isArray(value)) {
          console.log(`  ${field}: [array, ${value.length} items]`);
          // Check if array contains emails
          const arrayStr = JSON.stringify(value);
          const arrayEmails = arrayStr.match(emailRegex);
          if (arrayEmails) {
            console.log(`    └─ Contains emails: ${arrayEmails.join(', ')}`);
          }
        } else if (type === 'object' && value !== null) {
          const keys = Object.keys(value);
          console.log(`  ${field}: [object, keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
          // Check for emails in objects
          const objStr = JSON.stringify(value);
          const objEmails = objStr.match(emailRegex);
          if (objEmails) {
            console.log(`    └─ Contains emails: ${objEmails.join(', ')}`);
          }
        } else {
          console.log(`  ${field}: [${type}] ${value}`);
        }
      });
      
      // Deep search for all emails
      console.log('\n🔍 DEEP EMAIL SEARCH:');
      const foundEmails = new Set();
      const emailLocations = [];
      
      function findEmails(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              if (!foundEmails.has(email)) {
                foundEmails.add(email);
                emailLocations.push({ path, email });
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
      
      findEmails(item);
      
      if (foundEmails.size > 0) {
        console.log(`✅ Found ${foundEmails.size} unique email(s):`);
        emailLocations.forEach(loc => {
          console.log(`  📧 ${loc.email} at: ${loc.path}`);
        });
      } else {
        console.log('❌ No emails found anywhere in this result');
      }
      
      console.log('\n' + '-'.repeat(60));
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    let totalWithEmails = 0;
    const allEmails = new Set();
    const fieldCounts = {};
    
    results.forEach(item => {
      const itemEmails = new Set();
      
      function countEmails(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              itemEmails.add(email);
              allEmails.add(email);
              if (!fieldCounts[path]) fieldCounts[path] = 0;
              fieldCounts[path]++;
            });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => countEmails(item, `${path}[${i}]`));
        } else if (typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            countEmails(obj[key], path ? `${path}.${key}` : key);
          });
        }
      }
      
      countEmails(item);
      if (itemEmails.size > 0) totalWithEmails++;
    });
    
    console.log(`Pages with emails: ${totalWithEmails}/${results.length} (${((totalWithEmails/results.length)*100).toFixed(1)}%)`);
    console.log(`Total unique emails: ${allEmails.size}`);
    
    if (allEmails.size > 0) {
      console.log('\n📧 All emails found:');
      Array.from(allEmails).forEach(email => console.log(`  - ${email}`));
      
      console.log('\n📍 Email locations (field -> count):');
      Object.entries(fieldCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([field, count]) => {
          console.log(`  ${field}: ${count} occurrence(s)`);
        });
    }
    
    console.log('\n💡 Check ' + filename + ' for complete details');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the analysis
analyzeSpecificRun();