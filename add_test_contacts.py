#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    
    print("🔄 Adding test contacts...")
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    
    # Test contacts data (simplified format matching existing schema)
    test_contacts = [
        {
            "name": "Alex Thompson",
            "email": "alex.thompson@techcorp.com",
            "linkedin_url": "https://linkedin.com/in/alex-thompson-tech",
            "title": "Marketing Director",
            "headline": "Marketing Director at TechCorp | B2B SaaS Growth",
            "audience_id": "f08913d0-b585-4730-b559-d2f76ed9ab3b"
        },
        {
            "name": "Maria Rodriguez",
            "email": "maria@greentech.io",
            "linkedin_url": "https://linkedin.com/in/maria-rodriguez-ceo",
            "title": "CEO & Founder",
            "headline": "CEO at GreenTech Solutions | Sustainable Technology Leader",
            "audience_id": "f08913d0-b585-4730-b559-d2f76ed9ab3b"
        },
        {
            "name": "David Chen",
            "email": "david.chen@dataflow.com",
            "linkedin_url": "https://linkedin.com/in/david-chen-vp",
            "title": "VP of Marketing",
            "headline": "VP Marketing at DataFlow Inc | Financial Tech Expert",
            "audience_id": "f08913d0-b585-4730-b559-d2f76ed9ab3b"
        }
    ]
    
    # Insert contacts
    for contact in test_contacts:
        try:
            result = manager.client.table("raw_contacts").insert(contact).execute()
            print(f"✅ Added contact: {contact['name']}")
        except Exception as e:
            print(f"❌ Failed to add {contact['name']}: {e}")
    
    print(f"🎉 Test contacts added successfully!")
    
except Exception as e:
    print(f"❌ Script failed: {e}")
    sys.exit(1)