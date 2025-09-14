#!/usr/bin/env node
/**
 * Test the full local business campaign flow for Yorktown, Virginia
 * This will:
 * 1. Create a campaign with ZIP code analysis
 * 2. Execute the campaign (Google Maps scraping for each ZIP)
 * 3. Export results to CSV
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCampaign() {
  console.log('\n📍 Step 1: Creating campaign for Yorktown, Virginia...');
  
  const response = await fetch(`${API_BASE}/api/gmaps/campaigns/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Yorktown VA Salons Test',
      location: 'Yorktown, Virginia',
      keywords: ['salons', 'beauty salons', 'hair salons'],
      coverage_profile: 'balanced',  // Should get 5-10 ZIP codes
      description: 'Test campaign for Yorktown, VA local businesses'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to create campaign: ${result.error}`);
  }
  
  console.log('✅ Campaign created:', result.campaign.id);
  console.log(`📊 ZIP codes analyzed: ${result.campaign.zipCodes?.length || 0}`);
  
  if (result.campaign.zipCodes?.length > 0) {
    console.log('\n📍 ZIP codes to search:');
    result.campaign.zipCodes.forEach((zip, idx) => {
      console.log(`  ${idx + 1}. ${zip.zip} - ${zip.neighborhood || 'N/A'} (${zip.estimated_businesses || 0} businesses)`);
    });
  }
  
  return result.campaign;
}

async function executeCampaign(campaignId) {
  console.log('\n🚀 Step 2: Executing campaign (Google Maps scraping)...');
  console.log('⏳ This may take several minutes as it searches each ZIP code...');
  
  const response = await fetch(`${API_BASE}/api/gmaps/campaigns/${campaignId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_businesses_per_zip: 30  // Limit for testing
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to execute campaign: ${result.error}`);
  }
  
  console.log('✅ Campaign execution started');
  return result;
}

async function waitForCompletion(campaignId) {
  console.log('\n⏳ Step 3: Waiting for campaign to complete...');
  
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes max wait
  
  while (attempts < maxAttempts) {
    const response = await fetch(`${API_BASE}/api/gmaps/campaigns`);
    const data = await response.json();
    
    // Handle both array and object responses
    const campaigns = Array.isArray(data) ? data : (data.campaigns || []);
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    console.log(`Status: ${campaign.status} | Businesses found: ${campaign.total_businesses_found || 0} | Emails found: ${campaign.total_emails_found || 0}`);
    
    if (campaign.status === 'completed') {
      console.log('\n✅ Campaign completed!');
      return campaign;
    }
    
    if (campaign.status === 'failed') {
      throw new Error('Campaign failed');
    }
    
    await sleep(10000); // Check every 10 seconds
    attempts++;
  }
  
  throw new Error('Campaign timed out after 10 minutes');
}

async function exportResults(campaignId) {
  console.log('\n📊 Step 4: Exporting results to CSV...');
  
  const response = await fetch(`${API_BASE}/api/gmaps/campaigns/${campaignId}/export`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to export: ${error}`);
  }
  
  const csvContent = await response.text();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `yorktown-salons-${timestamp}.csv`;
  const filepath = path.join(__dirname, filename);
  
  fs.writeFileSync(filepath, csvContent);
  
  console.log(`✅ Results exported to: ${filename}`);
  
  // Parse CSV to show summary
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Total businesses: ${dataLines.length}`);
  
  // Count emails
  const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
  if (emailIndex >= 0) {
    const withEmails = dataLines.filter(line => {
      const fields = line.split(',');
      return fields[emailIndex] && fields[emailIndex].includes('@');
    });
    console.log(`  - Businesses with emails: ${withEmails.length}`);
  }
  
  // Show first few results
  console.log('\n📋 First 5 businesses:');
  dataLines.slice(0, 5).forEach((line, idx) => {
    const fields = line.split(',');
    const name = fields[0];
    const address = fields[1];
    console.log(`  ${idx + 1}. ${name} - ${address}`);
  });
  
  return filepath;
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('LOCAL BUSINESS CAMPAIGN TEST - YORKTOWN, VIRGINIA');
    console.log('='.repeat(60));
    
    // Check if server is running
    try {
      const healthCheck = await fetch(API_BASE);
      if (!healthCheck.ok) {
        throw new Error('Server not responding properly');
      }
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first:');
      console.error('   cd "/Users/tristanwaite/n8n test" && node simple-server.js');
      console.error('   Error:', error.message);
      process.exit(1);
    }
    
    // Step 1: Create campaign with ZIP analysis
    const campaign = await createCampaign();
    
    // Step 2: Execute campaign (Google Maps scraping)
    await executeCampaign(campaign.id);
    
    // Step 3: Wait for completion
    const completedCampaign = await waitForCompletion(campaign.id);
    
    // Step 4: Export results
    const csvPath = await exportResults(campaign.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CAMPAIGN TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nFinal Results:');
    console.log(`  - Campaign ID: ${campaign.id}`);
    console.log(`  - ZIP codes searched: ${campaign.zipCodes?.length || 'Unknown'}`);
    console.log(`  - Total businesses: ${completedCampaign.total_businesses_found}`);
    console.log(`  - Total emails: ${completedCampaign.total_emails_found}`);
    console.log(`  - CSV exported to: ${csvPath}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
main();