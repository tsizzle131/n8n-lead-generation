# Stored Functions Quick Reference Card

## Quick Function Lookup

| Function | When to Use | Returns | Critical? |
|----------|------------|---------|-----------|
| `create_campaign_with_coverage` | Creating new campaign | Campaign ID + ZIP count | No |
| `insert_businesses_batch` | After scraping businesses | Insert/update counts | No |
| `update_campaign_statistics` | After bulk operations | Updated totals | Yes |
| `track_campaign_cost` | After API calls | New cost total | **CRITICAL** |
| `update_coverage_status` | After scraping ZIP | Success status | No |
| `update_enrichment_batch` | After Facebook/LinkedIn | Update counts | No |
| `update_email_verification` | After Bouncer check | Verification status | No |
| `get_businesses_for_enrichment` | Need enrichment list | Business records | No |

## JavaScript Quick Examples

### Create Campaign
```javascript
const result = await supabase.rpc('create_campaign_with_coverage', {
    p_campaign_data: {
        name: 'My Campaign',
        keywords: ['dentist'],
        location: 'Los Angeles, CA'
    },
    p_zip_codes: [
        { zip_code: '90001', keywords: ['dentist'], max_results: 200 }
    ]
});
// Returns: { success: true, campaign_id: '...', zip_count: 1 }
```

### Save Businesses
```javascript
const result = await supabase.rpc('insert_businesses_batch', {
    p_campaign_id: campaignId,
    p_zip_code: '90001',
    p_businesses: [
        {
            place_id: 'ChIJ...',
            name: 'Business Name',
            email: 'contact@business.com',
            phone: '(555) 123-4567'
        }
    ]
});
// Returns: { success: true, inserted: 45, updated: 5, skipped: 0 }
```

### Track Cost (CRITICAL)
```javascript
const result = await supabase.rpc('track_campaign_cost', {
    p_campaign_id: campaignId,
    p_service: 'google_maps',
    p_items_processed: 100,
    p_cost_usd: 7.50,
    p_metadata: { zip_code: '90001', run_id: 'abc123' }
});
// Returns: { success: true, cost_id: '...', new_total: 107.50 }
```

### Update Statistics
```javascript
const result = await supabase.rpc('update_campaign_statistics', {
    p_campaign_id: campaignId
});
// Returns: { success: true, total_businesses: 1250, total_emails: 875 }
```

### Get Businesses for Enrichment
```javascript
const result = await supabase.rpc('get_businesses_for_enrichment', {
    p_campaign_id: campaignId,
    p_enrichment_type: 'facebook',
    p_limit: 100,
    p_offset: 0
});
// Returns: Array of business records
```

## Python Quick Examples

### Create Campaign
```python
result = manager._call_stored_function('create_campaign_with_coverage', {
    'p_campaign_data': {
        'name': 'My Campaign',
        'keywords': ['dentist'],
        'location': 'Los Angeles, CA'
    },
    'p_zip_codes': [
        {'zip_code': '90001', 'keywords': ['dentist'], 'max_results': 200}
    ]
})
# Returns: {'success': True, 'campaign_id': '...', 'zip_count': 1}
```

### Save Businesses
```python
result = manager._call_stored_function('insert_businesses_batch', {
    'p_campaign_id': campaign_id,
    'p_zip_code': '90001',
    'p_businesses': [
        {
            'place_id': 'ChIJ...',
            'name': 'Business Name',
            'email': 'contact@business.com',
            'phone': '(555) 123-4567'
        }
    ]
}, max_retries=5)
# Returns: {'success': True, 'inserted': 45, 'updated': 5, 'skipped': 0}
```

### Track Cost (CRITICAL)
```python
result = manager._call_stored_function('track_campaign_cost', {
    'p_campaign_id': campaign_id,
    'p_service': 'google_maps',
    'p_items_processed': 100,
    'p_cost_usd': 7.50,
    'p_metadata': {'zip_code': '90001', 'run_id': 'abc123'}
}, max_retries=5)
# Returns: {'success': True, 'cost_id': '...', 'new_total': 107.50}
```

