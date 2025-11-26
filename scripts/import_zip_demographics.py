#!/usr/bin/env python3
"""
Bulk Import ZIP Code Demographics from uszipcode Library

This script imports demographic data for all ~42,000 US ZIP codes from the
uszipcode library into the zip_demographics Supabase table.

Data includes:
- Location: city, state, county, timezone, coordinates
- Population: population, density, housing units
- Economic: median household income, median home value

Usage:
    python scripts/import_zip_demographics.py

Requirements:
    - uszipcode library (pip install uszipcode)
    - supabase library (pip install supabase)
    - SUPABASE_URL and SUPABASE_KEY environment variables
"""

import os
import sys
import logging
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from supabase import create_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_supabase_client():
    """Initialize Supabase client from environment variables."""
    load_dotenv()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment or .env file")

    return create_client(url, key)


def fetch_all_zipcodes() -> List[Any]:
    """Fetch all ZIP codes from uszipcode library."""
    try:
        from uszipcode import SearchEngine
    except ImportError:
        logger.error("uszipcode library not installed. Run: pip install uszipcode")
        sys.exit(1)

    logger.info("Initializing uszipcode SearchEngine (this may take a moment on first run)...")
    search = SearchEngine()

    logger.info("Fetching all ZIP codes from uszipcode database...")
    # query() with returns=None returns all ZIP codes
    all_zips = search.query(returns=None)

    logger.info(f"Found {len(all_zips)} ZIP codes")
    return all_zips


def convert_to_record(zc: Any) -> Dict[str, Any]:
    """Convert a uszipcode Zipcode object to a database record dict."""
    return {
        "zip_code": zc.zipcode,
        "city": zc.major_city,
        "state": zc.state,
        "county": zc.county,
        "timezone": zc.timezone,
        "latitude": float(zc.lat) if zc.lat else None,
        "longitude": float(zc.lng) if zc.lng else None,
        "population": zc.population or 0,
        "population_density": float(zc.population_density) if zc.population_density else None,
        "land_area_sqmi": float(zc.land_area_in_sqmi) if zc.land_area_in_sqmi else None,
        "housing_units": zc.housing_units,
        "median_household_income": zc.median_household_income,
        "median_home_value": zc.median_home_value,
    }


def batch_upsert(supabase, records: List[Dict], batch_size: int = 1000) -> int:
    """Batch upsert records to zip_demographics table."""
    total = len(records)
    imported = 0
    errors = 0

    logger.info(f"Starting batch upsert of {total} records (batch size: {batch_size})...")

    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        try:
            supabase.table('zip_demographics').upsert(
                batch,
                on_conflict='zip_code'
            ).execute()
            imported += len(batch)
            logger.info(f"Progress: {imported:,} / {total:,} ({100 * imported / total:.1f}%)")
        except Exception as e:
            errors += len(batch)
            logger.error(f"Error upserting batch {i}-{i + batch_size}: {e}")

    return imported, errors


def import_all_zipcodes():
    """Main function to import all ZIP codes."""
    logger.info("=" * 60)
    logger.info("ZIP Code Demographics Import")
    logger.info("=" * 60)

    # Initialize Supabase
    logger.info("Connecting to Supabase...")
    supabase = get_supabase_client()

    # Fetch all ZIP codes
    all_zips = fetch_all_zipcodes()

    # Convert to records
    logger.info("Converting ZIP codes to database records...")
    records = []
    skipped = 0

    for zc in all_zips:
        if not zc.zipcode:
            skipped += 1
            continue
        records.append(convert_to_record(zc))

    if skipped > 0:
        logger.warning(f"Skipped {skipped} ZIP codes without valid zip_code")

    logger.info(f"Prepared {len(records)} records for import")

    # Batch upsert
    imported, errors = batch_upsert(supabase, records)

    # Summary
    logger.info("=" * 60)
    logger.info("Import Summary")
    logger.info("=" * 60)
    logger.info(f"Total ZIP codes found: {len(all_zips):,}")
    logger.info(f"Successfully imported: {imported:,}")
    logger.info(f"Errors: {errors:,}")
    logger.info(f"Skipped (invalid): {skipped:,}")

    return imported


def verify_import(supabase) -> Dict[str, Any]:
    """Verify the import by checking counts and sample data."""
    logger.info("Verifying import...")

    # Get count
    result = supabase.table('zip_demographics').select('zip_code', count='exact').execute()
    total = result.count

    # Get state breakdown
    states = supabase.table('zip_demographics').select('state').execute()
    unique_states = len(set(r['state'] for r in states.data if r.get('state')))

    # Sample data
    sample = supabase.table('zip_demographics').select('*').limit(5).execute()

    logger.info(f"Total ZIP codes in database: {total:,}")
    logger.info(f"Unique states: {unique_states}")
    logger.info("Sample data:")
    for row in sample.data:
        logger.info(f"  {row['zip_code']} - {row['city']}, {row['state']} - Pop: {row['population']:,} - Income: ${row['median_household_income'] or 0:,}")

    return {
        "total": total,
        "unique_states": unique_states,
        "sample": sample.data
    }


if __name__ == "__main__":
    try:
        count = import_all_zipcodes()

        # Verify
        logger.info("")
        supabase = get_supabase_client()
        verify_import(supabase)

        logger.info("")
        logger.info(f"Import complete! {count:,} ZIP codes imported.")

    except KeyboardInterrupt:
        logger.info("\nImport cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)
