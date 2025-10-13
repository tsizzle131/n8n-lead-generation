# Database Schema Mapping for Transaction Boundaries

**Date:** 2025-10-12
**Purpose:** Complete schema documentation for implementing stored procedures with transaction boundaries for 8 critical operations

---

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Complete Table Schemas](#complete-table-schemas)
3. [Foreign Key Relationships](#foreign-key-relationships)
4. [Operations and Table Mappings](#operations-and-table-mappings)
5. [Column Details by Operation](#column-details-by-operation)
6. [Indexes and Performance](#indexes-and-performance)
7. [RLS Policies](#rls-policies)
8. [Triggers and Functions](#triggers-and-functions)

---

## Schema Overview

**Active Schema:** `public` (NOT `gmaps_scraper`)
- The codebase uses `gmaps_` prefixed tables in the **public schema**
- The `gmaps_scraper` schema exists in migrations but is NOT used by the application
- All operations target: `gmaps_campaigns`, `gmaps_businesses`, `gmaps_facebook_enrichments`, `gmaps_linkedin_enrichments`, `gmaps_campaign_coverage`, `gmaps_api_costs`

---

## Complete Table Schemas

### 1. gmaps_campaigns

**Purpose:** Campaign metadata and aggregated statistics

```sql
CREATE TABLE public.gmaps_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[],
    location VARCHAR(255),
    coverage_profile VARCHAR(50), -- 'aggressive', 'balanced', 'budget', 'custom'
    custom_zip_codes TEXT[],
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed', 'failed'

    -- Coverage Settings
    target_zip_count INTEGER,
    actual_zip_count INTEGER,
    coverage_percentage DECIMAL(5,2),

    -- Cost Tracking (UPDATED BY OPERATIONS)
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    google_maps_cost DECIMAL(10,2),
    facebook_cost DECIMAL(10,2),
    linkedin_enrichment_cost DECIMAL(10,2),
    bouncer_verification_cost DECIMAL(10,2),

    -- Results Counters (UPDATED BY OPERATIONS)
    total_businesses_found INTEGER DEFAULT 0,
    total_emails_found INTEGER DEFAULT 0,
    total_facebook_pages_found INTEGER DEFAULT 0,
    total_linkedin_profiles_found INTEGER DEFAULT 0,
    total_verified_emails INTEGER DEFAULT 0,

    -- Metadata
    organization_id UUID,
    created_by VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns for Transactions:**
- `total_businesses_found` - Incremented when businesses saved
- `total_emails_found` - Updated when emails discovered
- `total_facebook_pages_found` - Incremented on FB enrichment
- `total_linkedin_profiles_found` - Incremented on LI enrichment
- `actual_cost`, `google_maps_cost`, `facebook_cost`, `linkedin_enrichment_cost`, `bouncer_verification_cost` - Updated on cost tracking
- `status` - Critical for state transitions

---

### 2. gmaps_campaign_coverage

**Purpose:** ZIP code coverage tracking for campaigns

```sql
CREATE TABLE public.gmaps_campaign_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
    zip_code VARCHAR(10) NOT NULL,

    -- Search Configuration
    keywords TEXT[],
    max_results INTEGER DEFAULT 250,

    -- Status Tracking (UPDATED BY OPERATIONS)
    scraped BOOLEAN DEFAULT FALSE,
    scraped_at TIMESTAMPTZ,
    businesses_found INTEGER DEFAULT 0,
    emails_found INTEGER DEFAULT 0,

    -- Cost Tracking
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campaign_id, zip_code)
);
```

**Key Columns for Transactions:**
- `scraped`, `scraped_at` - Updated when ZIP scraping completes
- `businesses_found`, `emails_found` - Counters updated after scraping
- `actual_cost` - Updated with scraping costs

---

### 3. gmaps_businesses

**Purpose:** Core business records from Google Maps with enrichment flags

```sql
CREATE TABLE public.gmaps_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
    zip_code VARCHAR(10),

    -- Google Maps Data
    place_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    postal_code VARCHAR(10),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Contact Information (UPDATED BY ENRICHMENTS)
    phone VARCHAR(50),
    website TEXT,
    email VARCHAR(255),
    email_source VARCHAR(50), -- 'google_maps', 'facebook', 'linkedin', 'not_found'

    -- Email Verification Fields (UPDATED BY OPERATIONS)
    email_verified BOOLEAN DEFAULT FALSE,
    bouncer_status VARCHAR(50),
    bouncer_score INTEGER,
    bouncer_reason TEXT,
    is_safe BOOLEAN,
    is_disposable BOOLEAN,
    is_role_based BOOLEAN,
    is_free_email BOOLEAN,
    bouncer_verified_at TIMESTAMPTZ,

    -- Business Details
    category VARCHAR(255),
    categories TEXT[],
    description TEXT,
    rating DECIMAL(2,1),
    reviews_count INTEGER,
    price_level VARCHAR(10),
    hours JSONB,

    -- Social Media URLs
    facebook_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,

    -- Enrichment Status (UPDATED BY OPERATIONS)
    needs_enrichment BOOLEAN DEFAULT TRUE,
    enrichment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'enriched', 'no_facebook', 'failed'
    enrichment_attempts INTEGER DEFAULT 0,
    last_enrichment_attempt TIMESTAMPTZ,
    linkedin_enriched BOOLEAN DEFAULT FALSE,

    -- AI-Generated Content
    icebreaker TEXT,
    subject_line VARCHAR(255),
    icebreaker_generated_at TIMESTAMPTZ,

    -- Raw Data
    raw_data JSONB,

    -- Metadata
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns for Transactions:**
- `email`, `email_source` - Updated by Facebook/LinkedIn enrichments
- `email_verified`, `bouncer_status`, `bouncer_score`, etc. - Updated by email verification
- `enrichment_status`, `enrichment_attempts`, `last_enrichment_attempt` - Tracking enrichment progress
- `linkedin_enriched` - Flag for LinkedIn enrichment completion
- `facebook_url`, `linkedin_url` - Can be updated during enrichment

**Critical Constraint:** `place_id` UNIQUE - prevents duplicates, enables upsert

---

### 4. gmaps_facebook_enrichments

**Purpose:** Facebook page enrichment data with emails

```sql
CREATE TABLE public.gmaps_facebook_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

    -- Facebook Page Data
    facebook_url TEXT,
    page_name VARCHAR(255),
    page_likes INTEGER,
    page_followers INTEGER,

    -- Extracted Emails
    emails TEXT[],
    primary_email VARCHAR(255),
    email_sources TEXT[],

    -- Additional Contact Info
    phone_numbers TEXT[],
    addresses TEXT[],

    -- Email Verification (UPDATED BY OPERATIONS)
    email_verified BOOLEAN DEFAULT FALSE,
    bouncer_status VARCHAR(50),
    bouncer_score INTEGER,
    bouncer_reason TEXT,
    is_safe BOOLEAN,
    is_disposable BOOLEAN,
    is_role_based BOOLEAN,
    is_free_email BOOLEAN,
    bouncer_verified_at TIMESTAMPTZ,
    bouncer_raw_response JSONB,

    -- Enrichment Source
    enrichment_source VARCHAR(50), -- 'facebook_scraper'

    -- Metadata
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    raw_data JSONB,

    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns for Transactions:**
- `primary_email`, `emails` - Must be saved atomically with business update
- `email_verified`, `bouncer_*` fields - Updated during verification
- `success` - Critical status flag

---

### 5. gmaps_linkedin_enrichments

**Purpose:** LinkedIn profile enrichment with email verification

```sql
CREATE TABLE public.gmaps_linkedin_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

    -- LinkedIn Profile Data
    linkedin_url TEXT,
    profile_type VARCHAR(20), -- 'company', 'personal'
    person_name TEXT,
    person_title TEXT,
    person_profile_url TEXT,
    company_name TEXT,
    location TEXT,
    connections INTEGER,

    -- Contact Information
    emails_found TEXT[],
    emails_generated TEXT[],
    primary_email TEXT,
    email_source VARCHAR(50), -- 'linkedin_direct', 'generated', 'pattern_match'
    phone_numbers TEXT[],
    phone_number TEXT,

    -- Email Quality Tracking
    email_extraction_attempted BOOLEAN DEFAULT FALSE,
    email_verified_source VARCHAR(50),
    email_quality_tier VARCHAR(50),

    -- Bouncer Email Verification (UPDATED BY OPERATIONS)
    email_verified BOOLEAN DEFAULT FALSE,
    email_status VARCHAR(50), -- 'deliverable', 'undeliverable', 'risky', 'unknown', 'accept_all'
    email_score INTEGER, -- 0-100
    is_safe BOOLEAN,
    is_deliverable BOOLEAN,
    is_risky BOOLEAN,
    is_disposable BOOLEAN,
    is_role_based BOOLEAN,
    is_free_email BOOLEAN,
    bouncer_status VARCHAR(50),
    bouncer_score INTEGER,
    bouncer_reason TEXT,
    bouncer_verified_at TIMESTAMPTZ,
    bouncer_raw_response JSONB,

    -- Metadata
    enriched_at TIMESTAMPTZ DEFAULT NOW(),
    verification_date TIMESTAMPTZ,
    raw_verification_response JSONB,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns for Transactions:**
- `primary_email`, `emails_found`, `emails_generated` - Must be saved atomically
- `email_verified`, `bouncer_*` fields - Updated during verification
- All Bouncer verification fields must be updated together

---

### 6. gmaps_api_costs

**Purpose:** Track API usage costs per service

```sql
CREATE TABLE public.gmaps_api_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,

    -- Cost Details
    service VARCHAR(50) NOT NULL, -- 'google_maps', 'facebook', 'linkedin', 'bouncer'
    actor_name VARCHAR(255),
    run_id VARCHAR(255),

    -- Metrics
    items_processed INTEGER,
    cost_usd DECIMAL(10,4),
    credits_used INTEGER,

    -- Performance
    duration_seconds INTEGER,
    success_rate DECIMAL(5,2),

    -- Metadata
    metadata JSONB,
    incurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns for Transactions:**
- `service`, `cost_usd`, `items_processed` - Must be inserted atomically with campaign cost updates

---

### 7. gmaps_email_verifications (Optional)

**Purpose:** Verification log table for tracking all email verification attempts

```sql
CREATE TABLE public.gmaps_email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES gmaps_businesses(id) ON DELETE CASCADE,
    linkedin_enrichment_id UUID REFERENCES gmaps_linkedin_enrichments(id) ON DELETE CASCADE,
    facebook_enrichment_id UUID REFERENCES gmaps_facebook_enrichments(id) ON DELETE CASCADE,

    -- Email Being Verified
    email VARCHAR(255) NOT NULL,
    source VARCHAR(50), -- 'google_maps', 'facebook', 'linkedin'

    -- Verification Results
    status VARCHAR(50) NOT NULL,
    score DECIMAL(5,2),
    is_safe BOOLEAN DEFAULT FALSE,

    -- Detailed Flags
    is_disposable BOOLEAN,
    is_role_based BOOLEAN,
    is_free_email BOOLEAN,
    is_gibberish BOOLEAN,

    -- Technical Details
    domain VARCHAR(255),
    provider VARCHAR(255),
    mx_records BOOLEAN,
    smtp_check BOOLEAN,

    -- Error/Suggestion
    reason TEXT,
    suggestion VARCHAR(255),

    -- Raw Response
    raw_response JSONB,

    -- Timestamps
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Foreign Key Relationships

### Cascade Delete Diagram

```
gmaps_campaigns (id)
    ↓ ON DELETE CASCADE
    ├── gmaps_campaign_coverage (campaign_id)
    ├── gmaps_businesses (campaign_id)
    │   ↓ ON DELETE CASCADE
    │   ├── gmaps_facebook_enrichments (business_id)
    │   ├── gmaps_linkedin_enrichments (business_id)
    │   └── gmaps_email_verifications (business_id)
    ├── gmaps_facebook_enrichments (campaign_id)
    ├── gmaps_linkedin_enrichments (campaign_id)
    └── gmaps_api_costs (campaign_id)
```

### Foreign Key Constraints

1. **gmaps_campaign_coverage**
   - `campaign_id → gmaps_campaigns(id)` ON DELETE CASCADE

2. **gmaps_businesses**
   - `campaign_id → gmaps_campaigns(id)` ON DELETE CASCADE

3. **gmaps_facebook_enrichments**
   - `business_id → gmaps_businesses(id)` ON DELETE CASCADE
   - `campaign_id → gmaps_campaigns(id)` ON DELETE CASCADE

4. **gmaps_linkedin_enrichments**
   - `business_id → gmaps_businesses(id)` ON DELETE CASCADE
   - `campaign_id → gmaps_campaigns(id)` ON DELETE CASCADE

5. **gmaps_api_costs**
   - `campaign_id → gmaps_campaigns(id)` ON DELETE CASCADE

6. **gmaps_email_verifications**
   - `business_id → gmaps_businesses(id)` ON DELETE CASCADE
   - `linkedin_enrichment_id → gmaps_linkedin_enrichments(id)` ON DELETE CASCADE
   - `facebook_enrichment_id → gmaps_facebook_enrichments(id)` ON DELETE CASCADE

---

## Operations and Table Mappings

### Operation 1: Facebook Enrichment Save
**Tables Modified:**
1. `gmaps_facebook_enrichments` - INSERT enrichment record
2. `gmaps_businesses` - UPDATE email, email_source, enrichment_status

**Transaction Scope:** Both operations must succeed or rollback

---

### Operation 2: LinkedIn Enrichment Save
**Tables Modified:**
1. `gmaps_linkedin_enrichments` - INSERT enrichment record
2. `gmaps_businesses` - UPDATE email, email_source, linkedin_enriched, linkedin_url

**Transaction Scope:** Both operations must succeed or rollback

---

### Operation 3: Campaign Creation with Coverage
**Tables Modified:**
1. `gmaps_campaigns` - INSERT campaign record
2. `gmaps_campaign_coverage` - INSERT multiple ZIP coverage records (batch)

**Transaction Scope:** Campaign + all coverage records must be created atomically

---

### Operation 4: Email Verification (Facebook)
**Tables Modified:**
1. `gmaps_facebook_enrichments` - UPDATE bouncer verification fields
2. `gmaps_email_verifications` - INSERT verification log (optional)

**Transaction Scope:** Both updates must succeed together

---

### Operation 5: Email Verification (LinkedIn)
**Tables Modified:**
1. `gmaps_linkedin_enrichments` - UPDATE bouncer verification fields
2. `gmaps_email_verifications` - INSERT verification log (optional)

**Transaction Scope:** Both updates must succeed together

---

### Operation 6: Email Verification (Google Maps)
**Tables Modified:**
1. `gmaps_businesses` - UPDATE bouncer verification fields
2. `gmaps_email_verifications` - INSERT verification log (optional)

**Transaction Scope:** Both updates must succeed together

---

### Operation 7: Campaign Statistics Update
**Tables Read:**
1. `gmaps_businesses` - COUNT and aggregate data
2. `gmaps_facebook_enrichments` - COUNT Facebook pages
3. `gmaps_linkedin_enrichments` - COUNT LinkedIn profiles
4. `gmaps_campaign_coverage` - Coverage statistics

**Tables Modified:**
1. `gmaps_campaigns` - UPDATE counter fields

**Transaction Scope:** All reads + campaign update must be consistent

---

### Operation 8: API Cost Tracking
**Tables Modified:**
1. `gmaps_api_costs` - INSERT cost record
2. `gmaps_campaigns` - UPDATE service-specific cost fields (google_maps_cost, facebook_cost, linkedin_enrichment_cost, bouncer_verification_cost, actual_cost)

**Transaction Scope:** Cost record insertion + campaign cost updates must be atomic

---

### Operation 9: Coverage Update After Scraping
**Tables Modified:**
1. `gmaps_campaign_coverage` - UPDATE scraped, scraped_at, businesses_found, emails_found, actual_cost
2. `gmaps_campaigns` - Optionally update aggregated statistics

**Transaction Scope:** Coverage update + optional campaign updates must be consistent

---

### Operation 10: Campaign Status Transitions
**Tables Modified:**
1. `gmaps_campaigns` - UPDATE status, started_at/completed_at

**Transaction Scope:** Single table, but status changes must maintain valid state machine

---

## Column Details by Operation

### Operation 1: Facebook Enrichment Save

**INSERT into gmaps_facebook_enrichments:**
- `business_id` (UUID, NOT NULL, FK)
- `campaign_id` (UUID, FK)
- `facebook_url` (TEXT)
- `page_name` (VARCHAR(255))
- `emails` (TEXT[])
- `primary_email` (VARCHAR(255))
- `email_sources` (TEXT[])
- `phone_numbers` (TEXT[])
- `enrichment_source` (VARCHAR(50))
- `success` (BOOLEAN)
- `error_message` (TEXT)
- `raw_data` (JSONB)
- `scraped_at` (TIMESTAMPTZ)

**UPDATE gmaps_businesses:**
- `email` = primary_email
- `email_source` = 'facebook'
- `enrichment_status` = 'enriched' | 'failed'
- `enrichment_attempts` = enrichment_attempts + 1
- `last_enrichment_attempt` = NOW()
- `updated_at` = NOW()

---

### Operation 2: LinkedIn Enrichment Save

**INSERT into gmaps_linkedin_enrichments:**
- `business_id` (UUID, NOT NULL, FK)
- `campaign_id` (UUID, NOT NULL, FK)
- `linkedin_url` (TEXT)
- `profile_type` (VARCHAR(20))
- `person_name` (TEXT)
- `person_title` (TEXT)
- `person_profile_url` (TEXT)
- `company_name` (TEXT)
- `location` (TEXT)
- `connections` (INTEGER)
- `emails_found` (TEXT[])
- `emails_generated` (TEXT[])
- `primary_email` (TEXT)
- `email_source` (VARCHAR(50))
- `phone_numbers` (TEXT[])
- `phone_number` (TEXT)
- `email_extraction_attempted` (BOOLEAN)
- `email_verified_source` (VARCHAR(50))
- `email_quality_tier` (VARCHAR(50))
- `bouncer_status` (VARCHAR(50))
- `bouncer_score` (INTEGER)
- `bouncer_reason` (TEXT)
- `bouncer_verified_at` (TIMESTAMPTZ)
- `bouncer_raw_response` (JSONB)
- `email_verified` (BOOLEAN)
- `is_safe` (BOOLEAN)
- `is_disposable` (BOOLEAN)
- `is_role_based` (BOOLEAN)
- `is_free_email` (BOOLEAN)
- `error_message` (TEXT)
- `enriched_at` (TIMESTAMPTZ)

**UPDATE gmaps_businesses:**
- `email` = primary_email (if found)
- `email_source` = 'linkedin'
- `linkedin_url` = linkedin_url
- `linkedin_enriched` = TRUE
- `updated_at` = NOW()

---

### Operation 3: Campaign Creation

**INSERT into gmaps_campaigns:**
- `name` (VARCHAR(255), NOT NULL)
- `description` (TEXT)
- `keywords` (TEXT[])
- `location` (VARCHAR(255))
- `coverage_profile` (VARCHAR(50))
- `custom_zip_codes` (TEXT[])
- `status` = 'draft'
- `target_zip_count` (INTEGER)
- `actual_zip_count` (INTEGER)
- `coverage_percentage` (DECIMAL(5,2))
- `estimated_cost` (DECIMAL(10,2))
- `total_businesses_found` = 0
- `total_emails_found` = 0
- `total_facebook_pages_found` = 0
- `organization_id` (UUID)
- `created_by` (VARCHAR(255))
- `created_at` = NOW()
- `updated_at` = NOW()

**INSERT into gmaps_campaign_coverage (batch):**
- `campaign_id` (UUID, FK - from campaign insert)
- `zip_code` (VARCHAR(10), NOT NULL)
- `keywords` (TEXT[])
- `max_results` = 200 (INTEGER)
- `estimated_cost` (DECIMAL(10,2))
- `scraped` = FALSE
- `businesses_found` = 0
- `emails_found` = 0
- `created_at` = NOW()

---

### Operation 4-6: Email Verification

**UPDATE gmaps_facebook_enrichments / gmaps_linkedin_enrichments / gmaps_businesses:**
- `email_verified` = TRUE
- `bouncer_status` (VARCHAR(50))
- `bouncer_score` (INTEGER)
- `bouncer_reason` (TEXT)
- `is_safe` (BOOLEAN)
- `is_disposable` (BOOLEAN)
- `is_role_based` (BOOLEAN)
- `is_free_email` (BOOLEAN)
- `bouncer_verified_at` = NOW()
- `bouncer_raw_response` (JSONB) - LinkedIn/Facebook only

**INSERT into gmaps_email_verifications (optional):**
- `business_id` (UUID, FK)
- `linkedin_enrichment_id` (UUID, FK) - if LinkedIn
- `facebook_enrichment_id` (UUID, FK) - if Facebook
- `email` (VARCHAR(255))
- `source` (VARCHAR(50))
- `status` (VARCHAR(50))
- `score` (DECIMAL(5,2))
- `is_safe` (BOOLEAN)
- `is_disposable`, `is_role_based`, `is_free_email`, `is_gibberish` (BOOLEAN)
- `domain`, `provider` (VARCHAR(255))
- `mx_records`, `smtp_check` (BOOLEAN)
- `reason`, `suggestion` (TEXT/VARCHAR)
- `raw_response` (JSONB)
- `verified_at` = NOW()

---

### Operation 7: Campaign Statistics Update

**SELECT aggregates from:**
- `gmaps_businesses` WHERE `campaign_id` = ?
  - COUNT(*) as total_businesses
  - COUNT(CASE WHEN email IS NOT NULL) as total_emails_found

- `gmaps_facebook_enrichments` WHERE `campaign_id` = ?
  - COUNT(*) as total_facebook_pages_found

- `gmaps_linkedin_enrichments` WHERE `campaign_id` = ?
  - COUNT(*) as total_linkedin_profiles_found
  - COUNT(CASE WHEN email_verified = TRUE) as total_verified_emails

- `gmaps_campaign_coverage` WHERE `campaign_id` = ?
  - COUNT(CASE WHEN scraped = TRUE) as zips_scraped
  - SUM(businesses_found), SUM(emails_found)

**UPDATE gmaps_campaigns:**
- `total_businesses_found` = <calculated>
- `total_emails_found` = <calculated>
- `total_facebook_pages_found` = <calculated>
- `total_linkedin_profiles_found` = <calculated>
- `total_verified_emails` = <calculated>
- `updated_at` = NOW()

---

### Operation 8: API Cost Tracking

**INSERT into gmaps_api_costs:**
- `campaign_id` (UUID, FK)
- `service` (VARCHAR(50)) - 'google_maps', 'facebook', 'linkedin', 'bouncer'
- `items_processed` (INTEGER)
- `cost_usd` (DECIMAL(10,4))
- `metadata` (JSONB)
- `incurred_at` = NOW()

**UPDATE gmaps_campaigns (service-specific):**
- For `service = 'google_maps'`:
  - `google_maps_cost` = cost_usd
  - `actual_cost` = cost_usd

- For `service = 'facebook'`:
  - `facebook_cost` = cost_usd
  - `actual_cost` = google_maps_cost + facebook_cost

- For `service = 'linkedin'`:
  - `linkedin_enrichment_cost` = cost_usd
  - `actual_cost` = google_maps_cost + facebook_cost + linkedin_enrichment_cost

- For `service = 'bouncer'`:
  - `bouncer_verification_cost` = cost_usd
  - `actual_cost` = google_maps_cost + facebook_cost + linkedin_enrichment_cost + bouncer_verification_cost

**Note:** Requires reading current campaign costs to calculate new `actual_cost`

---

### Operation 9: Coverage Update

**UPDATE gmaps_campaign_coverage:**
- `scraped` = TRUE
- `scraped_at` = NOW()
- `businesses_found` = <value>
- `emails_found` = <value>
- `actual_cost` = <value>
- `updated_at` = NOW()

WHERE `campaign_id` = ? AND `zip_code` = ?

---

### Operation 10: Campaign Status Transitions

**UPDATE gmaps_campaigns:**
- `status` = <new_status>
- `started_at` = NOW() (when transitioning to 'running')
- `completed_at` = NOW() (when transitioning to 'completed')
- `updated_at` = NOW()

WHERE `id` = ?

**Valid Transitions:**
- 'draft' → 'running'
- 'running' → 'paused'
- 'paused' → 'running'
- 'running' → 'completed'
- 'running' → 'failed'

---

## Indexes and Performance

### Primary Keys (Automatic Indexes)
- `gmaps_campaigns(id)`
- `gmaps_campaign_coverage(id)`
- `gmaps_businesses(id)`
- `gmaps_facebook_enrichments(id)`
- `gmaps_linkedin_enrichments(id)`
- `gmaps_api_costs(id)`
- `gmaps_email_verifications(id)`

### Unique Constraints (Automatic Indexes)
- `gmaps_businesses(place_id)` - UNIQUE
- `gmaps_campaign_coverage(campaign_id, zip_code)` - UNIQUE

### Foreign Key Indexes
- `idx_businesses_campaign_id` ON `gmaps_businesses(campaign_id)`
- `idx_businesses_place_id` ON `gmaps_businesses(place_id)`
- `idx_businesses_zip_code` ON `gmaps_businesses(postal_code)`
- `idx_facebook_enrichments_business_id` ON `gmaps_facebook_enrichments(business_id)`
- `idx_facebook_enrichments_campaign_id` ON `gmaps_facebook_enrichments(campaign_id)`
- `idx_linkedin_enrichments_business_id` ON `gmaps_linkedin_enrichments(business_id)`
- `idx_linkedin_enrichments_campaign_id` ON `gmaps_linkedin_enrichments(campaign_id)`
- `idx_campaign_coverage_campaign_id` ON `gmaps_campaign_coverage(campaign_id)`
- `idx_campaign_coverage_zip_code` ON `gmaps_campaign_coverage(zip_code)`
- `idx_api_costs_campaign_id` ON `gmaps_api_costs(campaign_id)`

### Query Optimization Indexes
- `idx_businesses_enrichment_status` ON `gmaps_businesses(enrichment_status)`
- `idx_businesses_needs_enrichment` ON `gmaps_businesses(needs_enrichment)`
- `idx_businesses_linkedin_enriched` ON `gmaps_businesses(linkedin_enriched)`
- `idx_linkedin_enrichments_email_verified` ON `gmaps_linkedin_enrichments(email_verified)`
- `idx_linkedin_enrichments_is_safe` ON `gmaps_linkedin_enrichments(is_safe)`
- `idx_linkedin_enrichments_email_status` ON `gmaps_linkedin_enrichments(email_status)`
- `idx_linkedin_enrichments_profile_type` ON `gmaps_linkedin_enrichments(profile_type)`
- `idx_api_costs_service` ON `gmaps_api_costs(service)`

### Partial Indexes
- `idx_gmaps_businesses_icebreaker` ON `gmaps_businesses(icebreaker_generated_at)` WHERE `icebreaker IS NOT NULL`

---

## RLS Policies

**Status:** Row Level Security is ENABLED on all gmaps_ tables

**Tables with RLS:**
- `gmaps_campaigns`
- `gmaps_businesses`
- `gmaps_facebook_enrichments`
- `gmaps_linkedin_enrichments`
- `gmaps_campaign_coverage`
- `gmaps_api_costs`

**Current Policies:**
- Allow authenticated read/insert/update access
- Allow anon read/insert/update access

**Note:** Current policies are permissive. For production, should implement:
- User-specific campaign ownership
- Organization-based access control
- Read-only for completed campaigns

**Stored Functions and RLS:**
- Stored functions run with `SECURITY DEFINER` to bypass RLS
- This is necessary for aggregation queries and cross-table transactions
- Functions will enforce business logic security internally

---

## Triggers and Functions

### Existing Triggers

1. **update_gmaps_linkedin_enrichments_updated_at**
   - Trigger on: `gmaps_linkedin_enrichments` BEFORE UPDATE
   - Function: `update_gmaps_linkedin_enrichments_updated_at()`
   - Purpose: Auto-update `updated_at` timestamp

### Existing Functions

1. **update_gmaps_linkedin_enrichments_updated_at()**
   - Returns: TRIGGER
   - Purpose: Sets `NEW.updated_at = NOW()` before update

### Functions to Create (for stored procedures)

These will be created as part of the transaction boundary implementation:

1. **save_facebook_enrichment_tx()**
   - Parameters: business_id, campaign_id, enrichment_data JSONB
   - Returns: JSONB (result with success/error)
   - Transaction scope: INSERT enrichment + UPDATE business

2. **save_linkedin_enrichment_tx()**
   - Parameters: business_id, campaign_id, enrichment_data JSONB
   - Returns: JSONB
   - Transaction scope: INSERT enrichment + UPDATE business

3. **create_campaign_with_coverage_tx()**
   - Parameters: campaign_data JSONB, coverage_data JSONB[]
   - Returns: JSONB (campaign with coverage)
   - Transaction scope: INSERT campaign + INSERT coverage batch

4. **update_email_verification_tx()**
   - Parameters: source VARCHAR, target_id UUID, verification_data JSONB
   - Returns: JSONB
   - Transaction scope: UPDATE enrichment/business + INSERT verification log

5. **track_api_cost_tx()**
   - Parameters: campaign_id UUID, service VARCHAR, cost_data JSONB
   - Returns: JSONB
   - Transaction scope: INSERT cost + UPDATE campaign costs

6. **update_campaign_statistics_tx()**
   - Parameters: campaign_id UUID
   - Returns: JSONB
   - Transaction scope: Read aggregates + UPDATE campaign (READ COMMITTED isolation)

7. **update_coverage_status_tx()**
   - Parameters: campaign_id UUID, zip_code VARCHAR, results JSONB
   - Returns: JSONB
   - Transaction scope: UPDATE coverage + optional campaign update

8. **update_campaign_status_tx()**
   - Parameters: campaign_id UUID, new_status VARCHAR, metadata JSONB
   - Returns: JSONB
   - Transaction scope: UPDATE campaign with validation

---

## Data Integrity Considerations

### Consistency Guarantees Needed

1. **Facebook/LinkedIn Enrichment:**
   - If enrichment record is created, business MUST be updated
   - If business update fails, enrichment record should not exist
   - Email source priority: linkedin > facebook > google_maps

2. **Campaign Creation:**
   - Campaign cannot exist without coverage records
   - All ZIP codes must be inserted or none

3. **Email Verification:**
   - Verification results must be saved to enrichment table AND log table together
   - Partial verification updates create orphaned data

4. **Cost Tracking:**
   - Cost record must be saved with campaign cost update
   - Campaign `actual_cost` must be recalculated atomically

5. **Campaign Statistics:**
   - Counter updates must reflect actual table counts
   - Concurrent enrichments must not cause counter drift

### Concurrency Issues

1. **Multiple workers enriching same campaign:**
   - Race condition on `total_businesses_found` counter
   - Solution: Use stored procedure with SELECT FOR UPDATE or increment operation

2. **Simultaneous cost tracking:**
   - Race condition on `actual_cost` calculation
   - Solution: Use RPC with row-level lock

3. **Batch operations:**
   - Large batch inserts can cause lock contention
   - Solution: Process in smaller batches within transaction

### Error Recovery

1. **Partial Enrichment Failure:**
   - Current: Enrichment saved but business not updated
   - With transactions: Full rollback, retry entire operation

2. **Network Interruption:**
   - Current: Orphaned enrichment records
   - With transactions: Clean state, no orphans

3. **Validation Failures:**
   - Stored procedures should validate before transaction commits
   - Return error codes for application-level retry logic

---

## Next Steps

1. **Create stored procedures** for each of 8 operations
2. **Add transaction isolation levels** (READ COMMITTED for statistics, SERIALIZABLE for critical updates)
3. **Implement retry logic** in application code for stored procedure calls
4. **Add monitoring** for transaction deadlocks and rollbacks
5. **Performance testing** with concurrent operations
6. **Update application code** to use stored procedures instead of direct queries

---

## References

- Migration files: `/migrations/schema/20250911_001_create_gmaps_scraper_schema.sql`
- Migration files: `/migrations/phase_25_complete_migration_fixed.sql`
- Application code: `/supabase-db.js`
- Python code: `/lead_generation/modules/gmaps_supabase_manager.py`
- Test suite: `/tests/test_database_integrity.js`
