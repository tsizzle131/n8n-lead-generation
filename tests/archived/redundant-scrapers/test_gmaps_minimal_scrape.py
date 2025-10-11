"""
Minimal Google Maps Scraper Test
Actually runs a tiny scrape to verify everything works end-to-end
Cost: ~$0.10
"""

import logging
from datetime import datetime
from modules.gmaps_campaign_manager import GmapsCampaignManager
from modules.gmaps_supabase_manager import GmapsSupabaseManager
from config import APIFY_API_KEY, OPENAI_API_KEY

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Supabase credentials
SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

def main():
    print("\n" + "="*70)
    print("GOOGLE MAPS SCRAPER - MINIMAL LIVE TEST")
    print("="*70)
    print("⚠️  This will make real API calls and cost ~$0.10")
    print("")
    
    # Step 1: Create a very small campaign
    print("STEP 1: Creating minimal test campaign...")
    print("-" * 50)
    
    manager = GmapsCampaignManager(
        supabase_url=SUPABASE_URL,
        supabase_key=SUPABASE_KEY,
        apify_key=APIFY_API_KEY,
        openai_key=OPENAI_API_KEY
    )
    
    # Create campaign with just 1 ZIP code (90210 - Beverly Hills)
    from modules.coverage_analyzer import CoverageAnalyzer
    analyzer = CoverageAnalyzer()
    
    # Override the analysis to use just one specific ZIP for testing
    campaign_name = f"Minimal Test {datetime.now().strftime('%H%M%S')}"
    
    # Manually create a campaign with just 1 ZIP code
    db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)
    
    campaign_data = {
        "name": campaign_name,
        "description": "Minimal test - 1 ZIP, 10 businesses max",
        "keywords": ["restaurant"],  # Just one keyword
        "location": "90210",
        "coverage_profile": "custom",
        "status": "draft",
        "target_zip_count": 1,
        "coverage_percentage": 1.0,
        "estimated_cost": 0.10
    }
    
    campaign = db.create_campaign(campaign_data)
    if not campaign or not campaign.get("id"):
        print("❌ Failed to create campaign")
        return
    
    campaign_id = campaign["id"]
    print(f"✅ Created campaign: {campaign_name}")
    print(f"   ID: {campaign_id}")
    
    # Add just one ZIP code to coverage
    coverage_data = [{
        "zip": "90210",
        "keywords": ["restaurant"],
        "max_results": 10,  # Very small!
        "estimated_cost": 0.10
    }]
    
    added = db.add_campaign_coverage(campaign_id, coverage_data)
    print(f"✅ Added {added} ZIP code to campaign")
    
    # Step 2: Execute the minimal campaign
    print("\n" + "="*70)
    print("STEP 2: EXECUTING MINIMAL SCRAPE")
    print("="*70)
    print("Target: 90210 (Beverly Hills)")
    print("Keyword: restaurant")
    print("Max results: 10 businesses")
    print("")
    
    # Auto-confirm for testing
    print("➡️  Auto-executing minimal test (cost ~$0.10)...")
    import time
    time.sleep(2)  # Brief pause to show what's happening
    
    print("\n🚀 Starting scrape...")
    print("-" * 50)
    
    # Execute with very limited scope
    results = manager.execute_campaign(
        campaign_id=campaign_id,
        max_businesses_per_zip=10  # Override to ensure minimal cost
    )
    
    if "error" in results:
        print(f"\n❌ Scrape failed: {results['error']}")
        return
    
    # Step 3: Show results
    print("\n" + "="*70)
    print("RESULTS")
    print("="*70)
    print(f"✅ Campaign Status: {results.get('status')}")
    print(f"📍 ZIP codes scraped: {results.get('zip_codes_scraped')}")
    print(f"🏢 Total businesses found: {results.get('total_businesses')}")
    print(f"📧 Total emails found: {results.get('total_emails')}")
    print(f"💰 Total cost: ${results.get('total_cost')}")
    
    if results.get('total_emails') > 0:
        print(f"📊 Email success rate: {results.get('email_success_rate')}%")
        print(f"💵 Cost per email: ${results.get('cost_per_email')}")
    
    # Step 4: Show sample data
    print("\n" + "="*70)
    print("SAMPLE DATA")
    print("="*70)
    
    # Get some businesses from the database
    businesses = db.client.table("gmaps_businesses").select("*").eq("campaign_id", campaign_id).limit(5).execute()
    
    if businesses.data:
        print(f"\nShowing first {min(5, len(businesses.data))} businesses:")
        for i, biz in enumerate(businesses.data[:5], 1):
            print(f"\n{i}. {biz['name']}")
            print(f"   📍 {biz.get('address', 'No address')}")
            if biz.get('phone'):
                print(f"   📞 {biz['phone']}")
            if biz.get('website'):
                print(f"   🌐 {biz['website'][:50]}...")
            if biz.get('email'):
                print(f"   📧 {biz['email']}")
            if biz.get('facebook_url'):
                print(f"   📘 Has Facebook page")
            print(f"   ⭐ Rating: {biz.get('rating', 'N/A')}")
    
    # Step 5: Analytics
    print("\n" + "="*70)
    print("CAMPAIGN ANALYTICS")
    print("="*70)
    
    analytics = db.get_campaign_analytics(campaign_id)
    print(f"Coverage completion: {analytics.get('coverage_completion')}%")
    print(f"Businesses with email: {analytics.get('businesses_with_email')}")
    print(f"Email success rate: {analytics.get('email_success_rate')}%")
    print(f"Cost per business: ${analytics.get('cost_per_business')}")
    
    print("\n" + "="*70)
    print("✅ MINIMAL TEST COMPLETE")
    print("="*70)
    print("\nThe Google Maps Facebook Scraper is working correctly!")
    print(f"Campaign ID for future reference: {campaign_id}")

if __name__ == "__main__":
    main()