#!/usr/bin/env node
/**
 * Test the Supabase integration for GMaps campaigns
 */

const { gmapsCampaigns, initializeSchema } = require('./supabase-db');

async function main() {
  try {
    console.log('Testing Supabase GMaps integration...\n');
    
    // Check if schema exists
    const schemaReady = await initializeSchema();
    console.log('✅ Schema check:', schemaReady ? 'Ready' : 'Needs migration');
    
    // Test fetching campaigns
    console.log('\n📋 Fetching campaigns...');
    const campaigns = await gmapsCampaigns.getAll();
    console.log(`Found ${campaigns.length} campaigns`);
    
    if (campaigns.length > 0) {
      console.log('\nFirst campaign:', {
        id: campaigns[0].id,
        name: campaigns[0].name,
        status: campaigns[0].status
      });
    }
    
    console.log('\n✅ Supabase integration working!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main();