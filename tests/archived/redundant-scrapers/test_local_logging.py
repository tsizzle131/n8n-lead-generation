#!/usr/bin/env python3
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modules.local_business_scraper import LocalBusinessScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

def test_local_scraper():
    """Test the local business scraper with enhanced logging"""
    
    logging.info("Starting local business scraper test...")
    
    # Initialize scraper
    scraper = LocalBusinessScraper()
    
    # Test scraping restaurants in San Francisco
    results = scraper.scrape_local_businesses(
        search_query="restaurants",
        location="San Francisco, CA",
        max_results=5
    )
    
    if results:
        logging.info(f"✅ Successfully scraped {len(results)} businesses")
        for i, business in enumerate(results, 1):
            logging.info(f"  {i}. {business.get('name', 'Unknown')} - {business.get('email', 'No email')}")
    else:
        logging.info("❌ No results returned from scraper")
    
    return results

if __name__ == "__main__":
    test_local_scraper()