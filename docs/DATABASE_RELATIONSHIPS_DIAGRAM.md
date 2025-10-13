# Database Relationships Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         gmaps_campaigns (PARENT)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ PK: id (UUID)                                                           │
│                                                                         │
│ Core Fields:                                                            │
│   - name, description, keywords[], location                             │
│   - status ('draft', 'running', 'paused', 'completed', 'failed')       │
│   - coverage_profile ('aggressive', 'balanced', 'budget', 'custom')    │
│                                                                         │
│ Counter Fields (UPDATED BY OPERATIONS):                                │
│   - total_businesses_found                                              │
│   - total_emails_found                                                  │
│   - total_facebook_pages_found                                          │
│   - total_linkedin_profiles_found                                       │
│   - total_verified_emails                                               │
│                                                                         │
│ Cost Fields (UPDATED BY OPERATIONS):                                   │
│   - actual_cost                                                         │
│   - google_maps_cost                                                    │
│   - facebook_cost                                                       │
│   - linkedin_enrichment_cost                                            │
│   - bouncer_verification_cost                                           │
│                                                                         │
│ Timestamps:                                                             │
│   - created_at, updated_at, started_at, completed_at                    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ ON DELETE CASCADE
                              ▼
        ┌─────────────────────┴─────────────────────────────────┬─────────────────────┐
        │                                                        │                     │
        │                                                        │                     │
        ▼                                                        ▼                     ▼
