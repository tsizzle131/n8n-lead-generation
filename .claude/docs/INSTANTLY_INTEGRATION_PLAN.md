# Instantly.ai Integration Plan
## Complete Research & Implementation Strategy

**Generated**: 2025-10-13
**Research Status**: ✅ Complete
**Approval Status**: 🟡 Pending Review

---

## Executive Summary

This document outlines a comprehensive integration plan between our lead generation platform and Instantly.ai's email campaign automation platform. The integration will enable automatic campaign creation, lead synchronization, and bi-directional engagement tracking.

### Current State
- **Lead Generation**: ✅ Fully operational (Google Maps, Facebook, LinkedIn enrichment)
- **Email Sending**: ❌ Not implemented (CSV export only)
- **Engagement Tracking**: ❌ Not implemented
- **AI Personalization**: ✅ Icebreakers and subject lines generated

### Target State
- **Lead Generation**: ✅ Unchanged (existing pipeline)
- **Email Sending**: ✅ Automated via Instantly.ai API
- **Engagement Tracking**: ✅ Real-time webhooks (opens, clicks, replies)
- **AI Personalization**: ✅ Enhanced with Instantly custom variables

---

## 1. System Architecture

### 1.1 Integration Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Lead Generation Platform                   │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Google Maps Scraping                              │
│  Phase 2: Facebook/LinkedIn Enrichment                      │
│  Phase 3: AI Icebreaker Generation                          │
│  Phase 4: ✨ NEW - Instantly.ai Export                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS POST
                     │ Bearer Token Auth
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Instantly.ai API v2                         │
├─────────────────────────────────────────────────────────────┤
│  • Create Campaign (with schedules & sequences)             │
│  • Bulk Add Leads (with custom variables)                   │
│  • Campaign Analytics                                        │
│  • Webhook Events (real-time)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Webhook POST
                     │ Event Notifications
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Webhook Receiver (New Endpoint)                 │
├─────────────────────────────────────────────────────────────┤
│  • /api/webhooks/instantly                                   │
│  • Event Processing: opens, clicks, replies                 │
│  • Database Updates: engagement tracking                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

1. **Export to Instantly** (User-triggered):
   - User completes campaign in lead generation platform
   - User clicks "Export to Instantly.ai" button
   - System creates campaign in Instantly with:
     - Campaign name & schedule
     - Email sequence template (with AI-generated icebreakers)
     - Bulk leads with custom variables
   - System saves Instantly campaign ID to database

2. **Real-Time Event Tracking** (Webhook-driven):
   - Instantly.ai sends webhook POST when events occur
   - Our webhook endpoint receives:
     - `email_sent` → Update sent count
     - `email_opened` → Track open timestamps
     - `link_clicked` → Track engagement
     - `reply_received` → Save reply text, mark as interested
   - Database updated in real-time

3. **Analytics Sync** (Polling fallback):
   - Periodic sync (hourly) to catch missed webhooks
   - GET campaign statistics from Instantly API
   - Update dashboard with latest metrics

---

## 2. Instantly.ai API Reference

### 2.1 Authentication

**Method**: Bearer Token
**Header**: `Authorization: Bearer <API_KEY>`
**Key Location**: User settings (stored in `.app-state.json`)

**Required Scopes**:
- `campaigns:create` - Create campaigns
- `campaigns:all` - Read campaign data
- `leads:all` - Add/manage leads
- `analytics:all` - Read analytics

### 2.2 Campaign Creation API

**Endpoint**: `POST https://api.instantly.ai/api/v2/campaigns`

**Required Fields**:
```json
{
  "name": "Campaign Name",
  "campaign_schedule": {
    "schedules": [
      {
        "name": "Business Hours",
        "timing": {
          "from": "09:00",
          "to": "17:00"
        },
        "days": {},
        "timezone": "America/Los_Angeles"
      }
    ]
  },
  "sequences": [
    {
      "step": 1,
      "subject": "{{subject_line}}",
      "body": "{{icebreaker}}\n\n[Your pitch here]",
      "delay_days": 0
    }
  ]
}
```

**Response**:
```json
{
  "id": "campaign_abc123",
  "name": "Campaign Name",
  "status": "active",
  "created_at": "2025-10-13T10:00:00Z"
}
```

