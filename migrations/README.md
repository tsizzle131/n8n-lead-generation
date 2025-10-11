# Database Migrations

This directory contains all database schema and data migrations for the Google Maps lead generation system.

**Last Updated:** 2025-10-11
**Database:** Supabase PostgreSQL
**Project URL:** https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo

---

## Directory Structure

```
migrations/
├── schema/          # DDL migrations (CREATE, ALTER, DROP)
├── data/            # DML migrations (INSERT, UPDATE for data)
├── hotfixes/        # Emergency fixes applied to production
├── archived/        # Superseded or duplicate migrations
└── README.md        # This file
```

### Schema Migrations (`schema/`)

DDL operations that modify database structure: tables, columns, indexes, constraints, functions, triggers.

### Data Migrations (`data/`)

DML operations that modify existing data: backfills, data corrections, seed data.

### Hotfixes (`hotfixes/`)

Emergency migrations applied directly to production to resolve critical issues. These take precedence over regular migrations.

### Archived (`archived/`)

Superseded migrations, duplicates, or experimental migrations that were replaced by later versions. Kept for historical reference only.

---

## Naming Convention

All migrations follow this pattern:

```
YYYYMMDD_NNN_description.sql
```

- **YYYYMMDD**: Date the migration was created (based on file modification time or git commit date)
- **NNN**: Sequence number (001, 002, 003...) for migrations on the same day
- **description**: Brief snake_case description of what the migration does

**Examples:**
- `20250911_001_create_gmaps_scraper_schema.sql`
- `20251010_001_backfill_email_source.sql`
- `20250731_001_emergency_fix_audience_system.sql`

---

## Migration History (Chronological Order)

### 1. Google Maps Scraper System (July 31, 2025)

**APPLIED:** Hotfix version only

The audience system went through 4 iteration attempts before the final emergency fix:

**Archived Attempts (NOT APPLIED):**
- `archived/20250731_001_minimal_migration_audience_system.sql` - First attempt
- `archived/20250731_002_minimal_safe_migration_audience_system.sql` - Safety improvements
- `archived/20250731_003_step_by_step_migration_audience_system.sql` - Step-by-step approach
- `archived/20250731_004_corrected_migration_audience_system.sql` - Corrected version

**APPLIED (Production):**
- `hotfixes/20250731_001_emergency_fix_audience_system.sql` - **Final working version**

**What it does:**
- Creates core audience management system
- Tables: `organizations`, `audiences`, `audience_urls`, `contacts`, `campaigns`
- Enables segmentation and targeting for lead generation

**Status:** ✅ Applied to production

---

### 2. Scraper Type Support (August 30, 2025)

**File:** `schema/20250830_001_add_scraper_type_support.sql`

**What it does:**
- Adds `scraper_type` column to `campaigns` and `search_urls` tables
- Adds `source` column to `raw_contacts` and `processed_leads` tables
- Enables distinction between Apollo B2B scraper and Local Business scraper
- Values: `'apollo'` or `'local'`

**Status:** ✅ Applied to production

---

### 3. Google Maps Scraper Schema (September 11, 2025)

**Files:**
- `schema/20250911_001_create_gmaps_scraper_schema.sql` - Main schema
- `data/20250911_001_seed_los_angeles_zip_codes.sql` - Seed data

**What it does:**

**Schema Migration:**
- Creates `gmaps_scraper` schema (isolated from main `public` schema)
- Tables created:
  - `campaigns` - Campaign management with coverage profiles
  - `zip_codes` - ZIP code density and business data
  - `campaign_coverage` - ZIP selections per campaign
  - `businesses` - Scraped business records from Google Maps
  - `facebook_enrichments` - Facebook page enrichment data
  - `api_costs` - Cost tracking for Apify API usage
- Creates views: `campaign_analytics`, `zip_performance`
- Enums: `campaign_status`, `coverage_profile`, `density_level`, `enrichment_status`

**Seed Data Migration:**
- Inserts 100+ Los Angeles ZIP codes
- Classifies by density: `very_high`, `high`, `medium`, `low`
- Includes expected business counts for coverage analysis

**Status:** ✅ Applied to production

---

### 4. LinkedIn Enrichment (Phase 2.5) - September 25, 2025

**File:** `schema/20250925_001_add_linkedin_enrichment_gmaps_scraper.sql`

**What it does:**
- Adds LinkedIn enrichment to `gmaps_scraper` schema
- Creates `linkedin_enrichments` table
- Creates `email_verifications` table (Bouncer API integration)
- Adds LinkedIn tracking columns to `businesses` table
- Function: `get_best_email_for_business()` - Prioritizes LinkedIn > Facebook > Google Maps
- View: `enrichment_overview` - Campaign enrichment statistics

**Schema:** `gmaps_scraper` (NOT public)

**Status:** ✅ Applied to production

---

### 5. LinkedIn Enrichment (Public Schema) - October 9, 2025

**ISSUE:** Schema confusion - Two different LinkedIn implementations

**Files:**
- `schema/20251009_001_create_linkedin_enrichments_public.sql` - Public schema version
- `archived/20251009_002_phase_25_complete_migration_v1.sql` - First attempt (superseded)
- `schema/20251010_001_phase_25_complete_migration_fixed.sql` - **Final version with RLS**

