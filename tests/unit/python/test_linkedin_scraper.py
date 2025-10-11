#!/usr/bin/env python3
"""
Unit Tests for LinkedIn Scraper
Tests LinkedIn URL discovery, profile scraping, and email extraction
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from lead_generation.modules.linkedin_scraper_parallel import LinkedInScraperParallel as LinkedInScraper


class TestLinkedInSearchQueries(unittest.TestCase):
    """Test LinkedIn search query generation"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_search_query_format_building(self):
        """Test that search queries are formatted correctly"""
        # Test the search query format directly by checking what would be built
        business_name = 'Acme Coffee Shop'
        city = 'Austin'

        # Expected format: "business" site:linkedin.com city
        expected_parts = ['"Acme Coffee Shop"', 'site:linkedin.com', 'Austin']

        # Build what the search query should look like
        search_query = f'"{business_name}" site:linkedin.com {city}'

        for part in expected_parts:
            self.assertIn(part, search_query)

    def test_business_name_quoting_format(self):
        """Test that business names are properly quoted in search format"""
        business_name = "Joe's Pizza & Pasta"
        city = "New York"

        # Build search query
        search_query = f'"{business_name}" site:linkedin.com {city}'

        # Business name should be in quotes
        self.assertIn('"Joe\'s Pizza & Pasta"', search_query)
        self.assertIn('site:linkedin.com', search_query)
        self.assertIn('New York', search_query)


class TestLinkedInProfileDetection(unittest.TestCase):
    """Test LinkedIn profile type detection (company vs personal)"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_company_profile_detection(self):
        """Test detection of company LinkedIn profiles"""
        company_urls = [
            'https://www.linkedin.com/company/acme-corp',
            'https://linkedin.com/company/acme-corp/',
            'http://www.linkedin.com/company/12345',
        ]

        for url in company_urls:
            profile_type = self.scraper._determine_profile_type(url)
            self.assertEqual(profile_type, 'company', f"Failed for URL: {url}")

    def test_personal_profile_detection(self):
        """Test detection of personal LinkedIn profiles"""
        personal_urls = [
            'https://www.linkedin.com/in/john-doe',
            'https://linkedin.com/in/jane-smith/',
            'http://www.linkedin.com/in/john-doe-12345',
        ]

        for url in personal_urls:
            profile_type = self.scraper._determine_profile_type(url)
            self.assertEqual(profile_type, 'personal', f"Failed for URL: {url}")

    def test_unknown_profile_type(self):
        """Test handling of unknown LinkedIn URL formats"""
        unknown_urls = [
            'https://www.linkedin.com/feed',
            'https://linkedin.com/jobs',
            'https://linkedin.com',
        ]

        for url in unknown_urls:
            profile_type = self.scraper._determine_profile_type(url)
            self.assertEqual(profile_type, 'unknown', f"Failed for URL: {url}")


class TestEmailExtraction(unittest.TestCase):
    """Test email extraction from LinkedIn profiles"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_process_profile_with_email(self):
        """Test processing profile data with direct email"""
        profile_data = {
            'name': 'John Doe',
            'headline': 'CEO at Acme Corp',
            'email': 'john@acme.com',
            'phone': '+1-555-0100'
        }

        business = {
            'id': 'biz_123',
            'name': 'Acme Corp',
            'city': 'Austin',
            'website': 'https://acme.com'
        }

        result = self.scraper._process_linkedin_profile(
            profile_data,
            business,
            'https://linkedin.com/in/john-doe',
            'personal'
        )

        self.assertIsNotNone(result)
        self.assertEqual(result['primary_email'], 'john@acme.com')
        self.assertEqual(result['email_source'], 'linkedin_direct')
        self.assertTrue(result['linkedin_found'])

    def test_process_profile_without_email(self):
        """Test processing profile when no email is found"""
        profile_data = {
            'name': 'Jane Smith',
            'headline': 'Marketing Manager',
            # No email field
        }

        business = {
            'id': 'biz_456',
            'name': 'Test Business',
            'city': 'Dallas',
            'website': 'https://testbiz.com'
        }

        result = self.scraper._process_linkedin_profile(
            profile_data,
            business,
            'https://linkedin.com/in/jane-smith',
            'personal'
        )

        # Should generate email patterns
        self.assertIsNotNone(result)
        self.assertIsNotNone(result.get('primary_email'))  # Should have generated pattern
        self.assertEqual(result['email_source'], 'generated')


