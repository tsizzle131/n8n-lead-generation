# LinkedIn Enrichment Database Migration Instructions

## Overview
This migration adds LinkedIn enrichment and Bouncer email verification capabilities to your Supabase database.

## Tables Created
1. **gmaps_scraper.linkedin_enrichments** - Stores LinkedIn profile data and Bouncer verification results
2. **gmaps_scraper.email_verifications** - Logs all email verification attempts

## How to Run the Migration

### Method 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo
   - Navigate to **SQL Editor** in the left sidebar

2. **Open Migration File**
   - File location: `lead_generation/migrations/add_linkedin_enrichment.sql`
   - Copy the entire contents (195 lines)

3. **Execute Migration**
   - Paste the SQL into the SQL Editor
   - Click **"Run"** button
   - Wait for success confirmation

4. **Verify Tables Created**
   ```bash
   cd "/Users/tristanwaite/n8n test"
   python3 scripts/utils/verify_linkedin_tables.py
   ```

### Method 2: psql Command Line

If you have postgres client installed:

```bash
cd "/Users/tristanwaite/n8n test"
psql "postgresql://postgres:[your-password]@db.ndrqixjdddcozjlevieo.supabase.co:5432/postgres" \
  -f lead_generation/migrations/add_linkedin_enrichment.sql
```

## What the Migration Does

### 1. Adds LinkedIn Columns to Businesses Table
- `linkedin_url` - URL to LinkedIn profile
- `linkedin_enriched` - Whether LinkedIn enrichment was performed
- `linkedin_enriched_at` - Timestamp of enrichment

### 2. Creates LinkedIn Enrichments Table
Stores:
- Person details (name, title, profile URL)
- Email data (found, generated, verified)
- Bouncer verification results (status, score, flags)
- Phone numbers
- Raw profile data (JSONB)

### 3. Creates Email Verifications Table
Logs every email verification with:
- Email address and verification status
- Deliverability score (0-100)
- Risk flags (disposable, role-based, etc.)
- Technical details (MX records, SMTP check)

### 4. Adds Campaign Tracking Fields
- `total_linkedin_profiles_found`
- `total_verified_emails`
- `linkedin_enrichment_cost`
- `bouncer_verification_cost`

### 5. Creates Helper Functions
- `update_business_linkedin_status()` - Trigger to auto-update business records
- `get_best_email_for_business()` - Returns best verified email prioritizing LinkedIn > Facebook > Google Maps

### 6. Creates Enrichment Overview View
View that shows enrichment statistics per campaign

## Verification

After running the migration, verify it worked:

```bash
python3 scripts/utils/verify_linkedin_tables.py
```

You should see:
```
✅ Table 'gmaps_linkedin_enrichments' exists
✅ Table 'gmaps_email_verifications' exists
```

## Troubleshooting

**Error: relation "gmaps_scraper.businesses" does not exist**
- The gmaps_scraper schema doesn't exist yet
- Run the main schema migration first: `lead_generation/migrations/create_gmaps_scraper_schema.sql`

**Error: permission denied**
- Make sure you're using the service role key, not the anon key
- Check Supabase project settings for correct credentials

**Migration runs but tables not visible**
- Check you're looking in the correct schema: `gmaps_scraper` not `public`
- Use verification script to check

## Next Steps

After migration completes:
1. ✅ Configure Bouncer API key in Settings UI
2. ✅ Run a test campaign with LinkedIn enrichment
3. ✅ Verify data appears in enrichment tables
4. ✅ Export CSV to see LinkedIn contact data
