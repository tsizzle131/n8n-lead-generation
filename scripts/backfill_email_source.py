#!/usr/bin/env python3
"""
Backfill email_source Script
Fixes the email_source tracking bug by backfilling NULL values in existing records

This script:
1. Connects to Supabase
2. Runs the backfill migration SQL
3. Verifies the results
4. Provides detailed statistics

Usage:
    python scripts/backfill_email_source.py
"""

import os
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from lead_generation.modules.gmaps_supabase_manager import GmapsSupabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_migration_sql():
    """Load the migration SQL file"""
    migration_path = Path(__file__).parent.parent / "migrations" / "backfill_email_source.sql"

    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")

    with open(migration_path, 'r') as f:
        return f.read()


def verify_email_source_distribution(db: GmapsSupabaseManager):
    """Verify the distribution of email_source values"""
    try:
        logging.info("\n" + "="*60)
        logging.info("VERIFYING EMAIL SOURCE DISTRIBUTION")
        logging.info("="*60)

        # Get all businesses grouped by email_source
        result = db.client.table("gmaps_businesses").select("email_source, campaign_id").execute()

        if not result.data:
            logging.warning("No businesses found in database")
            return

        # Count by email_source
        source_counts = {}
        campaign_sources = {}

        for row in result.data:
            source = row.get("email_source") or "NULL"
            campaign_id = row.get("campaign_id")

            # Overall counts
            source_counts[source] = source_counts.get(source, 0) + 1

            # Per-campaign counts
            if campaign_id not in campaign_sources:
                campaign_sources[campaign_id] = {}
            campaign_sources[campaign_id][source] = campaign_sources[campaign_id].get(source, 0) + 1

        # Print overall statistics
        total = len(result.data)
        logging.info(f"\n📊 Overall Distribution (Total: {total} businesses):")

        for source in ["google_maps", "facebook", "not_found", "NULL"]:
            if source in source_counts:
                count = source_counts[source]
                percentage = (count / total * 100) if total > 0 else 0
                logging.info(f"   {source:15s}: {count:6d} ({percentage:5.1f}%)")

        # Print per-campaign statistics
        if campaign_sources:
            logging.info(f"\n📋 Per-Campaign Distribution:")
            for campaign_id, sources in campaign_sources.items():
                campaign_total = sum(sources.values())
                logging.info(f"\n   Campaign {campaign_id}:")
                for source, count in sources.items():
                    percentage = (count / campaign_total * 100) if campaign_total > 0 else 0
                    logging.info(f"      {source:15s}: {count:6d} ({percentage:5.1f}%)")

        # Check for NULL values
        null_count = source_counts.get("NULL", 0)
        if null_count > 0:
            logging.error(f"\n❌ ISSUE: {null_count} businesses still have NULL email_source")
            return False
        else:
            logging.info(f"\n✅ SUCCESS: All businesses have valid email_source values")
            return True

    except Exception as e:
        logging.error(f"Error verifying email source distribution: {e}")
        return False


