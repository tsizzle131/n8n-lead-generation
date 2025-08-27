#!/usr/bin/env python3

import sys
import os
import csv
from datetime import datetime

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    
    print("🔄 Exporting icebreakers...")
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    
    # Get all contacts with icebreakers
    result = manager.client.table("raw_contacts").select(
        "name, email, linkedin_url, title, headline, mutiline_icebreaker, scraped_at"
    ).not_.is_("mutiline_icebreaker", "null").execute()
    
    if not result.data:
        print("❌ No icebreakers found to export")
        sys.exit(1)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"icebreakers_export_{timestamp}.csv"
    
    # Export to CSV
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'email', 'linkedin_url', 'title', 'headline', 'icebreaker', 'scraped_at']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for contact in result.data:
            writer.writerow({
                'name': contact.get('name', ''),
                'email': contact.get('email', ''),
                'linkedin_url': contact.get('linkedin_url', ''),
                'title': contact.get('title', ''),
                'headline': contact.get('headline', ''),
                'icebreaker': contact.get('mutiline_icebreaker', ''),
                'scraped_at': contact.get('scraped_at', '')
            })
    
    print(f"✅ Exported {len(result.data)} icebreakers to {filename}")
    print(f"📄 File location: {os.path.abspath(filename)}")
    
except Exception as e:
    print(f"❌ Export failed: {e}")
    sys.exit(1)