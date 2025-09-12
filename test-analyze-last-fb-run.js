#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// API key
const APIFY_API_KEY = 'apify_api_VThYEh2KqYRhbvWecxhJG5KpmbwMf1140Skl';

async function analyzeLastFacebookRun() {
  console.log('🔍 Analyzing Last Facebook Scraper Run\n');
  console.log('='.repeat(60));
  
  const runId = process.argv[2] || '6VA8ENS5FTozbVwbt'; // From the test output
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
    
    // Get input from key-value store
    const kvStoreId = runData.defaultKeyValueStoreId;
    try {
      const inputResponse = await axios.get(
        `https://api.apify.com/v2/key-value-stores/${kvStoreId}/records/INPUT`,
        {
          headers: {
            'Authorization': `Bearer ${APIFY_API_KEY}`
          }
        }
      );
      console.log(JSON.stringify(inputResponse.data, null, 2));
    } catch (e) {
      console.log('Could not retrieve input parameters from key-value store');
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
    
    console.log(`Found ${results.length} results\n`);
    
    // Analyze each result
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    results.forEach((item, index) => {
      console.log(`\n📘 Result #${index + 1}: ${item.title || item.name || 'Unknown'}`);
      console.log(`URL: ${item.url || item.facebookUrl || item.pageUrl}`);
      
      // Check for email field
      console.log('\n📧 EMAIL FIELD CHECK:');
      console.log(`  email field exists: ${item.hasOwnProperty('email')}`);
      console.log(`  email value: ${item.email || 'null/undefined'}`);
      console.log(`  email type: ${typeof item.email}`);
      
      // Check for emails field
      console.log(`  emails field exists: ${item.hasOwnProperty('emails')}`);
      console.log(`  emails value: ${JSON.stringify(item.emails) || 'null/undefined'}`);
      console.log(`  emails type: ${typeof item.emails}`);
      
      // List ALL fields
      console.log('\n📋 ALL FIELDS:');
      const fields = Object.keys(item).sort();
      fields.forEach(field => {
        if (field.toLowerCase().includes('email') || field.toLowerCase().includes('contact')) {
          console.log(`  ⭐ ${field}: ${JSON.stringify(item[field])}`);
        }
      });
      
      // Deep search for emails
      const foundEmails = new Set();
      function findEmails(obj, path = '') {
        if (!obj) return;
        
        if (typeof obj === 'string') {
          const matches = obj.match(emailRegex);
          if (matches) {
            matches.forEach(email => foundEmails.add(email));
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
        console.log(`\n✅ EMAILS FOUND IN DATA: ${Array.from(foundEmails).join(', ')}`);
      } else {
        console.log('\n❌ NO EMAILS FOUND ANYWHERE');
      }
      
      console.log('-'.repeat(60));
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    let withEmailField = 0;
    let withEmailValue = 0;
    const allEmails = new Set();
    
    results.forEach(item => {
      if (item.hasOwnProperty('email')) withEmailField++;
      if (item.email) {
        withEmailValue++;
        allEmails.add(item.email);
      }
      
      // Also check in full data
      const jsonStr = JSON.stringify(item);
      const matches = jsonStr.match(emailRegex);
      if (matches) {
        matches.forEach(email => allEmails.add(email));
      }
    });
    
    console.log(`Results with 'email' field: ${withEmailField}/${results.length}`);
    console.log(`Results with email value: ${withEmailValue}/${results.length}`);
    console.log(`Total unique emails found: ${allEmails.size}`);
    
    if (allEmails.size > 0) {
      console.log('\nAll emails:');
      Array.from(allEmails).forEach(email => console.log(`  - ${email}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the analysis
analyzeLastFacebookRun();