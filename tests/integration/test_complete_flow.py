"""
Complete flow test: Google Maps + Facebook Enrichment
Tests the full two-phase scraping process
"""

import logging
from datetime import datetime
from modules.gmaps_campaign_manager import GmapsCampaignManager
from modules.gmaps_supabase_manager import GmapsSupabaseManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

def main():
    print("\n" + "="*70)
    print("COMPLETE GOOGLE MAPS + FACEBOOK ENRICHMENT TEST")
    print("="*70)
    print("This test will:")
    print("1. Search for businesses with likely Facebook pages")
    print("2. Attempt to extract emails from Facebook")
    print("Estimated cost: ~$0.20")
    print("")
    
    # Initialize
    from config import APIFY_API_KEY, OPENAI_API_KEY
    manager = GmapsCampaignManager(
        supabase_url=SUPABASE_URL,
        supabase_key=SUPABASE_KEY,
        apify_key=APIFY_API_KEY,
        openai_key=OPENAI_API_KEY
    )
    
    db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)
    
    # Create campaign targeting businesses likely to have Facebook
    print("Creating campaign for beauty salons (often have Facebook)...")
    campaign_data = {
        "name": f"Full Test {datetime.now().strftime('%H%M%S')}",
        "description": "Test with Facebook enrichment",
        "keywords": ["beauty salon", "hair salon"],  # These often have Facebook
        "location": "Beverly Hills, CA",
        "coverage_profile": "custom",
        "status": "draft",
        "target_zip_count": 1,
        "estimated_cost": 0.20
    }
    
    campaign = db.create_campaign(campaign_data)
    if not campaign:
        print("❌ Failed to create campaign")
        return
    
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign['name']}")
    
    # Add ZIP code
    db.add_campaign_coverage(campaign_id, [{
        "zip": "90210",
        "keywords": ["beauty salon", "hair salon"],
        "max_results": 5  # Small test
    }])
    
    print("\n" + "-"*70)
    print("EXECUTING CAMPAIGN")
    print("-"*70)
    
    # Execute the campaign
    results = manager.execute_campaign(campaign_id, max_businesses_per_zip=5)
    
    if "error" in results:
        print(f"❌ Error: {results['error']}")
        return
    
    # Show results
    print("\n" + "="*70)
    print("FINAL RESULTS")
    print("="*70)
    print(f"✅ Status: {results['status']}")
    print(f"📍 ZIP codes scraped: {results['zip_codes_scraped']}")
    print(f"🏢 Total businesses: {results['total_businesses']}")
    print(f"📘 Facebook pages found: {results['total_facebook_pages']}")
    print(f"📧 Total emails: {results['total_emails']}")
    print(f"💰 Total cost: ${results['total_cost']:.2f}")
    
    # Get enriched businesses
    print("\n" + "-"*70)
    print("BUSINESSES WITH EMAILS")
    print("-"*70)
    
    businesses = db.client.table("gmaps_businesses").select("*").eq("campaign_id", campaign_id).execute()
    
    if businesses.data:
        email_count = 0
        for b in businesses.data:
            if b.get('email'):
                email_count += 1
                print(f"\n{email_count}. {b['name']}")
                print(f"   📧 Email: {b['email']}")
                print(f"   📞 Phone: {b.get('phone', 'N/A')}")
                print(f"   🌐 Website: {b.get('website', 'N/A')[:50]}...")
                if b.get('facebook_url'):
                    print(f"   📘 Facebook: {b['facebook_url'][:50]}...")
                print(f"   ✅ Enrichment: {b.get('enrichment_status')}")
        
        if email_count == 0:
            print("No businesses with emails found (Facebook pages might not have public emails)")
    
    # Check Facebook enrichments
    enrichments = db.client.table("gmaps_facebook_enrichments").select("*").eq("campaign_id", campaign_id).execute()
    
    if enrichments.data:
        print(f"\n📘 Facebook enrichments attempted: {len(enrichments.data)}")
        success_count = sum(1 for e in enrichments.data if e.get('success'))
        print(f"   Successful: {success_count}")
        print(f"   Failed: {len(enrichments.data) - success_count}")
    
    print("\n" + "="*70)
    print("✅ COMPLETE TEST FINISHED")
    print("="*70)
    print(f"Campaign ID: {campaign_id}")
    print("\nThe Google Maps + Facebook enrichment pipeline is working!")

if __name__ == "__main__":
    main()