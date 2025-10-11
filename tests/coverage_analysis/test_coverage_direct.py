#!/usr/bin/env python3
"""
Direct test of coverage analyzer with simpler approach
"""
import sys
import os
import json
import logging

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

from coverage_analyzer import CoverageAnalyzer

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def test_state_coverage():
    """Test state coverage analysis"""
    analyzer = CoverageAnalyzer()
    
    # Test with Texas aggressive
    print("\n" + "="*50)
    print("Testing Texas with aggressive profile")
    print("="*50)
    
    result = analyzer.analyze_location(
        location="Texas",
        keywords=["salons", "beauty salons", "hair salons"],
        profile="aggressive"
    )
    
    print(f"\nResults:")
    print(f"- Location type: {result.get('location_type')}")
    print(f"- Total ZIP codes: {len(result.get('zip_codes', []))}")
    print(f"- Total estimated businesses: {result.get('total_estimated_businesses', 0)}")
    print(f"- Coverage achieved: {result.get('coverage_achieved', 0):.1f}%")
    
    # Show first 10 ZIPs
    print("\nFirst 10 ZIP codes:")
    for i, zip_data in enumerate(result.get('zip_codes', [])[:10], 1):
        print(f"  {i}. {zip_data['zip']} - {zip_data.get('neighborhood', 'N/A')} - {zip_data.get('estimated_businesses', 0)} businesses")
    
    return result

if __name__ == "__main__":
    try:
        result = test_state_coverage()
        # Save full result to file
        with open('/tmp/texas_coverage_test.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nFull results saved to /tmp/texas_coverage_test.json")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()