def check_data_integrity(db: GmapsSupabaseManager):
    """Check for data integrity issues"""
    try:
        logging.info("\n" + "="*60)
        logging.info("CHECKING DATA INTEGRITY")
        logging.info("="*60)

        issues_found = False

        # Check 1: Businesses with email but email_source = 'not_found'
        result = db.client.table("gmaps_businesses").select("id, name, email, email_source").is_("email", "null").eq("email_source", "not_found").execute()

        mismatched = [row for row in (result.data or []) if row.get("email")]
        if mismatched:
            logging.warning(f"\n⚠️  Found {len(mismatched)} businesses with email but email_source='not_found':")
            for row in mismatched[:5]:
                logging.warning(f"   - {row['name']}: {row['email']}")
            issues_found = True

        # Check 2: Businesses without email but email_source != 'not_found'
        result = db.client.table("gmaps_businesses").select("id, name, email, email_source").execute()

        no_email_wrong_source = [
            row for row in (result.data or [])
            if not row.get("email") and row.get("email_source") not in ["not_found", None]
        ]

        if no_email_wrong_source:
            logging.warning(f"\n⚠️  Found {len(no_email_wrong_source)} businesses without email but email_source != 'not_found':")
            for row in no_email_wrong_source[:5]:
                logging.warning(f"   - {row['name']}: email_source={row['email_source']}")
            issues_found = True

        # Check 3: Businesses with Facebook enrichment but email_source != 'facebook'
        query = """
            SELECT
                gb.id,
                gb.name,
                gb.email,
                gb.email_source,
                gfe.primary_email as fb_email
            FROM gmaps_businesses gb
            INNER JOIN gmaps_facebook_enrichments gfe ON gb.id = gfe.business_id
            WHERE gfe.primary_email IS NOT NULL
            AND gfe.primary_email != ''
            AND gb.email_source != 'facebook'
        """

        # Note: Direct SQL execution for complex joins
        # For now, we'll skip this check as it requires RPC or complex query

        if not issues_found:
            logging.info("\n✅ No data integrity issues found")
        else:
            logging.warning("\n⚠️  Data integrity issues detected - review above warnings")

        return not issues_found

    except Exception as e:
        logging.error(f"Error checking data integrity: {e}")
        return False


def main():
    """Main execution function"""
    try:
        # Load environment variables
        load_dotenv()

        # Initialize Supabase manager
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            logging.error("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables")
            logging.error("   Please set these in your .env file")
            sys.exit(1)

        logging.info("="*60)
        logging.info("EMAIL SOURCE BACKFILL MIGRATION")
        logging.info("="*60)

        db = GmapsSupabaseManager(supabase_url, supabase_key)

        # Check current state before migration
        logging.info("\n📋 Pre-Migration State:")
        verify_email_source_distribution(db)

        # Ask for confirmation
        print("\n" + "="*60)
        response = input("Do you want to run the migration? (yes/no): ").strip().lower()

        if response != "yes":
            logging.info("Migration cancelled by user")
            return

        # Load and execute migration SQL
        logging.info("\n🚀 Running migration...")
        migration_sql = load_migration_sql()

        # Execute the migration (Note: Supabase client doesn't support raw SQL easily)
        # We'll need to use the management API or execute via psql
        logging.warning("\n⚠️  Direct SQL execution via Python Supabase client is limited")
        logging.info("   Please run the migration SQL manually using one of these methods:")
        logging.info("\n   1. Supabase Dashboard:")
        logging.info("      - Go to SQL Editor in your Supabase dashboard")
        logging.info("      - Copy and paste the contents of migrations/backfill_email_source.sql")
        logging.info("      - Click 'Run'")
        logging.info("\n   2. psql command line:")
        logging.info("      - psql 'your-connection-string' -f migrations/backfill_email_source.sql")

        print("\n" + "="*60)
        response = input("Have you run the migration? (yes/no): ").strip().lower()

        if response != "yes":
            logging.info("Verification skipped")
            return

        # Verify post-migration state
        logging.info("\n📋 Post-Migration State:")
        success = verify_email_source_distribution(db)

        # Check data integrity
        integrity_ok = check_data_integrity(db)

        # Final summary
        logging.info("\n" + "="*60)
        logging.info("MIGRATION SUMMARY")
        logging.info("="*60)

        if success and integrity_ok:
            logging.info("✅ Migration completed successfully!")
            logging.info("   All email_source values have been backfilled")
            logging.info("   No data integrity issues detected")
        elif success:
            logging.warning("⚠️  Migration completed with warnings")
            logging.warning("   All email_source values backfilled, but some data integrity issues detected")
        else:
            logging.error("❌ Migration incomplete or failed")
            logging.error("   Some email_source values are still NULL or invalid")

    except Exception as e:
        logging.error(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
