#!/bin/bash
# Database Verification Test Runner
#
# This script runs a comprehensive test suite that verifies:
# 1. LinkedIn parallel scraper saves data to all tables correctly
# 2. Facebook email verifications are recorded
# 3. Google Maps email verifications are recorded
# 4. Data integrity and foreign key relationships
# 5. Email verification coverage by source
# 6. Export data completeness
#
# Usage: ./run_database_verification_test.sh

echo "================================================================================================"
echo "DATABASE VERIFICATION TEST SUITE"
echo "================================================================================================"
echo ""
echo "This test will:"
echo "  1. Find the Miami Restaurants campaign"
echo "  2. Run LinkedIn parallel scraper on 10 businesses"
echo "  3. Verify all data saved to database tables:"
echo "     - gmaps_linkedin_enrichments"
echo "     - gmaps_facebook_enrichments"
echo "     - gmaps_email_verifications"
echo "     - gmaps_businesses (updated with URLs)"
echo "  4. Check data integrity and foreign key relationships"
echo "  5. Generate detailed coverage report"
echo ""
echo "Test results will be saved to: test_results/database_verification_report_*.json"
echo ""
read -p "Press Enter to start test..."

python3 test_database_verification_complete.py

exit_code=$?

echo ""
echo "================================================================================================"
if [ $exit_code -eq 0 ]; then
    echo "✓ ALL TESTS PASSED"
else
    echo "✗ SOME TESTS FAILED - Check output above for details"
fi
echo "================================================================================================"

exit $exit_code
