#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Quick Link Contacts to Audience ===")
    
    manager = SupabaseManager()
    audience_id = "f08913d0-b585-4730-b559-d2f76ed9ab3b"
    completed_search_url_id = "f3ee6623-482d-4edf-a5a0-35a4f4c46618"
    
    print(f"🎯 Linking contacts to audience: {audience_id}")
    
    # Process in smaller batches
    batch_size = 50
    offset = 0
    total_updated = 0
    
    while True:
        # Get batch of contacts
        result = manager.client.table("raw_contacts").select("id, raw_data_json").eq("search_url_id", completed_search_url_id).range(offset, offset + batch_size - 1).execute()
        
        contacts = result.data
        if not contacts:
            break
            
        print(f"📦 Processing batch {offset}-{offset + len(contacts)}: {len(contacts)} contacts")
        
        # Update each contact in this batch
        for contact in contacts:
            raw_data = contact.get('raw_data_json', {})
            if '_audience_id' not in raw_data:  # Only update if not already updated
                raw_data['_audience_id'] = audience_id
                
                try:
                    manager.client.table("raw_contacts").update({
                        'raw_data_json': raw_data
                    }).eq("id", contact['id']).execute()
                    total_updated += 1
                except Exception as e:
                    print(f"❌ Error updating {contact['id']}: {e}")
        
        offset += batch_size
        
        if len(contacts) < batch_size:  # Last batch
            break
    
    print(f"✅ Successfully updated {total_updated} contacts!")
    
except Exception as e:
    print(f"❌ Error: {e}")