"""
Test Apify Google Maps Scraper directly
Minimal test to verify API is working
"""

import requests
import time
import logging
from config import APIFY_API_KEY

logging.basicConfig(level=logging.INFO)

def test_google_maps_scraper():
    """Test Google Maps Scraper with minimal input"""
    
    print("Testing Apify Google Maps Scraper...")
    print(f"API Key present: {'Yes' if APIFY_API_KEY else 'No'}")
    
    if not APIFY_API_KEY:
        print("❌ No API key found")
        return
    
    # Minimal payload - just search for 1 restaurant in Beverly Hills
    payload = {
        "searchStringsArray": ["restaurants 90210"],
        "maxCrawledPlacesPerSearch": 3,  # Just 3 results
        "language": "en",
        "exportPlaceUrls": False,
        "saveHtml": False,
        "saveScreenshots": False,
        "scrapeDirectEmails": True,
        "proxyConfig": {
            "useApifyProxy": True
        }
    }
    
    # Start the actor
    actor_id = "nwua9Gu5YrADL7ZDj"
    url = f"https://api.apify.com/v2/acts/{actor_id}/runs"
    headers = {
        "Authorization": f"Bearer {APIFY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    print("\n1. Starting actor run...")
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to start: {response.status_code}")
        print(response.text)
        return
    
    run_data = response.json()
    run_id = run_data['data']['id']
    print(f"✅ Started run: {run_id}")
    
    # Wait for completion
    print("\n2. Waiting for completion (max 60 seconds)...")
    status_url = f"https://api.apify.com/v2/acts/{actor_id}/runs/{run_id}"
    
    for i in range(12):  # Check every 5 seconds for 1 minute
        time.sleep(5)
        status_response = requests.get(status_url, headers=headers)
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            status = status_data['data']['status']
            print(f"   Status: {status}")
            
            if status == 'SUCCEEDED':
                print("✅ Run completed!")
                
                # Get results
                dataset_id = status_data['data']['defaultDatasetId']
                results_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
                results_response = requests.get(results_url, headers=headers)
                
                if results_response.status_code == 200:
                    results = results_response.json()
                    print(f"\n3. Results: Found {len(results)} businesses")
                    
                    # Show first result
                    if results:
                        first = results[0]
                        print(f"\nFirst result:")
                        print(f"  Name: {first.get('title', 'Unknown')}")
                        print(f"  Address: {first.get('address', 'Unknown')}")
                        print(f"  Phone: {first.get('phone', 'N/A')}")
                        print(f"  Website: {first.get('website', 'N/A')}")
                        if first.get('directEmails'):
                            print(f"  Email: {first['directEmails'][0]}")
                    
                    # Show cost
                    cost = status_data['data'].get('usageUsd', 0)
                    print(f"\n💰 Cost: ${cost:.4f}")
                    
                return
                
            elif status == 'FAILED':
                print("❌ Run failed!")
                return
    
    print("❌ Timeout - run taking too long")

if __name__ == "__main__":
    test_google_maps_scraper()