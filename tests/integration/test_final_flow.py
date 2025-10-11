"""
Final test of the complete two-phase flow with Facebook enrichment
"""

print('Testing complete two-phase flow with Facebook enrichment...')
print('=' * 60)

from modules.gmaps_campaign_manager import GmapsCampaignManager
from modules.gmaps_supabase_manager import GmapsSupabaseManager
from config import APIFY_API_KEY, OPENAI_API_KEY
from datetime import datetime

SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

manager = GmapsCampaignManager(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_KEY,
    apify_key=APIFY_API_KEY,
    openai_key=OPENAI_API_KEY
)

db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)

# Create simple campaign
print('Creating campaign for restaurants in Beverly Hills...')
campaign_data = {
    "name": f"Final Test {datetime.now().strftime('%H%M')}",
    "description": "Testing Facebook extraction and enrichment",
    "keywords": ["restaurant"],
    "location": "Beverly Hills, CA",
    "coverage_profile": "custom",
    "status": "draft",
    "target_zip_count": 1,
    "estimated_cost": 0.20
}

campaign = db.create_campaign(campaign_data)
campaign_id = campaign["id"]
print(f"Campaign ID: {campaign_id}")

# Add ZIP code
db.add_campaign_coverage(campaign_id, [{
    "zip": "90210",
    "keywords": ["restaurant"],
    "max_results": 5
}])

# Execute campaign
print('\nExecuting campaign (max 5 businesses)...')
results = manager.execute_campaign(campaign_id, max_businesses_per_zip=5)

if 'error' not in results:
    print('\n' + '=' * 60)
    print('CAMPAIGN RESULTS')
    print('=' * 60)
    print(f"Total businesses scraped: {results['total_businesses']}")
    print(f"Facebook pages found: {results['total_facebook_pages']}")
    print(f"Total emails: {results['total_emails']}")
    print(f"Total cost: ${results['total_cost']:.2f}")
    
    # Check database for Facebook URLs
    businesses = db.client.table('gmaps_businesses').select('name, facebook_url, email').eq('campaign_id', campaign_id).execute()
    
    fb_count = sum(1 for b in businesses.data if b.get('facebook_url'))
    email_count = sum(1 for b in businesses.data if b.get('email'))
    
    print(f"\nDatabase check:")
    print(f"  Businesses with Facebook: {fb_count}")
    print(f"  Businesses with email: {email_count}")
    
    if fb_count > 0:
        print('\n✅ SUCCESS: Facebook URLs are being extracted and saved!')
        print('\nBusinesses with Facebook:')
        for b in businesses.data:
            if b.get('facebook_url'):
                print(f"  - {b['name']}")
                print(f"    FB: {b['facebook_url']}")
                if b.get('email'):
                    print(f"    Email: {b['email']}")
    else:
        print('\n⚠️ No Facebook URLs found in this batch')
else:
    print(f"Execution error: {results['error']}")