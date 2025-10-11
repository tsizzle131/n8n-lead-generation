"""
Campaign Manager Test Suite
Tests campaign state transitions, cost tracking, and coverage profiles

This test suite validates:
1. Campaign creation with different coverage profiles
2. State transitions (draft -> running -> paused -> resumed -> completed)
3. Cost tracking accuracy across all phases
4. Coverage analysis with budget/balanced/aggressive profiles
5. Pause/resume functionality
6. Error handling and recovery
"""

import sys
import os
import time
import json
from datetime import datetime
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_generation.modules.gmaps_campaign_manager import GmapsCampaignManager
from lead_generation.modules.coverage_analyzer import CoverageAnalyzer
from lead_generation.modules.gmaps_supabase_manager import GmapsSupabaseManager

# Test configuration
TEST_CONFIG = {
    'supabase_url': os.getenv('SUPABASE_URL'),
    'supabase_key': os.getenv('SUPABASE_KEY'),
    'apify_key': os.getenv('APIFY_API_KEY'),
    'openai_key': os.getenv('OPENAI_API_KEY'),
    'linkedin_actor_id': os.getenv('LINKEDIN_ACTOR_ID'),
    'bouncer_api_key': os.getenv('BOUNCER_API_KEY')
}

# Test results tracking
test_results = {
    'campaign_creation': {'passed': False, 'duration': 0, 'details': {}},
    'state_transitions': {'passed': False, 'duration': 0, 'details': {}},
    'cost_tracking': {'passed': False, 'duration': 0, 'details': {}},
    'coverage_profiles': {'passed': False, 'duration': 0, 'details': {}},
    'pause_resume': {'passed': False, 'duration': 0, 'details': {}},
    'error_handling': {'passed': False, 'duration': 0, 'details': {}}
}


def log(message: str, level: str = 'INFO'):
    """Log message with timestamp and level"""
    timestamp = datetime.now().isoformat()
    prefix = {
        'ERROR': '❌',
        'SUCCESS': '✅',
        'WARN': '⚠️',
        'INFO': 'ℹ️'
    }.get(level, 'ℹ️')
    print(f"[{timestamp}] {prefix} {message}")


