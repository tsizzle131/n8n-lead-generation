# Complete Campaign Data Flow

**Complete Pipeline**: Google Maps → Facebook (2 passes) → LinkedIn → Email Verification

---

## **Phase-by-Phase Data Flow**

### **PHASE 1: Google Maps Scraping**

**Input**: Location (city/state/ZIP) + Keywords (e.g., "dentist")

**API**: Apify Google Maps Scraper

**Process**:
1. AI analyzes location → Selects optimal ZIP codes
2. For each ZIP code:
   - Search Google Maps for businesses matching keywords
   - Extract business data

**Output (per business)**:
```
{
  "name": "Joe's Dentistry",
  "address": "123 Main St",
  "phone": "(555) 123-4567",
  "website": "joesdentist.com",
  "email": "joe@joesdentist.com",           // ← Sometimes found (20-30%)
  "email_source": "google_maps",             // ← If found directly
  "facebook_url": "facebook.com/joesdentist", // ← Sometimes found (40-50%)
  "instagram_url": "...",
  "rating": 4.5,
  "reviews_count": 127
}
```

**Data saved to**: `gmaps_businesses` table

**Typical results**: 300-500 businesses per campaign

---

### **PHASE 2A: Facebook Enrichment (First Pass)**

**Input**: Businesses that already have `facebook_url` from Phase 1

**API**: Apify Facebook Scraper

**Process**:
1. Filter businesses: `WHERE facebook_url IS NOT NULL`
2. For each business with Facebook URL:
   - Scrape Facebook page
   - Extract emails from "About" section, posts, reviews
   - Extract additional phone numbers

**Output (per business)**:
```
{
  "facebook_url": "facebook.com/joesdentist",
  "page_name": "Joe's Dentistry",
  "emails": ["contact@joesdentist.com", "info@joesdentist.com"],
  "primary_email": "contact@joesdentist.com",
  "email_sources": ["facebook_about", "facebook_post"],
  "phone_numbers": ["(555) 123-4567"],
  "success": true
}
```

**Data saved to**: `gmaps_facebook_enrichments` table

**Business record updated**:
```
email = "contact@joesdentist.com"  // ← Updates business record
email_source = "facebook"          // ← Marks source
```

**Typical results**: 40-60% of businesses with Facebook URLs get emails

---

### **PHASE 2B: Google Search for Facebook Pages**

**Input**: Businesses WITHOUT `facebook_url` from Phase 1

**API**: Apify Google Search Scraper

**Process**:
1. Filter businesses: `WHERE facebook_url IS NULL`
2. For each business:
   - Search Google: `"[Business Name]" site:facebook.com [City]`
   - Extract Facebook page URL from search results
   - Update business record with Facebook URL

**Output**:
```
{
  "business_id": "abc-123",
  "facebook_url": "facebook.com/newlyfound"  // ← Newly discovered
}
```

**Business record updated**:
```
facebook_url = "facebook.com/newlyfound"  // ← Updates business
needs_enrichment = true                    // ← Marks for Phase 2C
```

**Typical results**: Finds Facebook pages for 30-50% of remaining businesses

---

### **PHASE 2C: Facebook Enrichment (Second Pass)**

**Input**: Businesses with newly discovered `facebook_url` from Phase 2B

**API**: Apify Facebook Scraper (same as 2A)

**Process**:
1. Filter businesses: `WHERE needs_enrichment = true AND enrichment_status = 'pending'`
2. Scrape newly found Facebook pages
3. Extract emails and phone numbers

**Output**: Same as Phase 2A

**Typical results**: Additional 20-30% email discovery

---

### **PHASE 2.5 STEP 1: Google Search for LinkedIn**

**Input**: ALL businesses (regardless of whether they have emails)

**API**: Apify Google Search Scraper

**Process** (PARALLEL BATCH):
1. Build batch queries (15 at a time):
   ```
   "Joe's Dentistry" site:linkedin.com Miami
   "ABC Corp" site:linkedin.com Miami
   ... (13 more)
   ```
2. Send to Apify as SINGLE batch request (newline-separated)
3. Parse results to find LinkedIn URLs
   - Personal profiles: `linkedin.com/in/joe-smith`
   - Company pages: `linkedin.com/company/joes-dentistry`

**Output (per business)**:
```
{
  "business_id": "abc-123",
  "linkedin_url": "linkedin.com/company/joes-dentistry",
  "profile_type": "company"  // or "personal"
}
```

**Process 3 batches simultaneously** = 45 businesses at once!

**Typical results**: Finds LinkedIn for 30-50% of businesses

---

### **PHASE 2.5 STEP 2: LinkedIn Scraping**

**Input**: LinkedIn URLs from Step 1

**API**: Apify bebity LinkedIn Premium Actor

**Process** (PARALLEL BATCH):
1. Group by type:
   - Company pages: `linkedin.com/company/*`
   - Personal profiles: `linkedin.com/in/*`
