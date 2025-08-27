#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    import config
    from supabase import create_client
    
    print("=== Running Icebreaker Column Migration ===")
    print()
    
    # Get database connection
    supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    print("✅ Connected to Supabase")
    
    # Execute migration
    sql = """
    ALTER TABLE raw_contacts 
    ADD COLUMN IF NOT EXISTS mutiline_icebreaker TEXT;
    """
    
    print("🔧 Adding mutiline_icebreaker column...")
    
    try:
        # Try using raw SQL through the REST API
        import requests
        headers = {
            'apikey': config.SUPABASE_KEY,
            'Authorization': f'Bearer {config.SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Use Supabase's SQL editor endpoint if available, or direct PostgREST
        response = requests.post(
            f"{config.SUPABASE_URL}/rest/v1/rpc/sql",
            headers=headers,
            json={"query": sql}
        )
        
        if response.status_code == 200:
            print("✅ Migration executed successfully")
        else:
            print(f"❌ Migration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        print("💡 You may need to run this migration manually in the Supabase dashboard")
        print(f"💡 SQL to run: {sql.strip()}")
        
except Exception as e:
    print(f"❌ Setup error: {e}")