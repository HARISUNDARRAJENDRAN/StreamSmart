#!/usr/bin/env python3
"""
Setup script to create .env file with Kaggle credentials
"""

import os
import sys

def setup_env_file():
    """Create or update .env file with Kaggle credentials"""
    
    print("🔧 Setting up .env file for Kaggle credentials")
    print("=" * 50)
    
    env_path = ".env"
    
    # Check if .env already exists
    if os.path.exists(env_path):
        print(f"✅ Found existing .env file: {env_path}")
        with open(env_path, 'r') as f:
            content = f.read()
            if 'KAGGLE_USERNAME' in content and 'KAGGLE_KEY' in content:
                print("✅ Kaggle credentials already present in .env file")
                return True
    
    print("\n📝 Please provide your Kaggle credentials:")
    print("You can find these at: https://www.kaggle.com/settings/account")
    print("Go to 'API' section and click 'Create New API Token'")
    
    username = input("\nEnter your Kaggle Username: ").strip()
    if not username:
        print("❌ Username cannot be empty")
        return False
    
    api_key = input("Enter your Kaggle API Key: ").strip()
    if not api_key:
        print("❌ API Key cannot be empty")
        return False
    
    # Create or append to .env file
    env_content = []
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            env_content = f.readlines()
    
    # Remove existing Kaggle entries
    env_content = [line for line in env_content if not line.startswith('KAGGLE_')]
    
    # Add new Kaggle credentials
    env_content.append(f"KAGGLE_USERNAME={username}\n")
    env_content.append(f"KAGGLE_KEY={api_key}\n")
    
    # Write to .env file
    with open(env_path, 'w') as f:
        f.writelines(env_content)
    
    print(f"\n✅ Successfully updated {env_path}")
    print("🔐 Your Kaggle credentials have been saved securely")
    
    return True

def verify_credentials():
    """Verify that credentials work"""
    print("\n🔍 Verifying Kaggle credentials...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        username = os.getenv('KAGGLE_USERNAME')
        key = os.getenv('KAGGLE_KEY')
        
        if not username or not key:
            print("❌ Credentials not found in environment")
            return False
        
        print(f"✅ Username: {username}")
        print(f"✅ API Key: {key[:10]}...")
        
        # Test Kaggle API
        os.environ['KAGGLE_USERNAME'] = username
        os.environ['KAGGLE_KEY'] = key
        
        import kaggle
        
        # Try to list datasets (this will verify credentials)
        kaggle.api.authenticate()
        print("✅ Kaggle authentication successful!")
        
        return True
        
    except Exception as e:
        print(f"❌ Credential verification failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Kaggle Credentials Setup for StreamSmart")
    print("=" * 50)
    
    # Setup .env file
    if not setup_env_file():
        print("❌ Failed to setup .env file")
        sys.exit(1)
    
    # Verify credentials
    if verify_credentials():
        print("\n🎉 Setup complete! You can now run:")
        print("python initialize_bert_system.py")
    else:
        print("\n⚠️ Credentials setup but verification failed")
        print("Please check your Kaggle username and API key")

if __name__ == "__main__":
    main() 