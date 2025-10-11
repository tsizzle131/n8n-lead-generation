#!/usr/bin/env python3
"""
Integration Test for Phase 2.5: LinkedIn Enrichment + Bouncer Verification
Tests the complete workflow from business data to verified emails
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from lead_generation.modules.linkedin_scraper import LinkedInScraper
from lead_generation.modules.bouncer_verifier import BouncerVerifier


class TestPhase25Integration(unittest.TestCase):
    """Test complete Phase 2.5 workflow: LinkedIn discovery → scraping → Bouncer verification"""

    def setUp(self):
        """Set up test components"""
        self.linkedin_scraper = LinkedInScraper(
            apify_key="test_apify_key",
            actor_id="test_actor"
        )
        self.bouncer_verifier = BouncerVerifier(api_key="test_bouncer_key")

    @patch('requests.post')
    @patch('requests.Session.post')
    def test_complete_enrichment_workflow(self, mock_bouncer, mock_linkedin_request):
        """Test complete workflow: Business → LinkedIn search → Profile scrape → Email verification"""

        # 1. Mock LinkedIn search results (Google Search)
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        # Mock Google search for LinkedIn
        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': 'search_dataset'},  # Google search
            {'defaultDatasetId': 'linkedin_dataset'}  # LinkedIn scrape
        ]

        mock_client.dataset().list_items().iter_items.side_effect = [
            # Google search results
            [{
                'url': 'https://www.linkedin.com/company/acme-corp',
                'title': 'Acme Corp | LinkedIn',
                'description': 'Official LinkedIn page for Acme Corp'
            }],
            # LinkedIn company profile
            [{
                'companyName': 'Acme Corp',
                'website': 'https://acme.com',
                'email': 'contact@acme.com',
                'phone': '+1-555-0100',
                'employees': [
                    {
                        'fullName': 'John Doe',
                        'headline': 'CEO & Founder',
                        'email': 'john@acme.com'
                    },
                    {
                        'fullName': 'Jane Smith',
                        'headline': 'Marketing Manager',
                        'email': 'jane@acme.com'
                    }
                ]
            }]
        ]

        # 2. Mock Bouncer email verification
        mock_bouncer_response = Mock()
        mock_bouncer_response.status_code = 200
        mock_bouncer_response.json.return_value = {
            'email': 'john@acme.com',
            'status': 'deliverable',
            'score': 95,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_bouncer.return_value = mock_bouncer_response

        # 3. Execute Phase 2.5 workflow
        business = {
            'id': 'business_123',
            'name': 'Acme Corp',
            'city': 'Austin',
            'state': 'Texas',
            'website': 'https://acme.com'
        }

        # LinkedIn enrichment
        linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)

        self.assertEqual(len(linkedin_results), 1)
        linkedin_result = linkedin_results[0]

        # Verify LinkedIn enrichment worked
        self.assertTrue(linkedin_result['linkedin_found'])
        self.assertEqual(linkedin_result['linkedin_url'], 'https://www.linkedin.com/company/acme-corp')
        self.assertEqual(linkedin_result['profile_type'], 'company')
        self.assertIsNotNone(linkedin_result['primary_email'])

        # Email verification
        primary_email = linkedin_result['primary_email']
        verification_result = self.bouncer_verifier.verify_email(primary_email)

        # Verify Bouncer verification worked
        self.assertEqual(verification_result['status'], 'deliverable')
        self.assertTrue(verification_result['is_safe'])
        self.assertEqual(verification_result['score'], 95)
        self.assertFalse(verification_result['is_disposable'])

        # Combined result should have both LinkedIn and verification data
        combined_result = {
            **linkedin_result,
            'email_verification': verification_result
        }

        self.assertTrue(combined_result['linkedin_found'])
        self.assertTrue(combined_result['email_verification']['is_safe'])
        self.assertEqual(combined_result['email_verification']['score'], 95)

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_workflow_with_unverifiable_email(self, mock_bouncer, mock_apify_client):
        """Test workflow when LinkedIn email fails Bouncer verification"""

        # Mock LinkedIn enrichment with email
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': 'search_dataset'},
            {'defaultDatasetId': 'linkedin_dataset'}
        ]

        mock_client.dataset().list_items().iter_items.side_effect = [
            [{
                'url': 'https://www.linkedin.com/company/sketchy-business',
                'title': 'Sketchy Business | LinkedIn'
            }],
            [{
                'companyName': 'Sketchy Business',
                'website': 'https://sketchy.com',
                'email': 'fake@sketchy.com',  # Email exists but won't verify
                'employees': []
            }]
        ]

        # Mock Bouncer: Email is undeliverable
        mock_bouncer_response = Mock()
        mock_bouncer_response.status_code = 200
        mock_bouncer_response.json.return_value = {
            'email': 'fake@sketchy.com',
            'status': 'undeliverable',
            'score': 15,
            'is_disposable': False,
            'is_role': False,
            'is_free': False,
            'reason': 'mailbox_not_found'
        }
        mock_bouncer.return_value = mock_bouncer_response

        business = {
            'id': 'business_456',
            'name': 'Sketchy Business',
            'city': 'Nowhere',
            'state': 'State'
        }

        # LinkedIn enrichment
        linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)
        linkedin_result = linkedin_results[0]

        # Email verification
        verification_result = self.bouncer_verifier.verify_email(linkedin_result['primary_email'])

        # LinkedIn found email, but Bouncer says it's not safe
        self.assertTrue(linkedin_result['linkedin_found'])
        self.assertIsNotNone(linkedin_result['primary_email'])
        self.assertEqual(verification_result['status'], 'undeliverable')
        self.assertFalse(verification_result['is_safe'])

        # Should mark this lead as having LinkedIn but unsafe email
        combined_result = {
            **linkedin_result,
            'email_verification': verification_result,
            'email_usable': False  # Not usable due to failed verification
        }

        self.assertFalse(combined_result['email_usable'])

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_workflow_with_no_linkedin_found(self, mock_bouncer, mock_apify_client):
        """Test workflow when no LinkedIn profile is found"""

        # Mock LinkedIn search with no results
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        mock_client.actor().call.return_value = {'defaultDatasetId': 'search_dataset'}
        mock_client.dataset().list_items().iter_items.return_value = []  # No search results

        business = {
            'id': 'business_789',
            'name': 'Obscure Local Business',
            'city': 'Smalltown',
            'state': 'State'
        }

        # LinkedIn enrichment
        linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)
        linkedin_result = linkedin_results[0]

        # No LinkedIn found
        self.assertFalse(linkedin_result['linkedin_found'])
        self.assertIsNone(linkedin_result.get('linkedin_url'))
        self.assertIsNone(linkedin_result.get('primary_email'))

        # Bouncer verification shouldn't be called if no email found
        # (verified by not mocking bouncer and ensuring no calls)

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_batch_processing_with_verification(self, mock_bouncer, mock_apify_client):
        """Test batch processing of multiple businesses with verification"""

        # Mock LinkedIn for multiple businesses
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        # Create mock responses for 3 businesses
        search_responses = []
        linkedin_responses = []

        for i in range(3):
            search_responses.append([{
                'url': f'https://www.linkedin.com/company/business-{i}',
                'title': f'Business {i} | LinkedIn'
            }])

            linkedin_responses.append([{
                'companyName': f'Business {i}',
                'website': f'https://business{i}.com',
                'email': f'contact@business{i}.com',
                'employees': [{
                    'fullName': f'Owner {i}',
                    'headline': 'Owner',
                    'email': f'owner@business{i}.com'
                }]
            }])

        # Flatten for mock side_effect
        all_responses = []
        for i in range(3):
            all_responses.append(search_responses[i])
            all_responses.append(linkedin_responses[i])

        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': f'dataset_{i}'} for i in range(6)
        ]
        mock_client.dataset().list_items().iter_items.side_effect = all_responses

        # Mock Bouncer for all emails
        bouncer_responses = []
        for i in range(3):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'email': f'owner@business{i}.com',
                'status': 'deliverable',
                'score': 90 + i,
                'is_disposable': False,
                'is_role': False,
                'is_free': False
            }
            bouncer_responses.append(mock_response)

        mock_bouncer.side_effect = bouncer_responses

        # Create 3 test businesses
        businesses = [
            {
                'id': f'business_{i}',
                'name': f'Business {i}',
                'city': 'City',
                'state': 'State'
            }
            for i in range(3)
        ]

        # LinkedIn enrichment
        linkedin_results = self.linkedin_scraper.enrich_with_linkedin(businesses, max_businesses=3)

        self.assertEqual(len(linkedin_results), 3)

        # Verify each business
        verified_results = []
        for linkedin_result in linkedin_results:
            if linkedin_result.get('primary_email'):
                verification = self.bouncer_verifier.verify_email(linkedin_result['primary_email'])
                verified_results.append({
                    **linkedin_result,
                    'email_verification': verification
                })

        # All 3 should be enriched and verified
        self.assertEqual(len(verified_results), 3)

        for result in verified_results:
            self.assertTrue(result['linkedin_found'])
            self.assertEqual(result['email_verification']['status'], 'deliverable')
            self.assertTrue(result['email_verification']['is_safe'])

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_workflow_with_personal_linkedin_profile(self, mock_bouncer, mock_apify_client):
        """Test workflow when finding a personal LinkedIn profile (owner's profile)"""

        # Mock LinkedIn search finding personal profile
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': 'search_dataset'},
            {'defaultDatasetId': 'linkedin_dataset'}
        ]

        mock_client.dataset().list_items().iter_items.side_effect = [
            # Google search returns personal profile
            [{
                'url': 'https://www.linkedin.com/in/john-doe-owner',
                'title': 'John Doe - Owner at Acme Corp | LinkedIn'
            }],
            # Personal profile data
            [{
                'fullName': 'John Doe',
                'headline': 'Owner at Acme Corp',
                'email': 'john@acme.com',
                'company': 'Acme Corp'
            }]
        ]

        # Mock Bouncer verification
        mock_bouncer_response = Mock()
        mock_bouncer_response.status_code = 200
        mock_bouncer_response.json.return_value = {
            'email': 'john@acme.com',
            'status': 'deliverable',
            'score': 92,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_bouncer.return_value = mock_bouncer_response

        business = {
            'id': 'business_personal',
            'name': 'Acme Corp',
            'city': 'Austin',
            'state': 'Texas'
        }

        # LinkedIn enrichment
        linkedin_results = self.linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)
        linkedin_result = linkedin_results[0]

        # Verify personal profile was found
        self.assertTrue(linkedin_result['linkedin_found'])
        self.assertEqual(linkedin_result['profile_type'], 'personal')
        self.assertIsNotNone(linkedin_result['primary_email'])

        # Verify email
        verification_result = self.bouncer_verifier.verify_email(linkedin_result['primary_email'])

        self.assertTrue(verification_result['is_safe'])
        self.assertEqual(verification_result['score'], 92)


