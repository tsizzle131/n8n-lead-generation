"""
Simple test for Google Maps Scraper integration
Tests basic functionality without the full integration test
"""

import logging
from datetime import datetime
from modules.gmaps_campaign_manager import GmapsCampaignManager
from config import APIFY_API_KEY, OPENAI_API_KEY

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Supabase credentials
SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

def main():
    print("\n" + "="*60)
    print("GOOGLE MAPS SCRAPER - SIMPLE TEST")
    print("="*60)
    
    # Initialize campaign manager
    print("\n1. Initializing Campaign Manager...")
    manager = GmapsCampaignManager(
        supabase_url=SUPABASE_URL,
        supabase_key=SUPABASE_KEY,
        apify_key=APIFY_API_KEY,
        openai_key=OPENAI_API_KEY
    )
    print("✅ Campaign Manager initialized")
    
    # Create a test campaign
    print("\n2. Creating test campaign...")
    campaign = manager.create_campaign(
        name=f"Test Beverly Hills {datetime.now().strftime('%H%M%S')}",
        location="Beverly Hills, CA",
        keywords=["luxury spa", "beauty salon"],
        coverage_profile="budget",  # Minimal for testing
        description="Simple test campaign"
    )
    
    if "error" in campaign:
        print(f"❌ Error: {campaign['error']}")
        return
    
    print(f"✅ Campaign created!")
    print(f"   ID: {campaign['campaign_id']}")
    print(f"   ZIP codes: {campaign['zip_count']}")
    print(f"   Est. businesses: {campaign['estimated_businesses']}")
    print(f"   Est. cost: ${campaign['estimated_cost']}")
    print(f"   Est. emails: {campaign['estimated_emails']}")
    
    # Get campaign status
    print("\n3. Checking campaign status...")
    status = manager.get_campaign_status(campaign['campaign_id'])
    print(f"✅ Status: {status.get('status', 'Unknown')}")
    
    print("\n" + "="*60)
    print("TEST COMPLETE - Campaign ready to execute")
    print("="*60)
    print(f"\nTo execute this campaign, run:")
    print(f"  results = manager.execute_campaign('{campaign['campaign_id']}')")
    print(f"\nThis would cost approximately ${campaign['estimated_cost']}")

if __name__ == "__main__":
    main()