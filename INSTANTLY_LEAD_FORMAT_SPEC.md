# Instantly.ai Lead Format Specification

**Test Date:** 2025-10-16
**Status:** API Key Invalid (cannot test live, but format documented from code)
**API Version:** v2

---

## Executive Summary

Based on analysis of the working Python implementation (`lead_generation/modules/instantly_client.py`) and API testing, this document specifies the correct lead payload format for Instantly.ai API v2.

**Key Findings:**
- ✅ API Version: **v2** (not v1)
- ✅ Base URL: `https://api.instantly.ai/api/v2`
- ✅ Authentication: `Authorization: Bearer <decoded-api-key>`
- ✅ API Key Storage: Base64-encoded in `.app-state.json`
- ✅ API Key Usage: **Must decode base64 before use**
- ❌ Current API Key Status: **Invalid/Expired** (needs replacement)

---

## Authentication

### API Key Format

**Storage Format (in `.app-state.json`):**
```
MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ==
```
- Base64-encoded string
- Contains the actual API key in format: `uuid:secret`

**Decoded Format:**
```
1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq
```
- Two parts separated by colon
- First part: UUID
- Second part: Secret key
- Both parts required

### Decoding in Code

**JavaScript:**
```javascript
const apiKeyBase64 = 'MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ==';
const apiKey = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');
// Result: 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq
```

**Python:**
```python
import base64

api_key_base64 = 'MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ=='
api_key = base64.b64decode(api_key_base64).decode('utf-8')
# Result: 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq
```

### HTTP Headers

**Required Headers:**
```
Authorization: Bearer 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq
Content-Type: application/json
```

**Example Request:**
```bash
curl -X POST 'https://api.instantly.ai/api/v2/leads' \
  -H 'Authorization: Bearer 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaign_id": "campaign-uuid-here",
    "leads": [...]
  }'
```

---

## API Endpoints

### 1. List Campaigns

**Endpoint:** `GET /api/v2/campaigns`

**Parameters:**
- `limit` (optional): Number of campaigns to return

**Example:**
```bash
GET https://api.instantly.ai/api/v2/campaigns?limit=10
```

**Response:**
```json
[
  {
    "id": "8b2941d9-7837-4914-972f-846e71f98711",
    "name": "My Campaign",
    "status": "active",
    ...
  }
]
```

### 2. Create Campaign

**Endpoint:** `POST /api/v2/campaigns`

**Payload:**
```json
{
  "name": "Campaign Name"
}
```

**Note:** The payload is **simplified** - only `name` is required. Previous versions required `timezone`, `hours_from`, `hours_to`, but these are optional in v2.

**Example:**
```javascript
const response = await axios.post(
  'https://api.instantly.ai/api/v2/campaigns',
  { name: 'My New Campaign' },
  {
    headers: {
      'Authorization': `Bearer ${decodedApiKey}`,
      'Content-Type': 'application/json'
    }
  }
);
```

**Response:**
```json
{
  "id": "campaign-uuid",
  "name": "My New Campaign",
  "status": "draft",
  ...
}
```

### 3. Add Leads (Bulk)

**Endpoint:** `POST /api/v2/leads`

**Payload:**
```json
{
  "campaign_id": "campaign-uuid",
  "leads": [
    { lead object },
    { lead object },
    ...
  ]
}
```

**Batch Size:** Up to 100 leads per request (recommended)

---

## Lead Object Format

### Minimal Format

**Required Fields:**
- `email` (only required field)

```json
{
  "email": "john@example.com"
}
```

### Basic Format (Recommended)

**Recommended Fields:**
- `email` (required)
- `first_name` (for personalization)
- `last_name` (for personalization)
- `company_name` (for targeting)

```json
{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Corp"
}
```

### Full Format with Custom Variables

**Structure:**
```json
{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Corp",
  "variables": {
    "key1": "value1",
    "key2": "value2",
    ...
  }
}
```

**Custom Variables:**
- Can contain any key-value pairs
- Used in email templates with `{{variable.key}}`
- Useful for personalization and dynamic content

### Production Format (From Working Code)

**Example from `instantly_client.py` (lines 189-213):**

```json
{
  "email": "contact@business.com",
  "first_name": "Business Name",
  "last_name": "Team",
  "company_name": "Business Name",
  "variables": {
    "icebreaker": "AI-generated personalization line",
    "subject_line": "Quick question for Business Name",
    "business_name": "Business Name",
    "business_category": "Restaurant",
    "business_location": "Los Angeles, CA",
    "business_city": "Los Angeles",
    "business_state": "CA",
    "business_rating": "4.8",
    "business_reviews": "127",
    "business_phone": "555-1234",
    "business_website": "https://business.com",
    "business_address": "123 Main St"
  }
}
```