2. Send batch request per type (15 URLs at once):
   ```javascript
   {
     "action": "get-companies",
     "keywords": [
       "linkedin.com/company/joes-dentistry",
       "linkedin.com/company/abc-corp",
       ... (13 more)
     ],
     "isUrl": true,
     "limit": 15
   }
   ```
3. Extract profile data

**Output (per profile)**:
```
{
  "url": "linkedin.com/company/joes-dentistry",
  "name": "Joe's Dentistry",
  "industry": "Medical Practice",
  "headline": "Premier dental care in Miami",
  "email": "contact@joesdentist.com",  // ← Rarely found directly
  "phone": "(555) 123-4567",
  "location": "Miami, FL",
  "connections": 500,
  "followerCount": 1200
}
```

**If no direct email found**, generate patterns:
```
{
  "emails_generated": [
    "joe@joesdentist.com",
    "joe.smith@joesdentist.com",
    "jsmith@joesdentist.com",
    "contact@joesdentist.com",
    "info@joesdentist.com"
  ]
}
```

**Data saved to**: `gmaps_linkedin_enrichments` table

**Typical results**:
- Direct emails: 0-10%
- Generated patterns: 90-100% (when person name available)

---

### **PHASE 2.5 STEP 3: Bouncer Email Verification**

**Input**: Emails from LinkedIn (direct or generated)

**API**: Bouncer.io Email Verification

**Process**:
1. For each email found/generated:
   - Verify deliverability via Bouncer API
   - Check MX records
   - Check SMTP connection
   - Detect disposable/role-based emails

**Output (per email)**:
```
{
  "email": "joe@joesdentist.com",
  "status": "deliverable",           // or "risky", "undeliverable"
  "score": 95,                       // 0-100
  "is_safe": true,
  "is_disposable": false,
  "is_role_based": false,            // Not "info@", "contact@"
  "is_free_email": false,            // Not Gmail, Yahoo
  "mx_records": ["mail.joesdentist.com"],
  "smtp_check": true,
  "reason": "accepted_email"
}
```

**Enrichment record updated**:
```
email_verified = true
bouncer_status = "deliverable"
bouncer_score = 95
is_safe = true
```

**Typical results**:
- Deliverable: 40-60%
- Risky: 20-30%
- Undeliverable: 20-40%

---

## **Complete Data Flow Diagram**