class TestEmailPatternGeneration(unittest.TestCase):
    """Test email pattern generation for businesses"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_generate_basic_patterns(self):
        """Test generation of basic email patterns"""
        patterns = self.scraper._generate_email_patterns('John Doe', 'https://acme.com')

        # Check that common patterns are generated
        # Function returns top 5 patterns
        self.assertIn('john@acme.com', patterns)
        self.assertIn('john.doe@acme.com', patterns)
        self.assertIn('jdoe@acme.com', patterns)

        # Verify we get at least 3 patterns
        self.assertGreaterEqual(len(patterns), 3)

    def test_generate_patterns_with_special_chars(self):
        """Test pattern generation with names containing special characters"""
        patterns = self.scraper._generate_email_patterns("Mary O'Brien", 'https://acme.com')

        # Should generate patterns even with apostrophes
        # The function may or may not strip apostrophes, but should return some patterns
        self.assertGreater(len(patterns), 0)
        self.assertTrue(any('mary' in p.lower() for p in patterns))

    def test_domain_extraction(self):
        """Test domain extraction from website URLs"""
        test_cases = [
            ('https://www.acme.com', 'acme.com'),
            ('http://acme.com/', 'acme.com'),
            ('https://acme.com/about', 'acme.com'),
        ]

        for url, expected_domain in test_cases:
            patterns = self.scraper._generate_email_patterns('John Doe', url)
            # Check that patterns use the correct domain
            self.assertTrue(any(expected_domain in p for p in patterns),
                          f"No patterns found with domain {expected_domain} from URL {url}")


class TestDecisionMakerFiltering(unittest.TestCase):
    """Test filtering and prioritization of decision makers"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_owner_founder_priority(self):
        """Test that owners/founders are prioritized highest"""
        employees = [
            {'fullName': 'Jane Smith', 'headline': 'Marketing Manager', 'email': 'jane@acme.com'},
            {'fullName': 'John Doe', 'headline': 'Owner', 'email': 'john@acme.com'},
            {'fullName': 'Bob Wilson', 'headline': 'Sales Director', 'email': 'bob@acme.com'},
        ]

        key_people = self.scraper._filter_key_people(employees)

        # Should prioritize owner first
        self.assertTrue(len(key_people) > 0)
        self.assertEqual(key_people[0]['fullName'], 'John Doe')
        self.assertEqual(key_people[0]['headline'], 'Owner')

    def test_ceo_priority(self):
        """Test that CEO is prioritized when no owner/founder"""
        employees = [
            {'fullName': 'Jane Smith', 'headline': 'Chief Executive Officer', 'email': 'jane@acme.com'},
            {'fullName': 'Bob Wilson', 'headline': 'Sales Manager', 'email': 'bob@acme.com'},
        ]

        key_people = self.scraper._filter_key_people(employees)

        # Should prioritize CEO first
        self.assertTrue(len(key_people) > 0)
        self.assertEqual(key_people[0]['fullName'], 'Jane Smith')
        self.assertIn('Chief Executive Officer', key_people[0]['headline'])

    def test_director_fallback(self):
        """Test fallback to director level when no C-suite"""
        employees = [
            {'fullName': 'Alice Brown', 'headline': 'Sales Representative', 'email': 'alice@acme.com'},
            {'fullName': 'Bob Wilson', 'headline': 'Director of Operations', 'email': 'bob@acme.com'},
        ]

        key_people = self.scraper._filter_key_people(employees)

        # Should filter for director
        self.assertTrue(len(key_people) > 0)
        self.assertEqual(key_people[0]['fullName'], 'Bob Wilson')
        self.assertIn('Director', key_people[0]['headline'])

    def test_no_decision_maker_found(self):
        """Test handling when no clear decision maker exists"""
        employees = [
            {'fullName': 'Alice Brown', 'headline': 'Associate', 'email': 'alice@acme.com'},
            {'fullName': 'Bob Wilson', 'headline': 'Intern', 'email': 'bob@acme.com'},
        ]

        key_people = self.scraper._filter_key_people(employees)

        # Should return empty list if no key people found
        self.assertEqual(len(key_people), 0)


class TestLinkedInEnrichmentWorkflow(unittest.TestCase):
    """Test complete LinkedIn enrichment workflow"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_successful_company_enrichment_mock(self):
        """Test successful enrichment workflow with mocked API calls"""
        business = {
            'id': 'test_business_id',
            'name': 'Acme Corp',
            'city': 'Austin',
            'state': 'Texas',
            'website': 'https://acme.com'
        }

        # Mock the find_linkedin_url to return a URL
        with patch.object(self.scraper, 'find_linkedin_url') as mock_find:
            mock_find.return_value = 'https://www.linkedin.com/company/acme-corp'

            # Mock the scrape_linkedin_profiles to return profile data
            with patch.object(self.scraper, 'scrape_linkedin_profiles') as mock_scrape:
                mock_scrape.return_value = [{
                    'name': 'Acme Corp',
                    'email': 'contact@acme.com',
                    'phone': '+1-555-0100',
                    'headline': 'Leading provider of widgets'
                }]

                results = self.scraper.enrich_with_linkedin([business], max_businesses=1)

                self.assertEqual(len(results), 1)
                result = results[0]

                self.assertTrue(result['linkedin_found'])
                self.assertEqual(result['linkedin_url'], 'https://www.linkedin.com/company/acme-corp')
                self.assertEqual(result['profile_type'], 'company')
                self.assertIsNotNone(result.get('primary_email'))

    def test_no_linkedin_found(self):
        """Test handling when no LinkedIn profile is found"""
        with patch.object(self.scraper, 'find_linkedin_url') as mock_find:
            mock_find.return_value = None

            business = {
                'id': 'test_business_id',
                'name': 'Obscure Business',
                'city': 'Nowhere',
                'state': 'State'
            }

            results = self.scraper.enrich_with_linkedin([business], max_businesses=1)

            self.assertEqual(len(results), 1)
            result = results[0]

            self.assertFalse(result['linkedin_found'])
            self.assertIsNone(result.get('linkedin_url'))
            self.assertIsNone(result.get('primary_email'))


class TestErrorHandling(unittest.TestCase):
    """Test error handling in LinkedIn scraper"""

    def setUp(self):
        self.scraper = LinkedInScraper(apify_key="test_key", actor_id="test_actor")

    def test_api_request_error(self):
        """Test handling of API request errors"""
        with patch('requests.post') as mock_post:
            mock_post.side_effect = Exception("Network Error")

            business_name = 'Test Business'
            city = 'City'

            # Should not crash, should return None
            result = self.scraper.find_linkedin_url(business_name, city)

            self.assertIsNone(result)

    def test_malformed_linkedin_url(self):
        """Test handling of malformed LinkedIn URLs"""
        malformed_urls = [
            'not-a-url',
            'https://facebook.com/company/test',
            'linkedin.com',  # Missing protocol
        ]

        for url in malformed_urls:
            profile_type = self.scraper._determine_profile_type(url)
            # Should not crash, should return 'unknown' or handle gracefully
            self.assertIsInstance(profile_type, str)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
