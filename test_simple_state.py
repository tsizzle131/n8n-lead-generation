#!/usr/bin/env python3
"""
Simple test to see what's happening with state analysis
"""
import sys
import os
import json
import time

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'lead_generation'))

# Import with minimal dependencies
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

from coverage_analyzer import CoverageAnalyzer

def test_simple():
    """Test with a simple city first"""
    analyzer = CoverageAnalyzer()
    
    print("\n" + "="*50)
    print("Testing Austin, TX with balanced profile")
    print("="*50)
    
    start = time.time()
    result = analyzer.analyze_location(
        location="Austin, TX",
        keywords=["salons"],
        profile="balanced"
    )
    elapsed = time.time() - start
    
    print(f"\nCompleted in {elapsed:.1f} seconds")
    print(f"ZIP codes returned: {len(result.get('zip_codes', []))}")
    
    # Save result
    with open('/tmp/austin_test.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    return result

if __name__ == "__main__":
    try:
        test_simple()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()