┌──────────────────────────┐           ┌──────────────────────────────┐    ┌─────────────────────────┐
│ gmaps_campaign_coverage  │           │      gmaps_businesses        │    │   gmaps_api_costs       │
├──────────────────────────┤           ├──────────────────────────────┤    ├─────────────────────────┤
│ PK: id                   │           │ PK: id (UUID)                │    │ PK: id                  │
│ FK: campaign_id          │           │ FK: campaign_id              │    │ FK: campaign_id         │
│ UQ: (campaign_id,        │           │ UQ: place_id                 │    │                         │
│      zip_code)           │           │                              │    │ service VARCHAR(50)     │
│                          │           │ Core Fields:                 │    │ - 'google_maps'         │
│ zip_code VARCHAR(10)     │           │   - place_id (UNIQUE)        │    │ - 'facebook'            │
│ keywords TEXT[]          │           │   - name, address            │    │ - 'linkedin'            │
│ max_results INT          │           │   - city, state, zip         │    │ - 'bouncer'             │
│                          │           │   - phone, website           │    │                         │
│ Status (UPDATED):        │           │                              │    │ items_processed INT     │
│   - scraped BOOL         │           │ Email Fields (UPDATED):      │    │ cost_usd DECIMAL(10,4)  │
│   - scraped_at           │           │   - email VARCHAR(255)       │    │                         │
│   - businesses_found INT │           │   - email_source VARCHAR(50) │    │ Timestamp:              │
│   - emails_found INT     │           │     ('google_maps',          │    │   - incurred_at         │
│   - actual_cost          │           │      'facebook',             │    │   - created_at          │
│                          │           │      'linkedin',             │    └─────────────────────────┘
│ Timestamps:              │           │      'not_found')            │
│   - created_at           │           │                              │
│   - updated_at           │           │ Email Verification           │
└──────────────────────────┘           │ (UPDATED):                   │
                                       │   - email_verified BOOL      │
                                       │   - bouncer_status           │
                                       │   - bouncer_score INT        │
                                       │   - is_safe, is_disposable   │
                                       │   - is_role_based            │
                                       │   - is_free_email            │
                                       │   - bouncer_verified_at      │
                                       │                              │
                                       │ Social URLs:                 │
                                       │   - facebook_url             │
                                       │   - linkedin_url             │
                                       │   - instagram_url            │
                                       │   - twitter_url              │
                                       │                              │
                                       │ Enrichment Tracking          │
                                       │ (UPDATED):                   │
                                       │   - needs_enrichment         │
                                       │   - enrichment_status        │
                                       │   - enrichment_attempts      │
                                       │   - linkedin_enriched        │
                                       │                              │
                                       │ AI Fields:                   │
                                       │   - icebreaker TEXT          │
                                       │   - subject_line             │
                                       │                              │
                                       │ Timestamps:                  │
                                       │   - scraped_at               │
                                       │   - created_at               │
                                       │   - updated_at               │
                                       └──────────────────────────────┘
                                                     │
                                                     │ ON DELETE CASCADE
                      ┌──────────────────────────────┼──────────────────────────────┐
                      │                              │                              │
                      ▼                              ▼                              ▼
        ┌───────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────┐
        │ gmaps_facebook_enrichments│  │ gmaps_linkedin_enrichments│  │ gmaps_email_verifications│
        ├───────────────────────────┤  ├───────────────────────────┤  ├──────────────────────────┤
        │ PK: id                    │  │ PK: id                    │  │ PK: id                   │
        │ FK: business_id           │  │ FK: business_id           │  │ FK: business_id          │
        │ FK: campaign_id           │  │ FK: campaign_id           │  │ FK: linkedin_enrich_id   │
        │                           │  │                           │  │ FK: facebook_enrich_id   │
        │ Facebook Data:            │  │ LinkedIn Data:            │  │                          │
        │   - facebook_url          │  │   - linkedin_url          │  │ Verification Data:       │
        │   - page_name             │  │   - profile_type          │  │   - email VARCHAR(255)   │
        │   - page_likes            │  │     ('company',           │  │   - source VARCHAR(50)   │
        │   - page_followers        │  │      'personal')          │  │   - status VARCHAR(50)   │
        │                           │  │   - person_name           │  │   - score DECIMAL(5,2)   │
        │ Email Data:               │  │   - person_title          │  │   - is_safe BOOL         │
        │   - emails TEXT[]         │  │   - person_profile_url    │  │   - is_disposable        │
        │   - primary_email         │  │   - company_name          │  │   - is_role_based        │
        │   - email_sources TEXT[]  │  │   - location              │  │   - is_free_email        │
        │                           │  │   - connections INT       │  │   - is_gibberish         │
        │ Contact:                  │  │                           │  │                          │
        │   - phone_numbers TEXT[]  │  │ Email Data:               │  │ Technical:               │
        │   - addresses TEXT[]      │  │   - emails_found TEXT[]   │  │   - domain               │
        │                           │  │   - emails_generated      │  │   - provider             │
        │ Verification (UPDATED):   │  │     TEXT[]                │  │   - mx_records BOOL      │
        │   - email_verified        │  │   - primary_email         │  │   - smtp_check BOOL      │
        │   - bouncer_status        │  │   - email_source          │  │   - reason TEXT          │
        │   - bouncer_score         │  │     ('linkedin_direct',   │  │   - suggestion           │
        │   - bouncer_reason        │  │      'generated',         │  │                          │
        │   - is_safe               │  │      'pattern_match')     │  │ Raw Data:                │
        │   - is_disposable         │  │   - phone_numbers TEXT[]  │  │   - raw_response JSONB   │
        │   - is_role_based         │  │                           │  │                          │
        │   - is_free_email         │  │ Email Quality:            │  │ Timestamp:               │
        │   - bouncer_verified_at   │  │   - email_extraction_     │  │   - verified_at          │
        │   - bouncer_raw_response  │  │     attempted BOOL        │  │   - created_at           │
        │                           │  │   - email_verified_source │  └──────────────────────────┘
        │ Status:                   │  │   - email_quality_tier    │
        │   - success BOOL          │  │                           │
        │   - error_message         │  │ Bouncer Verification      │
        │   - raw_data JSONB        │  │ (UPDATED):                │
        │                           │  │   - email_verified        │
        │ Timestamp:                │  │   - email_status          │
        │   - scraped_at            │  │   - email_score INT       │
        │   - created_at            │  │   - is_safe               │
        └───────────────────────────┘  │   - is_deliverable        │
                                       │   - is_risky              │
                                       │   - is_disposable         │
                                       │   - is_role_based         │
                                       │   - is_free_email         │
                                       │   - bouncer_status        │
                                       │   - bouncer_score         │
                                       │   - bouncer_reason        │
                                       │   - bouncer_verified_at   │
                                       │   - bouncer_raw_response  │
                                       │                           │
                                       │ Timestamps:               │
                                       │   - enriched_at           │
                                       │   - verification_date     │
                                       │   - created_at            │
                                       │   - updated_at            │
                                       └───────────────────────────┘
```

---

## Transaction Boundary Operations Map

### Operation 1: Save Facebook Enrichment
```
┌─────────────────────────────────────────┐
│     TRANSACTION BOUNDARY START          │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT into                 │
    │  gmaps_facebook_enrichments  │
    │                              │
    │  - business_id (FK)          │
    │  - campaign_id (FK)          │
    │  - facebook_url              │
    │  - primary_email             │
    │  - emails[]                  │
    │  - success = TRUE/FALSE      │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  UPDATE gmaps_businesses     │
    │  WHERE id = business_id      │
    │                              │
    │  SET:                        │
    │  - email = primary_email     │
    │  - email_source = 'facebook' │
    │  - enrichment_status =       │
    │    'enriched' | 'failed'     │
    │  - enrichment_attempts += 1  │
    │  - last_enrichment_attempt   │
    │    = NOW()                   │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT or ROLLBACK         │
