# Bouncer Email Verification - Quick Reference Guide

## Overview

All emails from Google Maps, Facebook, and LinkedIn are now automatically verified using the Bouncer API during campaign execution.

---

## How It Works

### Automatic Verification

**No configuration needed** - verification happens automatically in each phase:

```python
# Phase 1: Google Maps
Google Maps scrape → Save businesses → Verify emails → Continue

# Phase 2: Facebook
Facebook enrich → Save enrichment → Verify emails → Continue

# Phase 2.5: LinkedIn
LinkedIn scrape → Save enrichment → Verify emails → Continue
```

### Verification Results

Each email is checked for:
- ✅ **Deliverability**: Can the email receive messages?
- ⚠️ **Risk Level**: Is it disposable, role-based, or risky?
- 📊 **Quality Score**: 0-100 score (70+ is safe)

---

## Verification Statuses

### Deliverable ✅
**Status**: `deliverable`
**Score**: 70-100
**Meaning**: Email is valid and safe to use
**Action**: Use for outreach

### Risky ⚠️
**Status**: `risky`
**Score**: 30-69
**Meaning**: Email might work but has risk factors:
- Disposable email (temp mail services)
- Role-based (info@, support@)
- Free provider (gmail, yahoo, etc.)
**Action**: Use with caution

### Undeliverable ❌
**Status**: `undeliverable`
**Score**: 0-29
**Meaning**: Email is invalid or won't accept messages
**Action**: Don't use

---

## Checking Verification Results

### Option 1: Campaign Logs

Look for verification messages in campaign execution logs:

```
Phase 1: GOOGLE MAPS SCRAPING
   ✅ Found 150 businesses
   📧 45 have emails
   ✅ 32 verified emails

Phase 2: FACEBOOK EMAIL ENRICHMENT
   ✅ Enriched 87 Facebook pages
   📧 Found 45 new emails
   ✅ Verified 32 Facebook emails

Phase 2.5: LINKEDIN ENRICHMENT
   🔗 LinkedIn profiles found: 67
   👤 New contacts found: 58
   ✅ Verified emails: 52
```

### Option 2: Database Query

Query `gmaps_email_verifications` table:

```sql
SELECT
    source,
    email,
    status,
    score,
    is_safe,
    bouncer_reason
FROM gmaps_email_verifications
WHERE campaign_id = 'your-campaign-id'
ORDER BY score DESC;
```

### Option 3: Export Data

Verified emails are included in campaign exports with verification status.

---

## Verification Fields

### In `gmaps_businesses` (Google Maps emails):
```
- email_verified: true/false
- bouncer_status: "deliverable" | "risky" | "undeliverable"
- bouncer_score: 0-100
- is_safe: true/false
- is_disposable: true/false
- is_role_based: true/false
- bouncer_verified_at: timestamp
```

### In `gmaps_facebook_enrichments` (Facebook emails):
```
- email_verified: true/false
- bouncer_status: "deliverable" | "risky" | "undeliverable"
- bouncer_score: 0-100
- is_safe: true/false
- (all same fields as above)
```

### In `gmaps_linkedin_enrichments` (LinkedIn emails):
```
- email_verified: true/false
- bouncer_status: "deliverable" | "risky" | "undeliverable"
- bouncer_score: 0-100
- is_safe: true/false
- (all same fields as above)
```

---

## Cost Tracking

### Bouncer Pricing
- **$5 per 1,000 verifications**
- Automatically tracked in `gmaps_api_costs` table
- Included in campaign total costs

### Example Costs

For a campaign with 500 businesses:
```
Google Maps emails: 100 found × $0.005 = $0.50
Facebook emails: 75 found × $0.005 = $0.38
LinkedIn emails: 150 found × $0.005 = $0.75
---
Total Bouncer cost: $1.63
```

---

## Filtering by Verification Status

### Get Only Safe Emails

```sql
-- Google Maps safe emails
SELECT email FROM gmaps_businesses
WHERE campaign_id = 'xxx'
AND is_safe = true;

-- Facebook safe emails
SELECT primary_email FROM gmaps_facebook_enrichments
WHERE campaign_id = 'xxx'
AND is_safe = true;

-- LinkedIn safe emails
SELECT primary_email FROM gmaps_linkedin_enrichments
WHERE campaign_id = 'xxx'
AND is_safe = true;
```

### Get All Verified Emails with Stats

```sql
SELECT
    source,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'deliverable' THEN 1 ELSE 0 END) as deliverable,
    SUM(CASE WHEN status = 'risky' THEN 1 ELSE 0 END) as risky,
    SUM(CASE WHEN status = 'undeliverable' THEN 1 ELSE 0 END) as undeliverable,
    ROUND(AVG(score), 1) as avg_score
FROM gmaps_email_verifications
WHERE campaign_id = 'your-campaign-id'
GROUP BY source;
```

---

## Troubleshooting

### Issue: No Emails Being Verified

**Check**:
1. Bouncer API key configured in `.env`
2. Campaign logs show verification attempts
3. Bouncer account has credits

**Fix**:
```bash
# Check .env file
cat .env | grep BOUNCER_API_KEY

# Test Bouncer connection
python -c "from lead_generation.modules.bouncer_verifier import BouncerVerifier; import os; from dotenv import load_dotenv; load_dotenv(); v = BouncerVerifier(os.getenv('BOUNCER_API_KEY')); print(v.test_connection())"
```

### Issue: Verifications Failing

**Check logs** for error messages:
- `❌ Invalid Bouncer API key` → Check API key
- `⚠️ Bouncer rate limit reached` → Wait or upgrade plan
- `Failed to verify email` → Individual email issue (continue)

### Issue: Verification Too Slow

**Normal**: ~1-2 seconds per email
**Slow**: >5 seconds per email

**Solutions**:
- Check internet connection
- Verify Bouncer API status
- Consider batch verification (future optimization)

---

## Best Practices

### 1. Use Only Safe Emails
Filter exports to only include `is_safe = true` emails for best deliverability.

### 2. Monitor Verification Rates
Track what % of emails pass verification by source:
- **Google Maps**: Usually 60-75% safe
- **Facebook**: Usually 70-80% safe
- **LinkedIn**: Usually 80-90% safe

### 3. Review Risky Emails
Risky emails can still work - review individually:
```sql
SELECT email, bouncer_reason
FROM gmaps_email_verifications
WHERE status = 'risky'
AND campaign_id = 'xxx';
```

### 4. Track Costs
Monitor Bouncer costs in campaign analytics:
```sql
SELECT SUM(cost_usd)
FROM gmaps_api_costs
WHERE service = 'bouncer'
AND campaign_id = 'xxx';
```

---

## Quick Tips

✅ **DO**:
- Use verified emails for outreach
- Filter by `is_safe = true`
- Review verification stats after each campaign
- Monitor Bouncer credit usage

❌ **DON'T**:
- Skip verification to save costs (wastes more on bounces)
- Use undeliverable emails
- Ignore risky email warnings
- Exceed Bouncer rate limits

---

## Support

### Bouncer Documentation
https://docs.usebouncer.com/

### Check Bouncer Credits
```python
from lead_generation.modules.bouncer_verifier import BouncerVerifier
import os
from dotenv import load_dotenv

load_dotenv()
verifier = BouncerVerifier(os.getenv('BOUNCER_API_KEY'))
stats = verifier.get_usage_stats()
print(f"Credits remaining: {stats['credits_remaining']}")
```

### Contact Support
- Bouncer: support@usebouncer.com
- System issues: Check campaign logs

---

**Last Updated**: 2025-10-10
**Version**: 1.0