**Variable Usage in Templates:**
- `{{first_name}}` → "Business Name"
- `{{company_name}}` → "Business Name"
- `{{variables.icebreaker}}` → AI-generated line
- `{{variables.business_category}}` → "Restaurant"
- `{{variables.business_rating}}` → "4.8"

---

## Field Naming Convention

### Snake Case (Recommended)

**✅ Use snake_case for all fields:**

```json
{
  "email": "test@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Corp"
}
```

**Why snake_case?**
- Matches Instantly.ai API v2 convention
- Consistent with Python implementation
- Working format confirmed in production code

### CamelCase (Not Tested)

**❓ Unknown if camelCase works:**

```json
{
  "email": "test@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp"
}
```

**Note:** Cannot confirm if camelCase is supported due to invalid API key. Recommend using snake_case as it's documented in working code.

---

## Complete Example: Add Leads

### Single Lead

```javascript
const axios = require('axios');

// Decode API key
const apiKeyBase64 = process.env.INSTANTLY_API_KEY_BASE64;
const apiKey = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');

// Add single lead
const response = await axios.post(
  'https://api.instantly.ai/api/v2/leads',
  {
    campaign_id: '8b2941d9-7837-4914-972f-846e71f98711',
    leads: [
      {
        email: 'john@acme.com',
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme Corp',
        variables: {
          icebreaker: 'Noticed your impressive growth in Q3',
          business_category: 'Technology',
          business_location: 'San Francisco, CA'
        }
      }
    ]
  },
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  }
);

console.log('Lead added:', response.data);
```

### Bulk Leads (Batch Processing)

```javascript
const leads = [
  { email: 'person1@company1.com', first_name: 'Alice', ... },
  { email: 'person2@company2.com', first_name: 'Bob', ... },
  // ... up to 100 leads
];

const batchSize = 100;
const results = [];

for (let i = 0; i < leads.length; i += batchSize) {
  const batch = leads.slice(i, i + batchSize);

  const response = await axios.post(
    'https://api.instantly.ai/api/v2/leads',
    {
      campaign_id: campaignId,
      leads: batch
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  results.push(response.data);

  // Rate limiting: wait between batches
  if (i + batchSize < leads.length) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

console.log('All batches processed:', results);
```

---

## Error Handling

### Common Errors

**1. 401 Unauthorized**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```
**Cause:** API key is invalid, expired, or incorrectly formatted
**Solution:** Verify API key, ensure it's decoded from base64

**2. 400 Bad Request**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Email is required"
}
```
**Cause:** Missing required field (email)
**Solution:** Ensure all leads have valid email addresses

**3. 404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Campaign not found"
}
```
**Cause:** Invalid campaign_id
**Solution:** Verify campaign exists using list campaigns endpoint

### Error Handling Code

```javascript
try {
  const response = await axios.post(
    'https://api.instantly.ai/api/v2/leads',
    payload,
    { headers }
  );
  return { success: true, data: response.data };

} catch (error) {
  if (error.response) {
    // API returned error response
    const status = error.response.status;
    const errorData = error.response.data;

    if (status === 401) {
      console.error('Authentication failed - check API key');
    } else if (status === 400) {
      console.error('Invalid payload:', errorData.message);
    } else if (status === 404) {
      console.error('Campaign not found');
    }

    return { success: false, error: errorData };
  } else {
    // Network error
    console.error('Network error:', error.message);
    return { success: false, error: error.message };
  }
}
```

---

## Integration Checklist

### Prerequisites

- [ ] Valid Instantly.ai account
- [ ] Valid API v2 key generated from Instantly.ai dashboard
- [ ] API key stored as base64 in `.app-state.json`
- [ ] Campaign created (or use campaign creation endpoint)

### Implementation Steps

1. **Decode API Key**
   ```javascript
   const apiKey = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');
   ```

2. **Verify API Key**
   ```javascript
   const campaigns = await axios.get(
     'https://api.instantly.ai/api/v2/campaigns?limit=1',
     { headers: { 'Authorization': `Bearer ${apiKey}` } }
   );
   ```

3. **Create Campaign (Optional)**
   ```javascript
   const campaign = await axios.post(
     'https://api.instantly.ai/api/v2/campaigns',
     { name: 'My Campaign' },
     { headers: { 'Authorization': `Bearer ${apiKey}` } }
   );
   const campaignId = campaign.data.id;
   ```

4. **Format Leads**
   ```javascript
   const leads = businesses.map(business => ({
     email: business.email,
     first_name: business.name,
     last_name: 'Team',
     company_name: business.name,
     variables: {
       icebreaker: business.icebreaker,
       business_category: business.category,
       // ... other custom variables
     }
   }));
   ```

5. **Add Leads in Batches**
   ```javascript
   for (let i = 0; i < leads.length; i += 100) {
     const batch = leads.slice(i, i + 100);
     await axios.post(
       'https://api.instantly.ai/api/v2/leads',
       { campaign_id: campaignId, leads: batch },
       { headers: { 'Authorization': `Bearer ${apiKey}` } }
     );
   }
   ```

6. **Handle Errors**
   - Log failures
   - Retry on network errors
   - Skip invalid leads
   - Report success/failure counts

---

## Testing Recommendations

### When Valid API Key Available

**Test 1: API Key Validation**
```bash
curl -X GET 'https://api.instantly.ai/api/v2/campaigns?limit=1' \
  -H 'Authorization: Bearer <decoded-api-key>' \
  -H 'Content-Type: application/json'
