#!/usr/bin/env python3
"""
Execute Google Maps Campaign via Python Campaign Manager
This script is called by simple-server.js to run campaigns using the Python infrastructure
with LinkedIn and Bouncer integration.
"""

import sys
import json
import logging
from pathlib import Path

# Add lead_generation to path (go up 2 dirs to project root, then into lead_generation)
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'lead_generation'))

from modules.gmaps_campaign_manager import GmapsCampaignManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    """
    Execute a campaign using the Python campaign manager

    Expected input (via stdin as JSON):
    {
        "campaign_id": "uuid",
        "supabase_url": "https://...",
        "supabase_key": "...",
        "apify_api_key": "...",
        "openai_api_key": "...",
        "bouncer_api_key": "...",
        "linkedin_actor_id": "...",
        "max_businesses_per_zip": 200
    }
    """
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        campaign_id = input_data.get('campaign_id')
        supabase_url = input_data.get('supabase_url')
        supabase_key = input_data.get('supabase_key')
        apify_key = input_data.get('apify_api_key')
        openai_key = input_data.get('openai_api_key')
        bouncer_key = input_data.get('bouncer_api_key', '')
        linkedin_actor_id = input_data.get('linkedin_actor_id', 'bebity~linkedin-premium-actor')
        max_businesses_per_zip = input_data.get('max_businesses_per_zip', 200)

        # Validate required fields
        if not all([campaign_id, supabase_url, supabase_key, apify_key, openai_key]):
            error_msg = "Missing required fields"
            logging.error(error_msg)
            print(json.dumps({"error": error_msg}))
            sys.exit(1)

        logging.info(f"Initializing campaign manager for campaign: {campaign_id}")

        # Initialize campaign manager with all API keys
        manager = GmapsCampaignManager(
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            apify_key=apify_key,
            openai_key=openai_key,
            linkedin_actor_id=linkedin_actor_id,
            bouncer_api_key=bouncer_key if bouncer_key else None
        )

        logging.info(f"Executing campaign: {campaign_id}")

        # Execute the campaign
        result = manager.execute_campaign(
            campaign_id=campaign_id,
            max_businesses_per_zip=max_businesses_per_zip
        )

        # Output result as JSON
        print(json.dumps(result, indent=2))

        # Exit with appropriate code
        if result.get('error'):
            sys.exit(1)
        else:
            sys.exit(0)

    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON input: {e}"
        logging.error(error_msg)
        print(json.dumps({"error": error_msg}))
        sys.exit(1)

    except Exception as e:
        error_msg = f"Campaign execution failed: {str(e)}"
        logging.error(error_msg)
        print(json.dumps({"error": error_msg}))
        sys.exit(1)

if __name__ == "__main__":
    main()
