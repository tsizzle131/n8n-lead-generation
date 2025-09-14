#!/usr/bin/env python3
"""
Test Rhode Island with parallel state analysis
"""
import sys
import os
import json
import logging
import time

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)
    ]
)

from coverage_analyzer import CoverageAnalyzer

def test_rhode_island():
    """Test Rhode Island coverage analysis"""
    analyzer = CoverageAnalyzer()
    
    print("\n" + "="*50, flush=True)
    print("Testing Rhode Island with aggressive profile", flush=True)
    print("="*50, flush=True)
    
    start = time.time()
    result = analyzer.analyze_location(
        location="Rhode Island",
        keywords=["salons", "beauty salons", "hair salons"],
        profile="aggressive"
    )
    elapsed = time.time() - start
    
    print(f"\nCompleted in {elapsed:.1f} seconds", flush=True)
    print(f"Results:", flush=True)
    print(f"- Location type: {result.get('location_type')}", flush=True)
    print(f"- Total ZIP codes: {len(result.get('zip_codes', []))}", flush=True)
    print(f"- Total estimated businesses: {result.get('total_estimated_businesses', 0)}", flush=True)
    print(f"- Coverage achieved: {result.get('coverage_achieved', 0):.1f}%", flush=True)
    
    # Show first 10 ZIPs
    print("\nFirst 10 ZIP codes:", flush=True)
    for i, zip_data in enumerate(result.get('zip_codes', [])[:10], 1):
        print(f"  {i}. {zip_data['zip']} - {zip_data.get('neighborhood', 'N/A')} - {zip_data.get('estimated_businesses', 0)} businesses", flush=True)
    
    # Save full result
    with open('/tmp/rhode_island_test.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nFull results saved to /tmp/rhode_island_test.json", flush=True)
    
    return result

if __name__ == "__main__":
    try:
        test_rhode_island()
    except Exception as e:
        print(f"Error: {e}", flush=True)
        import traceback
        traceback.print_exc()