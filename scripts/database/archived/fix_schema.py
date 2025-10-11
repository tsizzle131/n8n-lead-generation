#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

try:
    from modules.supabase_manager import SupabaseManager
    import config
    
    print("=== Database Schema Fix ===")
    print()
    
    # Initialize Supabase manager
    manager = SupabaseManager()
    
    print("✅ Connected to Supabase successfully")
    print()
    
    # Add audience_id column to raw_contacts table
    print("🔧 Adding audience_id column to raw_contacts table...")
    try:
        # Add the column
        sql = """
        ALTER TABLE raw_contacts 
        ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL;
        """
        
        result = manager.client.rpc('exec_sql', {'query': sql}).execute()
        print("✅ Successfully added audience_id column")
        print()
        
        # Create index for performance
        print("📊 Creating index on audience_id...")
        index_sql = """
        CREATE INDEX IF NOT EXISTS idx_raw_contacts_audience_id ON raw_contacts(audience_id);
        """
        
        result = manager.client.rpc('exec_sql', {'query': index_sql}).execute()
        print("✅ Successfully created index")
        print()
        
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        print("💡 Trying alternative approach...")
        
        # Alternative: direct SQL execution if RPC doesn't work
        try:
            # Note: This might not work depending on Supabase setup
            print("⚠️  Manual schema update needed")
            print("Run this SQL in Supabase dashboard:")
            print("ALTER TABLE raw_contacts ADD COLUMN IF NOT EXISTS audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL;")
            print("CREATE INDEX IF NOT EXISTS idx_raw_contacts_audience_id ON raw_contacts(audience_id);")
        except Exception as e2:
            print(f"❌ Alternative also failed: {e2}")
    
    print()
    print("🔍 Verifying schema...")
    try:
        # Test if column now exists
        result = manager.client.table("raw_contacts").select("audience_id").limit(1).execute()
        print("✅ Column exists and is accessible")
    except Exception as e:
        print(f"❌ Column still not accessible: {e}")
        
except Exception as e:
    print(f"❌ Failed to connect to database: {e}")