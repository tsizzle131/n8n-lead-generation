#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Verification Script - Testing All Fixes ===")
    print()
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    print("✅ Connected to Supabase successfully")
    print()
    
    # Test 1: Check if audience_id column exists
    print("🔍 Test 1: Checking if audience_id column exists...")
    try:
        result = manager.client.table("raw_contacts").select("audience_id").limit(1).execute()
        print("✅ audience_id column exists and is accessible")
    except Exception as e:
        print(f"❌ audience_id column issue: {e}")
        print("💡 Make sure you ran the SQL migration script")
        sys.exit(1)
    
    # Test 2: Check audience contact counts
    print()
    print("🔍 Test 2: Checking audience contact counts...")
    target_audience_id = "f08913d0-b585-4730-b559-d2f76ed9ab3b"
    
    try:
        result = manager.client.table("raw_contacts").select("id").eq("audience_id", target_audience_id).execute()
        contact_count = len(result.data)
        print(f"✅ Apollo Test audience has {contact_count} linked contacts")
        
        if contact_count > 0:
            print("✅ Contact linking successful!")
        else:
            print("⚠️ No contacts linked - migration may not have run")
            
    except Exception as e:
        print(f"❌ Error checking contact counts: {e}")
    
    # Test 3: Check all audiences
    print()
    print("🔍 Test 3: Checking all audiences and their contact counts...")
    try:
        audiences_result = manager.client.table("audiences").select("*").execute()
        audiences = audiences_result.data
        
        for audience in audiences:
            contacts_result = manager.client.table("raw_contacts").select("id").eq("audience_id", audience['id']).execute()
            contact_count = len(contacts_result.data)
            print(f"  📊 {audience['name']}: {contact_count} contacts")
            
    except Exception as e:
        print(f"❌ Error checking all audiences: {e}")
    
    # Test 4: Check data consistency
    print()
    print("🔍 Test 4: Checking data consistency...")
    try:
        # Check total contacts
        total_result = manager.client.table("raw_contacts").select("id").execute()
        total_contacts = len(total_result.data)
        
        # Check contacts with audience_id
        linked_result = manager.client.table("raw_contacts").select("id").not_.is_("audience_id", "null").execute()
        linked_contacts = len(linked_result.data)
        
        print(f"📈 Total contacts: {total_contacts}")
        print(f"🔗 Linked to audiences: {linked_contacts}")
        print(f"🔄 Link percentage: {(linked_contacts/total_contacts*100):.1f}%")
        
    except Exception as e:
        print(f"❌ Error checking data consistency: {e}")
    
    # Test 5: Test the audience manager functionality
    print()
    print("🔍 Test 5: Testing SupabaseManager with audience context...")
    try:
        # Test initialization with audience_id
        test_manager = SupabaseManager(audience_id=target_audience_id)
        print("✅ SupabaseManager with audience_id initialized successfully")
        
        # Test that the audience_id is properly stored
        if test_manager.audience_id == target_audience_id:
            print("✅ audience_id properly stored in manager")
        else:
            print(f"❌ audience_id mismatch: expected {target_audience_id}, got {test_manager.audience_id}")
            
    except Exception as e:
        print(f"❌ Error testing SupabaseManager: {e}")
    
    print()
    print("=== Verification Complete ===")
    print()
    print("🔧 Next steps:")
    print("1. If all tests pass, refresh the frontend to see updated contact counts")
    print("2. Test audience assignment in Email tab")
    print("3. Test campaign execution workflow")
    
except Exception as e:
    print(f"❌ Failed to connect to database: {e}")
    print("💡 Make sure Supabase settings are configured correctly")