### Update Statistics
```python
result = manager._call_stored_function('update_campaign_statistics', {
    'p_campaign_id': campaign_id
})
# Returns: {'success': True, 'total_businesses': 1250, 'total_emails': 875}
```

### Get Businesses for Enrichment
```python
result = client.rpc('get_businesses_for_enrichment', {
    'p_campaign_id': campaign_id,
    'p_enrichment_type': 'facebook',
    'p_limit': 100,
    'p_offset': 0
}).execute()
# Returns: List of business records
```

## Error Handling Quick Guide

### Standard Error Response
```json
{
  "success": false,
  "error": "User-friendly message",
  "error_code": "23505",
  "retry_recommended": true
}
```

### Common Errors

| Error Code | Meaning | Retry? | Fix |
|------------|---------|--------|-----|
| 23505 | Duplicate record | No | Check for existing records first |
| 23503 | Foreign key violation | No | Verify referenced records exist |
| 40P01 | Deadlock | Yes (3x) | Application retries automatically |
| 40001 | Serialization failure | Yes (3x) | Application retries automatically |
| 55P03 | Lock timeout | Yes (3x) | Application retries automatically |

### JavaScript Error Handler
```javascript
async function callWithRetry(functionName, params, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { data, error } = await supabase.rpc(functionName, params);

        if (!data.success && data.retry_recommended && attempt < maxRetries) {
            await sleep(1000 * attempt); // Exponential backoff
            continue;
        }

        if (!data.success) {
            throw new Error(data.error);
        }

        return data;
    }
}
```

### Python Error Handler
```python
def _call_with_retry(self, function_name, params, max_retries=3):
    for attempt in range(1, max_retries + 1):
        result = self.client.rpc(function_name, params).execute()
        response = result.data

        if not response.get('success') and response.get('retry_recommended'):
            if attempt < max_retries:
                time.sleep(attempt)  # Exponential backoff
                continue

        if not response.get('success'):
            raise Exception(response.get('error'))

        return response
```

## Performance Tips

### Batch Operations
- **Optimal batch size:** 50 records
- **Max batch size:** 100 records
- **Too large:** Increases transaction time, higher chance of conflicts
- **Too small:** More database round-trips, slower overall

### Cost Tracking (CRITICAL)
- **Always use max retries (5):** Cost accuracy is critical
- **Never skip errors:** Log all cost tracking failures
- **Verify totals:** Periodically check campaign cost totals match sum of api_costs

### Statistics Updates
- **Call frequency:** After every ZIP code scrape (not per business)
- **Don't call concurrently:** One statistics update per campaign at a time
- **Batch updates:** Update statistics once after batch operations, not for each record

### Pagination
- **Default limit:** 100 records
- **Max recommended:** 500 records
- **Use offset-based pagination:** `LIMIT 100 OFFSET 0`, then `OFFSET 100`, etc.
- **Better alternative:** Cursor-based pagination (use `created_at` as cursor)

## Testing Quick Commands

### Test Campaign Creation
```bash
# JavaScript
node test_stored_functions.js

# Python
python test_stored_functions.py
```

### Test Concurrency
```bash
# Run 10 concurrent cost tracking operations
for i in {1..10}; do
    node test_cost_tracking.js &
done
wait
```

### Monitor Performance
```sql
-- Check function execution times
SELECT
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%create_campaign%'
ORDER BY mean_exec_time DESC;

-- Check for lock contention
SELECT
    locktype,
    relation::regclass,
    mode,
    granted,
    pid
FROM pg_locks
WHERE NOT granted;
```

## Critical Reminders

### ⚠️ MUST DO
1. **Always use SERIALIZABLE for cost tracking** - Prevents lost cost updates
2. **Always retry on deadlocks** - Use max retries = 5 for critical operations
3. **Always log cost tracking errors** - Financial accuracy is critical
4. **Always validate campaign_id exists** - Prevents foreign key violations

### ❌ NEVER DO
1. **Never skip cost tracking errors** - This will cause financial discrepancies
2. **Never call statistics update concurrently** - Causes lock contention
3. **Never use batch size > 100** - Increases transaction time and conflicts
4. **Never ignore retry_recommended flag** - Application must retry these errors

