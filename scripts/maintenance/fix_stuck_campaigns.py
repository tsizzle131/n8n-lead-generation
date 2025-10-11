#!/usr/bin/env python3
"""
Fix stuck campaigns that have businesses but status=running

This script identifies campaigns stuck in 'running' status and:
- Marks them as 'completed' if they have businesses
- Marks them as 'failed' if they have no businesses

Usage:
    python3 fix_stuck_campaigns.py
"""
from supabase import create_client
import json
from datetime import datetime
import sys

def main():
    print("="*70)
    print("STUCK CAMPAIGN CLEANUP SCRIPT")
    print("="*70)
    print()

    # Load credentials
    try:
        with open('.app-state.json', 'r') as f:
            state = json.load(f)
    except FileNotFoundError:
        print("❌ Error: .app-state.json not found")
        print("   Please run this script from the project root directory")
        sys.exit(1)

    supabase_url = state.get('supabase', {}).get('url')
    supabase_key = state.get('supabase', {}).get('key')

    if not supabase_url or not supabase_key:
        print("❌ Error: Supabase credentials not found in .app-state.json")
        sys.exit(1)

    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    print(f"✅ Connected to Supabase: {supabase_url}")
    print()

    # Find stuck campaigns
    print("🔍 Searching for stuck campaigns...")
    response = supabase.table('gmaps_campaigns')\
        .select('*')\
        .eq('status', 'running')\
        .order('updated_at', desc=True)\
        .execute()

    stuck_campaigns = response.data

    if not stuck_campaigns:
        print("✅ No stuck campaigns found - all campaigns are in valid states!")
        return

    print(f"📊 Found {len(stuck_campaigns)} stuck campaign(s):\n")

    # Display stuck campaigns
    for idx, campaign in enumerate(stuck_campaigns, 1):
        campaign_id = campaign['id']
        name = campaign['name']
        businesses = campaign.get('total_businesses_found', 0)
        emails = campaign.get('total_emails_found', 0)
        started = campaign.get('started_at', 'unknown')
        updated = campaign.get('updated_at', 'unknown')

        print(f"{idx}. Campaign: {name}")
        print(f"   ID: {campaign_id}")
        print(f"   Businesses Found: {businesses}")
        print(f"   Emails Found: {emails}")
        print(f"   Started: {started}")
        print(f"   Last Updated: {updated}")
        print()

    # Ask for confirmation
    print("⚠️  This script will update the status of these campaigns.")
    response = input("Continue? (yes/no): ").strip().lower()

    if response not in ['yes', 'y']:
        print("❌ Cancelled by user")
        sys.exit(0)

    print()
    print("🔧 Processing stuck campaigns...")
    print()

    # Fix each stuck campaign
    fixed_count = 0
    for campaign in stuck_campaigns:
        campaign_id = campaign['id']
        name = campaign['name']
        businesses = campaign.get('total_businesses_found', 0)
        emails = campaign.get('total_emails_found', 0)

        # If campaign has results, mark as completed
        if businesses > 0:
            print(f"✅ Marking '{name}' as COMPLETED")
            print(f"   ({businesses} businesses, {emails} emails found)")

            supabase.table('gmaps_campaigns')\
                .update({
                    'status': 'completed',
                    'completed_at': datetime.now().isoformat()
                })\
                .eq('id', campaign_id)\
                .execute()

            fixed_count += 1

        else:
            # No results, mark as failed
            print(f"❌ Marking '{name}' as FAILED (no results)")

            supabase.table('gmaps_campaigns')\
                .update({
                    'status': 'failed',
                    'completed_at': datetime.now().isoformat(),
                    'error': 'Campaign stuck with no results - marked as failed by cleanup script'
                })\
                .eq('id', campaign_id)\
                .execute()

            fixed_count += 1

        print()

    print("="*70)
    print(f"✅ DONE! Fixed {fixed_count} stuck campaign(s)")
    print("="*70)
    print()
    print("Next steps:")
    print("  1. Refresh your frontend to see updated campaign statuses")
    print("  2. Check campaigns are now marked as 'completed' or 'failed'")
    print("  3. Export data from completed campaigns")
    print()

if __name__ == "__main__":
    main()