class CampaignManagerTester:
    """Test suite for Campaign Manager"""

    def __init__(self):
        """Initialize tester with campaign manager"""
        self.manager = GmapsCampaignManager(
            supabase_url=TEST_CONFIG['supabase_url'],
            supabase_key=TEST_CONFIG['supabase_key'],
            apify_key=TEST_CONFIG['apify_key'],
            openai_key=TEST_CONFIG['openai_key'],
            linkedin_actor_id=TEST_CONFIG['linkedin_actor_id'],
            bouncer_api_key=TEST_CONFIG['bouncer_api_key']
        )
        self.created_campaigns = []

    def cleanup(self):
        """Clean up test campaigns"""
        log("Cleaning up test campaigns...")
        for campaign_id in self.created_campaigns:
            try:
                self.manager.db.client.table('gmaps_campaigns').delete().eq('id', campaign_id).execute()
                log(f"Deleted test campaign: {campaign_id}")
            except Exception as e:
                log(f"Failed to delete campaign {campaign_id}: {e}", 'WARN')

    def test_campaign_creation(self) -> str:
        """Test 1: Campaign creation with coverage analysis"""
        log("Starting Test 1: Campaign Creation", 'INFO')
        start_time = time.time()

        try:
            # Create campaign with budget profile
            campaign = self.manager.create_campaign(
                name="Test Campaign - Budget Profile",
                location="90210",  # Beverly Hills - small area
                keywords=["coffee shops"],
                coverage_profile="budget",
                description="Integration test campaign"
            )

            if 'error' in campaign:
                raise Exception(f"Campaign creation failed: {campaign['error']}")

            campaign_id = campaign['campaign_id']
            self.created_campaigns.append(campaign_id)

            # Validate campaign structure
            assert campaign_id is not None, "Campaign ID is None"
            assert campaign['status'] == 'draft', f"Expected status 'draft', got '{campaign['status']}'"
            assert campaign['zip_count'] > 0, "No ZIP codes selected"
            assert campaign['estimated_cost'] > 0, "Estimated cost not calculated"

            test_results['campaign_creation']['passed'] = True
            test_results['campaign_creation']['duration'] = time.time() - start_time
            test_results['campaign_creation']['details'] = {
                'campaign_id': campaign_id,
                'zip_count': campaign['zip_count'],
                'estimated_cost': campaign['estimated_cost'],
                'estimated_businesses': campaign['estimated_businesses']
            }

            log(f"Campaign created: {campaign_id} with {campaign['zip_count']} ZIPs", 'SUCCESS')
            return campaign_id

        except Exception as e:
            test_results['campaign_creation']['passed'] = False
            test_results['campaign_creation']['duration'] = time.time() - start_time
            test_results['campaign_creation']['details'] = {'error': str(e)}
            log(f"Campaign creation failed: {e}", 'ERROR')
            raise

    def test_state_transitions(self, campaign_id: str):
        """Test 2: Campaign state transitions"""
        log("Starting Test 2: State Transitions", 'INFO')
        start_time = time.time()

        try:
            # Check initial state
            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'draft', f"Initial state should be 'draft', got '{campaign['status']}'"

            # Transition to running (start execution)
            log("Transitioning to 'running'...")
            self.manager.db.update_campaign(campaign_id, {'status': 'running'})
            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'running', f"Expected 'running', got '{campaign['status']}'"

            # Transition to paused
            log("Transitioning to 'paused'...")
            self.manager.pause_campaign(campaign_id)
            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'paused', f"Expected 'paused', got '{campaign['status']}'"

            # Resume (back to running)
            log("Resuming campaign...")
            self.manager.resume_campaign(campaign_id)
            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'running', f"Expected 'running' after resume, got '{campaign['status']}'"

            # Complete
            log("Transitioning to 'completed'...")
            self.manager.db.update_campaign(campaign_id, {'status': 'completed'})
            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'completed', f"Expected 'completed', got '{campaign['status']}'"

            test_results['state_transitions']['passed'] = True
            test_results['state_transitions']['duration'] = time.time() - start_time
            test_results['state_transitions']['details'] = {
                'transitions_tested': ['draft', 'running', 'paused', 'running', 'completed'],
                'all_valid': True
            }

            log("All state transitions validated", 'SUCCESS')

        except Exception as e:
            test_results['state_transitions']['passed'] = False
            test_results['state_transitions']['duration'] = time.time() - start_time
            test_results['state_transitions']['details'] = {'error': str(e)}
            log(f"State transitions test failed: {e}", 'ERROR')
            raise

    def test_cost_tracking(self, campaign_id: str):
        """Test 3: Cost tracking accuracy"""
        log("Starting Test 3: Cost Tracking", 'INFO')
        start_time = time.time()

        try:
            # Track Google Maps cost
            gmaps_cost = 7.50  # $7.50 for 1000 results
            self.manager.db.track_api_cost(
                campaign_id=campaign_id,
                service='google_maps',
                items=1000,
                cost_usd=gmaps_cost
            )

            # Track Facebook cost
            facebook_cost = 3.00  # $3.00 for 1000 pages
            self.manager.db.track_api_cost(
                campaign_id=campaign_id,
                service='facebook',
                items=1000,
                cost_usd=facebook_cost
            )

            # Track LinkedIn cost
            linkedin_cost = 10.00  # $10.00 for 1000 searches
            self.manager.db.track_api_cost(
                campaign_id=campaign_id,
                service='linkedin',
                items=1000,
                cost_usd=linkedin_cost
            )

            # Verify costs are tracked
            costs = self.manager.db.client.table('gmaps_api_costs').select('*').eq(
                'campaign_id', campaign_id
            ).execute()

            total_tracked = sum(c['cost_usd'] for c in costs.data)
            expected_total = gmaps_cost + facebook_cost + linkedin_cost

            assert abs(total_tracked - expected_total) < 0.01, \
                f"Cost mismatch: tracked={total_tracked}, expected={expected_total}"

            # Verify services
            services = [c['service'] for c in costs.data]
            assert 'google_maps' in services, "Google Maps cost not tracked"
            assert 'facebook' in services, "Facebook cost not tracked"
            assert 'linkedin' in services, "LinkedIn cost not tracked"

            test_results['cost_tracking']['passed'] = True
            test_results['cost_tracking']['duration'] = time.time() - start_time
            test_results['cost_tracking']['details'] = {
                'total_cost': total_tracked,
                'services_tracked': services,
                'accuracy': 'exact'
            }

            log(f"Cost tracking validated: ${total_tracked:.2f}", 'SUCCESS')

        except Exception as e:
            test_results['cost_tracking']['passed'] = False
            test_results['cost_tracking']['duration'] = time.time() - start_time
            test_results['cost_tracking']['details'] = {'error': str(e)}
            log(f"Cost tracking test failed: {e}", 'ERROR')
            raise

    def test_coverage_profiles(self):
        """Test 4: Coverage profiles (budget, balanced, aggressive)"""
        log("Starting Test 4: Coverage Profiles", 'INFO')
        start_time = time.time()

        try:
            analyzer = CoverageAnalyzer(self.manager.db)
            test_location = "Austin, TX"
            test_keywords = ["restaurants"]

            profiles_tested = {}

            for profile in ['budget', 'balanced', 'aggressive']:
                log(f"Testing {profile} profile...")

                result = analyzer.analyze_location(
                    location=test_location,
                    keywords=test_keywords,
                    profile=profile
                )

                if 'error' in result:
                    raise Exception(f"{profile} profile failed: {result['error']}")

                zip_count = len(result.get('zip_codes', []))
                profiles_tested[profile] = {
                    'zip_count': zip_count,
                    'estimated_businesses': result.get('total_estimated_businesses', 0),
                    'estimated_cost': result.get('cost_estimates', {}).get('total_cost', 0)
                }

                log(f"{profile} profile: {zip_count} ZIPs")

            # Validate profile ordering: budget < balanced < aggressive
            assert profiles_tested['budget']['zip_count'] <= profiles_tested['balanced']['zip_count'], \
                "Budget should have fewer ZIPs than balanced"

            assert profiles_tested['balanced']['zip_count'] <= profiles_tested['aggressive']['zip_count'], \
                "Balanced should have fewer ZIPs than aggressive"

            test_results['coverage_profiles']['passed'] = True
            test_results['coverage_profiles']['duration'] = time.time() - start_time
            test_results['coverage_profiles']['details'] = profiles_tested

            log("Coverage profiles validated", 'SUCCESS')

        except Exception as e:
            test_results['coverage_profiles']['passed'] = False
            test_results['coverage_profiles']['duration'] = time.time() - start_time
            test_results['coverage_profiles']['details'] = {'error': str(e)}
            log(f"Coverage profiles test failed: {e}", 'ERROR')
            raise

    def test_pause_resume(self, campaign_id: str):
        """Test 5: Pause and resume functionality"""
        log("Starting Test 5: Pause/Resume Functionality", 'INFO')
        start_time = time.time()

        try:
            # Start campaign in background (simulate)
            self.manager.db.update_campaign(campaign_id, {
                'status': 'running',
                'started_at': datetime.now().isoformat()
            })

            # Pause
            log("Pausing campaign...")
            result = self.manager.pause_campaign(campaign_id)
            assert result is not False, "Pause failed"

            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'paused', f"Expected 'paused', got '{campaign['status']}'"

            # Verify campaign is actually paused (no new businesses added)
            business_count_before = campaign.get('total_businesses_found', 0)

            # Resume
            log("Resuming campaign...")
            result = self.manager.resume_campaign(campaign_id)
            assert result is not False, "Resume failed"

            campaign = self.manager.db.get_campaign(campaign_id)
            assert campaign['status'] == 'running', f"Expected 'running', got '{campaign['status']}'"

            # Verify business count didn't change during pause
            business_count_after = campaign.get('total_businesses_found', 0)
            assert business_count_before == business_count_after, \
                "Business count changed during pause"

            test_results['pause_resume']['passed'] = True
            test_results['pause_resume']['duration'] = time.time() - start_time
            test_results['pause_resume']['details'] = {
                'pause_successful': True,
                'resume_successful': True,
                'data_integrity_maintained': True
            }

            log("Pause/Resume functionality validated", 'SUCCESS')

        except Exception as e:
            test_results['pause_resume']['passed'] = False
            test_results['pause_resume']['duration'] = time.time() - start_time
            test_results['pause_resume']['details'] = {'error': str(e)}
            log(f"Pause/Resume test failed: {e}", 'ERROR')
            raise

    def test_error_handling(self):
        """Test 6: Error handling and recovery"""
        log("Starting Test 6: Error Handling", 'INFO')
        start_time = time.time()

        try:
            errors_handled = {}

            # Test 1: Invalid campaign ID
            try:
                self.manager.db.get_campaign('invalid-campaign-id-12345')
                errors_handled['invalid_id'] = False
            except:
                errors_handled['invalid_id'] = True

            # Test 2: Invalid location
            result = self.manager.create_campaign(
                name="Invalid Location Test",
                location="INVALID_LOCATION_12345",
                keywords=["test"],
                coverage_profile="budget"
            )
            if 'error' in result or result.get('zip_count', 0) == 0:
                errors_handled['invalid_location'] = True
            else:
                errors_handled['invalid_location'] = False
                # Clean up if created
                if 'campaign_id' in result:
                    self.created_campaigns.append(result['campaign_id'])

            # Test 3: Missing required fields
            try:
                self.manager.create_campaign(
                    name="",  # Empty name
                    location="90210",
                    keywords=[],  # Empty keywords
                    coverage_profile="budget"
                )
                errors_handled['missing_fields'] = False
            except:
                errors_handled['missing_fields'] = True

            # All errors should be handled gracefully
            all_handled = all(errors_handled.values())

            test_results['error_handling']['passed'] = all_handled
            test_results['error_handling']['duration'] = time.time() - start_time
            test_results['error_handling']['details'] = errors_handled

            if all_handled:
                log("Error handling validated", 'SUCCESS')
            else:
                log(f"Some errors not handled: {errors_handled}", 'WARN')

        except Exception as e:
            test_results['error_handling']['passed'] = False
            test_results['error_handling']['duration'] = time.time() - start_time
            test_results['error_handling']['details'] = {'error': str(e)}
            log(f"Error handling test failed: {e}", 'ERROR')
            raise


