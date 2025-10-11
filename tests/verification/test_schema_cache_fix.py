#!/usr/bin/env python3
"""
Quick test to verify PostgREST schema cache refresh worked
Tests if we can now save LinkedIn enrichments without PGRST204 errors
"""

import sys
import os

# Add lead_generation to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lead_generation'))

from modules.gmaps_supabase_manager import GmapsSupabaseManager
import logging

logging.basicConfig(level=logging.INFO)

def test_schema_cache_fix():
    """Test that schema cache refresh fixed the PGRST204 error"""

    print("=" * 80)
    print("TESTING: PostgREST Schema Cache Fix")
    print("=" * 80)
    print()

    manager = GmapsSupabaseManager()

    # Get a real campaign and business to test with
    print("Finding test campaign...")
    campaigns = manager.get_campaigns()

    if not campaigns:
        print("❌ No campaigns found in database")
        return False

    campaign = campaigns[0]
    campaign_id = campaign['id']
    print(f"✓ Using campaign: {campaign.get('name', 'Unnamed')} ({campaign_id})")
    print()

    # Get a business from this campaign
    print("Finding test business...")
    businesses = manager.get_all_businesses(campaign_id)

    if not businesses:
        print("❌ No businesses found in campaign")
        return False

    business = businesses[0]
    business_id = business['id']
    print(f"✓ Using business: {business.get('name', 'Unnamed')} ({business_id})")
    print()

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

    print("Test enrichment data:")
    print(f"  emails_generated (array): {test_enrichment['emails_generated']}")
    print(f"  email_quality_tier: {test_enrichment['email_quality_tier']}")
    print(f"  email_verified_source: {test_enrichment['email_verified_source']}")
    print()

    print("Attempting to save LinkedIn enrichment...")
    print("(This was failing with PGRST204 before cache refresh)")
    print()

    try:
        result = manager.save_linkedin_enrichment(
            business_id=business_id,
            campaign_id=campaign_id,
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
    success = test_schema_cache_fix()
    sys.exit(0 if success else 1)
