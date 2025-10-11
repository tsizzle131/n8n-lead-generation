#!/usr/bin/env python3
"""Test email enrichment for Google Maps contacts"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.supabase_manager import SupabaseManager
from modules.web_scraper import WebScraper
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')

# Initialize
manager = SupabaseManager()
web_scraper = WebScraper()

print("\n" + "="*60)
print("🧪 TESTING EMAIL ENRICHMENT FOR GOOGLE MAPS CONTACTS")
print("="*60 + "\n")

# Get contacts needing enrichment
contacts = manager.get_google_maps_contacts_needing_enrichment(limit=3)

if not contacts:
    print("No contacts need email enrichment")
else:
    print(f"Found {len(contacts)} contacts needing email enrichment\n")
    
    for i, contact in enumerate(contacts, 1):
        print(f"Contact {i}: {contact.get('name', 'Unknown')}")
        website = contact.get('website_url')
        
        if website:
            print(f"  Website: {website}")
            print(f"  Scraping for email...")
            
            try:
                # Scrape website for email
                scraped_data = web_scraper.scrape_website_content(website)
                
                if scraped_data and scraped_data.get('emails'):
                    email = scraped_data['emails'][0]
                    print(f"  ✅ Found email: {email}")
                    
                    # Update in database
                    if manager.update_contact_email(contact['id'], email, 'verified'):
                        print(f"  ✅ Updated database")
                else:
                    print(f"  ❌ No email found")
            except Exception as e:
                print(f"  ❌ Error: {e}")
        print()

print("="*60)
print("✅ Email enrichment test complete!")
print("="*60)