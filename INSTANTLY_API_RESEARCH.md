# Instantly.ai API Research Summary

**Date:** 2025-10-16
**API Version:** v2
**Base URL:** `https://api.instantly.ai/api/v2`
**Documentation:** https://developer.instantly.ai/api/v2

---

## Executive Summary

Instantly.ai provides a REST API v2 that enables programmatic management of email campaigns, leads, accounts, analytics, and more. The API supports:

✅ **Campaign Management** - Create, update, activate, pause campaigns
✅ **Lead Management** - Add, update, delete leads in campaigns
✅ **Email Account Management** - Manage sending email accounts
✅ **Analytics & Reporting** - Get campaign performance metrics
✅ **Webhook Support** - Real-time email event notifications
✅ **Workspace Management** - Manage workspace settings

---

## Authentication

**Method:** Bearer Token Authentication

```bash
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Getting API Key:**
1. Login to Instantly.ai → Settings → Integrations → API Keys
2. Click "Create API Key"
3. Copy key (format: `{uuid}:{secret}`)

**Storage:** API keys in our system are base64-encoded in `.app-state.json`

---

## What We Can Do via API

### 1. Campaign Operations

#### ✅ Currently Implemented (in `instantly_client.py`)

**Create Campaign:**
```python
POST /api/v2/campaigns
{
  "name": "Campaign Name",
  "campaign_schedule": {
    "schedules": [{
      "name": "Business Hours",
      "timing": { "from": "09:00", "to": "17:00" },
      "days": {
        "monday": true, "tuesday": true, "wednesday": true,
        "thursday": true, "friday": true
      },
      "timezone": "America/Chicago"
    }]
  }
}
```

Returns: `{ id: "campaign-uuid", name: "...", ... }`

#### 🔄 Available but Not Yet Implemented

**Get Campaign Details:**
```bash
GET /api/v2/campaigns/{id}
```

**List All Campaigns:**
```bash
GET /api/v2/campaigns?limit=50&skip=0
```

**Update Campaign:**
```bash
PATCH /api/v2/campaigns/{id}
{
  "name": "Updated Campaign Name",
  "campaign_schedule": { ... }
}
```

**Activate Campaign:**
```bash
POST /api/v2/campaigns/{id}/activate
```

**Pause Campaign:**
```bash
POST /api/v2/campaigns/{id}/pause
```

**Delete Campaign:**
```bash
DELETE /api/v2/campaigns/{id}
```

---

### 2. Lead Operations

#### ✅ Currently Implemented

**Add Lead to Campaign:**
```python
POST /api/v2/leads
{
  "campaign_id": "campaign-uuid",
  "email": "lead@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Corp",
  "custom_variables": {
    "icebreaker": "Saw your recent product launch...",
    "subject_line": "Quick question for Acme",
    "business_name": "Acme Corp",
    "business_category": "Technology",
    "business_location": "San Francisco, CA",
    "business_rating": "4.8"
  }
}
```

**Bulk Import Strategy:**
- API requires **individual POST requests per lead** (no batch endpoint)
- Our implementation processes leads sequentially with 100ms delay
- Rate limiting: ~10 leads/second (600/minute) to avoid throttling

#### 🔄 Available but Not Yet Implemented

**Get Lead Details:**
```bash
GET /api/v2/leads/{id}
```

**List Campaign Leads:**
```bash
GET /api/v2/campaigns/{campaign_id}/leads?limit=100&skip=0
```

**Update Lead:**
```bash
PATCH /api/v2/leads/{id}
{
  "first_name": "Updated Name",
  "custom_variables": { ... }
}
```

**Delete Lead:**
```bash
DELETE /api/v2/leads/{id}
```

**Delete All Leads from Campaign:**
```bash
DELETE /api/v2/campaigns/{campaign_id}/leads
```

---

### 3. Email Account Management

**Purpose:** Manage the email accounts that send campaigns

#### 🔄 Available Endpoints

**List Email Accounts:**
```bash
GET /api/v2/accounts
```

**Add Email Account:**
```bash
POST /api/v2/accounts
{
  "email": "sender@yourdomain.com",
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "sender@yourdomain.com",
  "smtp_password": "password"
}
```

**Update Email Account:**
```bash
PATCH /api/v2/accounts/{id}
```

**Delete Email Account:**
```bash
DELETE /api/v2/accounts/{id}
```

**Warm Up Account:**
```bash
POST /api/v2/accounts/{id}/warmup
```

**Get Account Health:**
```bash
GET /api/v2/accounts/{id}/health
```

**Use Cases:**
- Monitor email account health
- Rotate accounts for sending
- Automate warmup processes
- Detect deliverability issues

---

### 4. Analytics & Reporting

**Purpose:** Track campaign performance metrics

#### 🔄 Available Endpoints

**Get Campaign Analytics:**
```bash
GET /api/v2/analytics?id={campaign_id}
```

**Response Data:**
```json
{
  "contacted_count": 1000,
  "open_count": 450,
  "reply_count": 85,
  "link_click_count": 120,
  "bounced_count": 15,
  "unsubscribed_count": 5,
  "open_rate": 45.0,
  "reply_rate": 8.5
}
```

**Get Workspace Analytics:**
```bash
GET /api/v2/analytics/workspace
```

**Get Lead Analytics:**
```bash
GET /api/v2/leads/{id}/analytics
```

**Use Cases:**
- Poll analytics hourly (background job)
- Calculate ROI metrics
- Track campaign performance over time
- Compare campaigns

---

### 5. Webhook Events (Real-time Notifications)

**Setup:** Configure webhook URL in Instantly Settings

**Webhook URL:** `https://yourdomain.com/webhook/instantly`

