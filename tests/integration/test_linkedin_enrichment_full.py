#!/usr/bin/env python3
"""
Test LinkedIn Enrichment Flow End-to-End
Tests the complete LinkedIn enrichment pipeline with Bouncer verification
"""

import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

# Import modules
from modules.linkedin_scraper import LinkedInScraper
from modules.bouncer_verifier import BouncerVerifier
import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def test_linkedin_enrichment():
    """Test the complete LinkedIn enrichment flow"""

    print("="*70)
    print("LINKEDIN ENRICHMENT TEST")
    print("="*70)

    # Initialize components
    print("\n1️⃣ Initializing components...")

    # LinkedIn scraper
    linkedin_scraper = LinkedInScraper(
        api_key=config.APIFY_API_KEY,
        linkedin_actor_id=config.LINKEDIN_ACTOR_ID
    )

    # Bouncer verifier
    bouncer_verifier = BouncerVerifier(
        api_key=config.BOUNCER_API_KEY
    )

    # Test connection
    print("\n2️⃣ Testing API connections...")

    if not linkedin_scraper.test_connection():
        print("❌ LinkedIn scraper connection failed!")
        print("   Check your APIFY_API_KEY in config")
        return

    if not config.BOUNCER_API_KEY:
        print("⚠️ Bouncer API key not configured")
        print("   Email verification will be skipped")
        print("   Set BOUNCER_API_KEY in .env or config to enable")
    elif not bouncer_verifier.test_connection():
        print("❌ Bouncer connection failed!")
        print("   Check your BOUNCER_API_KEY in config")
    else:
        print("✅ Bouncer connection successful")

    # Test businesses (use real local businesses for better results)
    test_businesses = [
        {
            "id": "test_1",
            "name": "Franklin's BBQ",
            "city": "Austin",
            "website": "https://franklinbbq.com"
        },
        {
            "id": "test_2",
            "name": "Mozart's Coffee Roasters",
            "city": "Austin",
            "website": "https://mozartscoffee.com"
        },
        {
            "id": "test_3",
            "name": "Uchi Restaurant",
            "city": "Austin",
            "website": "https://uchiaustin.com"
        }
    ]

    print(f"\n3️⃣ Testing with {len(test_businesses)} businesses...")

    # Step 1: Find LinkedIn profiles
    print("\n" + "="*50)
    print("STEP 1: LINKEDIN DISCOVERY")
    print("="*50)

    linkedin_results = linkedin_scraper.enrich_with_linkedin(
        test_businesses,
        max_businesses=len(test_businesses)
    )

    if not linkedin_results:
        print("❌ No LinkedIn results returned")
        return

    print(f"\n✅ Found {len(linkedin_results)} LinkedIn results")

    # Step 2: Process results and verify emails
    print("\n" + "="*50)
    print("STEP 2: EMAIL VERIFICATION")
    print("="*50)

    verified_contacts = []
    emails_to_verify = []

    for result in linkedin_results:
        business_name = result.get('business_name')
        linkedin_found = result.get('linkedin_found')

        print(f"\n📊 {business_name}:")
        print(f"   LinkedIn Found: {linkedin_found}")

        if linkedin_found:
            print(f"   Profile Type: {result.get('profile_type')}")
            print(f"   LinkedIn URL: {result.get('linkedin_url')}")

            if result.get('person_name'):
                print(f"   Person: {result.get('person_name')}")
                print(f"   Title: {result.get('person_title')}")

            # Collect emails for verification
            primary_email = result.get('primary_email')
            if primary_email:
                print(f"   Email: {primary_email} (Source: {result.get('email_source')})")
                emails_to_verify.append(primary_email)

                # Add to result
                result['email_to_verify'] = primary_email
        else:
            print(f"   Error: {result.get('error')}")

    # Verify emails if Bouncer is configured
    if emails_to_verify and config.BOUNCER_API_KEY:
        print(f"\n4️⃣ Verifying {len(emails_to_verify)} emails with Bouncer...")

        verification_results = bouncer_verifier.verify_batch(emails_to_verify)

        # Map verification results back to LinkedIn results
        verification_map = {r['email']: r for r in verification_results}

        for result in linkedin_results:
            email = result.get('email_to_verify')
            if email and email in verification_map:
                verification = verification_map[email]
                result['email_verified'] = verification.get('verified', False)
                result['email_status'] = verification.get('status')
                result['email_score'] = verification.get('score')
                result['email_is_safe'] = verification.get('is_safe', False)

                if verification.get('is_safe'):
                    verified_contacts.append(result)

        print(f"\n✅ Verified {len(verified_contacts)} safe contacts")

    # Step 3: Summary
    print("\n" + "="*50)
    print("FINAL RESULTS SUMMARY")
    print("="*50)

    total_businesses = len(test_businesses)
    linkedin_found = sum(1 for r in linkedin_results if r.get('linkedin_found'))
    emails_found = sum(1 for r in linkedin_results if r.get('primary_email'))
    emails_verified = len(verified_contacts) if config.BOUNCER_API_KEY else 0

    print(f"\n📊 Statistics:")
    print(f"   Total Businesses: {total_businesses}")
    print(f"   LinkedIn Profiles Found: {linkedin_found}")
    print(f"   Emails Found: {emails_found}")
    print(f"   Emails Verified Safe: {emails_verified}")
    print(f"   Success Rate: {linkedin_found/total_businesses*100:.1f}%")

    # Display verified contacts
    if verified_contacts:
        print(f"\n✅ Verified Contacts Ready for Outreach:")
        for contact in verified_contacts:
            print(f"\n   {contact.get('business_name')}:")
            print(f"      Name: {contact.get('person_name')}")
            print(f"      Title: {contact.get('person_title')}")
            print(f"      Email: {contact.get('primary_email')} (Score: {contact.get('email_score')})")
            print(f"      LinkedIn: {contact.get('person_profile_url', 'N/A')}")

    print("\n" + "="*70)
    print("✅ LinkedIn Enrichment Test Complete!")
    print("="*70)

    # Test specific functions
    if linkedin_found > 0:
        print("\n5️⃣ Testing Individual Functions...")

        # Test email generation
        print("\n📧 Testing Email Pattern Generation:")
        test_patterns = linkedin_scraper._generate_email_patterns(
            "John Doe",
            "https://example.com"
        )
        print(f"   Patterns for 'John Doe' at example.com:")
        for pattern in test_patterns:
            print(f"      - {pattern}")

        # Test Bouncer usage stats
        if config.BOUNCER_API_KEY:
            print("\n📊 Bouncer Account Status:")
            stats = bouncer_verifier.get_usage_stats()
            if 'error' not in stats:
                print(f"   Credits Remaining: {stats.get('credits_remaining', 'N/A')}")
                print(f"   Credits Used: {stats.get('credits_used', 'N/A')}")
                print(f"   Plan: {stats.get('plan', 'N/A')}")
            else:
                print(f"   Error: {stats.get('error')}")

    return linkedin_results


if __name__ == "__main__":
    try:
        results = test_linkedin_enrichment()

        # Save results to JSON for analysis
        if results:
            import json
            with open('linkedin_enrichment_results.json', 'w') as f:
                # Convert any non-serializable objects
                clean_results = []
                for r in results:
                    clean_result = {k: v for k, v in r.items()
                                  if k not in ['raw_profile_data', 'raw_response']}
                    clean_results.append(clean_result)

                json.dump(clean_results, f, indent=2, default=str)
                print(f"\n💾 Results saved to: linkedin_enrichment_results.json")

    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()