### 2.3 Bulk Lead Import API

**Endpoint**: `POST https://api.instantly.ai/api/v2/leads`

**Request Body**:
```json
{
  "campaign_id": "campaign_abc123",
  "leads": [
    {
      "email": "contact@business.com",
      "first_name": "Acme Corp",
      "last_name": "Business",
      "company_name": "Acme Corp",
      "variables": {
        "icebreaker": "Hey - saw you're a cafe in Los Angeles with 4.8 stars...",
        "subject_line": "Quick Q for Acme Corp",
        "business_category": "cafe",
        "business_location": "Los Angeles, CA",
        "business_rating": "4.8",
        "business_reviews": "127"
      }
    }
  ]
}
```

**Custom Variables**:
- Type restrictions: `string | number | boolean | null`
- No nested objects or arrays
- Used in email templates with `{{variable_name}}` syntax
- **Our custom variables**:
  - `icebreaker` - AI-generated personalized opener
  - `subject_line` - AI-generated subject
  - `business_category` - Business type
  - `business_location` - City/state
  - `business_rating` - Star rating
  - `business_reviews` - Review count

### 2.4 Webhook Events

**Endpoint** (our server): `POST https://yourdomain.com/api/webhooks/instantly`

**Event Types**:
- `email_sent` - Email delivered
- `email_opened` - Recipient opened email
- `link_clicked` - Recipient clicked link
- `reply_received` - Recipient replied
- `auto_reply_received` - Auto-reply received
- `email_bounced` - Email bounced
- `lead_unsubscribed` - Lead unsubscribed
- `campaign_completed` - Campaign finished

**Payload Example**:
```json
{
  "timestamp": "2025-10-13T14:30:00Z",
  "event_type": "reply_received",
  "workspace_uuid": "workspace_123",
  "campaign_id": "campaign_abc123",
  "campaign_name": "LA Cafes Campaign",
  "lead_email": "contact@business.com",
  "reply_text": "Hi, yes I'm interested...",
  "reply_subject": "Re: Quick Q for Acme Corp",
  "reply_text_snippet": "Hi, yes I'm interested..."
}
```

---

## 3. Database Schema Changes

### 3.1 New Tables

#### `gmaps_instantly_campaigns`
Tracks Instantly.ai campaigns created from our platform.

```sql
CREATE TABLE gmaps_instantly_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES gmaps_campaigns(id) ON DELETE CASCADE,
  instantly_campaign_id TEXT NOT NULL,
  instantly_campaign_name TEXT NOT NULL,
  instantly_workspace_uuid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- active, paused, completed
  total_leads_exported INTEGER DEFAULT 0,

  -- Analytics (synced from Instantly)
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,

  last_synced_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(campaign_id, instantly_campaign_id)
);

CREATE INDEX idx_gmaps_instantly_campaigns_org ON gmaps_instantly_campaigns(organization_id);
CREATE INDEX idx_gmaps_instantly_campaigns_campaign ON gmaps_instantly_campaigns(campaign_id);
```

#### `gmaps_instantly_events`
Stores webhook events from Instantly.ai for detailed tracking.

```sql
CREATE TABLE gmaps_instantly_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  instantly_campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  business_id UUID REFERENCES gmaps_businesses(id) ON DELETE SET NULL,

  -- Event data
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_payload JSONB NOT NULL,

  -- For replies
  reply_text TEXT,
  reply_subject TEXT,

  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,

  UNIQUE(instantly_campaign_id, lead_email, event_type, event_timestamp)
);

CREATE INDEX idx_gmaps_instantly_events_org ON gmaps_instantly_events(organization_id);
CREATE INDEX idx_gmaps_instantly_events_campaign ON gmaps_instantly_events(instantly_campaign_id);
CREATE INDEX idx_gmaps_instantly_events_email ON gmaps_instantly_events(lead_email);
CREATE INDEX idx_gmaps_instantly_events_type ON gmaps_instantly_events(event_type);
CREATE INDEX idx_gmaps_instantly_events_processed ON gmaps_instantly_events(processed);
```

### 3.2 Schema Updates

#### `gmaps_businesses`
Add engagement tracking fields.

