# Transaction Requirements and Isolation Levels

**Date:** 2025-10-12
**Purpose:** Detailed transaction requirements for implementing stored procedures with ACID guarantees

---

## Overview

This document specifies the exact transaction requirements for each of the 8 critical operations that need atomic transaction boundaries. Each operation is analyzed for:

1. **Atomicity Requirements** - What must succeed or fail together
2. **Consistency Rules** - Data integrity constraints to maintain
3. **Isolation Level** - Recommended PostgreSQL isolation level
4. **Concurrency Concerns** - Race conditions and locking strategy
5. **Error Handling** - Rollback scenarios and retry logic

---

## Transaction Requirements by Operation

### Operation 1: Save Facebook Enrichment

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION save_facebook_enrichment_tx(
    p_business_id UUID,
    p_campaign_id UUID,
    p_enrichment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrichment_id UUID;
    v_result JSONB;
BEGIN
    -- Start transaction (implicit)

    -- 1. INSERT enrichment record
    INSERT INTO gmaps_facebook_enrichments (
        business_id,
        campaign_id,
        facebook_url,
        page_name,
        emails,
        primary_email,
        email_sources,
        phone_numbers,
        success,
        error_message,
        raw_data,
        enrichment_source
    ) VALUES (
        p_business_id,
        p_campaign_id,
        p_enrichment_data->>'facebook_url',
        p_enrichment_data->>'page_name',
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'emails')),
        p_enrichment_data->>'primary_email',
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'email_sources')),
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'phone_numbers')),
        (p_enrichment_data->>'success')::BOOLEAN,
        p_enrichment_data->>'error_message',
        p_enrichment_data->'raw_data',
        'facebook_scraper'
    )
    RETURNING id INTO v_enrichment_id;

    -- 2. UPDATE business record
    UPDATE gmaps_businesses
    SET
        email = CASE
            WHEN p_enrichment_data->>'primary_email' IS NOT NULL
            THEN p_enrichment_data->>'primary_email'
            ELSE email
        END,
        email_source = CASE
            WHEN p_enrichment_data->>'primary_email' IS NOT NULL
            THEN 'facebook'
            ELSE email_source
        END,
        enrichment_status = CASE
            WHEN (p_enrichment_data->>'success')::BOOLEAN = TRUE
            THEN 'enriched'
            ELSE 'failed'
        END,
        enrichment_attempts = enrichment_attempts + 1,
        last_enrichment_attempt = NOW(),
        updated_at = NOW()
    WHERE id = p_business_id;

    -- Check if business was actually updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business with id % not found', p_business_id;
    END IF;

    -- Build success response
    v_result = jsonb_build_object(
        'success', true,
        'enrichment_id', v_enrichment_id,
        'business_id', p_business_id
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Transaction automatically rolled back
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ INSERT into `gmaps_facebook_enrichments` AND UPDATE `gmaps_businesses` must both succeed
- ✅ If business update fails, enrichment record must not exist (rollback)
- ✅ If enrichment insert fails, business remains unchanged

**Consistency Rules:**
- Email source priority: If Facebook finds email, it should override `google_maps` but not `linkedin`
- `enrichment_status` must be 'enriched' if `success = TRUE`, 'failed' if `success = FALSE`
- `enrichment_attempts` must be incremented exactly once per attempt

**Isolation Level:** `READ COMMITTED` (default)
- Sufficient because operation targets single business row
- No multi-row aggregation or complex reads

**Concurrency Concerns:**
- **Risk:** Two workers enrich same business simultaneously
- **Solution:** FK constraint prevents duplicate enrichments (business_id is unique in practice)
- **Additional:** Consider adding `WHERE linkedin_enriched = FALSE` to UPDATE to prevent overwriting LinkedIn emails

**Error Handling:**
- Foreign key violation if `business_id` doesn't exist → Return error JSONB
- Unique constraint violation if enrichment already exists → Decide: update or skip
- Network failure during transaction → Automatic rollback

**Retry Logic:**
- Safe to retry on network/timeout errors
- Check for existing enrichment first to avoid duplicates

---

### Operation 2: Save LinkedIn Enrichment

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION save_linkedin_enrichment_tx(
    p_business_id UUID,
    p_campaign_id UUID,
    p_enrichment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enrichment_id UUID;
    v_result JSONB;
BEGIN
    -- 1. INSERT enrichment record
    INSERT INTO gmaps_linkedin_enrichments (
        business_id,
        campaign_id,
        linkedin_url,
        profile_type,
        person_name,
        person_title,
        person_profile_url,
        company_name,
        location,
        connections,
        emails_found,
        emails_generated,
        primary_email,
        email_source,
        phone_numbers,
        phone_number,
        email_extraction_attempted,
        email_verified_source,
        email_quality_tier,
        bouncer_status,
        bouncer_score,
        bouncer_reason,
        bouncer_verified_at,
        bouncer_raw_response,
        email_verified,
        is_safe,
        is_disposable,
        is_role_based,
        is_free_email,
        error_message
    ) VALUES (
        p_business_id,
        p_campaign_id,
        p_enrichment_data->>'linkedin_url',
        p_enrichment_data->>'profile_type',
        p_enrichment_data->>'person_name',
        p_enrichment_data->>'person_title',
        p_enrichment_data->>'person_profile_url',
        p_enrichment_data->>'company_name',
        p_enrichment_data->>'location',
        (p_enrichment_data->>'connections')::INTEGER,
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'emails_found')),
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'emails_generated')),
        p_enrichment_data->>'primary_email',
        p_enrichment_data->>'email_source',
        ARRAY(SELECT jsonb_array_elements_text(p_enrichment_data->'phone_numbers')),
        p_enrichment_data->>'phone_number',
        (p_enrichment_data->>'email_extraction_attempted')::BOOLEAN,
        p_enrichment_data->>'email_verified_source',
        p_enrichment_data->>'email_quality_tier',
        p_enrichment_data->>'bouncer_status',
        (p_enrichment_data->>'bouncer_score')::INTEGER,
        p_enrichment_data->>'bouncer_reason',
        (p_enrichment_data->>'bouncer_verified_at')::TIMESTAMPTZ,
        p_enrichment_data->'bouncer_raw_response',
        (p_enrichment_data->>'bouncer_verified')::BOOLEAN,
        (p_enrichment_data->>'bouncer_is_safe')::BOOLEAN,
        (p_enrichment_data->>'bouncer_is_disposable')::BOOLEAN,
        (p_enrichment_data->>'bouncer_is_role_based')::BOOLEAN,
        (p_enrichment_data->>'bouncer_is_free_email')::BOOLEAN,
        p_enrichment_data->>'error'
    )
    RETURNING id INTO v_enrichment_id;

    -- 2. UPDATE business record
    UPDATE gmaps_businesses
    SET
        linkedin_url = p_enrichment_data->>'linkedin_url',
        linkedin_enriched = TRUE,
        email = CASE
            WHEN p_enrichment_data->>'primary_email' IS NOT NULL
            THEN p_enrichment_data->>'primary_email'
            ELSE email
        END,
        email_source = CASE
            WHEN p_enrichment_data->>'primary_email' IS NOT NULL
            THEN 'linkedin'
            ELSE email_source
        END,
        updated_at = NOW()
    WHERE id = p_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business with id % not found', p_business_id;
    END IF;

    v_result = jsonb_build_object(
        'success', true,
        'enrichment_id', v_enrichment_id,
        'business_id', p_business_id
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ INSERT into `gmaps_linkedin_enrichments` AND UPDATE `gmaps_businesses` must both succeed
- ✅ `linkedin_enriched` flag must be set atomically with enrichment record creation

**Consistency Rules:**
- LinkedIn emails ALWAYS take priority over Facebook/Google Maps
- `linkedin_enriched = TRUE` if and only if enrichment record exists
- Email quality tracking fields must be consistent

**Isolation Level:** `READ COMMITTED`

**Concurrency Concerns:**
- **Risk:** Multiple workers attempt LinkedIn enrichment on same business
- **Solution:** Check `linkedin_enriched = FALSE` before starting
- **Note:** First write wins; subsequent attempts should skip

**Error Handling:**
- FK violation → business doesn't exist
- Duplicate enrichment → Skip or update existing

---

### Operation 3: Create Campaign with Coverage

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION create_campaign_with_coverage_tx(
    p_campaign_data JSONB,
    p_coverage_data JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
    v_coverage_record JSONB;
    v_inserted_count INTEGER := 0;
    v_result JSONB;
BEGIN
    -- 1. INSERT campaign
    INSERT INTO gmaps_campaigns (
        name,
        description,
        keywords,
        location,
        coverage_profile,
        custom_zip_codes,
        status,
        target_zip_count,
        actual_zip_count,
        coverage_percentage,
        estimated_cost,
        total_businesses_found,
        total_emails_found,
        total_facebook_pages_found,
        organization_id,
        created_by
    ) VALUES (
        p_campaign_data->>'name',
        p_campaign_data->>'description',
        ARRAY(SELECT jsonb_array_elements_text(p_campaign_data->'keywords')),
        p_campaign_data->>'location',
        p_campaign_data->>'coverage_profile',
        ARRAY(SELECT jsonb_array_elements_text(p_campaign_data->'custom_zip_codes')),
        'draft',
        (p_campaign_data->>'target_zip_count')::INTEGER,
        (p_campaign_data->>'actual_zip_count')::INTEGER,
        (p_campaign_data->>'coverage_percentage')::DECIMAL,
        (p_campaign_data->>'estimated_cost')::DECIMAL,
        0, -- total_businesses_found
        0, -- total_emails_found
        0, -- total_facebook_pages_found
        (p_campaign_data->>'organization_id')::UUID,
        p_campaign_data->>'created_by'
    )
    RETURNING id INTO v_campaign_id;

    -- 2. INSERT coverage records (batch)
    FOREACH v_coverage_record IN ARRAY p_coverage_data
    LOOP
        INSERT INTO gmaps_campaign_coverage (
            campaign_id,
            zip_code,
            keywords,
            max_results,
            estimated_cost,
            scraped,
            businesses_found,
            emails_found
        ) VALUES (
            v_campaign_id,
            v_coverage_record->>'zip_code',
            ARRAY(SELECT jsonb_array_elements_text(v_coverage_record->'keywords')),
            COALESCE((v_coverage_record->>'max_results')::INTEGER, 200),
            (v_coverage_record->>'estimated_cost')::DECIMAL,
            FALSE,
            0,
            0
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- Verify all coverage records inserted
    IF v_inserted_count != array_length(p_coverage_data, 1) THEN
        RAISE EXCEPTION 'Coverage insertion failed: expected %, got %',
            array_length(p_coverage_data, 1), v_inserted_count;
    END IF;

    v_result = jsonb_build_object(
        'success', true,
        'campaign_id', v_campaign_id,
        'coverage_count', v_inserted_count
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ Campaign INSERT and ALL coverage INSERTs must succeed together
- ✅ If ANY coverage insert fails, entire operation rolls back (no campaign created)

**Consistency Rules:**
- `target_zip_count` must equal `array_length(coverage_data)`
- No duplicate ZIP codes for same campaign (UNIQUE constraint)
- All coverage records start with `scraped = FALSE`, `businesses_found = 0`

**Isolation Level:** `READ COMMITTED`

**Concurrency Concerns:**
- **Risk:** Minimal - campaign creation is single-user operation
- **Note:** Unique campaign names not enforced (business decision)

**Error Handling:**
- Unique constraint violation on (campaign_id, zip_code) → Shouldn't happen on creation
- Invalid data types → Rollback entire operation

**Performance Consideration:**
- For campaigns with 100+ ZIP codes, batch size may impact transaction duration
- Consider chunking coverage inserts if needed (but maintain atomicity)

---

### Operation 4-6: Update Email Verification

**SQL Operation (Generic for all sources):**
```sql
CREATE OR REPLACE FUNCTION update_email_verification_tx(
    p_source VARCHAR(50),  -- 'google_maps', 'facebook', 'linkedin'
    p_target_id UUID,      -- business_id or enrichment_id
    p_verification_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
    v_result JSONB;
BEGIN
    -- Update based on source
    IF p_source = 'facebook' THEN
        -- Get business_id from enrichment
        SELECT business_id INTO v_business_id
        FROM gmaps_facebook_enrichments
        WHERE id = p_target_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Facebook enrichment % not found', p_target_id;
        END IF;

        -- Update Facebook enrichment
        UPDATE gmaps_facebook_enrichments
        SET
            email_verified = TRUE,
            bouncer_status = p_verification_data->>'status',
            bouncer_score = (p_verification_data->>'score')::INTEGER,
            bouncer_reason = p_verification_data->>'reason',
            is_safe = (p_verification_data->>'is_safe')::BOOLEAN,
            is_disposable = (p_verification_data->>'is_disposable')::BOOLEAN,
            is_role_based = (p_verification_data->>'is_role_based')::BOOLEAN,
            is_free_email = (p_verification_data->>'is_free_email')::BOOLEAN,
            bouncer_verified_at = NOW(),
            bouncer_raw_response = p_verification_data->'raw_response'
        WHERE id = p_target_id;

        -- Insert verification log
        INSERT INTO gmaps_email_verifications (
            business_id,
            facebook_enrichment_id,
            email,
            source,
            status,
            score,
            is_safe,
            is_disposable,
            is_role_based,
            is_free_email,
            is_gibberish,
            domain,
            provider,
            mx_records,
            smtp_check,
            reason,
            suggestion,
            raw_response
        ) VALUES (
            v_business_id,
            p_target_id,
            p_verification_data->>'email',
            'facebook',
            p_verification_data->>'status',
            (p_verification_data->>'score')::DECIMAL,
            (p_verification_data->>'is_safe')::BOOLEAN,
            (p_verification_data->>'is_disposable')::BOOLEAN,
            (p_verification_data->>'is_role_based')::BOOLEAN,
            (p_verification_data->>'is_free_email')::BOOLEAN,
            (p_verification_data->>'is_gibberish')::BOOLEAN,
            p_verification_data->>'domain',
            p_verification_data->>'provider',
            (p_verification_data->>'mx_records')::BOOLEAN,
            (p_verification_data->>'smtp_check')::BOOLEAN,
            p_verification_data->>'reason',
            p_verification_data->>'suggestion',
            p_verification_data->'raw_response'
        );

    ELSIF p_source = 'linkedin' THEN
        -- Similar for LinkedIn
        SELECT business_id INTO v_business_id
        FROM gmaps_linkedin_enrichments
        WHERE id = p_target_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'LinkedIn enrichment % not found', p_target_id;
        END IF;

        UPDATE gmaps_linkedin_enrichments
        SET
            email_verified = TRUE,
            bouncer_status = p_verification_data->>'status',
            bouncer_score = (p_verification_data->>'score')::INTEGER,
            bouncer_reason = p_verification_data->>'reason',
            is_safe = (p_verification_data->>'is_safe')::BOOLEAN,
            is_disposable = (p_verification_data->>'is_disposable')::BOOLEAN,
            is_role_based = (p_verification_data->>'is_role_based')::BOOLEAN,
            is_free_email = (p_verification_data->>'is_free_email')::BOOLEAN,
            bouncer_verified_at = NOW(),
            bouncer_raw_response = p_verification_data->'raw_response'
        WHERE id = p_target_id;

        INSERT INTO gmaps_email_verifications (
            business_id,
            linkedin_enrichment_id,
            email,
            source,
            status,
            score,
            is_safe,
            is_disposable,
            is_role_based,
            is_free_email,
            is_gibberish,
            domain,
            provider,
            mx_records,
            smtp_check,
            reason,
            suggestion,
            raw_response
        ) VALUES (
            v_business_id,
            p_target_id,
            p_verification_data->>'email',
            'linkedin',
            p_verification_data->>'status',
            (p_verification_data->>'score')::DECIMAL,
            (p_verification_data->>'is_safe')::BOOLEAN,
            (p_verification_data->>'is_disposable')::BOOLEAN,
            (p_verification_data->>'is_role_based')::BOOLEAN,
            (p_verification_data->>'is_free_email')::BOOLEAN,
            (p_verification_data->>'is_gibberish')::BOOLEAN,
            p_verification_data->>'domain',
            p_verification_data->>'provider',
            (p_verification_data->>'mx_records')::BOOLEAN,
            (p_verification_data->>'smtp_check')::BOOLEAN,
            p_verification_data->>'reason',
            p_verification_data->>'suggestion',
            p_verification_data->'raw_response'
        );

    ELSIF p_source = 'google_maps' THEN
        -- Direct business update
        v_business_id := p_target_id;

        UPDATE gmaps_businesses
        SET
            email_verified = TRUE,
            bouncer_status = p_verification_data->>'status',
            bouncer_score = (p_verification_data->>'score')::INTEGER,
            bouncer_reason = p_verification_data->>'reason',
            is_safe = (p_verification_data->>'is_safe')::BOOLEAN,
            is_disposable = (p_verification_data->>'is_disposable')::BOOLEAN,
            is_role_based = (p_verification_data->>'is_role_based')::BOOLEAN,
            is_free_email = (p_verification_data->>'is_free_email')::BOOLEAN,
            bouncer_verified_at = NOW()
        WHERE id = p_target_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Business % not found', p_target_id;
        END IF;

        INSERT INTO gmaps_email_verifications (
            business_id,
            email,
            source,
            status,
            score,
            is_safe,
            is_disposable,
            is_role_based,
            is_free_email,
            is_gibberish,
            domain,
            provider,
            mx_records,
            smtp_check,
            reason,
            suggestion,
            raw_response
        ) VALUES (
            v_business_id,
            p_verification_data->>'email',
            'google_maps',
            p_verification_data->>'status',
            (p_verification_data->>'score')::DECIMAL,
            (p_verification_data->>'is_safe')::BOOLEAN,
            (p_verification_data->>'is_disposable')::BOOLEAN,
            (p_verification_data->>'is_role_based')::BOOLEAN,
            (p_verification_data->>'is_free_email')::BOOLEAN,
            (p_verification_data->>'is_gibberish')::BOOLEAN,
            p_verification_data->>'domain',
            p_verification_data->>'provider',
            (p_verification_data->>'mx_records')::BOOLEAN,
            (p_verification_data->>'smtp_check')::BOOLEAN,
            p_verification_data->>'reason',
            p_verification_data->>'suggestion',
            p_verification_data->'raw_response'
        );
    ELSE
        RAISE EXCEPTION 'Invalid source: %', p_source;
    END IF;

    v_result = jsonb_build_object(
        'success', true,
        'business_id', v_business_id,
        'source', p_source
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ UPDATE enrichment/business AND INSERT verification log must both succeed
- ✅ Verification log provides audit trail - must not be lost

**Consistency Rules:**
- `email_verified = TRUE` if and only if verification log exists
- `bouncer_status` must match verification result
- All verification fields must be updated together

**Isolation Level:** `READ COMMITTED`

**Concurrency Concerns:**
- **Risk:** Same email verified multiple times
- **Solution:** Idempotent - checking if already verified before calling
- **Log:** Verification log allows duplicate entries (tracks all verification attempts)

**Error Handling:**
- FK violation → enrichment/business doesn't exist
- Invalid verification data → Rollback

---

### Operation 7: Update Campaign Statistics

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION update_campaign_statistics_tx(
    p_campaign_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_businesses INTEGER;
    v_total_emails INTEGER;
    v_total_facebook INTEGER;
    v_total_linkedin INTEGER;
    v_total_verified INTEGER;
    v_result JSONB;
BEGIN
    -- Use READ COMMITTED isolation for consistent reads
    -- All SELECTs happen at same snapshot within transaction

    -- Count businesses and emails
    SELECT
        COUNT(*),
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END)
    INTO v_total_businesses, v_total_emails
    FROM gmaps_businesses
    WHERE campaign_id = p_campaign_id;

    -- Count Facebook enrichments
    SELECT COUNT(*)
    INTO v_total_facebook
    FROM gmaps_facebook_enrichments
    WHERE campaign_id = p_campaign_id;

    -- Count LinkedIn enrichments and verified emails
    SELECT
        COUNT(*),
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END)
    INTO v_total_linkedin, v_total_verified
    FROM gmaps_linkedin_enrichments
    WHERE campaign_id = p_campaign_id;

    -- Update campaign with consistent counts
    UPDATE gmaps_campaigns
    SET
        total_businesses_found = v_total_businesses,
        total_emails_found = v_total_emails,
        total_facebook_pages_found = v_total_facebook,
        total_linkedin_profiles_found = v_total_linkedin,
        total_verified_emails = v_total_verified,
        updated_at = NOW()
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;

    v_result = jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'statistics', jsonb_build_object(
            'total_businesses', v_total_businesses,
            'total_emails', v_total_emails,
            'total_facebook', v_total_facebook,
            'total_linkedin', v_total_linkedin,
            'total_verified', v_total_verified
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ All COUNT aggregates must be from same transaction snapshot
- ✅ Campaign UPDATE must reflect consistent counts

**Consistency Rules:**
- Statistics must accurately reflect database state at transaction commit time
- Concurrent enrichments may cause slight drift - acceptable

**Isolation Level:** `READ COMMITTED`
- Ensures all reads see consistent snapshot
- Prevents dirty reads from uncommitted transactions
- Acceptable for statistics that tolerate eventual consistency

**Concurrency Concerns:**
- **Risk:** Statistics calculated while enrichments are being added
- **Impact:** Counts may be slightly outdated by commit time
- **Mitigation:** Statistics are informational; periodic refresh acceptable
- **Alternative:** Use REPEATABLE READ for strict consistency (may cause serialization errors)

**Error Handling:**
- Campaign not found → Error
- Safe to retry - idempotent operation

**Performance:**
- COUNTs may be slow for campaigns with 100k+ businesses
- Consider using approximate counts or caching for large datasets
- Index on `campaign_id` is critical

---

### Operation 8: Track API Cost

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION track_api_cost_tx(
    p_campaign_id UUID,
    p_service VARCHAR(50),
    p_cost_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_id UUID;
    v_current_gm_cost DECIMAL;
    v_current_fb_cost DECIMAL;
    v_current_li_cost DECIMAL;
    v_current_bn_cost DECIMAL;
    v_new_actual_cost DECIMAL;
    v_result JSONB;
BEGIN
    -- Lock campaign row to prevent concurrent cost updates
    SELECT
        COALESCE(google_maps_cost, 0),
        COALESCE(facebook_cost, 0),
        COALESCE(linkedin_enrichment_cost, 0),
        COALESCE(bouncer_verification_cost, 0)
    INTO
        v_current_gm_cost,
        v_current_fb_cost,
        v_current_li_cost,
        v_current_bn_cost
    FROM gmaps_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;  -- Row-level lock prevents race conditions

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;

    -- Insert cost record
    INSERT INTO gmaps_api_costs (
        campaign_id,
        service,
        items_processed,
        cost_usd,
        metadata,
        incurred_at
    ) VALUES (
        p_campaign_id,
        p_service,
        (p_cost_data->>'items_processed')::INTEGER,
        (p_cost_data->>'cost_usd')::DECIMAL,
        p_cost_data->'metadata',
        NOW()
    )
    RETURNING id INTO v_cost_id;

    -- Update campaign costs based on service
    IF p_service = 'google_maps' THEN
        v_current_gm_cost := (p_cost_data->>'cost_usd')::DECIMAL;
    ELSIF p_service = 'facebook' THEN
        v_current_fb_cost := (p_cost_data->>'cost_usd')::DECIMAL;
    ELSIF p_service = 'linkedin' THEN
        v_current_li_cost := (p_cost_data->>'cost_usd')::DECIMAL;
    ELSIF p_service = 'bouncer' THEN
        v_current_bn_cost := (p_cost_data->>'cost_usd')::DECIMAL;
    ELSE
        RAISE EXCEPTION 'Invalid service: %', p_service;
    END IF;

    -- Calculate new total cost
    v_new_actual_cost := v_current_gm_cost + v_current_fb_cost +
                         v_current_li_cost + v_current_bn_cost;

    -- Update campaign
    UPDATE gmaps_campaigns
    SET
        google_maps_cost = v_current_gm_cost,
        facebook_cost = v_current_fb_cost,
        linkedin_enrichment_cost = v_current_li_cost,
        bouncer_verification_cost = v_current_bn_cost,
        actual_cost = v_new_actual_cost,
        updated_at = NOW()
    WHERE id = p_campaign_id;

    v_result = jsonb_build_object(
        'success', true,
        'cost_id', v_cost_id,
        'campaign_id', p_campaign_id,
        'service', p_service,
        'actual_cost', v_new_actual_cost
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ INSERT cost record AND UPDATE campaign costs must both succeed
- ✅ `actual_cost` calculation must be based on current values (no race conditions)

**Consistency Rules:**
- `actual_cost` = sum of all service costs
- Cost records must match campaign cost fields
- Each service cost tracks latest API call cost (not cumulative)

**Isolation Level:** `READ COMMITTED` with explicit row lock

**Concurrency Concerns:**
- **CRITICAL:** Multiple workers tracking costs simultaneously
- **Solution:** `SELECT ... FOR UPDATE` locks campaign row
- **Impact:** Serializes cost updates for same campaign
- **Performance:** Short transaction duration minimizes lock contention

**Error Handling:**
- FK violation → campaign doesn't exist
- Invalid service → rollback
- Lock timeout → retry

**Retry Logic:**
- Safe to retry on lock timeout
- Check for duplicate cost records if uncertain

---

### Operation 9: Update Coverage Status

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION update_coverage_status_tx(
    p_campaign_id UUID,
    p_zip_code VARCHAR(10),
    p_results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update coverage record
    UPDATE gmaps_campaign_coverage
    SET
        scraped = TRUE,
        scraped_at = NOW(),
        businesses_found = (p_results->>'businesses_found')::INTEGER,
        emails_found = (p_results->>'emails_found')::INTEGER,
        actual_cost = (p_results->>'actual_cost')::DECIMAL,
        updated_at = NOW()
    WHERE campaign_id = p_campaign_id
      AND zip_code = p_zip_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coverage record for campaign % ZIP % not found',
            p_campaign_id, p_zip_code;
    END IF;

    -- Optionally update campaign aggregates
    -- (Could call update_campaign_statistics_tx separately)

    v_result = jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'zip_code', p_zip_code
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;
```

**Atomicity Requirements:**
- ✅ Coverage UPDATE must be atomic
- ⚠️ Optional campaign statistics update should be separate transaction

**Consistency Rules:**
- `scraped = TRUE` if and only if `scraped_at` is set
- `businesses_found`, `emails_found` must match actual counts from scraping

**Isolation Level:** `READ COMMITTED`

**Concurrency Concerns:**
- **Risk:** Minimal - each ZIP is scraped once
- **Note:** UNIQUE(campaign_id, zip_code) prevents conflicts

**Error Handling:**
- Coverage record not found → error (should exist from campaign creation)

---

### Operation 10: Update Campaign Status

**SQL Operation:**
```sql
CREATE OR REPLACE FUNCTION update_campaign_status_tx(
    p_campaign_id UUID,
    p_new_status VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status VARCHAR(50);
    v_result JSONB;
BEGIN
    -- Get current status with row lock
    SELECT status INTO v_current_status
    FROM gmaps_campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;

    -- Validate state transition
    IF NOT is_valid_status_transition(v_current_status, p_new_status) THEN
        RAISE EXCEPTION 'Invalid status transition: % -> %',
            v_current_status, p_new_status;
    END IF;

    -- Update status with appropriate timestamps
    UPDATE gmaps_campaigns
    SET
        status = p_new_status,
        started_at = CASE
            WHEN p_new_status = 'running' AND v_current_status = 'draft'
            THEN NOW()
            ELSE started_at
        END,
        completed_at = CASE
            WHEN p_new_status IN ('completed', 'failed')
            THEN NOW()
            ELSE completed_at
        END,
        updated_at = NOW()
    WHERE id = p_campaign_id;

    v_result = jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'old_status', v_current_status,
        'new_status', p_new_status
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- Helper function for status validation
CREATE OR REPLACE FUNCTION is_valid_status_transition(
    p_current VARCHAR(50),
    p_new VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_current = 'draft' AND p_new = 'running' THEN TRUE
        WHEN p_current = 'running' AND p_new IN ('paused', 'completed', 'failed') THEN TRUE
        WHEN p_current = 'paused' AND p_new = 'running' THEN TRUE
        ELSE FALSE
    END;
END;
$$;
```

**Atomicity Requirements:**
- ✅ Status change and timestamp updates must be atomic
- ✅ State validation prevents invalid transitions

**Consistency Rules:**
- Valid transitions only:
  - draft → running
  - running → paused | completed | failed
  - paused → running
- `started_at` set when first entering 'running'
- `completed_at` set when entering 'completed' or 'failed'

**Isolation Level:** `READ COMMITTED` with row lock

**Concurrency Concerns:**
- **Risk:** Concurrent status updates
- **Solution:** `SELECT ... FOR UPDATE` ensures serial status changes
- **Note:** Status is critical - must maintain state machine integrity

**Error Handling:**
- Invalid transition → Raise exception, rollback
- Campaign not found → Error

---

## Summary of Isolation Levels

| Operation | Isolation Level | Locking Strategy | Concurrency Risk |
|-----------|----------------|------------------|------------------|
| 1. Facebook Enrichment | READ COMMITTED | None (FK constraints) | Low |
| 2. LinkedIn Enrichment | READ COMMITTED | None (FK constraints) | Low |
| 3. Campaign Creation | READ COMMITTED | None | Very Low |
| 4-6. Email Verification | READ COMMITTED | None | Low |
| 7. Statistics Update | READ COMMITTED | None (eventual consistency OK) | Medium |
| 8. API Cost Tracking | READ COMMITTED | SELECT FOR UPDATE on campaign | HIGH |
| 9. Coverage Update | READ COMMITTED | UNIQUE constraint | Low |
| 10. Status Transition | READ COMMITTED | SELECT FOR UPDATE on campaign | Medium |

---

## Recommendations

1. **Use `SECURITY DEFINER`** for all stored procedures to bypass RLS
2. **Return JSONB** for flexible result handling
3. **Use explicit locks** (SELECT FOR UPDATE) for cost tracking and status changes
4. **Implement retry logic** in application for lock timeouts
5. **Monitor transaction duration** - keep under 100ms when possible
6. **Log failed transactions** for debugging
7. **Test concurrent operations** to verify lock behavior
8. **Consider SERIALIZABLE** for critical operations if READ COMMITTED insufficient