**Available Events:**
- `email_sent` - Email successfully sent
- `email_opened` - Lead opened email
- `reply_received` - Lead replied to email
- `link_clicked` - Lead clicked link in email
- `email_bounced` - Email bounced
- `lead_unsubscribed` - Lead unsubscribed
- `auto_reply_received` - Auto-reply received

**Webhook Payload Example:**
```json
{
  "event_type": "reply_received",
  "timestamp": "2025-10-16T10:30:00Z",
  "workspace": "workspace_id",
  "campaign_id": "campaign_id",
  "campaign_name": "Campaign Name",
  "lead_email": "lead@example.com",
  "email_account": "sender@yourdomain.com",
  "unibox_url": "https://app.instantly.ai/unibox/..."
}
```

**Implementation Requirements:**
- Validate webhook signatures (prevent spoofing)
- Respond within 500ms (Instantly requirement)
- Queue payload for async processing
- Handle idempotency (detect duplicates)

#### 🚨 Not Yet Implemented
Our system currently has **no webhook receiver** - this is a high-priority feature.

---

### 6. Workspace Management

**Purpose:** Manage workspace-level settings

#### 🔄 Available Endpoints

**Get Workspace Details:**
```bash
GET /api/v2/workspace
```

**Update Workspace:**
```bash
PATCH /api/v2/workspace
{
  "name": "Updated Workspace Name"
}
```

**Get Workspace Statistics:**
```bash
GET /api/v2/workspace/stats
```

---

### 7. Unibox (Inbox Management)

**Purpose:** Access and manage email replies

#### 🔄 Available Endpoints

**List Conversations:**
```bash
GET /api/v2/unibox/conversations?limit=50&skip=0
```

**Get Conversation Messages:**
```bash
GET /api/v2/unibox/conversations/{id}/messages
```

**Reply to Conversation:**
```bash
POST /api/v2/unibox/conversations/{id}/reply
{
  "message": "Thanks for your reply..."
}
```

**Mark as Read/Unread:**
```bash
PATCH /api/v2/unibox/conversations/{id}
{
  "read": true
}
```

**Use Cases:**
- Display replies in our UI
- Auto-categorize responses (AI)
- Track qualified leads
- Export conversations to CRM

---

## Campaign Workflow Capabilities

### Complete End-to-End Flow

**1. Create Campaign** → `POST /api/v2/campaigns` ✅ Implemented
**2. Add Email Accounts** → `POST /api/v2/accounts` (if needed)
**3. Import Leads** → `POST /api/v2/leads` (bulk) ✅ Implemented
**4. Activate Campaign** → `POST /api/v2/campaigns/{id}/activate` 🔄 Not yet
**5. Monitor Analytics** → `GET /api/v2/analytics` 🔄 Not yet
**6. Track Webhooks** → Webhook receiver 🚨 Not yet
**7. Manage Replies** → `GET /api/v2/unibox/conversations` 🔄 Not yet
**8. Pause/Resume** → `POST /api/v2/campaigns/{id}/pause` 🔄 Not yet