**What they do:**

**Public Schema Version (20251009_001):**
- Creates `gmaps_linkedin_enrichments` table in **public schema**
- Basic structure without RLS policies
- Adds `linkedin_enriched` column to `gmaps_businesses` table

**Archived V1 (20251009_002):**
- First complete attempt with RLS
- Had policy creation issues with `CREATE POLICY IF NOT EXISTS`

**Fixed Version (20251010_001) - RECOMMENDED:**
- Complete Phase 2.5 implementation
- Properly drops and recreates RLS policies
- Full Bouncer email verification support
- Includes all indexes, triggers, and documentation

**⚠️ SCHEMA CONFLICT:**
- `gmaps_scraper.linkedin_enrichments` (Sept 25) - Uses `gmaps_scraper` schema
- `public.gmaps_linkedin_enrichments` (Oct 9-10) - Uses `public` schema

**Status:** ⚠️ Needs clarification - Which schema is production?

**Recommendation:** Query production to determine which table exists:
```sql
-- Check gmaps_scraper schema
SELECT COUNT(*) FROM gmaps_scraper.linkedin_enrichments;

-- Check public schema
SELECT COUNT(*) FROM public.gmaps_linkedin_enrichments;
```

---

### 6. Email Source Backfill (October 10, 2025)

**File:** `data/20251010_001_backfill_email_source.sql`

**What it does:**
- Fixes NULL `email_source` values in `gmaps_businesses` table
- Sets source based on enrichment data:
  - `'facebook'` - Email from Facebook enrichment
  - `'google_maps'` - Email from initial Google Maps scrape
  - `'not_found'` - No email discovered
- Creates index on `email_source` column
- Provides detailed statistics on completion

**Status:** ✅ Applied to production (based on recent fix commits)

---

## Current Schema State

### Active Schemas

1. **`public` schema** - Main application schema
   - Organizations, campaigns, audiences, contacts
   - Search URLs and campaign management
   - LinkedIn enrichments (?)

2. **`gmaps_scraper` schema** - Google Maps scraper (isolated)
   - Campaigns with ZIP code coverage
   - Businesses scraped from Google Maps
   - Facebook enrichments
   - LinkedIn enrichments (?)
   - API cost tracking

### Key Tables by Schema

**Public Schema:**
- `organizations` - Organization management
- `campaigns` - Campaign orchestration
- `audiences` - Audience segments
- `contacts` - Lead records
- `search_urls` - Apollo/scraper URLs
- `gmaps_businesses` - Google Maps businesses (?)
- `gmaps_linkedin_enrichments` (?) - LinkedIn data

**GMaps Scraper Schema:**
- `gmaps_scraper.campaigns` - Google Maps campaigns
- `gmaps_scraper.businesses` - Scraped businesses
- `gmaps_scraper.facebook_enrichments` - Facebook data
- `gmaps_scraper.linkedin_enrichments` (?) - LinkedIn data
- `gmaps_scraper.zip_codes` - ZIP code database
- `gmaps_scraper.api_costs` - Cost tracking

---

## Applied vs. Unapplied Migrations

### ✅ Confirmed Applied (Production)

1. `hotfixes/20250731_001_emergency_fix_audience_system.sql` - Audience system
2. `schema/20250830_001_add_scraper_type_support.sql` - Scraper types
3. `schema/20250911_001_create_gmaps_scraper_schema.sql` - GMaps schema
4. `data/20250911_001_seed_los_angeles_zip_codes.sql` - ZIP data
5. `data/20251010_001_backfill_email_source.sql` - Email source fix

### ⚠️ Needs Verification

1. `schema/20250925_001_add_linkedin_enrichment_gmaps_scraper.sql` - LinkedIn in gmaps_scraper
2. `schema/20251009_001_create_linkedin_enrichments_public.sql` - LinkedIn in public
3. `schema/20251010_001_phase_25_complete_migration_fixed.sql` - Complete Phase 2.5

**Action Required:** Query production to determine which LinkedIn enrichment migration was applied.

### ❌ Archived (Not Applied)

All files in `archived/` directory are superseded and should NOT be applied.

---

## How to Apply New Migrations

### 1. Local Development

```bash
# Connect to local Supabase
psql postgresql://postgres:postgres@localhost:54322/postgres

# Run migration
\i migrations/schema/YYYYMMDD_NNN_description.sql
```

### 2. Production (Supabase Dashboard)

1. Navigate to: https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql
2. Copy migration contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify success
6. Run security check: `SELECT * FROM gmaps_scraper.advisors;` (if applicable)

### 3. Using Supabase CLI

```bash
# Login
supabase login

# Link project
supabase link --project-ref ndrqixjdddcozjlevieo

# Apply migration
supabase db push

# Or use Supabase's MCP server (if available)
# Use mcp__supabase__apply_migration tool
```

---

## Migration Best Practices

### Before Creating a Migration

1. **Check current schema:**
   ```sql
   \dt          -- List tables
   \d table_name -- Describe table
   ```

