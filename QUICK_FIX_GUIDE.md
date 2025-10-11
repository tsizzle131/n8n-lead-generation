# Quick Fix Guide: Email Source Tracking Bug

## TL;DR

The `email_source` field was NULL in all business records. Fixed in Python code + created migration to backfill existing data.

## Apply Fix in 3 Steps

### 1. Code is Already Fixed ✅

Files modified:
- `/lead_generation/modules/gmaps_supabase_manager.py`

### 2. Run Backfill Migration

**Easiest Method - Supabase Dashboard:**
```
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste: migrations/backfill_email_source.sql
3. Click "Run"
4. Check output for success message
```

**Alternative - Command Line:**
```bash
# Option A: Using psql
psql 'your-connection-string' -f migrations/backfill_email_source.sql

# Option B: Using Python helper
python scripts/backfill_email_source.py
```

### 3. Verify Fix

**Quick Check - SQL:**
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM gmaps_businesses WHERE email_source IS NULL;
```

**Comprehensive Test:**
```bash
python tests/test_email_source_tracking.py
```

## What Was Fixed

**Problem:**
```python
# BEFORE: email_source was never set
record = {
    "email": business.get("email"),
    # email_source missing!
}
```

**Solution:**
```python
# AFTER: email_source correctly tracked
email = business.get("email")
email_source = "google_maps" if email else "not_found"

record = {
    "email": email,
    "email_source": email_source  # ✅ Fixed
}
```

## Files Changed

1. **Code Fix:** `/lead_generation/modules/gmaps_supabase_manager.py`
2. **Migration:** `/migrations/backfill_email_source.sql`
3. **Test Suite:** `/tests/test_email_source_tracking.py`
4. **Helper Script:** `/scripts/backfill_email_source.py`
5. **Documentation:** `/EMAIL_SOURCE_TRACKING_FIX.md` (detailed)

## Expected Results

After fix, `email_source` distribution:
- `not_found`: 60-70% (businesses without emails)
- `google_maps`: 20-30% (emails from initial scrape)
- `facebook`: 10-15% (emails from Facebook enrichment)
- `NULL`: 0% (none!)

## Need Help?

See full documentation: `/EMAIL_SOURCE_TRACKING_FIX.md`
