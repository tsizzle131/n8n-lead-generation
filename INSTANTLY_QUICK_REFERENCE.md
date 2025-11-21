# Instantly.ai Quick Reference Guide

**Quick access to the correct lead format for Instantly.ai API v2**

---

## TL;DR

### Working Payload

```javascript
POST https://api.instantly.ai/api/v2/leads

Headers:
  Authorization: Bearer <decoded-api-key>
  Content-Type: application/json

Body:
{
  "campaign_id": "uuid",
  "leads": [
    {
      "email": "required@example.com",
      "first_name": "Optional",
      "last_name": "Optional",
      "company_name": "Optional",
      "variables": {
        "icebreaker": "Custom personalization",
        "any_custom_field": "any_value"
      }
    }
  ]
}
```

### API Key Handling

```javascript
// Stored as base64 in .app-state.json
const apiKeyBase64 = 'MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ==';

// Must decode before use
const apiKey = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');
// Result: 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq

// Use in Authorization header
headers: {
  'Authorization': `Bearer ${apiKey}`
}
```

---

## Required vs Optional Fields

### Required ✅
- `email` - Only required field

### Recommended 📝
- `first_name` - For personalization
- `last_name` - For personalization
- `company_name` - For targeting

### Optional 🎨
- `variables` - Object with any custom key-value pairs

---

## Field Naming

**Use snake_case** (confirmed working):
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme"
}
```

**Not camelCase** (untested):
```json
{
  "firstName": "John",  // Unknown if supported
  "lastName": "Doe",
  "companyName": "Acme"
}
```

---

## Complete Examples

### Minimal (Email Only)

```json
{
  "campaign_id": "8b2941d9-7837-4914-972f-846e71f98711",
  "leads": [
    {
      "email": "john@example.com"
    }
  ]
}
```

### Basic (With Names)

```json
{
  "campaign_id": "8b2941d9-7837-4914-972f-846e71f98711",
  "leads": [
    {
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "company_name": "Acme Corp"
    }
  ]
}
```

### Full (With Variables)

```json
{
  "campaign_id": "8b2941d9-7837-4914-972f-846e71f98711",
  "leads": [
    {
      "email": "john@acme.com",
      "first_name": "John",
      "last_name": "Doe",
      "company_name": "Acme Corp",
      "variables": {
        "icebreaker": "Love your recent product launch",
        "subject_line": "Quick question for Acme",
        "business_category": "Technology",
        "business_location": "San Francisco, CA",
        "business_rating": "4.8",
        "business_phone": "555-1234",
        "business_website": "https://acme.com"
      }
    }
  ]
}
```

---

## JavaScript Implementation

### Complete Example

```javascript
const axios = require('axios');

// 1. Decode API key
const apiKeyBase64 = process.env.INSTANTLY_API_KEY_BASE64;
const apiKey = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');

// 2. Prepare payload
const payload = {
  campaign_id: '8b2941d9-7837-4914-972f-846e71f98711',
  leads: [
    {
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Acme Corp',
      variables: {
        icebreaker: 'Impressed by your recent growth',
        business_category: 'Technology'
      }
    }
  ]
};

// 3. Make request
try {
  const response = await axios.post(
    'https://api.instantly.ai/api/v2/leads',
    payload,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error.response?.data || error.message);
}
```

### Bulk Import (Batched)

```javascript
async function bulkImport(campaignId, leads, batchSize = 100) {
  const results = [];

  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);

    try {
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

      results.push({
        success: true,
        batch: i / batchSize + 1,
        count: batch.length,
        data: response.data
      });

    } catch (error) {
      results.push({
        success: false,
        batch: i / batchSize + 1,
        count: batch.length,
        error: error.response?.data || error.message
      });
    }

    // Rate limiting
    if (i + batchSize < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Usage
const results = await bulkImport(campaignId, myLeads, 100);
console.log(`Imported ${results.filter(r => r.success).length}/${results.length} batches`);
```

---

## Python Implementation

### Complete Example

```python
import requests
import base64

# 1. Decode API key
api_key_base64 = 'MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ=='
api_key = base64.b64decode(api_key_base64).decode('utf-8')

# 2. Prepare request
url = 'https://api.instantly.ai/api/v2/leads'
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

payload = {
    'campaign_id': '8b2941d9-7837-4914-972f-846e71f98711',
    'leads': [
        {
            'email': 'john@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'company_name': 'Acme Corp',
            'variables': {
                'icebreaker': 'Impressed by your recent growth',
                'business_category': 'Technology'
            }
        }
    ]
}

# 3. Make request
response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    print('Success:', response.json())
else:
    print('Error:', response.status_code, response.json())
```

---

## Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```
**Fix:** Check API key is valid and properly decoded

### 400 Bad Request
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Email is required"
}
```
**Fix:** Ensure all leads have `email` field

### 404 Not Found
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Campaign not found"
}
```
**Fix:** Verify `campaign_id` is correct

---

## Testing Commands

### Test API Key

```bash
# Decode key
echo "MWRhZDJmYzAtOWJmNC00MmZhLTlmODctZjEzODQzM2IzMGM1OkZCbXNDYldVbElFcQ==" | base64 -d
# Output: 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq

# Test with list campaigns
curl -X GET 'https://api.instantly.ai/api/v2/campaigns?limit=1' \
  -H 'Authorization: Bearer 1dad2fc0-9bf4-42fa-9f87-f138433b30c5:FBmsCbWUlIEq' \
  -H 'Content-Type: application/json'
```

### Add Test Lead

```bash
curl -X POST 'https://api.instantly.ai/api/v2/leads' \
  -H 'Authorization: Bearer <decoded-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaign_id": "8b2941d9-7837-4914-972f-846e71f98711",
    "leads": [
      {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "company_name": "Test Co"
      }
    ]
  }'
```

---

## Checklist

Before deploying to production:

- [ ] API key is valid (test with list campaigns)
- [ ] API key is base64-decoded before use
- [ ] Using API v2 endpoints (`/api/v2/`)
- [ ] Authorization header includes "Bearer "
- [ ] All leads have `email` field
- [ ] Using snake_case for field names
- [ ] Batch size is 100 or less
- [ ] Error handling implemented
- [ ] Rate limiting between batches
- [ ] Testing with small batch first

---

## Quick Links

- **API Base URL:** https://api.instantly.ai/api/v2
- **Dashboard:** https://app.instantly.ai
- **Campaign URL:** https://app.instantly.ai/app/campaigns/{campaign_id}

## Documentation

- **Full Spec:** `INSTANTLY_LEAD_FORMAT_SPEC.md`
- **Test Results:** `TEST_RESULTS_LEAD_FORMAT.md`
- **Working Code:** `lead_generation/modules/instantly_client.py`

---

**Last Updated:** 2025-10-16
**Status:** Ready for use with valid API key
