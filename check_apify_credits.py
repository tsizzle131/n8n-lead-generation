#!/usr/bin/env python3
"""Check Apify account credits and billing status"""

import json
import requests

# Load API key
with open('.app-state.json', 'r') as f:
    state = json.load(f)

apify_key = state['apiKeys']['apify_api_key']

# Check account info
print("Checking Apify account status...\n")

response = requests.get(
    f'https://api.apify.com/v2/users/me',
    headers={'Authorization': f'Bearer {apify_key}'}
)

if response.status_code == 200:
    user = response.json()['data']
    print('='*60)
    print('APIFY ACCOUNT STATUS')
    print('='*60)
    print(f"Email: {user.get('email', 'N/A')}")
    print(f"Plan: {user.get('plan', 'N/A')}")
    print(f"\nUsage This Month:")
    print(f"  Used: ${user.get('monthlyUsageCredits', 0):.2f}")
    print(f"  Limit: ${user.get('monthlyUsageCreditsLimit', 0):.2f}")

    remaining = user.get('monthlyUsageCreditsLimit', 0) - user.get('monthlyUsageCredits', 0)
    print(f"  Remaining: ${remaining:.2f}")

    print('\n' + '='*60)
    if remaining <= 0:
        print('❌ NO CREDITS REMAINING!')
        print('='*60)
        print('\nThis WILL cause 403 errors on paid actors!')
        print('LinkedIn actor (bebity) requires credits to run.')
        print('\nSolution:')
        print('  1. Add credits to your Apify account')
        print('  2. Upgrade to paid plan')
        print('  3. Use free actors only')
    elif remaining < 5:
        print('⚠️  LOW CREDITS WARNING')
        print('='*60)
        print(f'\nOnly ${remaining:.2f} remaining.')
        print('LinkedIn scraping may stop soon.')
    else:
        print('✅ SUFFICIENT CREDITS')
        print('='*60)
        print(f'\n${remaining:.2f} credits available.')
        print('LinkedIn actor should work fine.')
else:
    print('Failed to check account status')
    print(f'Status: {response.status_code}')
    print(f'Response: {response.text}')