```sql
ALTER TABLE gmaps_businesses
ADD COLUMN instantly_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN instantly_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN instantly_clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN instantly_replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN instantly_reply_text TEXT,
ADD COLUMN instantly_engagement_score INTEGER DEFAULT 0; -- 0=none, 1=sent, 2=opened, 3=clicked, 4=replied
```

#### `gmaps_campaigns`
Add Instantly.ai export tracking.

```sql
ALTER TABLE gmaps_campaigns
ADD COLUMN exported_to_instantly BOOLEAN DEFAULT FALSE,
ADD COLUMN instantly_export_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN instantly_campaign_count INTEGER DEFAULT 0;
```

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal**: Database schema, API client, basic export

**Tasks**:
1. ✅ Run database migrations (new tables + schema updates)
2. ✅ Create `InstantlyClient` class (`lead_generation/modules/instantly_client.py`)
   - Authentication with Bearer token
   - Campaign creation method
   - Bulk lead import method
   - Error handling & retries
3. ✅ Add Instantly API key to settings UI (`simple-server.js`)
4. ✅ Create export endpoint: `POST /api/campaigns/:id/export-to-instantly`
5. ✅ Test with sample campaign (5-10 leads)

**Deliverables**:
- Working API client
- Database schema in place
- Manual export functionality

---

### Phase 2: UI Integration (Week 2)
**Goal**: Frontend integration, export workflow

**Tasks**:
1. ✅ Add "Export to Instantly" button to campaign details page
2. ✅ Create export configuration modal:
   - Campaign name (pre-filled)
   - Schedule settings (timezone, hours)
   - Email sequence template selector
3. ✅ Add export status indicator
4. ✅ Show Instantly campaign link after export
5. ✅ Handle export errors gracefully

**Deliverables**:
- Complete export UI workflow
- User can export campaigns with one click

---

### Phase 3: Webhook Integration (Week 3)
**Goal**: Real-time event tracking

**Tasks**:
1. ✅ Create webhook endpoint: `POST /api/webhooks/instantly`
   - Validate webhook signature (if provided by Instantly)
   - Parse event payload
   - Route to event handlers
2. ✅ Implement event handlers:
   - `email_sent` → Update `instantly_sent_at`
   - `email_opened` → Update `instantly_opened_at`, increment counter
   - `link_clicked` → Update `instantly_clicked_at`, increment counter
   - `reply_received` → Save reply text, update `instantly_replied_at`
3. ✅ Add webhook URL to Instantly dashboard (manual setup by user)
4. ✅ Create webhook event log viewer in UI
5. ✅ Test with webhook simulator

**Deliverables**:
- Real-time event tracking
- Reply management system
- Event log viewer

---

### Phase 4: Analytics & Polish (Week 4)
**Goal**: Dashboard, reporting, refinements

**Tasks**:
1. ✅ Create Instantly analytics dashboard:
   - Campaign performance metrics
   - Engagement funnel (sent → opened → clicked → replied)
   - Reply inbox
2. ✅ Implement polling fallback (hourly sync for missed webhooks)
3. ✅ Add export history to campaign view
4. ✅ Performance optimization:
   - Batch webhook processing
   - Database query optimization
   - Caching for analytics
5. ✅ Documentation:
   - User guide for Instantly integration
   - Troubleshooting guide
   - API reference

**Deliverables**:
- Complete analytics dashboard
- Polling fallback system
- User documentation

---

## 5. Technical Implementation Details

### 5.1 InstantlyClient Class

**File**: `/Users/tristanwaite/n8n test/lead_generation/modules/instantly_client.py`

