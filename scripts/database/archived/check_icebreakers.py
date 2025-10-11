#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

from modules.supabase_manager import SupabaseManager

try:
    manager = SupabaseManager()
    print("🔍 Checking for stored icebreakers...")
    
    result = manager.client.table("raw_contacts").select("name, mutiline_icebreaker").limit(5).execute()
    
    found_icebreakers = 0
    for contact in result.data:
        name = contact.get('name', 'Unknown')
        icebreaker = contact.get('mutiline_icebreaker')
        print(f"Contact: {name}")
        if icebreaker and icebreaker.strip():
            found_icebreakers += 1
            print(f"  ✅ Has icebreaker: {len(icebreaker)} chars")
            print(f"  Preview: {icebreaker[:100]}...")
        else:
            print("  ❌ No icebreaker stored")
        print()
    
    print(f"📊 Summary: {found_icebreakers}/{len(result.data)} contacts have icebreakers")
    
except Exception as e:
    print(f"❌ Error: {e}")