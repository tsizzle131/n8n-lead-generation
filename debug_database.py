#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Database Debug Investigation ===")
    print()
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    
    print("✅ Connected to Supabase successfully")
    print()
    
    # Check if audiences table exists and get data
    print("🔍 Checking audiences...")
    try:
        result = manager.client.table("audiences").select("*").execute()
        audiences = result.data
        print(f"📊 Found {len(audiences)} audiences:")
        for aud in audiences:
            print(f"  - ID: {aud['id']}")
            print(f"    Name: {aud['name']}")
            print(f"    Org: {aud.get('organization_id', 'None')}")
        print()
    except Exception as e:
        print(f"❌ Error checking audiences: {e}")
        print()
    
    # Check raw_contacts table structure and data
    print("🔍 Checking raw_contacts...")
    try:
        # Get recent contacts to see structure
        result = manager.client.table("raw_contacts").select("*").limit(3).execute()
        contacts = result.data
        print(f"📊 Found {len(contacts)} recent contacts (showing structure):")
        if contacts:
            print("🏗️ Contact structure:")
            for key in contacts[0].keys():
                print(f"  - {key}: {type(contacts[0][key]).__name__}")
            print()
        
        # Check if audience_id column exists and has values
        result = manager.client.table("raw_contacts").select("audience_id").not_.is_("audience_id", "null").limit(5).execute()
        linked_contacts = result.data
        print(f"🔗 Contacts with audience_id: {len(linked_contacts)}")
        for contact in linked_contacts:
            print(f"  - audience_id: {contact['audience_id']}")
        print()
        
        # Count total contacts
        result = manager.client.table("raw_contacts").select("id", count="exact").execute()
        total_count = len(result.data) if result.data else 0
        print(f"📈 Total raw_contacts: {total_count}")
        print()
        
    except Exception as e:
        print(f"❌ Error checking raw_contacts: {e}")
        print()
    
    # Check search_urls to understand where the 649 leads come from
    print("🔍 Checking search_urls...")
    try:
        result = manager.client.table("search_urls").select("*").execute()
        urls = result.data
        print(f"📊 Found {len(urls)} search URLs:")
        for url in urls:
            print(f"  - ID: {url['id']}")
            print(f"    Status: {url.get('status', 'None')}")
            print(f"    Contacts: {url.get('total_contacts_found', 0)}")
            print(f"    URL: {url.get('url', 'None')[:50]}...")
        print()
    except Exception as e:
        print(f"❌ Error checking search_urls: {e}")
        print()
    
except Exception as e:
    print(f"❌ Failed to connect to database: {e}")
    print("💡 Make sure Supabase settings are configured correctly")