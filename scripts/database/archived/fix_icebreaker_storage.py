#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Adding Icebreaker Storage Column ===")
    print()
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    print("✅ Connected to Supabase successfully")
    print()
    
    # Check both contacts and raw_contacts tables for icebreaker storage
    print("🔍 Checking current table structures...")
    
    # Check contacts table (should have icebreaker_content)
    try:
        result = manager.client.table("contacts").select("full_name, icebreaker_content").limit(3).execute()
        print("✅ contacts table exists with icebreaker_content column")
        
        found_icebreakers = 0
        for contact in result.data:
            icebreaker = contact.get('icebreaker_content')
            if icebreaker and icebreaker.strip():
                found_icebreakers += 1
                
        print(f"📊 contacts table: {found_icebreakers}/{len(result.data)} have icebreakers")
        
    except Exception as e:
        print(f"❌ contacts table error: {e}")
    
    # Check raw_contacts table (needs mutiline_icebreaker)
    try:
        result = manager.client.table("raw_contacts").select("name, mutiline_icebreaker").limit(1).execute()
        print("✅ raw_contacts table has mutiline_icebreaker column")
        
    except Exception as e:
        if "does not exist" in str(e):
            print("❌ raw_contacts missing mutiline_icebreaker column")
            print("💡 Need to add: ALTER TABLE raw_contacts ADD COLUMN mutiline_icebreaker TEXT;")
        else:
            print(f"❌ raw_contacts error: {e}")
            
except Exception as e:
    print(f"❌ Connection error: {e}")