```python
"""
Instantly.ai API Client
Handles campaign creation, lead import, and analytics sync
"""

import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

class InstantlyClient:
    """Client for Instantly.ai API v2"""

    BASE_URL = "https://api.instantly.ai/api/v2"

    def __init__(self, api_key: str):
        """Initialize client with API key"""
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def create_campaign(self, name: str, schedule: Dict[str, Any],
                       sequences: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create a new campaign in Instantly.ai

        Args:
            name: Campaign name
            schedule: Schedule configuration
            sequences: Email sequence steps

        Returns:
            Campaign details with ID
        """
        payload = {
            "name": name,
            "campaign_schedule": schedule,
            "sequences": sequences
        }

        response = self.session.post(
            f"{self.BASE_URL}/campaigns",
            json=payload,
            timeout=30
        )
        response.raise_for_status()

        return response.json()

    def bulk_add_leads(self, campaign_id: str,
                       leads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Add leads in bulk to a campaign

        Args:
            campaign_id: Instantly campaign ID
            leads: List of lead objects with email and custom variables

        Returns:
            Import results
        """
        payload = {
            "campaign_id": campaign_id,
            "leads": leads
        }

        # Instantly may have batch size limits - chunk if needed
        batch_size = 100
        results = []

        for i in range(0, len(leads), batch_size):
            batch = leads[i:i + batch_size]
            batch_payload = {
                "campaign_id": campaign_id,
                "leads": batch
            }

            response = self.session.post(
                f"{self.BASE_URL}/leads",
                json=batch_payload,
                timeout=60
            )
            response.raise_for_status()

            results.append(response.json())
            logging.info(f"Imported batch {i//batch_size + 1}: {len(batch)} leads")

        return {
            "total_leads": len(leads),
            "batches": len(results),
            "results": results
        }

    def get_campaign_analytics(self, campaign_id: str) -> Dict[str, Any]:
        """
        Get analytics for a campaign

        Args:
            campaign_id: Instantly campaign ID

        Returns:
            Analytics data
        """
        response = self.session.get(
            f"{self.BASE_URL}/campaigns/{campaign_id}/analytics",
            timeout=30
        )
        response.raise_for_status()

        return response.json()

    def format_lead_for_instantly(self, business: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format a business record for Instantly lead import

        Args:
            business: Business record from gmaps_businesses table

        Returns:
            Formatted lead object
        """
        return {
            "email": business["email"],
            "first_name": business.get("name", "Business"),
            "last_name": "Contact",
            "company_name": business.get("name", ""),
            "variables": {
                "icebreaker": business.get("icebreaker", ""),
                "subject_line": business.get("subject_line", ""),
                "business_category": business.get("category", ""),
                "business_location": f"{business.get('city', '')}, {business.get('state', '')}".strip(", "),
                "business_rating": str(business.get("rating", "")),
                "business_reviews": str(business.get("reviews_count", ""))
            }
        }
```

### 5.2 Express API Endpoint

**File**: `/Users/tristanwaite/n8n test/simple-server.js`

