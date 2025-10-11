#!/usr/bin/env python3
"""Check the latest campaign results"""
import os
import sys
from datetime import datetime, timedelta
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from supabase_manager import SupabaseManager

# Initialize
manager = SupabaseManager()

# Get most recent campaign
recent_time = (datetime.now() - timedelta(hours=1)).isoformat()
campaigns = manager.client.table("campaigns").select("*").gte("created_at", recent_time).order("created_at", desc=True).limit(1).execute()

if campaigns.data:
    campaign = campaigns.data[0]
    campaign_id = campaign['id']
    print(f"Latest Campaign: {campaign['name']}")
    print(f"Campaign ID: {campaign_id}")
    print(f"Status: {campaign.get('status', 'N/A')}")
    print(f"Total leads generated: {campaign.get('total_leads_generated', 0)}")
    print("")
    
    # Check raw contacts
    raw_contacts = manager.client.table("raw_contacts").select("id,name,email,email_status,processed,website_url").eq("campaign_id", campaign_id).execute()
    
    print(f"Raw Contacts: {len(raw_contacts.data)}")
    if raw_contacts.data:
        with_email = sum(1 for c in raw_contacts.data if c.get('email'))
        processed = sum(1 for c in raw_contacts.data if c.get('processed'))
        with_website = sum(1 for c in raw_contacts.data if c.get('website_url'))
        
        print(f"  With email: {with_email}")
        print(f"  With website: {with_website}")
        print(f"  Marked as processed: {processed}")
        
        # Get raw contact IDs
        raw_ids = [c['id'] for c in raw_contacts.data]
        
        # Check processed leads
        if raw_ids:
            leads = manager.client.table("processed_leads").select("*").in_("raw_contact_id", raw_ids).execute()
            print(f"\nProcessed Leads: {len(leads.data)}")
            
            if leads.data:
                print("Sample leads with icebreakers:")
                for lead in leads.data[:3]:
                    print(f"  - {lead.get('name', 'Unknown')}")
                    print(f"    Icebreaker: {lead.get('icebreaker', 'NO ICEBREAKER')[:100]}...")
        else:
            print("\nNo raw contact IDs found")
    else:
        print("No raw contacts found for this campaign")
else:
    print("No recent campaigns found")