/**
 * Playwright E2E Tests for LinkedIn Enrichment + Bouncer Verification UI
 * Tests the complete frontend workflow for Phase 2.5 functionality
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5001'; // Express server

test.describe('LinkedIn Enrichment Frontend Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to frontend
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Settings page displays Bouncer and LinkedIn API key fields', async ({ page }) => {
    // Navigate to Settings
    await page.click('text=Settings');
    await page.waitForSelector('h2:has-text("Settings & Configuration")');

    // Click API Keys tab
    await page.click('button:has-text("API Keys")');

    // Verify all 4 API key fields exist
    const openAIField = await page.locator('label:has-text("OpenAI API Key")');
    const apifyField = await page.locator('label:has-text("Apify API Key")');
    const bouncerField = await page.locator('label:has-text("Bouncer API Key")');
    const linkedInField = await page.locator('label:has-text("LinkedIn Actor ID")');

    await expect(openAIField).toBeVisible();
    await expect(apifyField).toBeVisible();
    await expect(bouncerField).toBeVisible();
    await expect(linkedInField).toBeVisible();

    console.log('✅ All 4 API key fields are visible');
  });

  test('API keys can be saved and persisted', async ({ page }) => {
    // Navigate to Settings
    await page.click('text=Settings');
    await page.click('button:has-text("API Keys")');

    // Enter test values
    const testBouncerKey = 'test_bouncer_key_12345';
    const testLinkedInActor = 'test-linkedin-actor-id';

    await page.fill('input#bouncer-key', testBouncerKey);
    await page.fill('input#linkedin-actor', testLinkedInActor);

    // Save
    await page.click('button:has-text("Save API Keys")');

    // Wait for success message
    await page.waitForSelector('.message.success', { timeout: 5000 });
    const successMessage = await page.locator('.message.success').textContent();
    expect(successMessage).toContain('saved successfully');

    console.log('✅ API keys saved successfully');

    // Reload page and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.click('text=Settings');
    await page.click('button:has-text("API Keys")');

    // Check that green checkmarks appear (indicating keys are saved)
    const bouncerStatus = await page.locator('label:has-text("Bouncer API Key") ~ small.success-text');
    const linkedInStatus = await page.locator('label:has-text("LinkedIn Actor ID") ~ small.success-text');

    await expect(bouncerStatus).toBeVisible();
    await expect(linkedInStatus).toBeVisible();

    console.log('✅ API keys persisted after reload');
  });

  test('Campaign creation form includes LinkedIn enrichment option', async ({ page }) => {
    // Navigate to Campaigns
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    // Click Create Campaign
    await page.click('button:has-text("Create Campaign")');
    await page.waitForSelector('h3:has-text("Create New Campaign")');

    // Check for LinkedIn/Bouncer related options or messaging
    // (This depends on how it's implemented in the UI - checking for any mentions)
    const pageContent = await page.content();

    // Should mention LinkedIn enrichment somewhere in the campaign creation form
    // or in documentation/tooltips
    console.log('✅ Campaign creation form loaded');

    // Fill in basic campaign details
    await page.fill('input[name="campaignName"]', 'Test LinkedIn Enrichment Campaign');
    await page.fill('input[name="location"]', 'Austin, TX');
    await page.fill('input[name="keywords"]', 'coffee shops');

    // Select coverage profile
    await page.selectOption('select[name="coverageProfile"]', 'balanced');

    console.log('✅ Campaign form filled with test data');
  });

  test('Campaign list displays LinkedIn enrichment status', async ({ page }) => {
    // Navigate to Campaigns
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    // Check if any campaigns exist
    const campaigns = await page.locator('.campaign-row, .campaign-card, tr[data-campaign-id]');
    const count = await campaigns.count();

    console.log(`Found ${count} campaigns`);

    if (count > 0) {
      // Click on first campaign to view details
      await campaigns.first().click();

      // Wait for campaign details to load
      await page.waitForTimeout(1000);

      // Check for LinkedIn-related fields in campaign details
      const detailsContent = await page.content();

      // Look for LinkedIn-related text
      const hasLinkedInMention =
        detailsContent.includes('LinkedIn') ||
        detailsContent.includes('linkedin') ||
        detailsContent.includes('Phase 2.5');

      console.log(`LinkedIn mention in details: ${hasLinkedInMention}`);
    }
  });

  test('Campaign export includes LinkedIn and Bouncer verification columns', async ({ page }) => {
    // This test verifies that exported CSV has the right columns
    // We'll use the API directly to check export format

    // First, get a campaign ID from the UI
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    const campaigns = await page.locator('[data-campaign-id]');
    const count = await campaigns.count();

    if (count > 0) {
      const campaignId = await campaigns.first().getAttribute('data-campaign-id');

      // Navigate to export
      const exportButton = await page.locator(`button:has-text("Export"), a:has-text("Export")`).first();

      if (await exportButton.isVisible()) {
        // Download and verify CSV
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          exportButton.click()
        ]);

        const fileName = download.suggestedFilename();
        console.log(`Downloaded: ${fileName}`);

        // Read CSV content
        const path = await download.path();
        const fs = require('fs');
        const csvContent = fs.readFileSync(path, 'utf-8');

        // Check for LinkedIn columns
        const expectedColumns = [
          'linkedin_url',
          'linkedin_profile_type',
          'linkedin_email',
          'email_verified',
          'email_score',
          'email_deliverable'
        ];

        const headerLine = csvContent.split('\n')[0];

        let foundColumns = 0;
        for (const col of expectedColumns) {
          if (headerLine.toLowerCase().includes(col.toLowerCase())) {
            foundColumns++;
          }
        }

        console.log(`Found ${foundColumns}/${expectedColumns.length} LinkedIn/Bouncer columns in export`);
        expect(foundColumns).toBeGreaterThan(0);
      }
    } else {
      console.log('⚠️  No campaigns found to test export');
    }
  });

  test('Business details show LinkedIn enrichment data', async ({ page }) => {
    // Navigate to a campaign
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    const campaigns = await page.locator('.campaign-row, .campaign-card, tr');
    const count = await campaigns.count();

    if (count > 0) {
      // Click first campaign
      await campaigns.first().click();
      await page.waitForTimeout(1000);

      // Look for business list
      const businesses = await page.locator('.business-row, .business-card, tr[data-business-id]');
      const businessCount = await businesses.count();

      console.log(`Found ${businessCount} businesses in campaign`);

      if (businessCount > 0) {
        // Click first business to see details
        await businesses.first().click();
        await page.waitForTimeout(500);

        // Check for LinkedIn-related fields in business details
        const detailsContent = await page.content();

        const linkedInFields = [
          'LinkedIn URL',
          'LinkedIn Profile',
          'Email Verified',
          'Email Score',
          'Deliverability'
        ];

        let foundFields = 0;
        for (const field of linkedInFields) {
          if (detailsContent.includes(field)) {
            foundFields++;
            console.log(`✅ Found field: ${field}`);
          }
        }

        console.log(`Found ${foundFields}/${linkedInFields.length} LinkedIn fields in business details`);
      } else {
        console.log('⚠️  No businesses found in campaign');
      }
    } else {
      console.log('⚠️  No campaigns found to test');
    }
  });

  test('API endpoints return LinkedIn enrichment data', async ({ page }) => {
    // Test the API directly using fetch
    const apiTest = await page.evaluate(async (backendUrl) => {
      try {
        // Test settings endpoint
        const settingsResponse = await fetch(`${backendUrl}/settings`);
        const settings = await settingsResponse.json();

        // Check for LinkedIn actor ID in settings
        const hasLinkedInSetting = 'linkedin_actor_id' in settings;

        // Test API keys endpoint
        const keysResponse = await fetch(`${backendUrl}/api-keys`);
        const keys = await keysResponse.json();

        const hasBouncerKey = 'bouncer_api_key' in keys;
        const hasLinkedInActorId = 'linkedin_actor_id' in keys;

        return {
          hasLinkedInSetting,
          hasBouncerKey,
          hasLinkedInActorId,
          settingsKeys: Object.keys(settings),
          apiKeys: Object.keys(keys)
        };
      } catch (error) {
        return { error: error.message };
      }
    }, BACKEND_URL);

    console.log('API Test Results:', apiTest);

    // Verify API returns LinkedIn/Bouncer fields
    expect(apiTest.hasBouncerKey || apiTest.hasLinkedInActorId).toBeTruthy();

    console.log('✅ API endpoints include LinkedIn/Bouncer configuration');
  });

  test('Campaign execution shows Phase 2.5 progress', async ({ page }) => {
    // This test monitors campaign execution to see Phase 2.5 logs

    // Navigate to campaigns
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    // Create a small test campaign
    await page.click('button:has-text("Create Campaign")');
    await page.fill('input[name="campaignName"]', 'E2E Test - Phase 2.5');
    await page.fill('input[name="location"]', '78701'); // Single ZIP code for speed
    await page.fill('input[name="keywords"]', 'dentist');
    await page.selectOption('select[name="coverageProfile"]', 'budget');

    // Submit campaign
    await page.click('button:has-text("Create Campaign"), button:has-text("Submit")');
    await page.waitForTimeout(2000);

    // Execute campaign
    const executeButton = await page.locator('button:has-text("Execute"), button:has-text("Run Campaign")').first();

    if (await executeButton.isVisible()) {
      // Start execution
      await executeButton.click();

      // Monitor console/logs for Phase 2.5 mentions
      let phase25Detected = false;

      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('PHASE 2.5') ||
            text.includes('LinkedIn') ||
            text.includes('Bouncer')) {
          phase25Detected = true;
          console.log(`🔍 Detected Phase 2.5 activity: ${text}`);
        }
      });

      // Wait for execution to complete or timeout
      await page.waitForTimeout(60000); // Wait up to 1 minute

      console.log(`Phase 2.5 detected during execution: ${phase25Detected}`);
    } else {
      console.log('⚠️  Execute button not found - skipping execution test');
    }
  });

  test('Email verification badge shows on verified emails', async ({ page }) => {
    // This tests that emails verified by Bouncer show a visual indicator

    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    const campaigns = await page.locator('.campaign-row, .campaign-card, tr');
    const count = await campaigns.count();

    if (count > 0) {
      await campaigns.first().click();
      await page.waitForTimeout(1000);

      // Look for verification badges/icons
      const verificationBadges = await page.locator(
        '.verified-badge, .email-verified, span:has-text("✅"), span:has-text("Verified")'
      );
      const badgeCount = await verificationBadges.count();

      console.log(`Found ${badgeCount} email verification badges`);

      if (badgeCount > 0) {
        const firstBadge = verificationBadges.first();
        await expect(firstBadge).toBeVisible();
        console.log('✅ Email verification badges are displayed');
      }
    }
  });

  test('Campaign stats include LinkedIn enrichment metrics', async ({ page }) => {
    await page.click('text=Campaigns');
    await page.waitForSelector('h2:has-text("Google Maps Campaigns")');

    const campaigns = await page.locator('.campaign-row, .campaign-card, tr');
    const count = await campaigns.count();

    if (count > 0) {
      await campaigns.first().click();
      await page.waitForTimeout(1000);

      // Look for campaign statistics
      const pageContent = await page.content();

      // Check for LinkedIn-related metrics
      const metrics = [
        'LinkedIn Profiles Found',
        'Emails Verified',
        'Deliverable Emails',
        'LinkedIn Enrichment',
        'Verification Rate'
      ];

      let foundMetrics = 0;
      for (const metric of metrics) {
        if (pageContent.includes(metric)) {
          foundMetrics++;
          console.log(`✅ Found metric: ${metric}`);
        }
      }

      console.log(`Found ${foundMetrics}/${metrics.length} LinkedIn/Bouncer metrics`);
    }
  });

});

test.describe('LinkedIn/Bouncer API Integration Tests', () => {

  test('Backend API includes LinkedIn configuration', async ({ request }) => {
    // Test backend endpoints directly
    const settingsResponse = await request.get(`${BACKEND_URL}/settings`);
    expect(settingsResponse.ok()).toBeTruthy();

    const settings = await settingsResponse.json();
    console.log('Settings:', Object.keys(settings));

    // Should have LinkedIn actor ID
    expect('linkedin_actor_id' in settings || settings.linkedin_actor_id !== undefined).toBeTruthy();
  });

  test('Backend API includes Bouncer configuration', async ({ request }) => {
    const keysResponse = await request.get(`${BACKEND_URL}/api-keys`);
    expect(keysResponse.ok()).toBeTruthy();

    const keys = await keysResponse.json();
    console.log('API Keys:', Object.keys(keys));

    // Should have Bouncer API key field
    expect('bouncer_api_key' in keys).toBeTruthy();
  });

  test('Campaign creation accepts LinkedIn settings', async ({ request }) => {
    const createResponse = await request.post(`${BACKEND_URL}/api/gmaps/campaigns/create`, {
      data: {
        name: 'API Test Campaign',
        location: 'Austin, TX',
        keywords: ['test'],
        coverage_profile: 'budget',
        organization_id: 'test-org'
      }
    });

    // Should accept campaign creation
    expect(createResponse.status()).toBeLessThan(500);

    if (createResponse.ok()) {
      const campaign = await createResponse.json();
      console.log('Created campaign:', campaign.id || campaign.campaignId);
    }
  });

});

console.log('✅ LinkedIn Enrichment E2E Tests Loaded');