def generate_test_report():
    """Generate and print test report"""
    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results.values() if r['passed'])
    failed_tests = total_tests - passed_tests
    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

    report = {
        'summary': {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'pass_rate': f"{pass_rate:.2f}%",
            'timestamp': datetime.now().isoformat()
        },
        'tests': test_results
    }

    # Save report
    os.makedirs('test-results', exist_ok=True)
    report_path = f"test-results/campaign-manager-test-report-{int(time.time())}.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    # Print summary
    print('\n' + '=' * 70)
    print('CAMPAIGN MANAGER TEST SUMMARY')
    print('=' * 70)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Pass Rate: {pass_rate:.2f}%")
    print('=' * 70)

    # Print individual results
    for test_name, result in test_results.items():
        status = '✅ PASS' if result['passed'] else '❌ FAIL'
        duration = f"{result['duration']:.2f}s"
        print(f"{status} | {test_name} | {duration}")
        if 'error' in result['details']:
            print(f"       Error: {result['details']['error']}")

    print('\n' + '=' * 70)
    print(f"Report saved to: {report_path}")
    print('=' * 70 + '\n')

    return report


def run_campaign_manager_tests():
    """Main test execution"""
    log("Starting Campaign Manager Test Suite", 'INFO')

    tester = CampaignManagerTester()

    try:
        # Run tests
        campaign_id = tester.test_campaign_creation()
        tester.test_state_transitions(campaign_id)
        tester.test_cost_tracking(campaign_id)
        tester.test_coverage_profiles()
        tester.test_pause_resume(campaign_id)
        tester.test_error_handling()

        log("All campaign manager tests completed!", 'SUCCESS')

    except Exception as e:
        log(f"Test suite failed: {e}", 'ERROR')

    finally:
        # Clean up
        tester.cleanup()

        # Generate report
        report = generate_test_report()

        # Exit with appropriate code
        all_passed = all(r['passed'] for r in test_results.values())
        sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    run_campaign_manager_tests()