│  (Both operations succeed or both fail) │
└─────────────────────────────────────────┘
```

---

### Operation 2: Save LinkedIn Enrichment
```
┌─────────────────────────────────────────┐
│     TRANSACTION BOUNDARY START          │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT into                 │
    │  gmaps_linkedin_enrichments  │
    │                              │
    │  - business_id (FK)          │
    │  - campaign_id (FK)          │
    │  - linkedin_url              │
    │  - profile_type              │
    │  - person_name, title        │
    │  - primary_email             │
    │  - emails_found[]            │
    │  - emails_generated[]        │
    │  - bouncer_status (if done)  │
    │  - is_safe                   │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  UPDATE gmaps_businesses     │
    │  WHERE id = business_id      │
    │                              │
    │  SET:                        │
    │  - email = primary_email     │
    │    (if found)                │
    │  - email_source = 'linkedin' │
    │  - linkedin_url              │
    │  - linkedin_enriched = TRUE  │
    │  - updated_at = NOW()        │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT or ROLLBACK         │
└─────────────────────────────────────────┘
```

---

### Operation 3: Create Campaign with Coverage
```
┌─────────────────────────────────────────┐
│     TRANSACTION BOUNDARY START          │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT into                 │
    │  gmaps_campaigns             │
    │                              │
    │  - name, description         │
    │  - keywords[], location      │
    │  - coverage_profile          │
    │  - status = 'draft'          │
    │  - target_zip_count          │
    │  - estimated_cost            │
    │  RETURNING id                │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT BATCH into           │
    │  gmaps_campaign_coverage     │
    │                              │
    │  FOR EACH ZIP CODE:          │
    │  - campaign_id (from above)  │
    │  - zip_code                  │
    │  - keywords[]                │
    │  - max_results = 200         │
    │  - scraped = FALSE           │
    │  - businesses_found = 0      │
    │  - emails_found = 0          │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT or ROLLBACK         │
│  (Campaign + ALL coverage or NOTHING)   │
└─────────────────────────────────────────┘
```

---

### Operation 4-6: Email Verification
```
┌─────────────────────────────────────────┐
│     TRANSACTION BOUNDARY START          │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  UPDATE enrichment table     │
    │  (facebook/linkedin/         │
    │   business - depending       │
    │   on source)                 │
    │                              │
    │  SET:                        │
    │  - email_verified = TRUE     │
    │  - bouncer_status            │
    │  - bouncer_score             │
    │  - is_safe                   │
    │  - is_disposable             │
    │  - is_role_based             │
    │  - is_free_email             │
    │  - bouncer_verified_at       │
    │  - bouncer_raw_response      │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT into                 │
    │  gmaps_email_verifications   │
    │  (optional log)              │
    │                              │
    │  - business_id               │
    │  - enrichment_id (FK)        │
    │  - email, source             │
    │  - status, score             │
    │  - is_safe, flags            │
    │  - raw_response              │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT or ROLLBACK         │
└─────────────────────────────────────────┘
```

---

### Operation 7: Update Campaign Statistics
```
┌─────────────────────────────────────────┐
│  TRANSACTION BOUNDARY START             │
│  (READ COMMITTED isolation level)       │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  SELECT COUNT aggregates     │
    │                              │
    │  FROM gmaps_businesses       │
    │  WHERE campaign_id = ?       │
    │  - COUNT(*) businesses       │
    │  - COUNT(email) emails       │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  FROM                        │
    │  gmaps_facebook_enrichments  │
    │  WHERE campaign_id = ?       │
    │  - COUNT(*) fb_pages         │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  FROM                        │
    │  gmaps_linkedin_enrichments  │
    │  WHERE campaign_id = ?       │
    │  - COUNT(*) li_profiles      │
    │  - COUNT(email_verified)     │
    │    verified_emails           │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  UPDATE gmaps_campaigns      │
    │  WHERE id = campaign_id      │
    │                              │
    │  SET:                        │
    │  - total_businesses_found    │
    │  - total_emails_found        │
    │  - total_facebook_pages      │
    │  - total_linkedin_profiles   │
    │  - total_verified_emails     │
    │  - updated_at = NOW()        │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT                     │
