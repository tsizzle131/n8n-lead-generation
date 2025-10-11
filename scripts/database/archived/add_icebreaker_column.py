#!/usr/bin/env python3

import sys
import os

# Add the lead_generation directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

from modules.supabase_manager import SupabaseManager

def add_icebreaker_column():
    try:
        manager = SupabaseManager()
        
        sql = """
        ALTER TABLE raw_contacts 
        ADD COLUMN mutiline_icebreaker TEXT;
        """
        
        print('🔧 Adding mutiline_icebreaker column to raw_contacts table...')
        # Use direct SQL execution via postgrest
        from supabase import create_client
        import config
        
        supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        result = supabase.postgrest.schema().raw_query(sql)
        print('✅ Column added successfully')
        return True
        
    except Exception as e:
        if 'already exists' in str(e) or 'duplicate column' in str(e):
            print('✅ Column already exists')
            return True
        else:
            print(f'❌ Error: {e}')
            return False

if __name__ == "__main__":
    success = add_icebreaker_column()
    sys.exit(0 if success else 1)