#!/usr/bin/env node

const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');

// Get API key from environment or state file
const stateFile = path.join(__dirname, '.app-state.json');
let apifyKey;

try {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  apifyKey = state.apiKeys?.apify_api_key;
} catch (error) {
  console.error('Could not read API key from state file');
  process.exit(1);
}

if (!apifyKey) {
  console.error('Apify API key not found');
  process.exit(1);
}

const client = new ApifyClient({ token: apifyKey });

// Run IDs to fetch
const runIds = [
  'jKMD43eMQybOEZu5g',
  'wcewcWOKmOaEwtzai', 
  'WALqFo7Vrmfod2kSZ'
];

async function fetchRunData(runId) {
  try {
    console.log(`\nFetching data for run ${runId}...`);
    
    // Get the dataset ID for this run
    const run = await client.run(runId).get();
    const datasetId = run.defaultDatasetId;
    
    if (!datasetId) {
      console.log(`No dataset found for run ${runId}`);
      return [];
    }
    
    // Fetch all items from the dataset
    const dataset = await client.dataset(datasetId).listItems();
    console.log(`Found ${dataset.items.length} businesses in run ${runId}`);
    
    return dataset.items;
  } catch (error) {
    console.error(`Error fetching run ${runId}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Fetching data from Apify runs...');
  
  // Fetch all datasets
  const allBusinesses = [];
  
  for (const runId of runIds) {
    const businesses = await fetchRunData(runId);
    allBusinesses.push(...businesses);
  }
  
  console.log(`\n📊 Total businesses collected: ${allBusinesses.length}`);
  
  // Create CSV header
  const headers = [
    'Business Name',
    'Address',
    'City',
    'State', 
    'ZIP Code',
    'Phone',
    'Website',
    'Email',
    'LinkedIn URL',
    'Facebook URL',
    'Instagram URL',
    'Twitter URL',
    'Rating',
    'Reviews',
    'Category',
    'Price Level',
    'Place ID'
  ];
  
  // Process businesses and create CSV rows
  const rows = allBusinesses.map(business => {
    // Extract email - check various possible fields
    let email = business.email || 
                business.directEmail || 
                business.emails?.[0] || 
                '';
    
    // Clean up email if it contains multiple
    if (email && email.includes(',')) {
      email = email.split(',')[0].trim();
    }
    
    return [
      business.title || business.name || '',
      business.address || business.street || '',
      business.city || '',
      business.state || '',
      business.postalCode || business.zipCode || '',
      business.phone || business.phoneNumber || '',
      business.website || business.url || '',
      email,
      business.linkedIn || business.linkedInUrl || '',
      business.facebookUrl || '',
      business.instagramUrl || '',
      business.twitterUrl || '',
      business.rating || business.stars || '',
      business.reviewsCount || business.numberOfReviews || '',
      business.categoryName || business.category || '',
      business.priceLevel || '',
      business.placeId || ''
    ].map(field => {
      // Escape fields that contain commas, quotes, or newlines
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  
  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const csvWithBom = bom + csvContent;
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `tennessee-dentists-${timestamp}.csv`;
  const filepath = path.join(__dirname, filename);
  
  // Write CSV file
  fs.writeFileSync(filepath, csvWithBom, 'utf8');
  
  console.log(`\n✅ CSV file created: ${filename}`);
  console.log(`📍 Location: ${filepath}`);
  
  // Print summary statistics
  const withEmail = allBusinesses.filter(b => 
    b.email || b.directEmail || b.emails?.[0]
  ).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`  - Total businesses: ${allBusinesses.length}`);
  console.log(`  - With email: ${withEmail} (${Math.round(withEmail/allBusinesses.length*100)}%)`);
  console.log(`  - With website: ${allBusinesses.filter(b => b.website || b.url).length}`);
  console.log(`  - With phone: ${allBusinesses.filter(b => b.phone || b.phoneNumber).length}`);
}

main().catch(console.error);