```javascript
// Export campaign to Instantly.ai
app.post('/api/campaigns/:campaignId/export-to-instantly', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      campaignName,
      schedule,
      emailTemplate
    } = req.body;

    // Get Instantly API key from app state
    const instantlyApiKey = appState.apiKeys?.instantly_api_key;
    if (!instantlyApiKey) {
      return res.status(400).json({
        error: 'Instantly.ai API key not configured'
      });
    }

    // Get campaign businesses with emails and icebreakers
    const businesses = await gmapsExport.getExportData(campaignId);
    const businessesWithEmails = businesses.filter(b => b.email);

    if (businessesWithEmails.length === 0) {
      return res.status(400).json({
        error: 'No businesses with emails to export'
      });
    }

    // Run Python script to export to Instantly
    const pythonScript = path.join(__dirname, 'lead_generation', 'scripts', 'export_to_instantly.py');
    const args = [
      pythonScript,
      '--campaign-id', campaignId,
      '--instantly-campaign-name', campaignName,
      '--schedule', JSON.stringify(schedule),
      '--email-template', JSON.stringify(emailTemplate),
      '--api-key', instantlyApiKey
    ];

    const result = await new Promise((resolve, reject) => {
      const process = spawn(pythonCmd, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(output));
        } else {
          reject(new Error(errorOutput || 'Export failed'));
        }
      });
    });

    // Update campaign record
    await gmapsCampaigns.update(campaignId, {
      exported_to_instantly: true,
      instantly_export_date: new Date().toISOString(),
      instantly_campaign_count: (await gmapsCampaigns.getById(campaignId)).instantly_campaign_count + 1
    });

    res.json({
      success: true,
      instantly_campaign_id: result.campaign_id,
      leads_exported: result.leads_exported,
      instantly_url: `https://app.instantly.ai/campaigns/${result.campaign_id}`
    });

  } catch (error) {
    console.error('Error exporting to Instantly:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Instantly events
app.post('/api/webhooks/instantly', async (req, res) => {
  try {
    const event = req.body;

    // Log event
    console.log(`[Instantly Webhook] ${event.event_type}:`, event.lead_email);

    // Save event to database
    await supabase.from('gmaps_instantly_events').insert({
      organization_id: appState.currentOrganization,
      instantly_campaign_id: event.campaign_id,
      event_type: event.event_type,
      lead_email: event.lead_email,
      event_timestamp: event.timestamp,
      event_payload: event,
      reply_text: event.reply_text || null,
      reply_subject: event.reply_subject || null
    });

    // Update business record based on event type
    const business = await supabase
      .from('gmaps_businesses')
      .select('id')
      .eq('email', event.lead_email)
      .single();

    if (business) {
      const updates = {};

      switch (event.event_type) {
        case 'email_sent':
          updates.instantly_sent_at = event.timestamp;
          updates.instantly_engagement_score = 1;
          break;
        case 'email_opened':
          updates.instantly_opened_at = event.timestamp;
          updates.instantly_engagement_score = Math.max(2, business.instantly_engagement_score || 0);
          break;
        case 'link_clicked':
          updates.instantly_clicked_at = event.timestamp;
          updates.instantly_engagement_score = Math.max(3, business.instantly_engagement_score || 0);
          break;
        case 'reply_received':
          updates.instantly_replied_at = event.timestamp;
          updates.instantly_reply_text = event.reply_text;
          updates.instantly_engagement_score = 4;
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('gmaps_businesses')
          .update(updates)
          .eq('id', business.id);
      }
    }

    // Update campaign analytics
    await _updateInstantlyCampaignStats(event.campaign_id);

    res.json({ success: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5.3 React UI Component

**File**: `/Users/tristanwaite/n8n test/frontend/src/components/GoogleMapsCampaigns.tsx`

```typescript
// Add export modal
const [showExportModal, setShowExportModal] = useState(false);
const [exportConfig, setExportConfig] = useState({
  campaignName: '',
  timezone: 'America/Los_Angeles',
  hoursFrom: '09:00',
  hoursTo: '17:00',
  emailTemplate: 'default'
});

const handleExportToInstantly = async (campaignId: string) => {
  setShowExportModal(true);
  setExportConfig({
    ...exportConfig,
    campaignName: `${campaign.name} - ${new Date().toISOString().split('T')[0]}`
  });
};

const confirmExport = async () => {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/export-to-instantly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignName: exportConfig.campaignName,
        schedule: {
          schedules: [{
            name: 'Business Hours',
            timing: {
              from: exportConfig.hoursFrom,
              to: exportConfig.hoursTo
            },
            days: {},
            timezone: exportConfig.timezone
          }]
        },
        emailTemplate: exportConfig.emailTemplate
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`Successfully exported ${result.leads_exported} leads to Instantly.ai!\n\nView campaign: ${result.instantly_url}`);
      setShowExportModal(false);
    } else {
      alert(`Export failed: ${result.error}`);
    }
  } catch (error) {
    alert(`Export error: ${error.message}`);
  }
};

// Add button to campaign actions
<Button
  onClick={() => handleExportToInstantly(campaign.id)}
  disabled={!campaign.total_emails_found}
>
  Export to Instantly.ai
</Button>
```

---

## 6. Cost Analysis

### 6.1 Instantly.ai Pricing
- **Instantly.ai**: Pay-as-you-go or subscription plans
  - Growth Plan: $30/month (1,000 leads)
  - Hypergrowth Plan: $77.6/month (5,000 leads)
  - Light Speed Plan: $286.3/month (25,000 leads)

### 6.2 Integration Costs
- **Development Time**: 4 weeks @ 2 developers = 320 hours
- **Hosting**: Minimal (webhook endpoint on existing infrastructure)
- **API Costs**: Included in Instantly.ai subscription

### 6.3 ROI Calculation
**Current Manual Process**:
- Export CSV: 5 minutes
- Import to email platform: 10 minutes
- Configure campaign: 15 minutes
- **Total**: 30 minutes per campaign

**With Integration**:
- Export to Instantly: 1 minute (one click)
- **Savings**: 29 minutes per campaign

**Break-even**: ~420 campaigns (320 hours / 29 minutes saved)

---

## 7. Security Considerations

### 7.1 API Key Management
- Store Instantly API key in encrypted `apiKeys` object in `.app-state.json`
- Never expose API key in frontend
- Rotate keys every 90 days

### 7.2 Webhook Security
- Validate webhook signature (if Instantly provides one)
- Rate limiting on webhook endpoint (max 1000 requests/hour)
- Log all webhook events for audit trail

### 7.3 Data Privacy
- Only export businesses with emails
- Respect opt-out preferences
- GDPR compliance: Allow users to delete data

---

## 8. Testing Strategy

### 8.1 Unit Tests
- `InstantlyClient` methods (mock API responses)
- Webhook event handlers
- Lead formatting logic

### 8.2 Integration Tests
- End-to-end export workflow (sandbox campaign)
- Webhook event processing
- Analytics sync

### 8.3 User Acceptance Testing
- Export 5-10 real campaigns
- Verify emails sent correctly
- Confirm webhook events received
- Check analytics accuracy

---

## 9. Rollout Plan

### 9.1 Beta Testing (Week 5)
- Enable for 5 pilot users
- Monitor for errors
- Gather feedback

### 9.2 Gradual Rollout (Week 6)
- Enable for 25% of users
- Monitor performance
- Fix issues

### 9.3 Full Release (Week 7)
- Enable for all users
- Announce feature
- Provide documentation

---

## 10. Success Metrics

### 10.1 Adoption Metrics
- % of campaigns exported to Instantly
- Average export time (target: <60 seconds)
- Export success rate (target: >95%)

### 10.2 Engagement Metrics
- Email open rate (target: >30%)
- Reply rate (target: >5%)
- Unsubscribe rate (target: <2%)

### 10.3 Technical Metrics
- Webhook delivery rate (target: >99%)
- API error rate (target: <1%)
- Average API response time (target: <2 seconds)

---

## 11. Future Enhancements

### 11.1 Short-term (3 months)
- Auto-reply detection and routing
- A/B testing for email templates
- Smart send time optimization

### 11.2 Medium-term (6 months)
- AI-powered reply classification (interested/not interested)
- Multi-touch sequences (follow-up emails)
- CRM integration (HubSpot, Salesforce)

### 11.3 Long-term (12 months)
- AI agents responding to emails automatically
- Predictive lead scoring
- Omnichannel outreach (email + LinkedIn + phone)

---

## 12. Next Steps

**Immediate Actions** (This Week):
1. ✅ Review this integration plan
2. ⏳ Get user approval for implementation
3. ⏳ Provision Instantly.ai account (if not already done)
4. ⏳ Schedule Phase 1 kickoff meeting

**Phase 1 Kickoff** (Next Week):
1. Run database migrations
2. Create `InstantlyClient` class
3. Build export endpoint
4. Test with sample campaign

---

## Appendix A: API Key Setup

**How to get Instantly.ai API key**:
1. Log in to Instantly.ai dashboard
2. Navigate to Settings → API Keys
3. Click "Generate New API Key"
4. Copy key and save to Lead Generation platform settings
5. Test connection with sample request

---

## Appendix B: Webhook Configuration

**How to configure webhooks in Instantly.ai**:
1. Log in to Instantly.ai dashboard
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/webhooks/instantly`
4. Select event types:
   - ✅ email_sent
   - ✅ email_opened
   - ✅ link_clicked
   - ✅ reply_received
   - ✅ email_bounced
5. Save configuration
6. Test webhook with "Send Test Event" button

---

## Appendix C: Email Template Variables

**Available variables in Instantly email templates**:
- `{{icebreaker}}` - AI-generated personalized opener
- `{{subject_line}}` - AI-generated subject line
- `{{business_category}}` - Business type (e.g., "cafe", "dentist")
- `{{business_location}}` - City and state
- `{{business_rating}}` - Star rating (e.g., "4.8")
- `{{business_reviews}}` - Review count (e.g., "127")

**Example template**:
```
Subject: {{subject_line}}

{{icebreaker}}

I help {{business_category}}s in {{business_location}} increase their online bookings by 40% in 90 days.

With {{business_reviews}} reviews and a {{business_rating}}-star rating, you clearly deliver great service. I'd love to show you how we can help even more customers find you.

Quick 15-minute call this week?

Best,
[Your Name]
```

---

**End of Integration Plan**
