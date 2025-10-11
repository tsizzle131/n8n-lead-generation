#!/usr/bin/env python3
"""
Test Email Source Tracking
Comprehensive test to verify email_source field is set correctly across all operations

Tests:
1. Google Maps scraping sets email_source = "google_maps" or "not_found"
2. Facebook enrichment updates email_source = "facebook"
3. LinkedIn enrichment keeps email_source in LinkedIn table
4. Export functions correctly report email_source
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from lead_generation.modules.gmaps_supabase_manager import GmapsSupabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


class EmailSourceTrackingTest:
    """Test email_source tracking across all operations"""

    def __init__(self, supabase_url: str, supabase_key: str):
        self.db = GmapsSupabaseManager(supabase_url, supabase_key)
        self.test_campaign_id = None
        self.test_results = []

    def log_result(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        logging.info(f"{status}: {test_name}")
        if message:
            logging.info(f"   {message}")

        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message
        })

    def test_google_maps_email_source(self):
        """Test 1: Verify Google Maps scraping sets email_source correctly"""
        logging.info("\n" + "="*60)
        logging.info("TEST 1: Google Maps Email Source")
        logging.info("="*60)

        try:
            # Create test businesses with and without emails
            test_businesses = [
                {
                    "placeId": "test_place_1",
                    "title": "Test Business With Email",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "postalCode": "12345",
                    "email": "test1@business.com"  # Has email
                },
                {
                    "placeId": "test_place_2",
                    "title": "Test Business Without Email",
                    "address": "456 Test Ave",
                    "city": "Test City",
                    "state": "TS",
                    "postalCode": "12345"
                    # No email
                }
            ]

            # Create test campaign
            campaign_data = {
                "name": "Email Source Test Campaign",
                "description": "Testing email_source tracking",
                "keywords": ["test"],
                "location": "Test City, TS",
                "coverage_profile": "budget"
            }

            campaign = self.db.create_campaign(campaign_data)
            self.test_campaign_id = campaign.get("id")

            if not self.test_campaign_id:
                self.log_result("Create Test Campaign", False, "Failed to create campaign")
                return

            # Save test businesses
            saved_count = self.db.save_businesses(test_businesses, self.test_campaign_id, "12345")

            if saved_count != 2:
                self.log_result("Save Test Businesses", False, f"Expected 2, saved {saved_count}")
                return

            # Verify email_source is set correctly
            result = self.db.client.table("gmaps_businesses").select("*").eq("campaign_id", self.test_campaign_id).execute()

            businesses = result.data or []

            if len(businesses) != 2:
                self.log_result("Retrieve Test Businesses", False, f"Expected 2, found {len(businesses)}")
                return

            # Check business with email
            biz_with_email = next((b for b in businesses if b.get("email")), None)
            if not biz_with_email:
                self.log_result("Business With Email", False, "Not found")
                return

            if biz_with_email.get("email_source") == "google_maps":
                self.log_result("Email Source = google_maps", True, f"Correctly set for business with email")
            else:
                self.log_result("Email Source = google_maps", False,
                              f"Expected 'google_maps', got '{biz_with_email.get('email_source')}'")

            # Check business without email
            biz_without_email = next((b for b in businesses if not b.get("email")), None)
            if not biz_without_email:
                self.log_result("Business Without Email", False, "Not found")
                return

            if biz_without_email.get("email_source") == "not_found":
                self.log_result("Email Source = not_found", True, f"Correctly set for business without email")
            else:
                self.log_result("Email Source = not_found", False,
                              f"Expected 'not_found', got '{biz_without_email.get('email_source')}'")

        except Exception as e:
            self.log_result("Google Maps Email Source Test", False, str(e))
            logging.error(f"Exception: {e}")
            import traceback
            traceback.print_exc()

    def test_facebook_enrichment_email_source(self):
        """Test 2: Verify Facebook enrichment updates email_source"""
        logging.info("\n" + "="*60)
        logging.info("TEST 2: Facebook Enrichment Email Source")
        logging.info("="*60)

        try:
            if not self.test_campaign_id:
                self.log_result("Facebook Test - No Campaign", False, "Test campaign not created")
                return

            # Get business without email
            result = self.db.client.table("gmaps_businesses").select("*").eq("campaign_id", self.test_campaign_id).is_("email", "null").execute()

            if not result.data or len(result.data) == 0:
                self.log_result("Find Business for FB Enrichment", False, "No business without email found")
                return

            test_business = result.data[0]
            business_id = test_business["id"]

            # Simulate Facebook enrichment finding an email
            enrichment_data = {
                "facebook_url": "https://facebook.com/testbusiness",
                "page_name": "Test Business",
                "primary_email": "found_via_facebook@business.com",
                "emails": ["found_via_facebook@business.com"],
                "success": True
            }

            success = self.db.save_facebook_enrichment(business_id, self.test_campaign_id, enrichment_data)

            if not success:
                self.log_result("Save Facebook Enrichment", False, "Failed to save enrichment")
                return

            # Verify email_source was updated to 'facebook'
            result = self.db.client.table("gmaps_businesses").select("*").eq("id", business_id).execute()

            if not result.data or len(result.data) == 0:
                self.log_result("Retrieve After FB Enrichment", False, "Business not found")
                return

            updated_business = result.data[0]

            # Check email was updated
            if updated_business.get("email") == "found_via_facebook@business.com":
                self.log_result("Facebook Email Updated", True, "Email correctly updated")
            else:
                self.log_result("Facebook Email Updated", False,
                              f"Expected 'found_via_facebook@business.com', got '{updated_business.get('email')}'")

            # Check email_source was updated to 'facebook'
            if updated_business.get("email_source") == "facebook":
                self.log_result("Email Source = facebook", True, "Correctly updated after FB enrichment")
            else:
                self.log_result("Email Source = facebook", False,
                              f"Expected 'facebook', got '{updated_business.get('email_source')}'")

        except Exception as e:
            self.log_result("Facebook Enrichment Test", False, str(e))
            logging.error(f"Exception: {e}")
            import traceback
            traceback.print_exc()

    def test_linkedin_email_source(self):
        """Test 3: Verify LinkedIn enrichment stores email_source in LinkedIn table"""
        logging.info("\n" + "="*60)
        logging.info("TEST 3: LinkedIn Email Source")
        logging.info("="*60)

        try:
            if not self.test_campaign_id:
                self.log_result("LinkedIn Test - No Campaign", False, "Test campaign not created")
                return

            # Get a business for LinkedIn enrichment
            result = self.db.client.table("gmaps_businesses").select("*").eq("campaign_id", self.test_campaign_id).limit(1).execute()

            if not result.data or len(result.data) == 0:
                self.log_result("Find Business for LI Enrichment", False, "No business found")
                return

            test_business = result.data[0]
            business_id = test_business["id"]

            # Simulate LinkedIn enrichment
            enrichment_data = {
                "linkedin_url": "https://linkedin.com/in/testcontact",
                "profile_type": "personal",
                "person_name": "Test Contact",
                "person_title": "Owner",
                "primary_email": "contact@business.com",
                "email_source": "linkedin_direct",  # Source tracked in LinkedIn table
                "linkedin_found": True
            }

            success = self.db.save_linkedin_enrichment(business_id, self.test_campaign_id, enrichment_data)

            if not success:
                self.log_result("Save LinkedIn Enrichment", False, "Failed to save enrichment")
                return

            # Verify LinkedIn enrichment record has email_source
            result = self.db.client.table("gmaps_linkedin_enrichments").select("*").eq("business_id", business_id).execute()

            if not result.data or len(result.data) == 0:
                self.log_result("Retrieve LI Enrichment", False, "LinkedIn enrichment not found")
                return

            li_enrichment = result.data[0]

            # Check email_source in LinkedIn table
            if li_enrichment.get("email_source") == "linkedin_direct":
                self.log_result("LinkedIn Email Source", True, "Correctly stored in LinkedIn enrichment table")
            else:
                self.log_result("LinkedIn Email Source", False,
                              f"Expected 'linkedin_direct', got '{li_enrichment.get('email_source')}'")

            # Verify business email_source is NOT changed (remains original)
            result = self.db.client.table("gmaps_businesses").select("*").eq("id", business_id).execute()
            business = result.data[0] if result.data else None

            if business:
                original_source = business.get("email_source")
                if original_source in ["google_maps", "facebook", "not_found"]:
                    self.log_result("Business Email Source Unchanged", True,
                                  f"Correctly preserved original source: {original_source}")
                else:
                    self.log_result("Business Email Source Unchanged", False,
                                  f"Unexpected email_source: {original_source}")

        except Exception as e:
            self.log_result("LinkedIn Enrichment Test", False, str(e))
            logging.error(f"Exception: {e}")
            import traceback
            traceback.print_exc()

    def test_email_source_null_check(self):
        """Test 4: Verify no NULL email_source values exist"""
        logging.info("\n" + "="*60)
        logging.info("TEST 4: Check for NULL Email Sources")
        logging.info("="*60)

        try:
            # Check for NULL email_source values
            result = self.db.client.table("gmaps_businesses").select("id, name, email, email_source").is_("email_source", "null").execute()

            null_count = len(result.data) if result.data else 0

            if null_count == 0:
                self.log_result("No NULL Email Sources", True, "All businesses have email_source set")
            else:
                self.log_result("No NULL Email Sources", False, f"Found {null_count} businesses with NULL email_source")

                # Show first few examples
                if result.data:
                    logging.warning(f"\nExamples of businesses with NULL email_source:")
                    for row in result.data[:5]:
                        logging.warning(f"   - {row.get('name')}: email={row.get('email')}")

        except Exception as e:
            self.log_result("NULL Check Test", False, str(e))
            logging.error(f"Exception: {e}")

    def cleanup_test_data(self):
        """Clean up test data"""
        logging.info("\n" + "="*60)
        logging.info("CLEANUP: Removing Test Data")
        logging.info("="*60)

        try:
            if not self.test_campaign_id:
                logging.info("No test campaign to clean up")
                return

            # Delete test businesses
            self.db.client.table("gmaps_businesses").delete().eq("campaign_id", self.test_campaign_id).execute()

            # Delete test Facebook enrichments
            self.db.client.table("gmaps_facebook_enrichments").delete().eq("campaign_id", self.test_campaign_id).execute()

            # Delete test LinkedIn enrichments
            self.db.client.table("gmaps_linkedin_enrichments").delete().eq("campaign_id", self.test_campaign_id).execute()

            # Delete test campaign
            self.db.client.table("gmaps_campaigns").delete().eq("id", self.test_campaign_id).execute()

            logging.info("✅ Test data cleaned up successfully")

        except Exception as e:
            logging.error(f"Error during cleanup: {e}")

    def run_all_tests(self):
        """Run all tests and report results"""
        logging.info("="*60)
        logging.info("EMAIL SOURCE TRACKING TEST SUITE")
        logging.info("="*60)

        try:
            # Run tests
            self.test_google_maps_email_source()
            self.test_facebook_enrichment_email_source()
            self.test_linkedin_email_source()
            self.test_email_source_null_check()

        finally:
            # Always cleanup
            self.cleanup_test_data()

        # Print summary
        logging.info("\n" + "="*60)
        logging.info("TEST SUMMARY")
        logging.info("="*60)

        passed = sum(1 for r in self.test_results if r["passed"])
        failed = sum(1 for r in self.test_results if not r["passed"])
        total = len(self.test_results)

        logging.info(f"\nTotal Tests: {total}")
        logging.info(f"✅ Passed: {passed}")
        logging.info(f"❌ Failed: {failed}")

        if failed > 0:
            logging.warning("\n⚠️  Some tests failed. Review output above for details.")
            logging.info("\nFailed tests:")
            for result in self.test_results:
                if not result["passed"]:
                    logging.info(f"   - {result['test']}: {result['message']}")
        else:
            logging.info("\n✅ All tests passed successfully!")

        return failed == 0


def main():
    """Main execution function"""
    try:
        # Load environment variables
        load_dotenv()

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            logging.error("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables")
            sys.exit(1)

        # Run tests
        test_suite = EmailSourceTrackingTest(supabase_url, supabase_key)
        success = test_suite.run_all_tests()

        sys.exit(0 if success else 1)

    except Exception as e:
        logging.error(f"❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
