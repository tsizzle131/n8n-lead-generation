#!/usr/bin/env python3
"""
Verify LinkedIn enrichment tables exist in Supabase
"""

import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from supabase import create_client, Client

def main():
    # Load Supabase credentials
    state_file = os.path.join(os.path.dirname(__file__), '../../.app-state.json')

    with open(state_file, 'r') as f:
        state = json.load(f)

    supabase_url = state['supabase']['url']
    supabase_key = state['supabase']['key']

    print(f"📦 Connecting to Supabase: {supabase_url}")
    print()

    supabase: Client = create_client(supabase_url, supabase_key)

    # Check for LinkedIn enrichments table
    print("🔍 Checking for LinkedIn enrichment tables...")
    print("=" * 60)

    tables_to_check = [
        'gmaps_linkedin_enrichments',
        'gmaps_email_verifications'
    ]

    all_exist = True

    for table in tables_to_check:
        try:
            # Try to query the table (limit 0 to just check existence)
            result = supabase.from_(table).select('*').limit(0).execute()
            print(f"✅ Table '{table}' exists")

        except Exception as e:
            all_exist = False
            error_msg = str(e)

            if '404' in error_msg or 'not found' in error_msg.lower():
                print(f"❌ Table '{table}' NOT FOUND")
            else:
                print(f"⚠️  Table '{table}' - Error: {error_msg}")

    print("=" * 60)

    if all_exist:
        print("\n✅ All LinkedIn enrichment tables exist!")
        print("\nYou can now:")
        print("1. Configure Bouncer API key in Settings")
        print("2. Run campaigns with LinkedIn enrichment")
        return 0
    else:
        print("\n❌ LinkedIn enrichment tables missing!")
        print("\n📝 To create the tables:")
        print("1. Go to Supabase SQL Editor:")
        print(f"   {supabase_url.replace('https://', 'https://supabase.com/dashboard/project/')}")
        print("\n2. Open file: lead_generation/migrations/add_linkedin_enrichment.sql")
        print("\n3. Copy and paste the entire SQL file into the editor")
        print("\n4. Click 'Run' to execute the migration")
        print("\n5. Run this script again to verify")
        return 1

if __name__ == '__main__':
    sys.exit(main())
