# PostgreSQL Stored Functions Architecture Design
## High-Level Architecture for 8 Core Operations

**Version:** 1.0
**Date:** 2025-10-13
**Status:** Design Complete - Ready for Implementation

---

## Executive Summary

This document defines the complete architecture for 8 PostgreSQL stored functions that will replace application-level database operations with atomic, transaction-safe database operations. The design prioritizes:

1. **Transaction Safety**: All operations use appropriate isolation levels and locking strategies
2. **Consistency**: Uniform error handling, naming conventions, and return patterns
3. **Performance**: Minimal locking, efficient queries, and proper indexing
4. **Integration**: Seamless integration with existing JavaScript and Python codebases

---

## Table of Contents

1. [Function Signatures](#1-function-signatures)
2. [Transaction Strategy](#2-transaction-strategy)
3. [Error Handling Architecture](#3-error-handling-architecture)
4. [Integration Architecture](#4-integration-architecture)
5. [Consistency Patterns](#5-consistency-patterns)
6. [Implementation Guidelines](#6-implementation-guidelines)

---

## 1. Function Signatures

### 1.1 Campaign Creation with ZIP Codes
**Operation:** Create campaign with atomic coverage insertion

```sql
CREATE OR REPLACE FUNCTION create_campaign_with_coverage(
    p_campaign_data JSONB,      -- Campaign metadata
    p_zip_codes JSONB           -- Array of ZIP code objects
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_campaign_id UUID;
    v_campaign_record RECORD;
    v_zip_count INTEGER;
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'zip_count', v_zip_count,
        'message', 'Campaign created successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_ prefixed tables)
**Transaction Isolation:** READ COMMITTED (default)
**Rationale:** No concurrent modifications expected during campaign creation

**Input Structure:**
```json
{
  "campaign_data": {
    "name": "Campaign Name",
    "description": "Description",
    "keywords": ["keyword1", "keyword2"],
    "location": "Los Angeles, CA",
    "coverage_profile": "balanced",
    "organization_id": "uuid",
    "created_by": "user@example.com"
  },
  "zip_codes": [
    {
      "zip_code": "90001",
      "keywords": ["dentist", "dental"],
      "max_results": 200,
      "estimated_cost": 1.40
    }
  ]
}
```

**Output Structure:**
```json
{
  "success": true,
  "campaign_id": "uuid",
  "zip_count": 5,
  "message": "Campaign created successfully"
}
```

---

### 1.2 Batch Business Insertion with Deduplication
**Operation:** Insert businesses with place_id deduplication

```sql
CREATE OR REPLACE FUNCTION insert_businesses_batch(
    p_campaign_id UUID,
    p_zip_code VARCHAR(10),
    p_businesses JSONB          -- Array of business objects
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_business JSONB;
    v_business_id UUID;
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'inserted', v_inserted_count,
        'updated', v_updated_count,
        'skipped', v_skipped_count,
        'total', v_inserted_count + v_updated_count + v_skipped_count
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Duplicate place_id detected',
            'error_code', SQLSTATE
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_businesses table)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** Use `ON CONFLICT (place_id) DO UPDATE` for upsert

**Input Structure:**
```json
{
  "campaign_id": "uuid",
  "zip_code": "90001",
  "businesses": [
    {
      "place_id": "ChIJ...",
      "name": "Business Name",
      "address": "123 Main St",
      "email": "contact@business.com",
      "phone": "(555) 123-4567",
      "website": "https://business.com",
      "raw_data": { ... }
    }
  ]
}
```

---

### 1.3 Campaign Statistics Update
**Operation:** Atomically update campaign totals

```sql
CREATE OR REPLACE FUNCTION update_campaign_statistics(
    p_campaign_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_businesses INTEGER;
    v_total_emails INTEGER;
    v_total_facebook_pages INTEGER;
    v_updated BOOLEAN;
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'total_businesses', v_total_businesses,
        'total_emails', v_total_emails,
        'total_facebook_pages', v_total_facebook_pages
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_campaigns table)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** Row-level lock using `SELECT ... FOR UPDATE` to prevent concurrent updates

**Rationale:** Campaign statistics are frequently updated; row-level locking ensures atomicity while allowing other campaigns to be updated concurrently.

---

### 1.4 Campaign Cost Tracking with Rollup
**Operation:** Record API cost and update campaign totals

```sql
CREATE OR REPLACE FUNCTION track_campaign_cost(
    p_campaign_id UUID,
    p_service VARCHAR(50),      -- 'google_maps', 'facebook', 'linkedin', 'bouncer'
    p_items_processed INTEGER,
    p_cost_usd NUMERIC(10,4),
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_cost_id UUID;
    v_new_total NUMERIC(10,2);
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'cost_id', v_cost_id,
        'new_total', v_new_total,
        'service', p_service
    );
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign not found',
            'error_code', SQLSTATE
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_api_costs, gmaps_campaigns tables)
**Transaction Isolation:** SERIALIZABLE
**Locking Strategy:** `SELECT ... FOR UPDATE` on campaign row

**Rationale:** Cost tracking is critical and must be atomic. Multiple processes (Google Maps scraper, Facebook enricher, LinkedIn enricher, Bouncer verifier) may update costs concurrently. SERIALIZABLE isolation prevents lost updates.

**Critical Design Decision:** This function MUST use SERIALIZABLE isolation to prevent the following race condition:

**Race Condition Example (without proper isolation):**
```
Process A: Read campaign total_cost = $10.00
Process B: Read campaign total_cost = $10.00
Process A: Update total_cost = $10.00 + $5.00 = $15.00
Process B: Update total_cost = $10.00 + $3.00 = $13.00
Final Result: $13.00 (Lost Process A's $5.00 update!)
```

**With SERIALIZABLE + FOR UPDATE:**
```
Process A: SELECT FOR UPDATE (locks row)
Process A: Read campaign total_cost = $10.00
Process B: SELECT FOR UPDATE (blocks, waits for Process A)
Process A: Update total_cost = $15.00, COMMIT
Process B: Unblocked, reads total_cost = $15.00
Process B: Update total_cost = $18.00, COMMIT
Final Result: $18.00 (Correct!)
```

---

### 1.5 Coverage Status Update
**Operation:** Mark ZIP code as scraped with results

```sql
CREATE OR REPLACE FUNCTION update_coverage_status(
    p_campaign_id UUID,
    p_zip_code VARCHAR(10),
    p_businesses_found INTEGER,
    p_emails_found INTEGER,
    p_actual_cost NUMERIC(10,2)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'zip_code', p_zip_code,
        'businesses_found', p_businesses_found
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_campaign_coverage table)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** No explicit locking needed (single row update)

---

### 1.6 Batch Enrichment Update (Facebook/LinkedIn)
**Operation:** Update multiple businesses with enrichment data

```sql
CREATE OR REPLACE FUNCTION update_enrichment_batch(
    p_enrichment_type VARCHAR(20),  -- 'facebook' or 'linkedin'
    p_enrichments JSONB             -- Array of enrichment objects
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_enrichment JSONB;
    v_business_id UUID;
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'updated', v_updated_count,
        'failed', v_failed_count,
        'enrichment_type', p_enrichment_type
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_businesses, gmaps_facebook_enrichments, gmaps_linkedin_enrichments)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** No explicit locking (batch updates are independent)

**Input Structure (Facebook):**
```json
{
  "enrichment_type": "facebook",
  "enrichments": [
    {
      "business_id": "uuid",
      "campaign_id": "uuid",
      "facebook_url": "https://facebook.com/business",
      "primary_email": "contact@business.com",
      "emails": ["contact@business.com", "info@business.com"],
      "phone_numbers": ["(555) 123-4567"],
      "raw_data": { ... }
    }
  ]
}
```

---

### 1.7 Email Verification Update
**Operation:** Update email verification status (Bouncer results)

```sql
CREATE OR REPLACE FUNCTION update_email_verification(
    p_business_id UUID,
    p_email VARCHAR(255),
    p_verification_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_enrichment_id UUID;
    v_email_source VARCHAR(50);
BEGIN
    -- Implementation details in later sections
    RETURN jsonb_build_object(
        'success', true,
        'business_id', p_business_id,
        'email', p_email,
        'status', p_verification_data->>'status',
        'is_safe', (p_verification_data->>'is_safe')::BOOLEAN
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;
```

**Schema:** `public` (gmaps_email_verifications, gmaps_linkedin_enrichments, gmaps_facebook_enrichments)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** No explicit locking needed

**Input Structure:**
```json
{
  "business_id": "uuid",
  "email": "contact@business.com",
  "verification_data": {
    "status": "deliverable",
    "score": 95,
    "is_safe": true,
    "is_disposable": false,
    "is_role_based": false,
    "is_free_email": false,
    "domain": "business.com",
    "provider": "Google Workspace",
    "reason": "Accepted by mail server",
    "raw_response": { ... }
  }
}
```

---

### 1.8 Get Businesses for Enrichment (Paginated)
**Operation:** Fetch businesses needing enrichment with cursor-based pagination

```sql
CREATE OR REPLACE FUNCTION get_businesses_for_enrichment(
    p_campaign_id UUID,
    p_enrichment_type VARCHAR(20),  -- 'facebook' or 'linkedin'
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    business_id UUID,
    campaign_id UUID,
    place_id VARCHAR(255),
    name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    postal_code VARCHAR(10),
    phone VARCHAR(50),
    website TEXT,
    email VARCHAR(255),
    facebook_url TEXT,
    linkedin_url TEXT,
    enrichment_status VARCHAR(50),
    enrichment_attempts INTEGER,
    needs_enrichment BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Implementation details in later sections
    RETURN QUERY
    SELECT
        b.id as business_id,
        b.campaign_id,
        b.place_id,
        b.name,
        b.address,
        b.city,
        b.state,
        b.postal_code,
        b.phone,
        b.website,
        b.email,
        b.facebook_url,
        b.linkedin_url,
        b.enrichment_status::VARCHAR,
        b.enrichment_attempts,
        b.needs_enrichment
    FROM gmaps_businesses b
    WHERE b.campaign_id = p_campaign_id
        AND CASE
            WHEN p_enrichment_type = 'facebook' THEN b.needs_enrichment = TRUE AND b.enrichment_status = 'pending'
            WHEN p_enrichment_type = 'linkedin' THEN b.linkedin_enriched = FALSE
            ELSE FALSE
        END
    ORDER BY b.created_at
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
```

**Schema:** `public` (gmaps_businesses table)
**Transaction Isolation:** READ COMMITTED
**Locking Strategy:** No locking (read-only query)

**Rationale:** Returns a table type for easier integration with application code. No JSONB wrapping needed for table results.

---

## 2. Transaction Strategy

### 2.1 Isolation Level Matrix

| Function | Isolation Level | Rationale | Locking Strategy |
|----------|----------------|-----------|------------------|
| `create_campaign_with_coverage` | READ COMMITTED | Single user creating campaign, no concurrent access | None |
| `insert_businesses_batch` | READ COMMITTED | Place_id uniqueness enforced by constraint | `ON CONFLICT` clause |
| `update_campaign_statistics` | READ COMMITTED | Row-level locking prevents conflicts | `SELECT FOR UPDATE` |
| `track_campaign_cost` | **SERIALIZABLE** | **Critical: Prevents lost cost updates** | `SELECT FOR UPDATE` |
| `update_coverage_status` | READ COMMITTED | Single row update, no contention | None |
| `update_enrichment_batch` | READ COMMITTED | Independent batch updates | None |
| `update_email_verification` | READ COMMITTED | Single email verification | None |
| `get_businesses_for_enrichment` | READ COMMITTED | Read-only query | None |

### 2.2 Deadlock Prevention Strategy

**Potential Deadlock Scenario:**
- Process A: Updates campaign statistics (locks campaign row)
- Process B: Tracks campaign cost (locks campaign row)
- Process A: Tries to track cost (waits for Process B)
- Process B: Tries to update statistics (waits for Process A)
- **DEADLOCK!**

**Prevention Strategy:**
1. **Lock Ordering**: Always acquire locks in the same order:
   - First: Campaign row lock (`gmaps_campaigns`)
   - Second: Coverage row lock (`gmaps_campaign_coverage`)
   - Third: Business row locks (`gmaps_businesses`)
   - Fourth: Enrichment table locks

2. **Timeout Configuration**: Set `lock_timeout` to 5 seconds:
```sql
SET LOCAL lock_timeout = '5s';
```

3. **Retry Logic**: Application code should retry on deadlock detection (SQLSTATE 40P01)

### 2.3 Transaction Timeout Strategy

**Default Timeout:** 30 seconds for all functions
```sql
SET LOCAL statement_timeout = '30s';
```

**Exceptions:**
- `insert_businesses_batch`: 60 seconds (large batches may take longer)
- `update_enrichment_batch`: 60 seconds (batch operations)

---

## 3. Error Handling Architecture

### 3.1 Error Code Mapping

PostgreSQL uses SQLSTATE codes for error categorization. Our functions will translate these to user-friendly messages:

| SQLSTATE | Error Type | User-Facing Message | Retry Recommended |
|----------|-----------|---------------------|-------------------|
| 23505 | unique_violation | "Duplicate record detected" | No |
| 23503 | foreign_key_violation | "Referenced record not found" | No |
| 40P01 | deadlock_detected | "Operation conflict, please retry" | Yes (3x) |
| 40001 | serialization_failure | "Concurrent modification, please retry" | Yes (3x) |
| 55P03 | lock_not_available | "Resource busy, please retry" | Yes (3x) |
| P0001 | raise_exception | Custom business logic error | No |
| Others | internal_error | "Database operation failed" | No |

### 3.2 Error Response Format

All functions return JSONB with this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User-friendly error message",
  "error_code": "23505",
  "error_detail": "Detailed technical message for logging",
  "retry_recommended": true
}
```

### 3.3 Exception Handling Pattern

Standard exception handling template for all functions:

```sql
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Duplicate record detected',
            'error_code', SQLSTATE,
            'error_detail', SQLERRM,
            'retry_recommended', false
        );

    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Referenced record not found',
            'error_code', SQLSTATE,
            'error_detail', SQLERRM,
            'retry_recommended', false
        );

    WHEN deadlock_detected OR serialization_failure OR lock_not_available THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Operation conflict, please retry',
            'error_code', SQLSTATE,
            'error_detail', SQLERRM,
            'retry_recommended', true
        );

    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database operation failed',
            'error_code', SQLSTATE,
            'error_detail', SQLERRM,
            'retry_recommended', false
        );
