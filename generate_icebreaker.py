#!/usr/bin/env python3
"""
Wrapper script to generate icebreakers using the lead_generation AI processor.
Called by the Express backend (simple-server.js) to generate personalized icebreakers.
"""

import sys
import json
import os

# Add lead_generation directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lead_generation'))

from modules.ai_processor import AIProcessor

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Missing required arguments"}))
            sys.exit(1)

        openai_key = sys.argv[1]
        contact_json = sys.argv[2]
        prompts_json = sys.argv[3] if len(sys.argv) > 3 else '{}'
        settings_json = sys.argv[4] if len(sys.argv) > 4 else '{}'

        # Parse inputs
        contact = json.loads(contact_json)
        prompts = json.loads(prompts_json)
        settings = json.loads(settings_json)

        # Initialize AI processor
        ai_processor = AIProcessor(openai_key)

        # Extract website summaries (passed in contact or empty)
        website_summaries = contact.get('website_summaries', [])

        # Generate icebreaker
        result = ai_processor.generate_icebreaker(contact, website_summaries)

        # Output result
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(json.dumps({
            "error": error_msg,
            "traceback": error_trace
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
