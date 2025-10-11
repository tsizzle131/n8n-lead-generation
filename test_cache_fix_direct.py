#!/usr/bin/env python3
"""
Direct test of PostgREST schema cache fix
Uses known business/campaign IDs to test if PGRST204 error is resolved
"""

import sys
import os

# Add lead_generation to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lead_generation'))

from modules.gmaps_supabase_manager import GmapsSupabaseManager
import logging

logging.basicConfig(level=logging.INFO)

# Known IDs from database
CAMPAIGN_ID = '8c3eefa1-c48d-4fce-a311-b0548895b442'
BUSINESS_ID = '9df984bd-01b4-42ae-be1b-923acd8c95b0'

def test_cache_fix():
    """Test that schema cache refresh fixed the PGRST204 error"""

    print("=" * 80)
    print("TESTING: PostgREST Schema Cache Fix (Direct Test)")
    print("=" * 80)
    print()
    print(f"Campaign ID: {CAMPAIGN_ID}")
    print(f"Business ID: {BUSINESS_ID}")
    print()

    manager = GmapsSupabaseManager()

    # Create test enrichment data that mimics scraper output
    test_enrichment = {
        'linkedin_url': 'https://www.linkedin.com/company/test-schema-cache',
        'profile_type': 'company',
        'person_name': 'Test Person',
        'person_title': 'Test Title',
        'person_profile_url': 'https://www.linkedin.com/in/test-person',
        'company': 'Test Company',
        'location': 'Test Location',
        'connections': 500,

        # These were causing PGRST204 errors before cache refresh
        'emails_found': ['found@test.com'],
        'emails_generated': ['generated1@test.com', 'generated2@test.com'],  # Array
        'primary_email': 'found@test.com',
        'email_source': 'linkedin_public',
        'phone_numbers': ['+1234567890'],

        # Hybrid enrichment fields (also were in cache issue)
        'email_extraction_attempted': True,
        'email_verified_source': 'linkedin_verified',
        'phone_number': '+1234567890',
        'email_quality_tier': 2,

        # Bouncer fields
        'bouncer_status': 'deliverable',
        'bouncer_score': 95,
        'bouncer_reason': 'Valid email',
        'bouncer_verified': True,
        'bouncer_is_safe': True,
        'bouncer_is_disposable': False,
        'bouncer_is_role_based': False,
        'bouncer_is_free_email': False,
    }

    print("Test enrichment data includes:")
    print(f"  • emails_generated (array): {test_enrichment['emails_generated']}")
    print(f"  • email_quality_tier: {test_enrichment['email_quality_tier']}")
    print(f"  • email_verified_source: {test_enrichment['email_verified_source']}")
    print(f"  • email_extraction_attempted: {test_enrichment['email_extraction_attempted']}")
    print(f"  • bouncer fields: status, score, verified, etc.")
    print()

    print("Attempting to save LinkedIn enrichment...")
    print("(This was failing with PGRST204 error before cache refresh)")
    print()

    try:
        result = manager.save_linkedin_enrichment(
            business_id=BUSINESS_ID,
            campaign_id=CAMPAIGN_ID,
            enrichment_data=test_enrichment
        )

        if result:
            print("=" * 80)
            print("✅ SUCCESS!")
            print("=" * 80)
            print()
            print("LinkedIn enrichment saved successfully!")
            print("PostgREST schema cache refresh WORKED!")
            print()
            print("The PGRST204 error is FIXED.")
            print()
            print("Next steps:")
            print("  1. Decide on emails_generated type (BOOLEAN vs TEXT[])")
            print("  2. Update code if needed")
            print("  3. Setup auto-refresh trigger")
            return True
        else:
            print("=" * 80)
            print("❌ FAILED")
            print("=" * 80)
            print()
            print("Save returned False - check error logs above")
            return False

    except Exception as e:
        print("=" * 80)
        print("❌ ERROR")
        print("=" * 80)
        print()
        print(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_cache_fix()
    sys.exit(0 if success else 1)