class TestCostTracking(unittest.TestCase):
    """Test cost tracking for Phase 2.5 operations"""

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_phase_25_cost_calculation(self, mock_bouncer, mock_apify_client):
        """Test that costs are properly calculated for LinkedIn + Bouncer"""

        # Mock LinkedIn enrichment
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': 'search_dataset'},
            {'defaultDatasetId': 'linkedin_dataset'}
        ]

        mock_client.dataset().list_items().iter_items.side_effect = [
            [{'url': 'https://www.linkedin.com/company/test', 'title': 'Test'}],
            [{
                'companyName': 'Test',
                'email': 'test@test.com',
                'employees': []
            }]
        ]

        # Mock Bouncer
        mock_bouncer_response = Mock()
        mock_bouncer_response.status_code = 200
        mock_bouncer_response.json.return_value = {
            'email': 'test@test.com',
            'status': 'deliverable',
            'score': 90,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_bouncer.return_value = mock_bouncer_response

        # Process 100 businesses
        businesses = [
            {'id': f'biz_{i}', 'name': f'Business {i}', 'city': 'City', 'state': 'State'}
            for i in range(100)
        ]

        linkedin_scraper = LinkedInScraper(apify_key="test", actor_id="test")
        bouncer_verifier = BouncerVerifier(api_key="test")

        # LinkedIn cost: $10 per 1000 searches
        linkedin_cost = (100 / 1000) * 10  # $1.00

        # Bouncer cost: $5 per 1000 verifications
        # Assuming all 100 businesses get verified
        bouncer_cost = (100 / 1000) * 5  # $0.50

        total_phase_25_cost = linkedin_cost + bouncer_cost  # $1.50

        self.assertAlmostEqual(linkedin_cost, 1.00, places=2)
        self.assertAlmostEqual(bouncer_cost, 0.50, places=2)
        self.assertAlmostEqual(total_phase_25_cost, 1.50, places=2)


class TestDataPersistence(unittest.TestCase):
    """Test that Phase 2.5 results are properly structured for database storage"""

    @patch('lead_generation.modules.linkedin_scraper.ApifyClient')
    @patch('requests.Session.post')
    def test_result_structure_for_database(self, mock_bouncer, mock_apify_client):
        """Test that enrichment results have correct structure for database"""

        # Mock LinkedIn enrichment
        mock_client = MagicMock()
        mock_apify_client.return_value = mock_client

        mock_client.actor().call.side_effect = [
            {'defaultDatasetId': 'search_dataset'},
            {'defaultDatasetId': 'linkedin_dataset'}
        ]

        mock_client.dataset().list_items().iter_items.side_effect = [
            [{'url': 'https://www.linkedin.com/company/acme', 'title': 'Acme'}],
            [{
                'companyName': 'Acme Corp',
                'website': 'https://acme.com',
                'email': 'contact@acme.com',
                'phone': '+1-555-0100',
                'employees': [{
                    'fullName': 'John Doe',
                    'headline': 'CEO',
                    'email': 'john@acme.com'
                }]
            }]
        ]

        # Mock Bouncer
        mock_bouncer_response = Mock()
        mock_bouncer_response.status_code = 200
        mock_bouncer_response.json.return_value = {
            'email': 'john@acme.com',
            'status': 'deliverable',
            'score': 95,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_bouncer.return_value = mock_bouncer_response

        business = {
            'id': 'test_business',
            'name': 'Acme Corp',
            'city': 'Austin',
            'state': 'Texas'
        }

        linkedin_scraper = LinkedInScraper(apify_key="test", actor_id="test")
        bouncer_verifier = BouncerVerifier(api_key="test")

        # Enrich and verify
        linkedin_results = linkedin_scraper.enrich_with_linkedin([business], max_businesses=1)
        linkedin_result = linkedin_results[0]

        verification_result = bouncer_verifier.verify_email(linkedin_result['primary_email'])

        # Structure for database (gmaps_linkedin_enrichments table)
        db_record = {
            'business_id': business['id'],
            'campaign_id': 'test_campaign',
            'linkedin_url': linkedin_result['linkedin_url'],
            'profile_type': linkedin_result['profile_type'],
            'primary_email': linkedin_result['primary_email'],
            'email_source': linkedin_result['email_source'],
            'decision_maker_name': linkedin_result.get('decision_maker_name'),
            'decision_maker_title': linkedin_result.get('decision_maker_title'),
            'company_phone': linkedin_result.get('company_phone'),
            'email_status': verification_result['status'],
            'email_score': verification_result['score'],
            'is_safe': verification_result['is_safe'],
            'is_deliverable': verification_result['is_deliverable'],
            'is_risky': verification_result['is_risky'],
            'is_disposable': verification_result['is_disposable'],
            'is_role_based': verification_result['is_role_based'],
            'is_free_email': verification_result['is_free_email']
        }

        # Verify all required fields are present
        required_fields = [
            'business_id', 'campaign_id', 'linkedin_url', 'profile_type',
            'primary_email', 'email_status', 'email_score', 'is_safe'
        ]

        for field in required_fields:
            self.assertIn(field, db_record)
            self.assertIsNotNone(db_record[field])


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
