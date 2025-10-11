#!/usr/bin/env python3
"""
Run LinkedIn enrichment and Bouncer verification database migration
"""

import json
import sys
import os

# Add parent directory to path to import from lead_generation
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from supabase import create_client, Client

def main():
    # Load Supabase credentials from .app-state.json
    state_file = os.path.join(os.path.dirname(__file__), '../../.app-state.json')

    with open(state_file, 'r') as f:
        state = json.load(f)

    supabase_url = state['supabase']['url']
    supabase_key = state['supabase']['key']

    print(f"📦 Connecting to Supabase: {supabase_url}")

    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)

    # Read migration SQL
    migration_file = os.path.join(os.path.dirname(__file__),
                                   '../../lead_generation/migrations/add_linkedin_enrichment.sql')

    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    print("📄 Running LinkedIn enrichment migration...")
    print("=" * 60)

    try:
        # Execute the migration
        # Note: Supabase Python client doesn't have a direct SQL execution method
        # We'll need to use the REST API via rpc or execute via psycopg2

        # For now, let's split the migration into separate statements
        # and execute them one by one
        statements = migration_sql.split(';')

        success_count = 0
        error_count = 0

        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            if not statement or statement.startswith('--'):
                continue

            try:
                # Execute via rpc (we'll need to create a function)
                # Actually, let's use direct postgres connection instead
                print(f"[{i}] Executing statement...")

                # This is a workaround - the proper way would be to use psycopg2
                # or the Supabase SQL editor
                result = supabase.rpc('exec_sql', {'query': statement + ';'}).execute()

                success_count += 1
                print(f"    ✅ Success")

            except Exception as e:
                error_count += 1
                print(f"    ⚠️  Error: {str(e)}")
                # Continue with other statements
                continue

        print("=" * 60)
        print(f"📊 Migration Results:")
        print(f"   ✅ Successful: {success_count}")
        print(f"   ❌ Errors: {error_count}")

        if error_count == 0:
            print("\n✅ Migration completed successfully!")
        else:
            print(f"\n⚠️  Migration completed with {error_count} errors")
            print("   Check Supabase SQL editor for manual execution if needed")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nAlternative: Run migration manually via Supabase SQL Editor")
        print(f"1. Go to: {supabase_url.replace('https://', 'https://supabase.com/dashboard/project/')}/sql")
        print(f"2. Open: lead_generation/migrations/add_linkedin_enrichment.sql")
        print("3. Execute the SQL")
        sys.exit(1)

if __name__ == '__main__':
    main()
