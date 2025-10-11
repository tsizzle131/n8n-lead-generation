"""
Test Google Maps Facebook Scraper Integration
Tests the complete flow with your Supabase and Apify setup
"""

import logging
import sys
import os
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'gmaps_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.gmaps_campaign_manager import GmapsCampaignManager
from modules.gmaps_supabase_manager import GmapsSupabaseManager
from modules.coverage_analyzer import CoverageAnalyzer
from modules.facebook_scraper import FacebookScraper
from modules.local_business_scraper import LocalBusinessScraper
from config import APIFY_API_KEY, OPENAI_API_KEY

# Supabase credentials
SUPABASE_URL = "https://ndrqixjdddcozjlevieo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NDk1MTcsImV4cCI6MjA2NjAyNTUxN30.XL1CmTW230m7QoubRhfsc8KmtKHYXEPGYdFpIlULTec"

def test_database_connection():
    """Test Supabase connection and schema"""
    print("\n" + "="*60)
    print("TEST 1: DATABASE CONNECTION")
    print("="*60)
    
    try:
        db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)
        
        # Test basic connection
        print("✓ Connected to Supabase")
        
        # Test if gmaps tables exist in public schema
        try:
            result = db.client.table("gmaps_campaigns").select("id").limit(1).execute()
            print("✓ Table 'gmaps_campaigns' exists in public schema")
            print(f"✓ Found {len(result.data)} existing campaigns")
        except Exception as e:
            print(f"✗ Schema might not exist: {e}")
            print("  Run the migration first!")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def test_apify_connection():
    """Test Apify API connections"""
    print("\n" + "="*60)
    print("TEST 2: APIFY API CONNECTION")
    print("="*60)
    
    try:
        # Test Google Maps Scraper
        google_scraper = LocalBusinessScraper(APIFY_API_KEY)
        if google_scraper.test_connection():
            print("✓ Google Maps Scraper API connected")
        else:
            print("✗ Google Maps Scraper API failed")
            return False
        
        # Test Facebook Pages Scraper
        facebook_scraper = FacebookScraper(APIFY_API_KEY)
        if facebook_scraper.test_connection():
            print("✓ Facebook Pages Scraper API connected")
        else:
            print("✗ Facebook Pages Scraper API failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Apify connection failed: {e}")
        return False

def test_coverage_analyzer():
    """Test AI-powered ZIP code analysis"""
    print("\n" + "="*60)
    print("TEST 3: AI COVERAGE ANALYZER")
    print("="*60)
    
    try:
        analyzer = CoverageAnalyzer()
        
        # Test with a small location
        print("\nTesting location analysis for: Beverly Hills, CA")
        analysis = analyzer.analyze_location(
            location="Beverly Hills, CA",
            keywords=["restaurants", "cafes"],
            profile="budget"
        )
        
        if analysis.get("zip_codes"):
            print(f"✓ AI identified {len(analysis['zip_codes'])} ZIP codes")
            print(f"✓ Estimated businesses: {analysis.get('total_estimated_businesses', 0)}")
            
            if "cost_estimates" in analysis:
                print(f"✓ Estimated cost: ${analysis['cost_estimates']['total_cost']}")
            
            # Show first 3 ZIP codes
            print("\nTop ZIP codes identified:")
            for zip_data in analysis["zip_codes"][:3]:
                print(f"  - {zip_data['zip']}: {zip_data.get('neighborhood', 'Unknown')} "
                      f"(Score: {zip_data.get('combined_score', 0):.1f})")
            
            return True
        else:
            print("✗ No ZIP codes identified")
            return False
            
    except Exception as e:
        print(f"✗ Coverage analyzer failed: {e}")
        print("  Make sure OpenAI API key is configured")
        return False

def test_create_campaign():
    """Test creating a campaign"""
    print("\n" + "="*60)
    print("TEST 4: CREATE CAMPAIGN")
    print("="*60)
    
    try:
        manager = GmapsCampaignManager(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY,
            apify_key=APIFY_API_KEY,
            openai_key=OPENAI_API_KEY
        )
        
        # Create a test campaign with a small, specific location
        campaign_name = f"Test Campaign {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"\nCreating campaign: {campaign_name}")
        print("Location: Beverly Hills, CA")
        print("Keywords: luxury retail, boutiques")
        print("Profile: budget (minimum ZIPs for testing)")
        
        campaign = manager.create_campaign(
            name=campaign_name,
            location="Beverly Hills, CA",
            keywords=["luxury retail", "boutiques"],
            coverage_profile="budget",
            description="Test campaign for integration verification"
        )
        
        if "error" in campaign:
            print(f"✗ Campaign creation failed: {campaign['error']}")
            return None
        
        print(f"✓ Campaign created with ID: {campaign['campaign_id']}")
        print(f"✓ ZIP codes selected: {campaign['zip_count']}")
        print(f"✓ Estimated businesses: {campaign['estimated_businesses']}")
        print(f"✓ Estimated cost: ${campaign['estimated_cost']}")
        print(f"✓ Estimated emails: {campaign['estimated_emails']}")
        
        return campaign['campaign_id']
        
    except Exception as e:
        print(f"✗ Campaign creation failed: {e}")
        return None

