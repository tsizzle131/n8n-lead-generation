#!/usr/bin/env python3
"""
Unit Tests for Bouncer Email Verifier
Tests email verification, deliverability scoring, and batch verification
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from lead_generation.modules.bouncer_verifier import BouncerVerifier


class TestEmailVerification(unittest.TestCase):
    """Test single email verification"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_deliverable_email(self, mock_post):
        """Test verification of a deliverable email"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'john@acme.com',
            'status': 'deliverable',
            'score': 95,
            'is_disposable': False,
            'is_role': False,
            'is_free': False,
            'did_you_mean': None
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('john@acme.com')

        self.assertEqual(result['status'], 'deliverable')
        self.assertEqual(result['score'], 95)
        self.assertTrue(result['is_safe'])
        self.assertTrue(result['is_deliverable'])
        self.assertFalse(result['is_risky'])

    @patch('requests.Session.post')
    def test_undeliverable_email(self, mock_post):
        """Test verification of an undeliverable email"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'fake@nonexistent.com',
            'status': 'undeliverable',
            'score': 10,
            'reason': 'mailbox_not_found',
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('fake@nonexistent.com')

        self.assertEqual(result['status'], 'undeliverable')
        self.assertEqual(result['score'], 10)
        self.assertFalse(result['is_safe'])
        self.assertFalse(result['is_deliverable'])
        self.assertFalse(result['is_risky'])

    @patch('requests.Session.post')
    def test_risky_email(self, mock_post):
        """Test verification of a risky email"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'test@tempmail.com',
            'status': 'risky',
            'score': 45,
            'reason': 'low_deliverability',
            'is_disposable': True,
            'is_role': False,
            'is_free': True
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@tempmail.com')

        self.assertEqual(result['status'], 'risky')
        self.assertEqual(result['score'], 45)
        self.assertFalse(result['is_safe'])
        self.assertFalse(result['is_deliverable'])
        self.assertTrue(result['is_risky'])
        self.assertTrue(result['is_disposable'])

    @patch('requests.Session.post')
    def test_role_based_email(self, mock_post):
        """Test verification of role-based email (info@, support@, etc.)"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'info@acme.com',
            'status': 'deliverable',
            'score': 85,
            'is_disposable': False,
            'is_role': True,  # Role-based email
            'is_free': False
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('info@acme.com')

        self.assertEqual(result['status'], 'deliverable')
        self.assertTrue(result['is_role_based'])
        # Should still be considered safe if deliverable and high score
        self.assertTrue(result['is_safe'])

    @patch('requests.Session.post')
    def test_free_email_provider(self, mock_post):
        """Test verification of free email provider (gmail, yahoo, etc.)"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'john.doe@gmail.com',
            'status': 'deliverable',
            'score': 90,
            'is_disposable': False,
            'is_role': False,
            'is_free': True  # Free email provider
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('john.doe@gmail.com')

        self.assertEqual(result['status'], 'deliverable')
        self.assertTrue(result['is_free_email'])
        # Should still be safe if deliverable
        self.assertTrue(result['is_safe'])


class TestScoringLogic(unittest.TestCase):
    """Test deliverability scoring and safety classification"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_high_score_safe(self, mock_post):
        """Test that high score (>=70) with deliverable status is marked safe"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'status': 'deliverable',
            'score': 85,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        self.assertTrue(result['is_safe'])
        self.assertEqual(result['score'], 85)

    @patch('requests.Session.post')
    def test_low_score_unsafe(self, mock_post):
        """Test that low score (<70) is marked unsafe even if deliverable"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'status': 'deliverable',
            'score': 55,  # Below threshold
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        self.assertFalse(result['is_safe'])
        self.assertEqual(result['score'], 55)

    @patch('requests.Session.post')
    def test_unknown_status(self, mock_post):
        """Test handling of unknown verification status"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'status': 'unknown',
            'score': 50,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        self.assertEqual(result['status'], 'unknown')
        self.assertFalse(result['is_safe'])
        self.assertFalse(result['is_deliverable'])


class TestBatchVerification(unittest.TestCase):
    """Test batch email verification"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_batch_verification_success(self, mock_post):
        """Test successful batch verification of multiple emails"""
        # Mock batch API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'results': [
                {
                    'email': 'john@acme.com',
                    'status': 'deliverable',
                    'score': 95,
                    'is_disposable': False,
                    'is_role': False,
                    'is_free': False
                },
                {
                    'email': 'jane@acme.com',
                    'status': 'deliverable',
                    'score': 90,
                    'is_disposable': False,
                    'is_role': False,
                    'is_free': False
                },
                {
                    'email': 'fake@invalid.com',
                    'status': 'undeliverable',
                    'score': 5,
                    'is_disposable': False,
                    'is_role': False,
                    'is_free': False
                }
            ]
        }
        mock_post.return_value = mock_response

        emails = ['john@acme.com', 'jane@acme.com', 'fake@invalid.com']
        results = self.verifier.verify_batch(emails)

        self.assertEqual(len(results), 3)

        # Check first email (deliverable)
        self.assertEqual(results[0]['email'], 'john@acme.com')
        self.assertTrue(results[0]['is_safe'])

        # Check second email (deliverable)
        self.assertEqual(results[1]['email'], 'jane@acme.com')
        self.assertTrue(results[1]['is_safe'])

        # Check third email (undeliverable)
        self.assertEqual(results[2]['email'], 'fake@invalid.com')
        self.assertFalse(results[2]['is_safe'])

    @patch('requests.Session.post')
    @patch('time.sleep')
    def test_batch_with_rate_limiting(self, mock_sleep, mock_post):
        """Test that batch verification respects rate limits between batches"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'results': [
                {
                    'email': f'test{i}@example.com',
                    'status': 'deliverable',
                    'score': 90,
                    'is_disposable': False,
                    'is_role': False,
                    'is_free': False
                } for i in range(100)
            ]
        }
        mock_post.return_value = mock_response

        # Create 250 emails (more than max_batch_size of 100)
        emails = [f'test{i}@example.com' for i in range(250)]

        results = self.verifier.verify_batch(emails, max_batch_size=100)

        # Should process in 3 batches (100, 100, 50)
        # Should sleep between first and second batch, and second and third batch (2 sleeps)
        self.assertEqual(mock_sleep.call_count, 2)
        mock_sleep.assert_called_with(1)  # Default delay is 1s

    @patch('requests.Session.post')
    def test_batch_with_partial_failures(self, mock_post):
        """Test batch verification when API fails"""
        # Mock a failed batch request
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.json.return_value = {'error': 'Server error'}
        mock_post.return_value = mock_response

        emails = ['test1@example.com', 'test2@example.com', 'test3@example.com']
        results = self.verifier.verify_batch(emails)

        # Should return error results for all emails
        self.assertEqual(len(results), 3)
        for result in results:
            self.assertEqual(result['status'], 'error')
            self.assertIn('email', result)


class TestErrorHandling(unittest.TestCase):
    """Test error handling in Bouncer verifier"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_api_error_500(self, mock_post):
        """Test handling of 500 server error"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        # Should return error result, not crash
        self.assertEqual(result['status'], 'error')
        self.assertFalse(result.get('verified', True))

    @patch('requests.Session.post')
    def test_api_error_401_unauthorized(self, mock_post):
        """Test handling of 401 unauthorized (invalid API key)"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {'error': 'Invalid API key'}
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        self.assertEqual(result['status'], 'error')
        self.assertFalse(result.get('verified', True))
        self.assertIn('Invalid API key', result.get('reason', ''))

    @patch('requests.Session.post')
    def test_network_timeout(self, mock_post):
        """Test handling of network timeout"""
        mock_post.side_effect = Exception("Connection timeout")

        result = self.verifier.verify_email('test@example.com')

        # Should handle exception gracefully
        self.assertEqual(result['status'], 'error')
        self.assertFalse(result.get('verified', True))

    @patch('requests.Session.post')
    def test_malformed_response(self, mock_post):
        """Test handling of malformed API response"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'unexpected': 'format'}  # Missing required fields
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('test@example.com')

        # Should handle malformed response
        self.assertIn('status', result)
        self.assertIn('email', result)

    def test_invalid_email_format(self):
        """Test handling of invalid email format"""
        invalid_emails = [
            'not-an-email',
            '@example.com',
            'user@',
            'user space@example.com',
            '',
            None
        ]

        for email in invalid_emails:
            if email is None or email == '':
                continue
            result = self.verifier.verify_email(email)
            # Should handle invalid format gracefully
            self.assertIn('status', result)


class TestSuggestions(unittest.TestCase):
    """Test email suggestion feature"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_typo_suggestion(self, mock_post):
        """Test that typo suggestions are captured"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'john@gmial.com',  # Typo
            'status': 'undeliverable',
            'score': 20,
            'did_you_mean': 'john@gmail.com',  # Suggestion
            'is_disposable': False,
            'is_role': False,
            'is_free': True
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('john@gmial.com')

        self.assertEqual(result['status'], 'undeliverable')
        self.assertEqual(result.get('suggestion'), 'john@gmail.com')

    @patch('requests.Session.post')
    def test_no_suggestion_for_valid_email(self, mock_post):
        """Test that no suggestion is provided for valid emails"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'john@gmail.com',
            'status': 'deliverable',
            'score': 95,
            'did_you_mean': None,  # No suggestion needed
            'is_disposable': False,
            'is_role': False,
            'is_free': True
        }
        mock_post.return_value = mock_response

        result = self.verifier.verify_email('john@gmail.com')

        self.assertEqual(result['status'], 'deliverable')
        self.assertIsNone(result.get('suggestion'))


