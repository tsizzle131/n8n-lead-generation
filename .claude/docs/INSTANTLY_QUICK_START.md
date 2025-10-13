# Instantly.ai Integration - Quick Start Guide

**Created**: 2025-10-13
**Status**: ✅ Research Complete | ⏳ Ready for Implementation

---

## What This Integration Does

Automatically exports your lead generation campaigns to Instantly.ai for email outreach, with real-time engagement tracking via webhooks.

**Before**: Export CSV → Manual import → Configure campaign → No tracking
**After**: One-click export → Auto-configured campaign → Real-time engagement analytics

---

## How It Works

```
Your Campaign (with emails & icebreakers)
    ↓
Click "Export to Instantly.ai" button
    ↓
System creates Instantly campaign with:
    • AI-generated icebreakers as email content
    • Custom variables (rating, location, category)
    • Business hours schedule
    ↓
Instantly sends emails to your leads
    ↓
Webhooks track: opens, clicks, replies
    ↓
Dashboard shows real-time engagement
```

---

## Key Features

### 1. One-Click Export
- Export entire campaign to Instantly with one button
- Auto-populated campaign name, schedule, leads
- Uses your AI-generated icebreakers as email content

### 2. Custom Variables
Your AI icebreakers + business data passed as variables:
- `{{icebreaker}}` - Personalized opener
- `{{subject_line}}` - AI-generated subject
- `{{business_category}}` - Business type
- `{{business_location}}` - City/state
- `{{business_rating}}` - Star rating
- `{{business_reviews}}` - Review count

### 3. Real-Time Tracking
Webhooks update your dashboard when:
- ✉️ Email sent
- 👀 Email opened
- 🖱️ Link clicked
- 💬 Reply received

### 4. Analytics Dashboard
View campaign performance:
- Engagement funnel (sent → opened → clicked → replied)
- Reply inbox
- Best performing icebreakers

---

## Implementation Timeline

**Total**: 4 weeks, 2 developers

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1 | Database + API client + Export endpoint |
| Phase 2 | Week 2 | UI integration + Export workflow |
| Phase 3 | Week 3 | Webhooks + Event tracking |
| Phase 4 | Week 4 | Analytics + Polish |

---

## Prerequisites

1. **Instantly.ai Account**
   - Growth plan or higher recommended
   - API key (get from Settings → API Keys)

2. **Technical Setup**
   - Python module: `instantly_client.py` (to be created)
   - Database migrations (2 new tables, 2 schema updates)
   - Webhook endpoint (publicly accessible URL)

3. **User Configuration**
   - Add Instantly API key to platform settings
   - Configure webhook URL in Instantly dashboard

---

## Database Changes

### New Tables
1. **`gmaps_instantly_campaigns`** - Track exported campaigns
2. **`gmaps_instantly_events`** - Store webhook events

### Updated Tables
1. **`gmaps_businesses`** - Add engagement fields (sent_at, opened_at, clicked_at, replied_at)
2. **`gmaps_campaigns`** - Add export tracking (exported_to_instantly, export_date)

---

## API Endpoints

### Instantly.ai API (External)
- `POST /api/v2/campaigns` - Create campaign
- `POST /api/v2/leads` - Bulk add leads
- `GET /api/v2/campaigns/:id/analytics` - Get stats

### Our Platform (New)
- `POST /api/campaigns/:id/export-to-instantly` - Export campaign
- `POST /api/webhooks/instantly` - Receive webhook events
- `GET /api/campaigns/:id/instantly-analytics` - Get engagement data

---

## Cost Analysis

### Development
- 4 weeks × 2 developers = 320 hours
- Break-even: ~420 campaigns (saves 29 minutes per campaign)

### Instantly.ai Plans
- Growth: $30/month (1,000 leads)
- Hypergrowth: $77.60/month (5,000 leads)
- Light Speed: $286.30/month (25,000 leads)

---

## Security

1. **API Key Storage**: Encrypted in `.app-state.json`
2. **Webhook Validation**: Signature verification (if provided)
3. **Rate Limiting**: 1,000 webhooks/hour max
4. **GDPR Compliance**: User data deletion support

---

## Testing Plan

### Phase 1 Testing
- ✅ API client unit tests
- ✅ Export with 5-10 test leads
- ✅ Verify campaign created in Instantly

### Phase 2 Testing
- ✅ UI workflow end-to-end
- ✅ Error handling (missing API key, no emails, etc.)

### Phase 3 Testing
- ✅ Webhook event processing
- ✅ Database updates from events
- ✅ Event log viewer

### Phase 4 Testing
- ✅ Analytics dashboard accuracy
- ✅ Polling fallback (for missed webhooks)
- ✅ Performance with 10,000+ leads

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Export success rate | >95% |
| Webhook delivery rate | >99% |
| API response time | <2 seconds |
| Email open rate | >30% |
| Reply rate | >5% |

---

## Next Steps

**To Start Implementation**:

1. **Read the full plan**:
   - See `.claude/docs/INSTANTLY_INTEGRATION_PLAN.md`

2. **Run Phase 1 tasks**:
   ```bash
   # 1. Apply database migrations
   cd migrations && psql $DATABASE_URL < instantly_integration.sql

   # 2. Create Python API client
   touch lead_generation/modules/instantly_client.py

   # 3. Add export endpoint to simple-server.js
   # 4. Test with sample campaign
   ```

3. **Get user approval**:
   - Review integration plan
   - Confirm budget and timeline
   - Provision Instantly account

---

## Support Resources

- **Full Implementation Plan**: `.claude/docs/INSTANTLY_INTEGRATION_PLAN.md`
- **Instantly.ai API Docs**: https://developer.instantly.ai/
- **Webhook Events Reference**: https://developer.instantly.ai/webhook-events

---

**Ready to implement?** Start with Phase 1 in the full integration plan.
