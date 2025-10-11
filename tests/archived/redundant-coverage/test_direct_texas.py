#!/usr/bin/env python3
"""
Test direct AI analysis for Texas (bypassing multi-step)
"""
import sys
import os
import json

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

from coverage_analyzer import CoverageAnalyzer

def test_direct():
    """Test direct AI analysis"""
    analyzer = CoverageAnalyzer()
    
    print("\n" + "="*50)
    print("Testing Texas with direct AI analysis")
    print("="*50)
    
    # Call the AI directly (not the multi-step approach)
    result = analyzer._ai_analyze_location(
        location="Texas",
        keywords=["salons", "beauty salons", "hair salons"],
        profile="aggressive"
    )
    
    print(f"\nResults:")
    print(f"- Total ZIP codes: {len(result.get('zip_codes', []))}")
    print(f"- Total estimated businesses: {result.get('total_estimated_businesses', 0)}")
    
    # Show first 10 ZIPs
    print("\nFirst 10 ZIP codes:")
    for i, zip_data in enumerate(result.get('zip_codes', [])[:10], 1):
        print(f"  {i}. {zip_data['zip']} - {zip_data.get('neighborhood', 'N/A')}")
    
    # Save full result
    with open('/tmp/texas_direct_test.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nFull results saved to /tmp/texas_direct_test.json")
    
    return result

if __name__ == "__main__":
    try:
        test_direct()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()