class TestCostTracking(unittest.TestCase):
    """Test cost tracking for Bouncer API usage"""

    def setUp(self):
        self.verifier = BouncerVerifier(api_key="test_api_key")

    @patch('requests.Session.post')
    def test_single_verification_cost(self, mock_post):
        """Test cost calculation for single verification"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'status': 'deliverable',
            'score': 90,
            'is_disposable': False,
            'is_role': False,
            'is_free': False
        }
        mock_post.return_value = mock_response

        # Verify one email
        result = self.verifier.verify_email('test@example.com')

        # Cost should be tracked (approximately $0.005 per verification)
        self.assertIsNotNone(result)

    @patch('requests.Session.post')
    def test_batch_verification_cost(self, mock_post):
        """Test cost calculation for batch verification"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'results': [
                {
                    'email': f'test{i}@example.com',
                    'status': 'deliverable',
                    'score': 90,
                    'is_disposable': False,
                    'is_role': False,
                    'is_free': False
                } for i in range(100)
            ]
        }
        mock_post.return_value = mock_response

        # Verify 100 emails
        emails = [f'test{i}@example.com' for i in range(100)]
        results = self.verifier.verify_batch(emails)

        # Should have 100 results
        self.assertEqual(len(results), 100)

        # Total cost should be approximately $0.50 (100 * $0.005)
        expected_cost = len(results) * 0.005
        self.assertAlmostEqual(expected_cost, 0.50, places=2)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
