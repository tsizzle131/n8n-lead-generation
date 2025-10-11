#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Link Existing Contacts to Audience ===")
    print()
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    print("✅ Connected to Supabase successfully")
    
    # The audience ID we found
    audience_id = "f08913d0-b585-4730-b559-d2f76ed9ab3b"
    print(f"🎯 Target audience ID: {audience_id}")
    
    # Get the search URL that completed with 500 contacts
    completed_search_url_id = "f3ee6623-482d-4edf-a5a0-35a4f4c46618"  # From our debug output
    print(f"🔗 Target search URL ID: {completed_search_url_id}")
    print()
    
    # First, let's see what contacts we have from this search
    print("🔍 Checking contacts from completed search...")
    try:
        result = manager.client.table("raw_contacts").select("*").eq("search_url_id", completed_search_url_id).execute()
        contacts = result.data
        print(f"📊 Found {len(contacts)} contacts from the completed search")
        
        if len(contacts) > 0:
            print("👀 Sample contact structure:")
            sample = contacts[0]
            for key, value in sample.items():
                if isinstance(value, str) and len(value) > 50:
                    print(f"  {key}: {value[:50]}...")
                else:
                    print(f"  {key}: {value}")
            print()
        
        # Since we can't add the column directly, let's create a separate mapping table approach
        # or use the raw_data_json field to store the audience_id
        
        print("💡 Temporary solution: Store audience_id in raw_data_json...")
        updated_count = 0
        
        for contact in contacts:
            try:
                # Get current raw_data_json
                raw_data = contact.get('raw_data_json', {})
                
                # Add audience_id to the raw data
                raw_data['_audience_id'] = audience_id
                
                # Update the contact
                result = manager.client.table("raw_contacts").update({
                    'raw_data_json': raw_data
                }).eq("id", contact['id']).execute()
                
                updated_count += 1
                
                if updated_count <= 3:  # Show first few updates
                    print(f"✅ Updated contact {contact['id'][:8]}...")
                elif updated_count % 50 == 0:  # Progress updates
                    print(f"📈 Updated {updated_count} contacts...")
                    
            except Exception as e:
                print(f"❌ Error updating contact {contact['id']}: {e}")
        
        print(f"🎉 Successfully updated {updated_count} contacts with audience reference")
        print()
        
    except Exception as e:
        print(f"❌ Error processing contacts: {e}")
    
    # Now let's create a simple function to count contacts by audience
    print("🧮 Creating audience contact counter...")
    try:
        # Count contacts that have our audience ID in raw_data_json
        result = manager.client.table("raw_contacts").select("raw_data_json").execute()
        all_contacts = result.data
        
        audience_contact_count = 0
        for contact in all_contacts:
            raw_data = contact.get('raw_data_json', {})
            if raw_data.get('_audience_id') == audience_id:
                audience_contact_count += 1
        
        print(f"📊 Total contacts linked to audience: {audience_contact_count}")
        print()
        
    except Exception as e:
        print(f"❌ Error counting contacts: {e}")
    
    print("✅ Contact linking process completed!")
    print()
    print("🔧 Next steps:")
    print("1. The audience should now show the correct contact count")
    print("2. You should be able to assign the audience to campaigns")
    print("3. For a permanent fix, add the audience_id column to the database schema")
    
except Exception as e:
    print(f"❌ Failed to connect to database: {e}")