### ✅ BEST PRACTICES
1. **Use batch operations** - Insert 50 businesses at once, not one by one
2. **Call statistics update after batch operations** - Not for each record
3. **Use exponential backoff for retries** - 1s, 2s, 4s
4. **Log all database operations** - Helps debugging and monitoring

## Migration Checklist

Before deploying to production:

- [ ] All 8 functions implemented
- [ ] Unit tests pass for each function
- [ ] Integration tests pass (JavaScript + Python)
- [ ] Concurrency tests pass (10+ concurrent operations)
- [ ] Performance tests pass (<1s for most operations)
- [ ] Error handling verified (all SQLSTATE codes tested)
- [ ] Cost tracking accuracy verified (no lost updates)
- [ ] Documentation complete
- [ ] Rollback plan ready

## Getting Help

1. **Full Architecture:** `/Users/tristanwaite/n8n test/.claude/plans/stored_functions_architecture.md`
2. **Visual Diagrams:** `/Users/tristanwaite/n8n test/.claude/plans/stored_functions_diagram.md`
3. **Executive Summary:** `/Users/tristanwaite/n8n test/.claude/plans/stored_functions_summary.md`
4. **This Quick Reference:** `/Users/tristanwaite/n8n test/.claude/plans/stored_functions_quick_reference.md`

## Common Use Cases

### Use Case 1: Campaign Execution Flow
```javascript
// 1. Create campaign
const campaign = await supabase.rpc('create_campaign_with_coverage', {...});

// 2. Scrape each ZIP code
for (const zip of zipCodes) {
    const businesses = await scrapeZipCode(zip);

    // 3. Save businesses
    await supabase.rpc('insert_businesses_batch', {
        p_campaign_id: campaign.campaign_id,
        p_zip_code: zip,
        p_businesses: businesses
    });

    // 4. Track cost
    await supabase.rpc('track_campaign_cost', {
        p_campaign_id: campaign.campaign_id,
        p_service: 'google_maps',
        p_items_processed: businesses.length,
        p_cost_usd: calculateCost(businesses.length)
    });

    // 5. Update coverage
    await supabase.rpc('update_coverage_status', {
        p_campaign_id: campaign.campaign_id,
        p_zip_code: zip,
        p_businesses_found: businesses.length,
        p_emails_found: countEmails(businesses),
        p_actual_cost: calculateCost(businesses.length)
    });
}

// 6. Update final statistics
await supabase.rpc('update_campaign_statistics', {
    p_campaign_id: campaign.campaign_id
});
```

### Use Case 2: Enrichment Flow
```javascript
// 1. Get businesses needing enrichment
const businesses = await supabase.rpc('get_businesses_for_enrichment', {
    p_campaign_id: campaignId,
    p_enrichment_type: 'facebook',
    p_limit: 100,
    p_offset: 0
});

// 2. Enrich businesses
const enrichments = await enrichFacebook(businesses);

// 3. Update enrichments
await supabase.rpc('update_enrichment_batch', {
    p_enrichment_type: 'facebook',
    p_enrichments: enrichments
});

// 4. Track cost
await supabase.rpc('track_campaign_cost', {
    p_campaign_id: campaignId,
    p_service: 'facebook',
    p_items_processed: enrichments.length,
    p_cost_usd: calculateCost(enrichments.length)
});

// 5. Update statistics
await supabase.rpc('update_campaign_statistics', {
    p_campaign_id: campaignId
});
```

### Use Case 3: Email Verification Flow
```python
# 1. Get businesses with emails
businesses = manager.get_businesses_for_enrichment(
    campaign_id, 'linkedin', limit=100
)

# 2. Verify emails with Bouncer
for business in businesses:
    if business['email']:
        verification = verify_email_bouncer(business['email'])

        # 3. Update verification
        manager._call_stored_function('update_email_verification', {
            'p_business_id': business['id'],
            'p_email': business['email'],
            'p_verification_data': verification
        })

# 4. Track cost
manager._call_stored_function('track_campaign_cost', {
    'p_campaign_id': campaign_id,
    'p_service': 'bouncer',
    'p_items_processed': len(businesses),
    'p_cost_usd': len(businesses) * 0.005
})
```

---

**Print this page for quick reference during development!**