---

## Current Implementation Status

### ✅ What We Have (instantly_client.py)

```python
class InstantlyClient:
    ✅ create_campaign()           # Create campaign with schedule
    ✅ bulk_add_leads()            # Add leads one-by-one (with rate limiting)
    ✅ format_lead_for_instantly() # Map business data to Instantly format
    ✅ export_campaign()           # Complete export workflow
```

**Working Features:**
- Create campaigns with business hour schedules
- Export leads with custom variables (icebreakers, subject lines)
- Handle rate limiting (100ms delay between requests)
- Error handling and retry logic
- Progress logging

### 🔄 What's Missing (High Priority)

1. **Campaign Management**
   - Get campaign details
   - List all campaigns
   - Update campaign settings
   - Activate/pause campaigns
   - Delete campaigns

2. **Lead Management**
   - Get lead details
   - List campaign leads
   - Update lead information
   - Delete leads

3. **Analytics Polling**
   - Fetch campaign analytics
   - Calculate engagement rates
   - Store metrics in database

4. **Webhook Integration** 🚨 **CRITICAL**
   - Webhook receiver endpoint
   - Signature validation
   - Event processing
   - Database updates

5. **Email Account Management**
   - List accounts
   - Monitor account health
   - Detect deliverability issues

6. **Unibox/Reply Management**
   - Fetch conversations
   - Display replies in UI
   - Reply categorization

---

## API Constraints & Limitations

### Rate Limits
- **Not explicitly documented** in Instantly API v2
- **Assume industry standard:** 100-300 requests/minute
- **Our implementation:** ~600 leads/minute (100ms delay)
- **Strategy:** Exponential backoff on 429 errors

### Custom Variables
- ✅ Supported types: `string`, `number`, `boolean`, `null`
- ❌ NOT supported: `objects`, `arrays`
- **Max name length:** ~50-100 characters (undocumented)
- **Max value length:** ~500-1000 characters (undocumented)

### Bulk Import
- ❌ **No batch endpoint** for leads (as of v2)
- Must use individual POST requests
- Workaround: Sequential processing with rate limiting

### Webhook Signature
- **Validation method:** HMAC SHA256 (likely - check docs)
- **Response time requirement:** < 500ms
- Must acknowledge webhook immediately

---

## Data Mapping: Our System → Instantly

### Lead Format

**From gmaps_businesses table:**
```javascript
{
  name: "Acme Cafe",
  email: "contact@acmecafe.com",
  category: "cafe",
  city: "Los Angeles",
  state: "CA",
  rating: 4.8,
  reviews_count: 127,
  icebreaker: "Saw you have 4.8 stars in LA...",
  subject_line: "Quick Q for Acme Cafe"
}
```

**To Instantly lead:**
```json
{
  "email": "contact@acmecafe.com",
  "first_name": "Acme Cafe",
  "last_name": "Team",
  "company_name": "Acme Cafe",
  "custom_variables": {
    "icebreaker": "Saw you have 4.8 stars in LA...",
    "subject_line": "Quick Q for Acme Cafe",
    "business_name": "Acme Cafe",
    "business_category": "cafe",
    "business_location": "Los Angeles, CA",
    "business_city": "Los Angeles",
    "business_state": "CA",
    "business_rating": "4.8",
    "business_reviews": "127",
    "business_phone": "+1-555-1234",
    "business_website": "https://acmecafe.com",
    "business_address": "123 Main St, Los Angeles, CA"
  }
}
```

### Using Custom Variables in Email Templates

In Instantly email templates, reference custom variables as:
```
Hi {{first_name}},

{{icebreaker}}

I noticed {{business_name}} has a {{business_rating}} star rating with
{{business_reviews}} reviews in {{business_location}}. Impressive!

Best,
Your Name

P.S. - {{subject_line}}
```

---

## Integration Architecture Recommendations

### Hybrid Sync Pattern (from INSTANTLY_INTEGRATION_PLAN.md)

**Push on Demand:**
- User clicks "Export to Instantly" → Create campaign + Add leads

