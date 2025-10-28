"""
Create a working Amazon Lex V2 bot for StreamSmart voice chat
"""
import boto3
import time
import json

AWS_REGION = 'us-east-1'
AWS_PROFILE = 'Harisundar'

session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
lex_client = session.client('lexv2-models')

BOT_NAME = 'StreamSmartVoiceBot'
ROLE_ARN = 'arn:aws:iam::560271561936:role/StreamSmartLexBotRole'

def create_simple_bot():
    """Create a simple bot with FallbackIntent only"""
    try:
        print("Creating bot...")
        response = lex_client.create_bot(
            botName=BOT_NAME,
            description='Voice-enabled chatbot for StreamSmart playlist assistant',
            roleArn=ROLE_ARN,
            dataPrivacy={'childDirected': False},
            idleSessionTTLInSeconds=300
        )
        bot_id = response['botId']
        print(f"✅ Bot created: {bot_id}")
        time.sleep(5)
        return bot_id
    except Exception as e:
        print(f"Error: {e}")
        return None

def create_locale(bot_id):
    """Create locale for the bot"""
    try:
        print("Creating locale...")
        response = lex_client.create_bot_locale(
            botId=bot_id,
            botVersion='DRAFT',
            localeId='en_US',
            description='English US',
            nluIntentConfidenceThreshold=0.40
        )
        print(f"✅ Locale created")
        time.sleep(3)
    except Exception as e:
        print(f"Error: {e}")

def build_locale(bot_id):
    """Build bot locale"""
    try:
        print("Building locale...")
        lex_client.build_bot_locale(
            botId=bot_id,
            botVersion='DRAFT',
            localeId='en_US'
        )
        
        # Wait for build
        print("Waiting for build to complete...")
        for i in range(30):
            time.sleep(5)
            response = lex_client.describe_bot_locale(
                botId=bot_id,
                botVersion='DRAFT',
                localeId='en_US'
            )
            status = response['botLocaleStatus']
            print(f"  Status: {status}")
            
            if status == 'Built':
                print("✅ Build completed!")
                return True
            elif status in ['Failed', 'Deleting']:
                print(f"❌ Build failed: {status}")
                return False
                
        print("⏱️ Build timeout")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def create_version(bot_id):
    """Create bot version"""
    try:
        print("Creating bot version...")
        response = lex_client.create_bot_version(
            botId=bot_id,
            botVersionLocaleSpecification={
                'en_US': {
                    'sourceBotVersion': 'DRAFT'
                }
            }
        )
        version = response['botVersion']
        print(f"✅ Version created: {version}")
        
        # Wait for version
        print("Waiting for version to be ready...")
        for i in range(20):
            time.sleep(3)
            response = lex_client.describe_bot_version(
                botId=bot_id,
                botVersion=version
            )
            status = response['botStatus']
            print(f"  Status: {status}")
            
            if status == 'Available':
                print("✅ Version ready!")
                return version
                
        return version
    except Exception as e:
        print(f"Error: {e}")
        return None

def create_alias(bot_id, bot_version):
    """Create bot alias"""
    try:
        print("Creating alias...")
        response = lex_client.create_bot_alias(
            botAliasName='Production',
            description='Production alias',
            botId=bot_id,
            botVersion=bot_version,
            botAliasLocaleSettings={
                'en_US': {
                    'enabled': True
                }
            }
        )
        alias_id = response['botAliasId']
        print(f"✅ Alias created: {alias_id}")
        return alias_id
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    print("🚀 Creating working Lex bot...")
    print(f"Region: {AWS_REGION}\n")
    
    # Create bot
    bot_id = create_simple_bot()
    if not bot_id:
        print("Failed to create bot")
        return
    
    # Create locale
    create_locale(bot_id)
    
    # Build locale
    if not build_locale(bot_id):
        print("Build failed, but continuing...")
    
    # Create version
    version = create_version(bot_id)
    if not version:
        print("Failed to create version")
        return
    
    # Create alias
    alias_id = create_alias(bot_id, version)
    if not alias_id:
        print("Failed to create alias")
        return
    
    print("\n" + "="*60)
    print("✅ Bot setup complete!")
    print("="*60)
    print(f"Bot ID: {bot_id}")
    print(f"Version: {version}")
    print(f"Alias ID: {alias_id}")
    print(f"Region: {AWS_REGION}")
    print("\n📝 Update .env.local:")
    print(f"NEXT_PUBLIC_LEX_BOT_ID={bot_id}")
    print(f"NEXT_PUBLIC_LEX_BOT_ALIAS_ID={alias_id}")
    print(f"NEXT_PUBLIC_LEX_REGION={AWS_REGION}")

if __name__ == '__main__':
    main()
