# Campaign Workflow Guide

## Overview

This guide explains how campaigns work in the Lead Generation system, including the 4-phase enrichment process and best practices for optimal results.

## Creating a Campaign

### Via Frontend UI (Recommended)

1. Navigate to "Local Business" tab
2. Click "Create New Campaign"
3. Fill in campaign details:
   - **Name**: Descriptive campaign name (e.g., "Austin Plumbers Q1 2025")
   - **Location**: City, state, or ZIP code (e.g., "Austin, TX" or "Virginia")
   - **Keywords**: Business types to search (e.g., ["plumbers", "HVAC"])
   - **Coverage Profile**: budget | balanced | aggressive | custom
   - **Organization**: Select target organization

4. Click "Create Campaign"

**What Happens Behind the Scenes:**
- Location is analyzed by AI (if state/city level)
- ZIP codes are selected based on coverage profile
- Campaign record created with status `draft`
- Coverage records created for each ZIP code

### Via API

```javascript
POST /api/gmaps/campaigns/create
Content-Type: application/json

{
  "name": "Austin Restaurants",
  "location": "Austin, TX",
  "keywords": ["restaurants", "cafes", "bars"],
  "coverage_profile": "balanced",
  "organization_id": "uuid-here"
}
```

## Coverage Profiles Explained

### Budget Profile (5-15 ZIP codes)
**Best For:**
- Testing and small local campaigns
- Limited budget ($50-100)
- Single neighborhood targeting

**Characteristics:**
- Minimal cost
- Fast execution (15-30 minutes)
- Focused results (500-2000 businesses)

### Balanced Profile (10-30 ZIP codes)
**Best For:**
- Standard city-wide campaigns
- Medium budget ($100-300)
- Comprehensive local coverage

**Characteristics:**
- Moderate cost
- Medium execution time (30-60 minutes)
- Good coverage (2000-5000 businesses)

### Aggressive Profile (20-50+ ZIP codes)
**Best For:**
- State-wide campaigns
- Large budget ($300-1000+)
- Maximum market penetration

**Characteristics:**
- High cost
- Long execution time (1-3 hours)
- Extensive results (5000-20,000+ businesses)

**Note:** State-level aggressive campaigns can generate 100-300+ ZIP codes depending on state size.

### Custom Profile
Specify exact ZIP code count for precise control.

## AI-Powered ZIP Code Analysis

When you create a campaign with a state or city location, the system uses OpenAI to:

### For States (e.g., "Virginia")
1. **Multi-step analysis across tiers:**
   - Major cities (population 500k+)
   - Medium cities (population 100k-500k)
   - Small cities (population 50k-100k)

2. **Smart selection algorithm:**
   - Scores ZIP codes by population density
   - Balances urban and suburban coverage
   - Applies coverage profile limits

3. **Result:**
   - Budget: 5-15 highest-scoring ZIPs
   - Balanced: 10-30 distributed ZIPs
   - Aggressive: 20-100+ comprehensive ZIPs

### For Cities (e.g., "Austin, TX")
1. **Single-step analysis:**
   - Direct ZIP code selection for city
   - Faster than state analysis

2. **Smart selection:**
   - Prioritizes high-density areas
   - Includes suburban zones based on profile

3. **Result:**
   - Budget: 5-10 ZIPs
   - Balanced: 10-20 ZIPs
   - Aggressive: 15-30 ZIPs

### For ZIP Codes (e.g., "78701")
- No AI analysis needed
- Single ZIP campaign
- Fastest execution

## Campaign Execution

### Starting Execution

Click "Execute" button in campaign list or:

```javascript
POST /api/gmaps/campaigns/:id/execute
```

**Campaign Status Flow:**
```
draft → running → completed (or failed)
```

### Phase 1: Google Maps Scraping

**Duration:** 10-20 minutes per 1000 businesses

