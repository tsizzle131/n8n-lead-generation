#!/usr/bin/env python3
"""
Standalone ZIP Code Analyzer
Called by Express server to get optimal ZIP codes for a location
"""

import sys
import json
import logging
from pathlib import Path

# Add lead_generation modules to path
sys.path.append(str(Path(__file__).parent / 'lead_generation' / 'modules'))
sys.path.append(str(Path(__file__).parent / 'lead_generation'))

from coverage_analyzer import CoverageAnalyzer

logging.basicConfig(level=logging.WARNING)

def main():
    """Main function to analyze ZIP codes"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        location = input_data.get('location', '')
        keywords = input_data.get('keywords', [])
        coverage_profile = input_data.get('coverage_profile', 'balanced')
        
        # Initialize coverage analyzer
        analyzer = CoverageAnalyzer()
        
        # Analyze location
        result = analyzer.analyze_location(
            location=location,
            keywords=keywords,
            profile=coverage_profile
        )
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Check for OpenAI quota error
        error_msg = str(e).lower()
        is_quota_error = "insufficient_quota" in error_msg or "quota" in error_msg or "429" in error_msg
        
        # Return error as JSON with specific error type
        error_result = {
            "error": str(e),
            "error_type": "openai_quota" if is_quota_error else "general",
            "location_type": "error",
            "zip_codes": [],
            "reasoning": "OpenAI API quota exceeded - please check your OpenAI account" if is_quota_error else f"Error analyzing location: {str(e)}",
            "total_estimated_businesses": 0,
            "coverage_notes": "Analysis failed"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()