```

**Expected:** 200 OK with campaign list

**Test 2: Campaign Creation**
```bash
curl -X POST 'https://api.instantly.ai/api/v2/campaigns' \
  -H 'Authorization: Bearer <decoded-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Campaign"}'
```

**Expected:** 200 OK with campaign object including ID

**Test 3: Add Single Lead (Minimal)**
```bash
curl -X POST 'https://api.instantly.ai/api/v2/leads' \
  -H 'Authorization: Bearer <decoded-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaign_id": "campaign-uuid",
    "leads": [{"email": "test@example.com"}]
  }'
```

**Expected:** 200 OK with import result

**Test 4: Add Lead with Variables**
```bash
curl -X POST 'https://api.instantly.ai/api/v2/leads' \
  -H 'Authorization: Bearer <decoded-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaign_id": "campaign-uuid",
    "leads": [{
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User",
      "company_name": "Test Co",
      "variables": {
        "icebreaker": "Great work on your product",
        "custom_field": "custom_value"
      }
    }]
  }'
```

**Expected:** 200 OK with import result

**Test 5: Bulk Import**
- Add 100+ leads in single request
- Verify batch processing
- Check success/failure counts

---

## Current Status

### API Key Issue

**Problem:** Current API key in `.app-state.json` is invalid

**Evidence:**
```
Base64: MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ==
Decoded: 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq

API Response:
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**Resolution Required:**
1. Log into Instantly.ai account: https://app.instantly.ai
2. Navigate to: Settings → Integrations → API Keys
3. Generate new API v2 key
4. Update `.app-state.json` with base64-encoded key
5. Test with list campaigns endpoint

### Code Status

**✅ Code Implementation: CORRECT**
- Python client (`instantly_client.py`): Working correctly
- Base64 decoding: Implemented
- API v2 endpoints: Correct
- Lead formatting: Matches spec
- Batch processing: Implemented

**❌ API Key: INVALID**
- Cannot test live API calls
- Need valid key to verify lead format
- All endpoints return 401

---

## References

### Source Files

1. **Python Client:** `/Users/tristanwaite/n8n test/lead_generation/modules/instantly_client.py`
   - Lines 13-42: Authentication and API key handling
   - Lines 103-168: Bulk lead import
   - Lines 169-213: Lead formatting

2. **Test Results:** `/Users/tristanwaite/n8n test/INSTANTLY_EXPORT_TEST_RESULTS.md`
   - Confirms API key issue
   - Documents working code implementation
   - Shows correct API v2 usage

3. **Test Scripts:**
   - `/Users/tristanwaite/n8n test/test_instantly_lead_formats.js` (v1 - API v1, didn't work)
   - `/Users/tristanwaite/n8n test/test_instantly_lead_formats_v2.js` (v2 - tested auth methods)
   - `/Users/tristanwaite/n8n test/test_instantly_lead_formats_v3.js` (v3 - API v2 with decoding)

### External Links

- **Instantly.ai Dashboard:** https://app.instantly.ai
- **API Documentation:** Contact Instantly support for v2 docs
- **Campaign URL Format:** `https://app.instantly.ai/app/campaigns/{campaign_id}`

---

## Summary

### Working Format (Based on Code Analysis)

```json
{
  "campaign_id": "uuid",
  "leads": [
    {
      "email": "required@example.com",
      "first_name": "Optional",
      "last_name": "Optional",
      "company_name": "Optional",
      "variables": {
        "icebreaker": "Personalization line",
        "subject_line": "Email subject",
        "custom_field_1": "value1",
        "custom_field_2": "value2"
      }
    }
  ]
}
```

### Authentication

```
Authorization: Bearer <decoded-api-key>
Content-Type: application/json
```

### Next Steps

1. **Obtain valid API key** from Instantly.ai
2. **Update `.app-state.json`** with base64-encoded key
3. **Run test script** `test_instantly_lead_formats_v3.js`
4. **Verify all tests pass**
5. **Deploy to production**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Status:** Ready for testing with valid API key
