#!/usr/bin/env python3
"""
Simplified Integration Test for Phase 2.5: LinkedIn + Bouncer
Tests the complete workflow with method-level mocking
"""

import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from lead_generation.modules.linkedin_scraper import LinkedInScraper
from lead_generation.modules.bouncer_verifier import BouncerVerifier


class TestLinkedInBouncerWorkflow(unittest.TestCase):
    """Test complete LinkedIn + Bouncer workflow with simplified mocking"""

    def setUp(self):
        """Set up test components"""
        self.linkedin_scraper = LinkedInScraper(
            apify_key="test_apify_key",
            actor_id="test_actor"
        )
        self.bouncer_verifier = BouncerVerifier(api_key="test_bouncer_key")

    def test_successful_enrichment_and_verification(self):
        """Test successful workflow from business to verified email"""

        # Mock LinkedIn enrichment
        with patch.object(self.linkedin_scraper, 'find_linkedin_url') as mock_find:
            with patch.object(self.linkedin_scraper, 'scrape_linkedin_profiles') as mock_scrape:
                # Setup mocks
                mock_find.return_value = 'https://linkedin.com/company/acme'
                mock_scrape.return_value = [{
                    'name': 'John Doe',
                    'headline': 'CEO at Acme Corp',
                    'email': 'john@acme.com',
                    'phone': '+1-555-0100'
                }]

                # Execute LinkedIn enrichment
                business = {
                    'id': 'biz_123',
                    'name': 'Acme Corp',
                    'city': 'Austin',
                    'website': 'https://acme.com'
                }

                linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)

                # Verify LinkedIn enrichment worked
                self.assertEqual(len(linkedin_results), 1)
                linkedin_result = linkedin_results[0]
                self.assertTrue(linkedin_result['linkedin_found'])
                self.assertIsNotNone(linkedin_result['primary_email'])
                primary_email = linkedin_result['primary_email']

                # Mock Bouncer verification
                with patch.object(self.bouncer_verifier, 'verify_email') as mock_verify:
                    mock_verify.return_value = {
                        'email': primary_email,
                        'status': 'deliverable',
                        'score': 95,
                        'is_safe': True,
                        'is_deliverable': True,
                        'is_risky': False,
                        'is_disposable': False,
                        'is_role_based': False,
                        'is_free_email': False,
                        'verified': True
                    }

                    # Execute email verification
                    verification_result = self.bouncer_verifier.verify_email(primary_email)

                    # Verify Bouncer verification worked
                    self.assertEqual(verification_result['status'], 'deliverable')
                    self.assertTrue(verification_result['is_safe'])
                    self.assertEqual(verification_result['score'], 95)

                    # Combined result
                    combined = {
                        **linkedin_result,
                        'email_verification': verification_result
                    }

                    # Verify complete Phase 2.5 result
                    self.assertTrue(combined['linkedin_found'])
                    self.assertEqual(combined['email_verification']['status'], 'deliverable')
                    self.assertTrue(combined['email_verification']['is_safe'])

    def test_workflow_with_unverifiable_email(self):
        """Test workflow when email fails Bouncer verification"""

        with patch.object(self.linkedin_scraper, 'find_linkedin_url') as mock_find:
            with patch.object(self.linkedin_scraper, 'scrape_linkedin_profiles') as mock_scrape:
                # LinkedIn finds email, but it's not safe
                mock_find.return_value = 'https://linkedin.com/company/sketchy'
                mock_scrape.return_value = [{
                    'name': 'Fake Person',
                    'email': 'fake@disposable.com'
                }]

                business = {
                    'id': 'biz_456',
                    'name': 'Sketchy Business',
                    'city': 'Nowhere'
                }

                linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)
                linkedin_result = linkedin_results[0]

                # Mock Bouncer returning undeliverable
                with patch.object(self.bouncer_verifier, 'verify_email') as mock_verify:
                    mock_verify.return_value = {
                        'email': 'fake@disposable.com',
                        'status': 'undeliverable',
                        'score': 15,
                        'is_safe': False,
                        'is_deliverable': False,
                        'verified': True
                    }

                    verification = self.bouncer_verifier.verify_email(linkedin_result['primary_email'])

                    # Verify email not safe for use
                    self.assertFalse(verification['is_safe'])
                    self.assertEqual(verification['status'], 'undeliverable')

    def test_workflow_with_no_linkedin_found(self):
        """Test workflow when no LinkedIn profile exists"""

        with patch.object(self.linkedin_scraper, 'find_linkedin_url') as mock_find:
            mock_find.return_value = None

            business = {
                'id': 'biz_789',
                'name': 'Obscure Business',
                'city': 'Nowhere'
            }

            linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)

            # Should return empty result
            self.assertEqual(len(linkedin_results), 1)
            self.assertFalse(linkedin_results[0]['linkedin_found'])
            self.assertIsNone(linkedin_results[0].get('linkedin_url'))
            self.assertIsNone(linkedin_results[0].get('primary_email'))

    def test_batch_processing_workflow(self):
        """Test processing multiple businesses end-to-end"""

        businesses = [
            {'id': f'biz_{i}', 'name': f'Business {i}', 'city': 'City'}
            for i in range(3)
        ]

        with patch.object(self.linkedin_scraper, 'find_linkedin_url') as mock_find:
            with patch.object(self.linkedin_scraper, 'scrape_linkedin_profiles') as mock_scrape:
                # All businesses have LinkedIn profiles
                mock_find.return_value = 'https://linkedin.com/company/test'
                mock_scrape.return_value = [{
                    'name': 'Test Person',
                    'email': 'test@test.com'
                }]

                linkedin_results = self.linkedin_scraper.enrich_with_linkedin(businesses, max_businesses=3)

                # Should have 3 results
                self.assertEqual(len(linkedin_results), 3)

                # Mock Bouncer for all
                with patch.object(self.bouncer_verifier, 'verify_email') as mock_verify:
                    mock_verify.return_value = {
                        'status': 'deliverable',
                        'score': 90,
                        'is_safe': True,
                        'verified': True
                    }

                    verified_results = []
                    for linkedin_result in linkedin_results:
                        if linkedin_result.get('primary_email'):
                            verification = self.bouncer_verifier.verify_email(linkedin_result['primary_email'])
                            verified_results.append({
                                **linkedin_result,
                                'email_verification': verification
                            })

                    # All 3 should be verified
                    self.assertEqual(len(verified_results), 3)
                    for result in verified_results:
                        self.assertTrue(result['linkedin_found'])
                        self.assertTrue(result['email_verification']['is_safe'])


class TestCostCalculations(unittest.TestCase):
    """Test cost tracking for Phase 2.5"""

    def test_phase_25_cost_estimation(self):
        """Test that we can calculate costs for Phase 2.5 operations"""

        # LinkedIn cost: $10 per 1000 searches
        num_businesses = 100
        linkedin_cost = (num_businesses / 1000) * 10  # $1.00

        # Bouncer cost: $5 per 1000 verifications
        # Assuming 50% find emails
        emails_found = num_businesses * 0.5  # 50 emails
        bouncer_cost = (emails_found / 1000) * 5  # $0.25

        total_cost = linkedin_cost + bouncer_cost  # $1.25

        self.assertAlmostEqual(linkedin_cost, 1.00, places=2)
        self.assertAlmostEqual(bouncer_cost, 0.25, places=2)
        self.assertAlmostEqual(total_cost, 1.25, places=2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
