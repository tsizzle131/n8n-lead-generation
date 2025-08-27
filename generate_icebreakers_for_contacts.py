#!/usr/bin/env python3

import sys
import os
import json
import requests

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    
    print("🔄 Generating icebreakers for contacts without them...")
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    
    # Get contacts without icebreakers
    result = manager.client.table("raw_contacts").select(
        "id, name, email, linkedin_url, title, headline"
    ).is_("mutiline_icebreaker", "null").execute()
    
    if not result.data:
        print("✅ All contacts already have icebreakers!")
        sys.exit(0)
    
    print(f"Found {len(result.data)} contacts without icebreakers")
    
    # Generate icebreakers using the API
    for contact in result.data:
        try:
            print(f"Generating icebreaker for {contact['name']}...")
            
            # Prepare contact data for the API
            contact_data = {
                "contact": {
                    "first_name": contact['name'].split()[0] if contact['name'] else "",
                    "last_name": " ".join(contact['name'].split()[1:]) if contact['name'] and len(contact['name'].split()) > 1 else "",
                    "headline": contact.get('headline', ''),
                    "website_summaries": [
                        f"{contact['name']} is a professional with expertise in their field.",
                        f"They work as {contact.get('title', 'a professional')} with strong industry knowledge."
                    ]
                }
            }
            
            # Call the generate-icebreaker API
            response = requests.post(
                "http://localhost:8000/generate-icebreaker",
                headers={"Content-Type": "application/json"},
                json=contact_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result_data = response.json()
                icebreaker = result_data.get('icebreaker', '')
                
                if icebreaker:
                    # Update the contact with the generated icebreaker
                    update_result = manager.client.table("raw_contacts").update({
                        "mutiline_icebreaker": icebreaker
                    }).eq("id", contact['id']).execute()
                    
                    print(f"✅ Generated icebreaker for {contact['name']}")
                else:
                    print(f"⚠️ No icebreaker returned for {contact['name']}")
            else:
                print(f"❌ API error for {contact['name']}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error generating icebreaker for {contact['name']}: {e}")
    
    print("🎉 Icebreaker generation completed!")
    
except Exception as e:
    print(f"❌ Script failed: {e}")
    sys.exit(1)