2. **Search for existing migrations:**
   ```bash
   grep -r "CREATE TABLE table_name" migrations/
   ```

3. **Verify schema target:**
   - Is this for `public` or `gmaps_scraper` schema?
   - Check existing patterns

### Writing Migrations

1. **Make them idempotent:**
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ```

2. **Include rollback instructions in comments:**
   ```sql
   -- Rollback:
   -- DROP TABLE IF EXISTS table_name CASCADE;
   ```

3. **Add documentation comments:**
   ```sql
   COMMENT ON TABLE table_name IS 'Description of purpose';
   COMMENT ON COLUMN table_name.column_name IS 'What this stores';
   ```

4. **Test locally first:**
   - Apply to local Supabase instance
   - Verify table structure
   - Test queries
   - Check RLS policies

### After Applying a Migration

1. **Run security advisors:**
   ```bash
   # Using MCP Supabase server
   mcp__supabase__get_advisors --type security
   ```

2. **Verify table created:**
   ```sql
   SELECT COUNT(*) FROM new_table;
   ```

3. **Update this README:**
   - Add migration to chronological history
   - Mark as applied
   - Document any issues or notes

4. **Commit migration:**
   ```bash
   git add migrations/
   git commit -m "Add migration: [description]"
   ```

---

## Troubleshooting

### Migration Failed

1. **Check error message** - Usually indicates:
   - Table already exists → Migration already applied
   - Column already exists → Schema drift
   - Foreign key violation → Referenced table doesn't exist

2. **Check current schema:**
   ```sql
   SELECT table_name, table_schema
   FROM information_schema.tables
   WHERE table_name LIKE '%linkedin%';
   ```

3. **Compare with migration:**
   - Does table exist in different schema?
   - Are column names different?
   - Is migration trying to modify system tables?

### Schema Confusion (public vs. gmaps_scraper)

**Current Issue:** LinkedIn enrichment exists in both schemas

**Resolution Steps:**

1. **Query production:**
   ```sql
   -- Check both schemas
   SELECT
     'gmaps_scraper' as schema_name,
     COUNT(*) as record_count
   FROM gmaps_scraper.linkedin_enrichments
   UNION ALL
   SELECT
     'public' as schema_name,
     COUNT(*) as record_count
   FROM public.gmaps_linkedin_enrichments;
   ```

2. **Determine which is active:**
   - Check application code: Which table do Python/Node modules query?
   - Check recent data: Which table has recent `created_at` timestamps?
   - Check indexes: Which table has active indexes?

3. **Document finding:**
   - Update this README with production schema
   - Mark incorrect migration as archived
   - Update application code if needed

### Duplicate Migrations

If a migration appears to duplicate an existing one:

1. **Compare file contents:**
   ```bash
   diff migration1.sql migration2.sql
   ```

2. **Check dates and commit history:**
   ```bash
   git log --follow migration1.sql
   ```

3. **Archive the superseded version:**
   ```bash
   mv migrations/schema/old_migration.sql migrations/archived/
   ```

---

## Outstanding Issues

### 1. LinkedIn Schema Confusion ⚠️

**Problem:** Two LinkedIn enrichment implementations exist:
- `gmaps_scraper.linkedin_enrichments` (Sept 25, 2025)
- `public.gmaps_linkedin_enrichments` (Oct 9-10, 2025)

**Impact:** Unclear which table is production, could cause data fragmentation

**Action Required:**
1. Query production to determine active table
2. Update README with production schema
3. Archive unused migration
4. Verify application code queries correct table
5. Consider migration to consolidate if both exist

### 2. Missing Migration Tracking Table

**Problem:** No `schema_migrations` or similar tracking table

**Impact:** Hard to determine which migrations have been applied

**Recommendation:** Create a migration tracking system:

```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64), -- SHA-256 of migration file
    applied_by VARCHAR(255),
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);
```

### 3. Audience System Migration Attempts

**Observation:** 4 failed attempts before emergency fix worked

**Lessons:**
- Step-by-step migrations can fail due to table dependencies
- Emergency fix used simpler approach: DROP CASCADE + recreate
- Future audience system changes should use emergency fix as base

---

## Migration TODO

### Immediate Actions

- [ ] **Clarify LinkedIn schema** - Query production and document findings
- [ ] **Create migration tracking table** - Track applied migrations
- [ ] **Verify all production migrations** - Confirm application status
- [ ] **Document rollback procedures** - Add rollback SQL to each migration

### Future Improvements

- [ ] **Automated migration testing** - CI/CD pipeline for migrations
- [ ] **Migration templates** - Standard templates for common patterns
- [ ] **Schema versioning** - Track schema version numbers
- [ ] **Migration dry-run tool** - Test migrations against production copy

---

## Contact & Resources

**Supabase Dashboard:** https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo
**SQL Editor:** https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql
**Database URL:** Check `.env` file in root directory

**For Questions:**
- Check git history: `git log --follow migrations/`
- Check commit messages: `git show <commit-hash>`
- Review CLAUDE.md for architecture details

---

**Last Audit:** 2025-10-11
**Next Review:** After Phase 1.2 completion (migrations consolidation)