**Pull on Schedule:**
- Background job polls analytics every 1 hour
- Updates aggregate metrics in database

**Real-time Events:**
- Webhook notifications for email events
- Instant updates to lead engagement status

### Database Schema Needed

**New Tables:**
1. `instantly_api_keys` - Store encrypted API keys per organization
2. `instantly_campaigns` - Map gmaps_campaigns → instantly campaigns
3. `instantly_email_events` - Store webhook events
4. `instantly_export_logs` - Audit trail for exports

**Modified Tables:**
1. `gmaps_businesses` - Add email engagement fields:
   - `email_sent_at`
   - `email_opened_at`
   - `email_replied_at`
   - `reply_count`
   - `email_status`

---

## Performance Benchmarks

### Export Performance (from testing)

**1,000 Leads:**
- Time: ~2 minutes (with 100ms delay)
- Success rate: 95%+ (5% fail for invalid emails)

**10,000 Leads:**
- Time: ~20 minutes
- Recommendation: Show progress bar to user

### Webhook Processing
- **Target:** < 500ms response time
- **Strategy:** Immediate ack → Queue for async processing

### Analytics Sync
- **Frequency:** Every 1 hour
- **Batch size:** 50 campaigns per run
- **Time per campaign:** ~2-3 seconds

---

## Security Considerations

1. **API Key Encryption**
   - Store keys encrypted in database
   - Use AES-256 encryption
   - Encryption key in environment variables

2. **Webhook Validation**
   - Validate HMAC signature on all webhook payloads
   - Prevent replay attacks (timestamp check)
   - Rate limit webhook endpoint

3. **Organization Isolation**
   - RLS policies on all new tables
   - API keys scoped to organization
   - No cross-org data access

---

## Next Steps: Implementation Priorities

### Phase 1: Foundation (Week 1-2) ✅ MOSTLY COMPLETE
- [x] Create campaign endpoint
- [x] Add leads to campaign
- [x] Lead data formatting
- [ ] API key management in Settings UI
- [ ] "Export to Instantly" button in UI

### Phase 2: Webhook Integration (Week 3-4) 🚨 HIGH PRIORITY
- [ ] Webhook receiver endpoint (`POST /webhook/instantly`)
- [ ] Signature validation
- [ ] Event processing and database updates
- [ ] Real-time engagement metrics in UI

### Phase 3: Analytics Polling (Week 5-6) 🔄 MEDIUM PRIORITY
- [ ] Background analytics sync job
- [ ] Campaign performance dashboard
- [ ] ROI calculations
- [ ] Email reply viewer

### Phase 4: Advanced Features (Future)
- [ ] Campaign activation/pausing from UI
- [ ] Email account health monitoring
- [ ] Reply classification (AI)
- [ ] A/B testing support

---

## Resources

**Official Documentation:**
- API v2 Docs: https://developer.instantly.ai/api/v2
- Help Center: https://help.instantly.ai/en/articles/10432807-api-v2

**Our Documentation:**
- Integration Plan: `/docs/INSTANTLY_INTEGRATION_PLAN.md`
- Quick Reference: `/INSTANTLY_QUICK_REFERENCE.md`
- Lead Format Spec: `/INSTANTLY_LEAD_FORMAT_SPEC.md`

**Code:**
- Python Client: `/lead_generation/modules/instantly_client.py`
- Test Results: `/INSTANTLY_EXPORT_TEST_RESULTS.md`

---

## Conclusion

**What We Can Do:**
✅ Create campaigns programmatically
✅ Export leads in bulk with custom variables
✅ Track basic campaign information

**What We're Missing:**
🔄 Campaign management (activate, pause, update)
🔄 Analytics polling (engagement metrics)
🚨 **Webhook integration (CRITICAL for real-time tracking)**
🔄 Reply management (view and respond to leads)
🔄 Email account monitoring

**Recommendation:**
Prioritize **webhook integration** (Phase 2) to enable real-time email tracking. This is the most valuable feature for users and differentiates our platform from competitors.

The Instantly.ai API v2 provides all the capabilities needed to build a complete end-to-end email outreach platform. Current implementation handles the core export workflow well, but we need webhook support to deliver the full value proposition.

---

**Last Updated:** 2025-10-16
**Next Review:** After webhook implementation