│  (All counts consistent at commit time) │
└─────────────────────────────────────────┘
```

---

### Operation 8: Track API Cost
```
┌─────────────────────────────────────────┐
│     TRANSACTION BOUNDARY START          │
└─────────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  SELECT current costs        │
    │  FROM gmaps_campaigns        │
    │  WHERE id = campaign_id      │
    │  FOR UPDATE                  │
    │  (row lock)                  │
    │                              │
    │  - google_maps_cost          │
    │  - facebook_cost             │
    │  - linkedin_enrichment_cost  │
    │  - bouncer_verification_cost │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  INSERT into                 │
    │  gmaps_api_costs             │
    │                              │
    │  - campaign_id (FK)          │
    │  - service ('google_maps',   │
    │    'facebook', 'linkedin',   │
    │    'bouncer')                │
    │  - items_processed           │
    │  - cost_usd                  │
    │  - incurred_at = NOW()       │
    └──────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  UPDATE gmaps_campaigns      │
    │  WHERE id = campaign_id      │
    │                              │
    │  SET (based on service):     │
    │  - google_maps_cost          │
    │  - facebook_cost             │
    │  - linkedin_enrichment_cost  │
    │  - bouncer_verification_cost │
    │  - actual_cost =             │
    │    SUM(all service costs)    │
    └──────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT or ROLLBACK         │
│  (Cost record + campaign update atomic) │
└─────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
Campaign Creation Flow:
======================
1. User creates campaign
   └─> gmaps_campaigns (INSERT)
       └─> gmaps_campaign_coverage (INSERT batch)

Google Maps Scraping Flow:
=========================
2. Scrape ZIP code
   └─> gmaps_businesses (UPSERT batch by place_id)
       └─> gmaps_campaign_coverage (UPDATE scraped status)

Facebook Enrichment Flow:
========================
3. Find businesses needing enrichment
   └─> gmaps_businesses WHERE needs_enrichment = TRUE
       └─> Scrape Facebook
           └─> gmaps_facebook_enrichments (INSERT)
               └─> gmaps_businesses (UPDATE email, email_source)

LinkedIn Enrichment Flow:
========================
4. Find businesses needing LinkedIn
   └─> gmaps_businesses WHERE linkedin_enriched = FALSE
       └─> Scrape LinkedIn
           └─> gmaps_linkedin_enrichments (INSERT)
               └─> gmaps_businesses (UPDATE email, linkedin_url)

Email Verification Flow:
=======================
5. Verify emails from any source
   └─> gmaps_businesses / gmaps_linkedin_enrichments / gmaps_facebook_enrichments
       └─> Bouncer API verification
           └─> UPDATE enrichment table (bouncer fields)
               └─> gmaps_email_verifications (INSERT log)

Cost Tracking Flow:
==================
6. Track API costs
   └─> gmaps_api_costs (INSERT)
       └─> gmaps_campaigns (UPDATE service costs, actual_cost)

Statistics Update Flow:
======================
7. Recalculate campaign statistics
   └─> SELECT aggregates from:
       ├─> gmaps_businesses
       ├─> gmaps_facebook_enrichments
       └─> gmaps_linkedin_enrichments
           └─> gmaps_campaigns (UPDATE counters)
```

---

## Critical Relationships Summary

**Parent → Children (ON DELETE CASCADE):**
- `gmaps_campaigns` deletes cascade to:
  - `gmaps_campaign_coverage`
  - `gmaps_businesses` → which cascades to:
    - `gmaps_facebook_enrichments`
    - `gmaps_linkedin_enrichments`
    - `gmaps_email_verifications`
  - `gmaps_api_costs`

**Unique Constraints:**
- `gmaps_businesses.place_id` - Prevents duplicate businesses
- `gmaps_campaign_coverage(campaign_id, zip_code)` - One coverage record per ZIP per campaign

**Critical Columns Updated by Multiple Operations:**
- `gmaps_businesses.email` - Updated by Facebook, LinkedIn enrichments
- `gmaps_businesses.email_source` - Priority: linkedin > facebook > google_maps
- `gmaps_campaigns.total_*` counters - Updated by enrichment operations and statistics refresh
- `gmaps_campaigns.actual_cost` - Updated by cost tracking for different services

**JSONB Columns (for flexibility):**
- `gmaps_businesses.raw_data` - Full Google Maps response
- `gmaps_facebook_enrichments.raw_data` - Full Facebook scrape data
- `gmaps_linkedin_enrichments.bouncer_raw_response` - Full Bouncer API response
- `gmaps_email_verifications.raw_response` - Full verification response