```

### 3.4 Rollback Behavior

All functions use implicit transactions:
- **Automatic Rollback**: Any EXCEPTION triggers automatic rollback of all changes
- **No Explicit ROLLBACK**: Let PostgreSQL handle rollback automatically
- **No Partial Commits**: Never use nested transactions or savepoints

---

## 4. Integration Architecture

### 4.1 JavaScript Integration (supabase-db.js)

#### 4.1.1 Wrapper Pattern

Create a standardized wrapper for all RPC calls:

```javascript
// Generic RPC wrapper with error handling and retry logic
async function callStoredFunction(functionName, params, options = {}) {
    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { data, error } = await supabase.rpc(functionName, params);

            if (error) {
                throw new Error(`RPC Error: ${error.message}`);
            }

            // Check function's success flag
            if (!data.success) {
                // Check if retry is recommended
                if (data.retry_recommended && attempt < maxRetries) {
                    console.warn(`${functionName} failed (attempt ${attempt}/${maxRetries}): ${data.error}`);
                    await sleep(retryDelay * attempt); // Exponential backoff
                    continue;
                }

                // No retry, throw error
                throw new Error(data.error || 'Operation failed');
            }

            // Success!
            return data;

        } catch (err) {
            if (attempt === maxRetries) {
                throw err;
            }
            console.error(`${functionName} error (attempt ${attempt}/${maxRetries}):`, err);
            await sleep(retryDelay * attempt);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

#### 4.1.2 Function-Specific Wrappers

```javascript
const gmapsCampaigns = {
    // Create campaign with ZIP codes
    async create(campaignData, zipCodes) {
        const result = await callStoredFunction('create_campaign_with_coverage', {
            p_campaign_data: campaignData,
            p_zip_codes: zipCodes
        });

        console.log(`✅ Campaign created: ${result.campaign_id} with ${result.zip_count} ZIP codes`);
        return result;
    },

    // Update campaign statistics
    async updateStatistics(campaignId) {
        const result = await callStoredFunction('update_campaign_statistics', {
            p_campaign_id: campaignId
        });

        console.log(`✅ Campaign statistics updated: ${result.total_businesses} businesses, ${result.total_emails} emails`);
        return result;
    }
};

const gmapsBusinesses = {
    // Save businesses in batch
    async saveBatch(campaignId, zipCode, businesses) {
        const result = await callStoredFunction('insert_businesses_batch', {
            p_campaign_id: campaignId,
            p_zip_code: zipCode,
            p_businesses: businesses
        }, { retries: 5 }); // More retries for large batches

        console.log(`✅ Businesses saved: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped`);
        return result;
    },

    // Get businesses for enrichment
    async getForEnrichment(campaignId, enrichmentType, limit = 100, offset = 0) {
        const { data, error } = await supabase.rpc('get_businesses_for_enrichment', {
            p_campaign_id: campaignId,
            p_enrichment_type: enrichmentType,
            p_limit: limit,
            p_offset: offset
        });

        if (error) throw new Error(`Failed to fetch businesses: ${error.message}`);
        return data; // Returns array of business records
    }
};

const gmapsCosts = {
    // Track campaign cost
    async trackCost(campaignId, service, itemsProcessed, costUsd, metadata = null) {
        const result = await callStoredFunction('track_campaign_cost', {
            p_campaign_id: campaignId,
            p_service: service,
            p_items_processed: itemsProcessed,
            p_cost_usd: costUsd,
            p_metadata: metadata
        }, { retries: 5 }); // Critical operation, retry more

        console.log(`💰 Cost tracked: $${costUsd} for ${service} (new total: $${result.new_total})`);
        return result;
    }
};
```

#### 4.1.3 Error Propagation

```javascript
// Centralized error handler
function handleDatabaseError(error, operation) {
    // Log for debugging
    console.error(`Database error in ${operation}:`, {
        message: error.message,
        stack: error.stack
    });

    // User-friendly error message
    if (error.message.includes('Duplicate record')) {
        throw new Error(`This ${operation} already exists`);
    } else if (error.message.includes('Referenced record not found')) {
        throw new Error(`Invalid reference in ${operation}`);
    } else if (error.message.includes('retry')) {
        throw new Error(`${operation} is temporarily unavailable, please try again`);
    } else {
        throw new Error(`Failed to complete ${operation}`);
    }
}
```

### 4.2 Python Integration (gmaps_supabase_manager.py)

#### 4.2.1 Wrapper Pattern

```python
import logging
from typing import Dict, Any, List, Optional
from supabase import Client

class GmapsSupabaseManager:
    """Supabase manager with stored function integration"""

    def __init__(self, supabase_url: str, supabase_key: str):
        self.client: Client = create_client(supabase_url, supabase_key)
        self.logger = logging.getLogger(__name__)

    def _call_stored_function(
        self,
        function_name: str,
        params: Dict[str, Any],
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> Dict[str, Any]:
        """Generic wrapper for stored function calls with retry logic"""

        for attempt in range(1, max_retries + 1):
            try:
                result = self.client.rpc(function_name, params).execute()

                if not result.data:
                    raise Exception(f"No data returned from {function_name}")

                response = result.data

                # Check function's success flag
                if not response.get('success', False):
                    error_msg = response.get('error', 'Operation failed')
                    retry_recommended = response.get('retry_recommended', False)

                    if retry_recommended and attempt < max_retries:
                        self.logger.warning(
                            f"{function_name} failed (attempt {attempt}/{max_retries}): {error_msg}"
                        )
                        time.sleep(retry_delay * attempt)  # Exponential backoff
                        continue

                    # No retry, raise error
                    raise Exception(error_msg)

                # Success!
                return response

            except Exception as e:
                if attempt == max_retries:
                    self.logger.error(f"{function_name} failed after {max_retries} attempts: {e}")
                    raise

                self.logger.error(f"{function_name} error (attempt {attempt}/{max_retries}): {e}")
                time.sleep(retry_delay * attempt)

        raise Exception(f"{function_name} failed after {max_retries} attempts")
```

#### 4.2.2 Function-Specific Wrappers

```python
class GmapsSupabaseManager:
    # ... (continued from above)

    def create_campaign(self, campaign_data: Dict[str, Any], zip_codes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create campaign with ZIP codes using stored function"""
        try:
            result = self._call_stored_function('create_campaign_with_coverage', {
                'p_campaign_data': campaign_data,
                'p_zip_codes': zip_codes
            })

            self.logger.info(f"✅ Campaign created: {result['campaign_id']} with {result['zip_count']} ZIP codes")
            return result

        except Exception as e:
            self.logger.error(f"Failed to create campaign: {e}")
            raise

    def save_businesses_batch(
        self,
        campaign_id: str,
        zip_code: str,
        businesses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Save businesses using batch stored function"""
        try:
            result = self._call_stored_function('insert_businesses_batch', {
                'p_campaign_id': campaign_id,
                'p_zip_code': zip_code,
                'p_businesses': businesses
            }, max_retries=5)  # More retries for large batches

            self.logger.info(
                f"✅ Businesses saved: {result['inserted']} inserted, "
                f"{result['updated']} updated, {result['skipped']} skipped"
            )
            return result

        except Exception as e:
            self.logger.error(f"Failed to save businesses: {e}")
            raise

    def track_campaign_cost(
        self,
        campaign_id: str,
        service: str,
        items_processed: int,
        cost_usd: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Track API cost using stored function"""
        try:
            result = self._call_stored_function('track_campaign_cost', {
                'p_campaign_id': campaign_id,
                'p_service': service,
                'p_items_processed': items_processed,
                'p_cost_usd': cost_usd,
                'p_metadata': metadata
            }, max_retries=5)  # Critical operation

            self.logger.info(
                f"💰 Cost tracked: ${cost_usd} for {service} (new total: ${result['new_total']})"
            )
            return result

        except Exception as e:
            self.logger.error(f"Failed to track cost: {e}")
            raise

    def get_businesses_for_enrichment(
        self,
        campaign_id: str,
        enrichment_type: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get businesses needing enrichment"""
        try:
            result = self.client.rpc('get_businesses_for_enrichment', {
                'p_campaign_id': campaign_id,
                'p_enrichment_type': enrichment_type,
                'p_limit': limit,
                'p_offset': offset
            }).execute()

            if not result.data:
                return []

            self.logger.info(
                f"📊 Retrieved {len(result.data)} businesses for {enrichment_type} enrichment"
            )
            return result.data

        except Exception as e:
            self.logger.error(f"Failed to get businesses for enrichment: {e}")
            raise
```

#### 4.2.3 Error Handling

```python
class GmapsSupabaseManager:
    # ... (continued from above)

    def _handle_database_error(self, error: Exception, operation: str) -> None:
        """Centralized error handler with user-friendly messages"""

        error_msg = str(error)

        # Log for debugging
        self.logger.error(f"Database error in {operation}: {error_msg}")

        # User-friendly error messages
        if 'Duplicate record' in error_msg:
            raise Exception(f"This {operation} already exists")
        elif 'Referenced record not found' in error_msg:
            raise Exception(f"Invalid reference in {operation}")
        elif 'retry' in error_msg.lower():
            raise Exception(f"{operation} is temporarily unavailable, please try again")
        else:
            raise Exception(f"Failed to complete {operation}")
```

### 4.3 Integration Testing Strategy

#### 4.3.1 JavaScript Tests

```javascript
// test_stored_functions.js
const { supabase, gmapsCampaigns, gmapsBusinesses, gmapsCosts } = require('./supabase-db');

async function testCampaignCreation() {
    console.log('Testing campaign creation...');

    const campaignData = {
        name: 'Test Campaign',
        keywords: ['dentist', 'dental'],
        location: 'Los Angeles, CA',
        coverage_profile: 'balanced'
    };

    const zipCodes = [
        { zip_code: '90001', keywords: ['dentist'], max_results: 200, estimated_cost: 1.40 },
        { zip_code: '90002', keywords: ['dental'], max_results: 200, estimated_cost: 1.40 }
    ];

    const result = await gmapsCampaigns.create(campaignData, zipCodes);
    console.log('✅ Campaign created:', result);
}

async function testCostTracking() {
    console.log('Testing cost tracking...');

    const result = await gmapsCosts.trackCost(
        'campaign-id-here',
        'google_maps',
        100,
        7.50,
        { zip_code: '90001', run_id: 'abc123' }
    );
    console.log('✅ Cost tracked:', result);
}

// Run tests
(async () => {
    await testCampaignCreation();
    await testCostTracking();
})();
```

#### 4.3.2 Python Tests

```python
# test_stored_functions.py
import pytest
from gmaps_supabase_manager import GmapsSupabaseManager

def test_campaign_creation():
    """Test campaign creation with ZIP codes"""
    manager = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)

    campaign_data = {
        'name': 'Test Campaign',
        'keywords': ['dentist', 'dental'],
        'location': 'Los Angeles, CA',
        'coverage_profile': 'balanced'
    }

    zip_codes = [
        {'zip_code': '90001', 'keywords': ['dentist'], 'max_results': 200, 'estimated_cost': 1.40},
        {'zip_code': '90002', 'keywords': ['dental'], 'max_results': 200, 'estimated_cost': 1.40}
    ]

    result = manager.create_campaign(campaign_data, zip_codes)

    assert result['success'] == True
    assert result['zip_count'] == 2
    print(f"✅ Campaign created: {result['campaign_id']}")

def test_cost_tracking():
    """Test campaign cost tracking"""
    manager = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)

    result = manager.track_campaign_cost(
        campaign_id='campaign-id-here',
        service='google_maps',
        items_processed=100,
        cost_usd=7.50,
        metadata={'zip_code': '90001', 'run_id': 'abc123'}
    )

    assert result['success'] == True
    print(f"✅ Cost tracked: ${result['new_total']}")

if __name__ == '__main__':
    test_campaign_creation()
    test_cost_tracking()
```

---

## 5. Consistency Patterns

### 5.1 Naming Conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Function Name | `verb_noun_modifier` | `create_campaign_with_coverage` |
| Parameter Name | `p_snake_case` | `p_campaign_id` |
| Variable Name | `v_snake_case` | `v_inserted_count` |
| Return Value | Always JSONB (except TABLE functions) | `RETURNS JSONB` |
| Schema | `public` (with gmaps_ prefix) | `public.gmaps_campaigns` |

### 5.2 Return Pattern Consistency

All functions (except TABLE-returning functions) use this structure:

```json
{
  "success": true/false,
  "error": "Error message (only if success=false)",
  "error_code": "PostgreSQL SQLSTATE (only if success=false)",
  "error_detail": "Technical details (only if success=false)",
  "retry_recommended": true/false (only if success=false),
  ...additional fields specific to the operation
}
```

### 5.3 Timestamp Consistency

All timestamp fields use:
- **Type:** `TIMESTAMP WITH TIME ZONE` (PostgreSQL `TIMESTAMPTZ`)
- **Function:** `NOW()` for current timestamp
- **Format:** ISO 8601 (automatic with `TIMESTAMPTZ`)

### 5.4 Logging Pattern

All functions should log key events:

```sql
-- At function start
RAISE NOTICE 'Starting % for campaign %', function_name, p_campaign_id;

-- At success
RAISE NOTICE '✅ % completed: % records affected', function_name, v_count;

-- At error
RAISE NOTICE '❌ % failed: %', function_name, SQLERRM;
```

---

## 6. Implementation Guidelines

### 6.1 Migration File Structure

Create a single migration file for all 8 functions:

**File:** `/Users/tristanwaite/n8n test/migrations/create_stored_functions.sql`

```sql
-- ============================================================================
-- STORED FUNCTIONS MIGRATION: Core Database Operations
-- ============================================================================
-- This migration creates 8 stored functions to replace application-level
-- database operations with atomic, transaction-safe database operations.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql
-- ============================================================================

-- Function 1: Create Campaign with Coverage
-- ============================================================================
CREATE OR REPLACE FUNCTION create_campaign_with_coverage(
    p_campaign_data JSONB,
    p_zip_codes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
-- Implementation here
$$;

-- Function 2: Insert Businesses Batch
-- ============================================================================
CREATE OR REPLACE FUNCTION insert_businesses_batch(
    p_campaign_id UUID,
    p_zip_code VARCHAR(10),
    p_businesses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
-- Implementation here
$$;

-- ... (continue for all 8 functions)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
```

### 6.2 Implementation Order

Implement functions in this order:

1. **Simple Functions First:**
   - `update_coverage_status` (simplest, single table update)
   - `update_campaign_statistics` (single table, with aggregation)
   - `get_businesses_for_enrichment` (read-only query)

2. **Medium Complexity:**
   - `create_campaign_with_coverage` (two table inserts)
   - `insert_businesses_batch` (batch insert with conflict handling)
   - `update_email_verification` (multi-table update)

3. **Complex Functions Last:**
   - `track_campaign_cost` (critical, needs SERIALIZABLE isolation)
   - `update_enrichment_batch` (batch updates across multiple tables)

### 6.3 Testing Strategy

For each function, create tests in this order:

1. **Unit Tests:** Test function in isolation
2. **Integration Tests:** Test with application code
3. **Concurrency Tests:** Test with multiple processes
4. **Performance Tests:** Test with large datasets

### 6.4 Rollback Plan

If any function causes issues:

1. **Quick Fix:** Update function with `CREATE OR REPLACE FUNCTION`
2. **Rollback:** Drop specific function and revert to application logic
```sql
DROP FUNCTION IF EXISTS function_name(param_types);
```

3. **Full Rollback:** Drop all functions
```sql
DROP FUNCTION IF EXISTS create_campaign_with_coverage(JSONB, JSONB);
DROP FUNCTION IF EXISTS insert_businesses_batch(UUID, VARCHAR(10), JSONB);
-- ... etc
```

### 6.5 Performance Monitoring

After deployment, monitor these metrics:

1. **Function Execution Time:**
```sql
SELECT
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%create_campaign_with_coverage%'
ORDER BY mean_exec_time DESC;
```

2. **Lock Contention:**
```sql
SELECT
    locktype,
    relation::regclass,
    mode,
    granted,
    pid
FROM pg_locks
WHERE NOT granted;
```

3. **Deadlock Frequency:**
```sql
SELECT
    datname,
    deadlocks
FROM pg_stat_database
WHERE datname = 'your_database';
```

---

## 7. Design Decisions & Rationale

### 7.1 Why JSONB Parameters?

**Decision:** Use JSONB for complex input parameters (campaign_data, businesses array)

**Rationale:**
1. **Flexibility:** Easy to add new fields without changing function signature
2. **Consistency:** Matches Supabase RPC call format
3. **Performance:** Binary format, faster than TEXT/JSON
4. **Validation:** Can validate structure inside function

**Trade-off:** Less type safety, but more flexibility for evolving schema

### 7.2 Why JSONB Return Values?

**Decision:** Return JSONB (except for TABLE-returning functions)

**Rationale:**
1. **Consistency:** Uniform response format across all functions
2. **Error Handling:** Can include error details in same structure
3. **Extensibility:** Easy to add new fields to response
4. **Integration:** JavaScript/Python naturally parse JSON

**Trade-off:** Slightly less efficient than native types, but more flexible

### 7.3 Why SERIALIZABLE for Cost Tracking?

**Decision:** Use SERIALIZABLE isolation for `track_campaign_cost`

**Rationale:**
1. **Critical Operation:** Cost tracking MUST be accurate
2. **Concurrent Updates:** Multiple processes update costs simultaneously
3. **Lost Update Prevention:** READ COMMITTED can lose updates
4. **Financial Accuracy:** Costs are monetary values, cannot be incorrect

**Trade-off:** Slightly slower, but ensures correctness

### 7.4 Why Row-Level Locking for Statistics?

**Decision:** Use `SELECT FOR UPDATE` in `update_campaign_statistics`

**Rationale:**
1. **Frequent Updates:** Statistics updated often during campaign execution
2. **Prevents Conflicts:** Multiple processes calling updateStatistics()
3. **Performance:** Row-level locking allows concurrent updates to different campaigns
4. **Simpler Than SERIALIZABLE:** READ COMMITTED + FOR UPDATE is sufficient

**Trade-off:** Processes must wait for lock, but only for specific campaign row

### 7.5 Why Batch Functions?

**Decision:** Create `insert_businesses_batch` and `update_enrichment_batch`

**Rationale:**
1. **Performance:** Single database round-trip for multiple records
2. **Atomicity:** All records inserted/updated or none
3. **Network Efficiency:** Reduces Supabase API calls
4. **Cost Savings:** Fewer database connections

**Trade-off:** More complex error handling for batch failures

### 7.6 Why Snake_Case?

**Decision:** Use snake_case for all database identifiers

**Rationale:**
1. **PostgreSQL Convention:** Standard for PostgreSQL
2. **Consistency:** Matches existing table/column names
3. **Readability:** Easier to read than camelCase in SQL
4. **Compatibility:** Works with all database tools

**Trade-off:** Different from JavaScript camelCase, but worth consistency

---

## 8. Next Steps

### 8.1 Implementation Phase

1. **Wave 3 (Current):** Implement all 8 stored functions
2. **Wave 4:** Integrate functions into application code
3. **Wave 5:** Test with real campaign data
4. **Wave 6:** Deploy to production

### 8.2 Success Criteria

Functions are ready for production when:

✅ All 8 functions implemented and tested
✅ Integration tests pass in both JavaScript and Python
✅ Concurrency tests show no data corruption
✅ Performance benchmarks meet requirements (<1s for most operations)
✅ Error handling verified with all error scenarios
✅ Documentation complete and reviewed

### 8.3 Rollout Strategy

**Phase 1: Soft Launch (Week 1)**
- Deploy functions to production
- Keep application logic as fallback
- Monitor function performance
- Fix any issues

**Phase 2: Gradual Migration (Week 2)**
- Switch 25% of operations to stored functions
- Monitor for errors
- Increase to 50%, then 75%

**Phase 3: Full Migration (Week 3)**
- Switch 100% to stored functions
- Remove old application logic
- Monitor and optimize

---

## Appendix A: Quick Reference

### Function Summary Table

| Function Name | Purpose | Critical? | Isolation Level |
|---------------|---------|-----------|----------------|
| `create_campaign_with_coverage` | Create campaign + ZIP codes | No | READ COMMITTED |
| `insert_businesses_batch` | Batch insert businesses | No | READ COMMITTED |
| `update_campaign_statistics` | Update campaign totals | Yes | READ COMMITTED + FOR UPDATE |
| `track_campaign_cost` | Track API costs | **CRITICAL** | **SERIALIZABLE** |
| `update_coverage_status` | Mark ZIP as scraped | No | READ COMMITTED |
| `update_enrichment_batch` | Batch update enrichments | No | READ COMMITTED |
| `update_email_verification` | Update email verification | No | READ COMMITTED |
| `get_businesses_for_enrichment` | Fetch businesses for enrichment | No | READ COMMITTED |

### Error Code Quick Reference

| SQLSTATE | Retry? | User Message |
|----------|--------|--------------|
| 23505 | No | "Duplicate record detected" |
| 23503 | No | "Referenced record not found" |
| 40P01 | Yes (3x) | "Operation conflict, please retry" |
| 40001 | Yes (3x) | "Concurrent modification, please retry" |
| 55P03 | Yes (3x) | "Resource busy, please retry" |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-13 | Claude Code | Initial design document |

---

**End of Architecture Design Document**
