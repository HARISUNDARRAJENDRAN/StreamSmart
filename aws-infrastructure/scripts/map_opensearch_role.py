#!/usr/bin/env python3
"""
Map Lambda IAM role to OpenSearch all_access role via API
"""

import boto3
import requests
from requests_aws4auth import AWS4Auth
import json

# Configuration
REGION = 'ap-south-2'
OPENSEARCH_ENDPOINT = 'search-streamsmart-search-h7nvtdclcuojbv243vua5cqlc4.ap-south-2.es.amazonaws.com'
LAMBDA_ROLE_ARN = 'arn:aws:iam::560271561936:role/StreamSmartAI-API-LambdaRole3A44B857-WMrEx5men7rq'

def main():
    print("[*] Mapping Lambda role to OpenSearch all_access role...")
    
    # Get AWS credentials
    session = boto3.Session(profile_name='Harisundar', region_name=REGION)
    credentials = session.get_credentials()
    
    # Create AWS4Auth
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        REGION,
        'es',
        session_token=credentials.token
    )
    
    # OpenSearch Security API endpoint
    url = f'https://{OPENSEARCH_ENDPOINT}/_plugins/_security/api/rolesmapping/all_access'
    
    # Get current mapping
    print(f"\n[*] Getting current role mapping...")
    response = requests.get(url, auth=awsauth)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        current_mapping = response.json()
        print(f"Current mapping: {json.dumps(current_mapping, indent=2)}")
        
        # Get current backend roles
        backend_roles = current_mapping.get('all_access', {}).get('backend_roles', [])
        
        # Add Lambda role if not already there
        if LAMBDA_ROLE_ARN not in backend_roles:
            backend_roles.append(LAMBDA_ROLE_ARN)
            print(f"\n[+] Adding Lambda role: {LAMBDA_ROLE_ARN}")
        else:
            print(f"\n[!] Lambda role already mapped")
            return
        
        # Update mapping
        new_mapping = {
            "backend_roles": backend_roles,
            "hosts": current_mapping.get('all_access', {}).get('hosts', []),
            "users": current_mapping.get('all_access', {}).get('users', [])
        }
        
        print(f"\n[*] Updating role mapping...")
        response = requests.put(url, auth=awsauth, json=new_mapping, headers={'Content-Type': 'application/json'})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 201]:
            print(f"\n[SUCCESS] Lambda role mapped to all_access role!")
            print(f"\n[+] Your AI recommendations should now work!")
            print(f"\n[TEST] Run this command:")
            print(f'   curl -X POST https://v77rlpez17.execute-api.ap-south-2.amazonaws.com/prod/api/v1/recommend \\')
            print(f'     -H "Content-Type: application/json" \\')
            print(f'     -d \'{{"title": "Figma tutorial", "topN": 5}}\'')
        else:
            print(f"\n[ERROR] Failed to update role mapping")
            print(f"Response: {response.text}")
    else:
        print(f"[ERROR] Failed to get current mapping")
        print(f"Response: {response.text}")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