**Process:**
1. Backend spawns Python process: `lead_generation/main.py`
2. For each ZIP code in campaign coverage:
   - Calls Apify Google Maps actor (`compass/crawler-google-places`)
   - Scrapes businesses matching keywords
   - Extracts: name, address, phone, website, ratings, reviews
3. Saves all businesses to `gmaps_businesses` table

**Data Collected:**
- Business name
- Full address (street, city, state, ZIP)
- Phone number
- Website URL
- Google Maps URL
- Place ID (unique identifier)
- Rating and review count
- Business category

**Cost:** ~$7 per 1000 businesses

### Phase 2A: Facebook Enrichment (First Pass)

**Duration:** 5-10 minutes per 1000 businesses with Facebook URLs

**Process:**
1. Identifies businesses with `facebook_url` from Phase 1
2. For each Facebook URL:
   - Calls Apify Facebook Pages actor
   - Extracts emails, phone numbers, about text
3. Saves to `gmaps_facebook_enrichments` table

**Data Collected:**
- Email addresses
- Additional phone numbers
- Business description
- Facebook page metadata

**Cost:** ~$3 per 1000 pages

### Phase 2B: Google Search (Facebook Discovery)

**Duration:** 2-5 minutes per 100 businesses

**Process:**
1. Identifies businesses WITHOUT Facebook URLs
2. For each business:
   - Searches Google: "[business name] [location] facebook"
   - Extracts Facebook page URL from search results
3. Updates business records with discovered URLs

**Data Collected:**
- Facebook page URLs

**Cost:** Minimal (uses Apify Google Search actor)

### Phase 2C: Facebook Enrichment (Second Pass)

**Duration:** 5-10 minutes per 1000 newly discovered pages

**Process:**
1. Same as Phase 2A but for newly discovered URLs
2. Enriches businesses found in Phase 2B

**Data Collected:**
- Same as Phase 2A

**Cost:** ~$3 per 1000 pages

### Phase 2.5: LinkedIn Enrichment

**Duration:** 10-15 minutes per 1000 businesses

**Process:**
1. For each business without sufficient contact info:
   - Searches LinkedIn for company profile
   - Extracts company page data
   - Finds employee emails via LinkedIn patterns
2. Verifies emails using Bouncer API
3. Saves to `gmaps_linkedin_enrichments` table

**Data Collected:**
- LinkedIn company URL
- Employee emails
- Email verification status
- Confidence scores

**Cost:** ~$10 per 1000 LinkedIn searches + ~$5 per 1000 email verifications

### Phase 3: Email Source Consolidation

**Duration:** Instant

**Process:**
1. Consolidates emails from all sources
2. Tags each email with source:
   - `google_maps` - From initial scrape
   - `facebook` - From Facebook page
   - `linkedin` - From LinkedIn profile
   - `not_found` - No email discovered

**Priority Order:** LinkedIn > Facebook > Google Maps (highest confidence first)

## Monitoring Execution

### In Frontend
- Real-time status updates
- Progress indicator
- Error notifications

### In Logs
```bash
# Watch backend logs
tail -f lead_generation.log

# Watch campaign progress
grep "STAGE" lead_generation.log
```

### Campaign States

| State      | Description                           | Can Execute? |
|------------|---------------------------------------|--------------|
| draft      | Created but not executed              | Yes          |
| running    | Currently executing                   | No           |
| paused     | Execution paused (not implemented)    | Yes (resume) |
| completed  | Finished successfully                 | Yes (re-run) |
| failed     | Execution failed                      | Yes (retry)  |

## Exporting Results

### Via Frontend
1. Click "Export" button in campaign list
2. Choose pagination page (for large campaigns)
3. Download CSV file

### Via API
```javascript
GET /api/gmaps/campaigns/:id/export?page=1&limit=1000
```

**CSV Columns:**
- Business information (name, address, phone, website)
- Enrichment data (Facebook URL, LinkedIn URL)
- Contact information (emails from all sources)
- Email source tags
- Verification status
- Confidence scores