```
┌──────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN START                           │
│  Input: "Miami, FL" + "dentist, orthodontist"                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Google Maps Scraping (Apify)                         │
│  ─────────────────────────────────────────                      │
│  • AI selects 8 ZIP codes                                       │
│  • Scrape businesses for each ZIP                               │
│  • Extract: name, address, phone, website, rating               │
│  • SOMETIMES: email (20-30%), facebook_url (40-50%)             │
│  ─────────────────────────────────────────                      │
│  OUTPUT: 321 businesses in gmaps_businesses table               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2A: Facebook Enrichment - First Pass (Apify)            │
│  ──────────────────────────────────────────────────             │
│  • Filter: Businesses WITH facebook_url from Phase 1            │
│  • Scrape Facebook pages (batch: 15 at a time)                  │
│  • Extract emails from About section, posts                     │
│  • Update business.email, business.email_source = "facebook"    │
│  ──────────────────────────────────────────────────             │
│  OUTPUT: ~50% get emails from existing Facebook pages           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2B: Google Search for Facebook (Apify)                  │
│  ─────────────────────────────────────────                      │
│  • Filter: Businesses WITHOUT facebook_url                      │
│  • Google Search: "[Name]" site:facebook.com [City]            │
│  • Find Facebook URLs (batch: 15 at a time)                     │
│  • Update business.facebook_url for newly found pages           │
│  ─────────────────────────────────────────                      │
│  OUTPUT: ~40% get Facebook URLs discovered                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2C: Facebook Enrichment - Second Pass (Apify)           │
│  ──────────────────────────────────────────────────             │
│  • Filter: Businesses with newly found facebook_url             │
│  • Scrape newly discovered Facebook pages                       │
│  • Extract emails, update records                               │
│  ──────────────────────────────────────────────────             │
│  OUTPUT: Additional ~30% email discovery                        │
│                                                                  │
│  ════════════════════════════════════════════                   │
│  END OF PHASE 2: ~44% of businesses have emails                 │
│  ════════════════════════════════════════════                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.5 STEP 1: Google Search for LinkedIn (Apify)          │
│  ──────────────────────────────────────────────────────         │
│  • Process ALL 321 businesses (not just those without emails)   │
│  • Google Search: "[Name]" site:linkedin.com [City]            │
│  • PARALLEL BATCH: 3 batches of 15 simultaneously               │
│  • Find LinkedIn URLs (company pages or personal profiles)      │
│  ──────────────────────────────────────────────────────         │
│  OUTPUT: LinkedIn URLs for ~50% of businesses                   │
│  TIME: ~20 seconds for 45 businesses (3 batches parallel)       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.5 STEP 2: LinkedIn Scraping (Apify bebity)            │
│  ──────────────────────────────────────────────────────         │
│  • Group by type: company vs personal                           │
│  • Scrape LinkedIn profiles (batch: 15 URLs at once)            │
│  • PARALLEL BATCH: 3 batches simultaneously                     │
│  • Extract: name, title, location, connections                  │
│  • Rarely find direct email (0-10%)                             │
│  • Generate email patterns from name + website domain           │
│  ──────────────────────────────────────────────────────         │
│  OUTPUT: Enrichment data for ~50% (those with LinkedIn)         │
│  TIME: ~15 seconds for 45 businesses (3 batches parallel)       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.5 STEP 3: Bouncer Email Verification                  │
│  ──────────────────────────────────────────────────────         │
│  • For each email (direct or generated)                         │
│  • Verify deliverability: MX records, SMTP check                │
│  • Score 0-100, categorize: deliverable/risky/undeliverable    │
│  • Update linkedin_enrichments with verification results        │
│  ──────────────────────────────────────────────────────         │
│  OUTPUT: Verified emails with confidence scores                 │
│  TIME: ~2-5 seconds per email                                   │
│                                                                  │
│  ════════════════════════════════════════════                   │
│  END OF PHASE 2.5: Additional contact data from LinkedIn        │
│  ════════════════════════════════════════════                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      CAMPAIGN COMPLETE                           │
│  ──────────────────────────────────────────────                 │
│  Final Results (example):                                        │
│  • 321 businesses found                                          │
│  • 144 emails from Phases 1 & 2 (44.9%)                         │
│  • 126 Facebook pages found                                      │
│  • 160 LinkedIn profiles found                                   │
│  • 85 verified LinkedIn emails (additional potential contacts)   │
│  ──────────────────────────────────────────────                 │
│  Total cost: ~$3-4 (Google Maps + Facebook + LinkedIn + Bouncer)│
│  Total time: ~45 minutes (with parallel optimizations)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## **Email Source Tracking**

After all phases complete, each business has `email_source`:

| Source | Meaning | Typical % |
|--------|---------|-----------|
| `google_maps` | Found directly in Google Maps data | 20-30% |
| `facebook` | Extracted from Facebook page | 30-40% |
| `linkedin_direct` | Found in LinkedIn profile | 0-10% |
| `generated` | Pattern generated from LinkedIn name + domain | 10-20% |
| `not_found` | No email discovered | 20-30% |

---

## **Database Tables Updated**

### **Phase 1**:
- `gmaps_businesses` - Business records created
- `gmaps_campaign_coverage` - ZIP codes tracked

### **Phase 2**:
- `gmaps_facebook_enrichments` - Facebook scraping results
- `gmaps_businesses` - Email field updated

### **Phase 2.5**:
- `gmaps_linkedin_enrichments` - LinkedIn scraping results
- `gmaps_email_verifications` - Bouncer verification results
- `gmaps_businesses` - LinkedIn URL added

---

## **API Usage Summary (321 businesses)**

| Phase | API | Sequential Calls | Batch Calls | Parallel Batch Calls |
|-------|-----|------------------|-------------|---------------------|
| Phase 1 | Google Maps | 8 ZIP codes | 8 ZIP codes | 8 ZIP codes |
| Phase 2A | Facebook | 143 | 10 | 10 |
| Phase 2B | Google Search | 178 | 12 | 12 |
| Phase 2C | Facebook | 126 | 9 | 9 |
| **Phase 2.5 Step 1** | **Google Search** | **321** | **22** | **22** |
| **Phase 2.5 Step 2** | **LinkedIn** | **321** | **22** | **22** |
| **Phase 2.5 Step 3** | **Bouncer** | **~100** | **~100** | **~100** |
| **TOTAL** | | **~1097** | **~183** | **~183** |

**Parallel batch processes 3 batches at once**, so:
- Sequential batch: 22 batches × 40s = **880s = 15 min**
- Parallel batch: 8 rounds × 40s = **320s = 5.3 min**

---

## **Time Breakdown (Parallel Batch - 321 businesses)**

| Phase | Time | Description |
|-------|------|-------------|
| Phase 1 | ~15 min | Google Maps scraping (8 ZIP codes) |
| Phase 2A | ~3 min | Facebook enrichment (first pass) |
| Phase 2B | ~2 min | Google search for Facebook |
| Phase 2C | ~2 min | Facebook enrichment (second pass) |
| **Phase 2.5** | **~6 min** | **Google + LinkedIn + Bouncer** |
| **TOTAL** | **~28 min** | **Complete campaign** |

**Before optimization**: Phase 2.5 alone took 8-13 hours!

---

## **Summary**

The complete flow is:

1. **Google Maps** → Find businesses
2. **Facebook (first pass)** → Enrich businesses with existing Facebook URLs
3. **Google Search** → Find Facebook pages for remaining businesses
4. **Facebook (second pass)** → Enrich newly found Facebook pages
5. **Google Search** → Find LinkedIn profiles for ALL businesses (PARALLEL)
6. **LinkedIn Scraper** → Extract contact info from profiles (PARALLEL)
7. **Bouncer** → Verify emails are deliverable

**Result**: Comprehensive contact database with multi-source verification!