def test_mini_scrape(campaign_id):
    """Test scraping with minimal data"""
    print("\n" + "="*60)
    print("TEST 5: MINI SCRAPE TEST")
    print("="*60)
    
    try:
        manager = GmapsCampaignManager(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY,
            apify_key=APIFY_API_KEY,
            openai_key=OPENAI_API_KEY
        )
        
        print("\n⚠️  This will run a REAL scrape with Apify (costs ~$0.10)")
        response = input("Continue with mini scrape? (yes/no): ")
        
        if response.lower() != 'yes':
            print("Skipping scrape test")
            return False
        
        print("\nExecuting mini campaign (max 10 businesses per ZIP)...")
        
        # Run with very limited results for testing
        results = manager.execute_campaign(
            campaign_id=campaign_id,
            max_businesses_per_zip=10  # Very small for testing
        )
        
        if "error" in results:
            print(f"✗ Scrape failed: {results['error']}")
            return False
        
        print("\n✓ Scrape completed successfully!")
        print(f"  Total businesses: {results['total_businesses']}")
        print(f"  Total emails: {results['total_emails']}")
        print(f"  Email success rate: {results['email_success_rate']}%")
        print(f"  Total cost: ${results['total_cost']}")
        
        if results['total_emails'] > 0:
            print(f"  Cost per email: ${results['cost_per_email']}")
        
        return True
        
    except Exception as e:
        print(f"✗ Scrape test failed: {e}")
        return False

def test_data_retrieval(campaign_id):
    """Test retrieving data from the database"""
    print("\n" + "="*60)
    print("TEST 6: DATA RETRIEVAL")
    print("="*60)
    
    try:
        db = GmapsSupabaseManager(SUPABASE_URL, SUPABASE_KEY)
        
        # Get campaign analytics
        analytics = db.get_campaign_analytics(campaign_id)
        if analytics:
            print("✓ Retrieved campaign analytics")
            print(f"  Campaign: {analytics.get('campaign_name')}")
            print(f"  Status: {analytics.get('status')}")
            print(f"  Businesses: {analytics.get('total_businesses')}")
            print(f"  Emails: {analytics.get('businesses_with_email')}")
        
        # Get some businesses
        result = db.client.table("gmaps_scraper.businesses").select("*").eq("campaign_id", campaign_id).limit(5).execute()
        
        if result.data:
            print(f"\n✓ Retrieved {len(result.data)} sample businesses:")
            for business in result.data[:3]:
                print(f"  - {business['name']}")
                if business.get('email'):
                    print(f"    Email: {business['email']}")
                if business.get('phone'):
                    print(f"    Phone: {business['phone']}")
        
        return True
        
    except Exception as e:
        print(f"✗ Data retrieval failed: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("GOOGLE MAPS SCRAPER INTEGRATION TEST")
    print("="*60)
    print(f"Timestamp: {datetime.now()}")
    print(f"Supabase URL: {SUPABASE_URL[:30]}...")
    print(f"Apify Key: {'✓ Present' if APIFY_API_KEY else '✗ Missing'}")
    print(f"OpenAI Key: {'✓ Present' if OPENAI_API_KEY else '✗ Missing'}")
    
    # Track test results
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Database
    if test_database_connection():
        tests_passed += 1
    else:
        tests_failed += 1
        print("\n⚠️  Cannot continue without database connection")
        return
    
    # Test 2: Apify
    if test_apify_connection():
        tests_passed += 1
    else:
        tests_failed += 1
        print("\n⚠️  Cannot continue without Apify API")
        return
    
    # Test 3: Coverage Analyzer
    if test_coverage_analyzer():
        tests_passed += 1
    else:
        tests_failed += 1
        print("\n⚠️  Coverage analyzer failed - check OpenAI API key")
    
    # Test 4: Create Campaign
    campaign_id = test_create_campaign()
    if campaign_id:
        tests_passed += 1
        
        # Test 5: Mini Scrape (optional)
        print("\n" + "="*60)
        print("OPTIONAL: LIVE SCRAPE TEST")
        print("="*60)
        print("The next test will perform a real (but tiny) scrape.")
        print("This will cost approximately $0.10 in Apify credits.")
        
        if test_mini_scrape(campaign_id):
            tests_passed += 1
            
            # Test 6: Data Retrieval
            if test_data_retrieval(campaign_id):
                tests_passed += 1
            else:
                tests_failed += 1
        else:
            print("Skipping data retrieval test")
    else:
        tests_failed += 1
        print("\n⚠️  Cannot test scraping without a campaign")
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"✓ Tests Passed: {tests_passed}")
    print(f"✗ Tests Failed: {tests_failed}")
    
    if tests_failed == 0:
        print("\n🎉 All tests passed! The integration is working correctly.")
    else:
        print(f"\n⚠️  {tests_failed} test(s) failed. Check the logs above.")
    
    print("\nLog file created: " + f"gmaps_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

if __name__ == "__main__":
    main()