# Products Table Migration Instructions

## Overview
This migration transforms the system from single-product-per-organization to multi-product catalog support.

## Prerequisites
- [ ] Backup database (Supabase Dashboard → Database → Backups)
- [ ] Confirm all data is saved
- [ ] Have rollback script ready

## Migration Steps

### Step 1: Run Schema Migration
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ndrqixjdddcozjlevieo/sql
2. Click "New Query"
3. Copy contents of `migrations/schema/20251121_001_create_products_table.sql`
4. Paste into SQL Editor
5. Click "Run" (or Cmd/Ctrl + Enter)
6. Verify success messages appear

**Expected output:**
```
✅ Products table created successfully
✅ Organizations table updated (product fields renamed to deprecated)
✅ Campaigns table updated (product_id added)
⏭️  Next step: Run data migration script
```

### Step 2: Run Data Migration
1. In Supabase SQL Editor, click "New Query"
2. Copy contents of `migrations/data/20251121_002_migrate_products_data.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review migration statistics

**Expected output:**
```
========================================
DATA MIGRATION COMPLETE
========================================
Total organizations: X
Organizations with products: X
Total products created: X
Campaigns linked to products: X
========================================
✅ Successfully migrated X products
✅ Linked X campaigns to products
```

### Step 3: Verify Migration
Run this query in SQL Editor to check results:

```sql
-- Check products were created
SELECT
    o.name as organization,
    p.name as product,
    p.is_default,
    p.is_active
FROM organizations o
LEFT JOIN products p ON p.organization_id = o.id
ORDER BY o.name, p.display_order;

-- Check campaigns are linked
SELECT
    c.name as campaign,
    p.name as product,
    o.name as organization
FROM gmaps_campaigns c
JOIN organizations o ON o.id = c.organization_id
LEFT JOIN products p ON p.id = c.product_id
LIMIT 10;
```

## Rollback (if needed)

**ONLY run this if migration fails and you need to revert:**

1. Open Supabase SQL Editor
2. Copy contents of `migrations/rollback/20251121_rollback_products.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify rollback success

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- Products table already exists
- Safe to ignore if running migration multiple times
- Data migration will skip existing products

### Warning: "Organizations do not have products"
- Normal for organizations without product_name set
- These orgs will need products created manually via UI

### Error: "relation products does not exist"
- Schema migration didn't complete
- Run Step 1 again

## Post-Migration Checklist

After successful migration:

- [ ] Verify products appear in database
- [ ] Check all organizations have default_product_id set
- [ ] Verify existing campaigns are linked to products
- [ ] Test creating new product via API
- [ ] Test creating new campaign with product selection
- [ ] Monitor for 24 hours before removing deprecated columns

## Cleanup (After 30 days)

Once migration is stable and tested, run this to remove deprecated columns:

```sql
-- WAIT 30 DAYS BEFORE RUNNING THIS
ALTER TABLE organizations DROP COLUMN product_name_deprecated;
ALTER TABLE organizations DROP COLUMN product_description_deprecated;
ALTER TABLE organizations DROP COLUMN value_proposition_deprecated;
ALTER TABLE organizations DROP COLUMN target_audience_deprecated;
ALTER TABLE organizations DROP COLUMN industry_deprecated;
ALTER TABLE organizations DROP COLUMN product_features_deprecated;
ALTER TABLE organizations DROP COLUMN product_examples_deprecated;
ALTER TABLE organizations DROP COLUMN messaging_tone_deprecated;
ALTER TABLE organizations DROP COLUMN custom_icebreaker_prompt_deprecated;
ALTER TABLE organizations DROP COLUMN product_url_deprecated;
ALTER TABLE organizations DROP COLUMN product_analyzed_at_deprecated;
```

## Contact

If you encounter issues, check:
1. Supabase logs: Dashboard → Logs
2. Error messages in SQL Editor
3. Migration scripts for syntax errors
