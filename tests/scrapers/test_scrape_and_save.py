"""
Direct test: Scrape 3 businesses and save to database
"""

import logging
from modules.local_business_scraper import LocalBusinessScraper
from modules.gmaps_supabase_manager import GmapsSupabaseManager
from config import APIFY_API_KEY

logging.basicConfig(level=logging.INFO)

SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

def main():
    print("\n" + "="*60)
    print("DIRECT SCRAPE AND SAVE TEST")
    print("="*60)
    
    # 1. Initialize
    scraper = LocalBusinessScraper(APIFY_API_KEY)
    db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)
    
    # 2. Create a simple campaign
    print("\n1. Creating test campaign...")
    campaign = db.create_campaign({
        "name": "Direct Test",
        "description": "Direct scrape test",
        "keywords": ["restaurant"],
        "location": "90210",
        "coverage_profile": "custom"
    })
    
    if not campaign or not campaign.get("id"):
        print("❌ Failed to create campaign")
        return
    
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    
    # 3. Scrape just 3 restaurants
    print("\n2. Scraping 3 restaurants in Beverly Hills...")
    businesses = scraper._scrape_google_maps(
        search_query="restaurant",
        location="90210",
        max_results=3
    )
    
    print(f"✅ Found {len(businesses)} businesses")
    
    if businesses:
        # Show what we found
        print("\nBusinesses found:")
        for b in businesses:
            print(f"  - {b.get('title', 'Unknown')}")
            print(f"    Address: {b.get('address', 'N/A')}")
            if b.get('website'):
                print(f"    Website: {b['website'][:50]}...")
            if b.get('directEmails'):
                print(f"    Email: {b['directEmails'][0]}")
    
    # 4. Save to database
    print("\n3. Saving to database...")
    saved_count = db.save_businesses(businesses, campaign_id, "90210")
    print(f"✅ Saved {saved_count} businesses")
    
    # 5. Verify in database
    print("\n4. Verifying in database...")
    db_businesses = db.client.table("gmaps_businesses").select("*").eq("campaign_id", campaign_id).execute()
    
    if db_businesses.data:
        print(f"✅ Found {len(db_businesses.data)} businesses in database")
        for b in db_businesses.data:
            print(f"  - {b['name']}")
            if b.get('email'):
                print(f"    📧 {b['email']}")
            if b.get('facebook_url'):
                print(f"    📘 Has Facebook")
    
    # 6. Update campaign status
    db.update_campaign(campaign_id, {
        "status": "completed",
        "total_businesses_found": saved_count,
        "actual_cost": 0.01
    })
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)
    print(f"Campaign ID: {campaign_id}")
    print(f"Businesses scraped and saved: {saved_count}")

if __name__ == "__main__":
    main()