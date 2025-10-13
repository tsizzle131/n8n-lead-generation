const { chromium } = require('playwright');

async function testIcebreakerWorkflow() {
  console.log('🚀 Starting Icebreaker Workflow Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to frontend
    console.log('📍 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/test-step-1-homepage.png' });
    console.log('✅ Loaded homepage\n');

    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Click on "Local Business" tab for Google Maps campaigns
    console.log('🔍 Looking for Local Business tab...');
    await page.waitForTimeout(1000);

    const localBusinessTab = page.locator('text="Local Business"');
    if (await localBusinessTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('📍 Found Local Business tab, clicking...');
      await localBusinessTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️  Local Business tab not found, trying alternative navigation...');
      // Try alternative navigation
      const gmapsLink = page.locator('text=/Google Maps|Local/i').first();
      if (await gmapsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await gmapsLink.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: '/tmp/test-step-2-campaigns-page.png' });

    // Look for "Create Campaign" or "New Campaign" button
    console.log('🔍 Looking for Create Campaign button...');
    const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found Create Campaign button, clicking...');
      await createButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/test-step-3-create-form.png' });

      // Fill out campaign form
      console.log('📝 Filling out campaign form...');

      // Campaign Name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('Playwright Icebreaker Test ' + new Date().toISOString().slice(11, 19));
        console.log('  ✓ Entered campaign name');
      }

      // Keywords
      const keywordsInput = page.locator('input[name="keywords"], input[placeholder*="keyword" i]').first();
      if (await keywordsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await keywordsInput.fill('coffee shop');
        console.log('  ✓ Entered keywords');
      }

      // Location - try to find ZIP code input
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i], input[placeholder*="zip" i]').first();
      if (await locationInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await locationInput.fill('10001');
        console.log('  ✓ Entered location (10001)');
      }

      // Select budget profile if available
      const budgetOption = page.locator('text=/budget/i, input[value="budget"]').first();
      if (await budgetOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await budgetOption.click();
        console.log('  ✓ Selected budget profile');
      }

      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/test-step-4-form-filled.png' });

      // Submit form
      console.log('📤 Submitting campaign...');
      const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit"), button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        console.log('  ✓ Clicked submit button');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/tmp/test-step-5-submitted.png' });
      }

      // Close any modal dialogs
      console.log('🔍 Checking for modal dialogs...');
      const closeButton = page.locator('button:has-text("Close"), button:has-text("Cancel"), button.close-button').first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('  ✓ Closing modal dialog');
        await closeButton.click();
        await page.waitForTimeout(1000);
      }

      // Dismiss any other overlays by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // Look for the newly created campaign in the list
      console.log('\n⏳ Waiting for campaign to appear in list...');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/test-step-5b-campaign-list.png' });

      // Find the most recent campaign card (should be first in list)
      // Look for Execute/Run button within the campaign card
      console.log('🔍 Looking for Execute/Run button in campaign card...');
      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
      if (await executeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('▶️  Found Execute button, clicking...');
        // Try clicking with force if needed
        await executeButton.click({ force: true }).catch(async () => {
          console.log('  ⚠️  Normal click failed, trying with force...');
          await executeButton.click({ force: true });
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/test-step-6-executing.png' });

        // Wait for campaign to complete (check for status changes)
        console.log('\n⏳ Waiting for campaign to complete (checking status)...');
        let attempts = 0;
        let completed = false;

        while (attempts < 60 && !completed) {
          await page.waitForTimeout(5000);
          attempts++;

          // Check if there's a "Completed" status or "Export" button
          const completedText = page.locator('text=/completed/i').first();
          const exportButton = page.locator('button:has-text("Export"), a:has-text("Export")').first();

          if (await completedText.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('✅ Campaign completed!');
            completed = true;
          } else if (await exportButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('✅ Export button available - campaign completed!');
            completed = true;
          } else {
            console.log(`  ⏳ Still running... (${attempts * 5}s)`);
          }
        }

        if (completed) {
          await page.screenshot({ path: '/tmp/test-step-7-completed.png' });

          // Try to export CSV
          console.log('\n📥 Attempting to export CSV...');
          const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")').first();
          if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await exportBtn.click();
            console.log('✅ Clicked export button');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: '/tmp/test-step-8-exported.png' });
          }
        } else {
          console.log('⚠️  Campaign did not complete within timeout');
          await page.screenshot({ path: '/tmp/test-step-timeout.png' });
        }
      } else {
        console.log('⚠️  Could not find Execute button');
        await page.screenshot({ path: '/tmp/test-step-no-execute.png' });
      }
    } else {
      console.log('⚠️  Could not find Create Campaign button');
      console.log('📸 Current page screenshot saved');
      await page.screenshot({ path: '/tmp/test-step-no-create-button.png' });
    }

    console.log('\n✅ Test completed! Check screenshots in /tmp/');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-error.png' });
    throw error;
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

testIcebreakerWorkflow().catch(console.error);