### Large Dataset Handling

For campaigns with 10,000+ businesses:
- Results are paginated (1000 records per page)
- Multiple CSV downloads available
- Page selection in export dialog

## Best Practices

### Campaign Planning

1. **Start Small:**
   - Test with budget profile first
   - Verify data quality
   - Scale to balanced/aggressive

2. **Choose Keywords Wisely:**
   - Be specific (e.g., "emergency plumbers" not just "plumbers")
   - Use 2-4 keywords per campaign
   - Avoid overly broad terms

3. **Target Strategically:**
   - City-level for local campaigns
   - State-level for regional campaigns
   - Individual ZIPs for hyper-local

### Cost Optimization

1. **Monitor OpenAI Usage:**
   - ZIP code analysis consumes tokens
   - State-level campaigns use more tokens
   - Set usage limits in OpenAI dashboard

2. **Apify Credit Management:**
   - Budget profile: $20-50 per campaign
   - Balanced profile: $50-150 per campaign
   - Aggressive profile: $150-500+ per campaign

3. **Email Verification:**
   - LinkedIn enrichment adds cost
   - Skip if budget is tight
   - Focus on Facebook enrichment first

### Data Quality

1. **Review Sample Results:**
   - Execute small test campaign first
   - Check email accuracy
   - Verify business relevance

2. **Adjust Keywords:**
   - Refine based on initial results
   - Add negative keywords if needed (future feature)

3. **Geographic Targeting:**
   - Avoid overlapping campaigns
   - Track which ZIPs have been covered

### Execution Timing

1. **Avoid Peak Hours:**
   - Apify actors may be slower during peak
   - Run overnight for large campaigns

2. **Sequential Execution:**
   - Don't run multiple campaigns simultaneously
   - Wait for completion before starting next

3. **Monitoring:**
   - Check logs for errors
   - Watch for rate limiting
   - Ensure sufficient API quotas

## Troubleshooting

### Campaign Stuck in "Running"

**Symptoms:** Campaign shows "running" but no progress

**Solutions:**
1. Check `lead_generation.log` for errors
2. Verify Python process is running: `ps aux | grep python`
3. Check Apify actor runs in Apify dashboard
4. Manually update status in database if process crashed

### No Results After Execution

**Symptoms:** Campaign completes but 0 businesses found

**Possible Causes:**
1. Invalid keywords for location
2. Apify actor failure
3. No businesses match criteria

**Solutions:**
1. Try different keywords
2. Expand geographic coverage
3. Check Apify console for actor errors

### High Cost / Low Results

**Symptoms:** Spent more than expected for few results

**Possible Causes:**
1. Aggressive profile on sparse area
2. Keywords too specific
3. Duplicate campaigns

**Solutions:**
1. Use balanced profile instead
2. Broaden keywords
3. Check for existing campaigns in same area

### Email Enrichment Failures

**Symptoms:** Many businesses with `not_found` email status

**This is Normal:** 30-50% of businesses may not have public emails

**To Improve:**
1. Enable LinkedIn enrichment
2. Use email guessing (future feature)
3. Focus on businesses with websites

## Advanced Features

### Re-execution

You can re-execute completed campaigns:
- Finds new businesses (Google Maps data updates)
- Re-enriches existing businesses
- Merges with existing data (no duplicates)

### Campaign Cloning

Clone successful campaigns:
1. Create new campaign with same settings
2. Modify location/keywords
3. Execute independently

### Batch Export

Export multiple campaigns:
```javascript
POST /api/gmaps/campaigns/batch-export
{
  "campaign_ids": ["uuid1", "uuid2", "uuid3"]
}
```

Returns combined CSV with all businesses.

## Next Steps

- Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Check [API_REFERENCE.md](API_REFERENCE.md) for programmatic access
- See [TESTING.md](../tests/README.md) for running tests
