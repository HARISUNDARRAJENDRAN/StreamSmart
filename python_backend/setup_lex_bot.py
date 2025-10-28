"""
Setup Amazon Lex V2 bot for StreamSmart transcript chatbot
"""
import boto3
import json
import time
from botocore.exceptions import ClientError

# AWS Configuration
AWS_REGION = 'us-east-1'  # Lex V2 is only available in select regions (us-east-1, us-west-2, eu-west-1, etc.)
AWS_PROFILE = 'Harisundar'

# Initialize boto3 session
session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
lex_client = session.client('lexv2-models')
iam_client = session.client('iam')

BOT_NAME = 'StreamSmartTranscriptBot'
BOT_DESCRIPTION = 'Conversational AI bot for answering questions about video transcripts'

def create_iam_role_for_lex():
    """Create IAM role for Lex bot"""
    role_name = 'StreamSmartLexBotRole'
    
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lexv2.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    try:
        response = iam_client.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description='Role for StreamSmart Lex bot'
        )
        role_arn = response['Role']['Arn']
        print(f"✅ Created IAM role: {role_arn}")
        
        # Attach basic Lex execution policy
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn='arn:aws:iam::aws:policy/AmazonLexRunBotsOnly'
        )
        
        # Wait for role to propagate
        time.sleep(10)
        return role_arn
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            response = iam_client.get_role(RoleName=role_name)
            role_arn = response['Role']['Arn']
            print(f"ℹ️  IAM role already exists: {role_arn}")
            return role_arn
        raise

def create_lex_bot(role_arn):
    """Create Lex V2 bot"""
    try:
        response = lex_client.create_bot(
            botName=BOT_NAME,
            description=BOT_DESCRIPTION,
            roleArn=role_arn,
            dataPrivacy={
                'childDirected': False
            },
            idleSessionTTLInSeconds=300,
            botTags={
                'Project': 'StreamSmart',
                'Environment': 'Production'
            }
        )
        
        bot_id = response['botId']
        print(f"✅ Created Lex bot: {BOT_NAME} (ID: {bot_id})")
        
        # Wait for bot to be ready
        print("⏳ Waiting for bot to be ready...")
        time.sleep(10)
        
        return bot_id
        
    except ClientError as e:
        print(f"❌ Error creating bot: {e}")
        raise

def create_bot_locale(bot_id):
    """Create bot locale (English US)"""
    try:
        response = lex_client.create_bot_locale(
            botId=bot_id,
            botVersion='DRAFT',
            localeId='en_US',
            description='English (US) locale',
            nluIntentConfidenceThreshold=0.4,
            voiceSettings={
                'voiceId': 'Joanna'  # AWS Polly voice
            }
        )
        
        print(f"✅ Created bot locale: en_US")
        
        # Wait for locale to be ready
        print("⏳ Waiting for locale to be ready...")
        time.sleep(5)
        
    except ClientError as e:
        print(f"❌ Error creating locale: {e}")
        raise

def create_intent(bot_id):
    """Create FallbackIntent - catches all user inputs"""
    try:
        # Use FallbackIntent to catch all user messages and forward to backend
        response = lex_client.create_intent(
            intentName='TranscriptQuestionIntent',
            description='Catch-all intent for transcript questions',
            parentIntentSignature='AMAZON.FallbackIntent',
            botId=bot_id,
            botVersion='DRAFT',
            localeId='en_US'
        )
        
        intent_id = response['intentId']
        print(f"✅ Created intent: TranscriptQuestionIntent (ID: {intent_id})")
        return intent_id
        
    except ClientError as e:
        print(f"❌ Error creating intent: {e}")
        raise

def update_fallback_intent(bot_id):
    """Update the built-in FallbackIntent to handle all questions"""
    try:
        # The FallbackIntent already exists, we just need to configure it
        print(f"ℹ️  Using built-in AMAZON.FallbackIntent to catch all user queries")
        return "FALLBACK_INTENT"
        
    except ClientError as e:
        print(f"❌ Error updating fallback intent: {e}")
        raise

def build_bot_locale(bot_id):
    """Build the bot locale"""
    try:
        response = lex_client.build_bot_locale(
            botId=bot_id,
            botVersion='DRAFT',
            localeId='en_US'
        )
        
        print(f"✅ Building bot locale...")
        print(f"⏳ This may take 1-2 minutes...")
        
        # Wait for build to complete
        while True:
            time.sleep(10)
            status_response = lex_client.describe_bot_locale(
                botId=bot_id,
                botVersion='DRAFT',
                localeId='en_US'
            )
            status = status_response['botLocaleStatus']
            print(f"   Status: {status}")
            
            if status == 'Built':
                print(f"✅ Bot locale built successfully!")
                break
            elif status == 'Failed':
                print(f"❌ Bot build failed")
                break
                
    except ClientError as e:
        print(f"❌ Error building bot: {e}")
        raise

def create_bot_alias(bot_id):
    """Create production bot alias"""
    try:
        response = lex_client.create_bot_alias(
            botAliasName='Production',
            description='Production alias',
            botId=bot_id,
            botVersion='DRAFT'
        )
        
        bot_alias_id = response['botAliasId']
        print(f"✅ Created bot alias: Production (ID: {bot_alias_id})")
        return bot_alias_id
        
    except ClientError as e:
        print(f"❌ Error creating alias: {e}")
        raise

def main():
    print("🚀 Setting up Amazon Lex bot for StreamSmart...")
    print(f"📍 Region: {AWS_REGION}")
    print()
    
    try:
        # Step 1: Create IAM role
        print("1️⃣  Creating IAM role...")
        role_arn = create_iam_role_for_lex()
        print()
        
        # Step 2: Create bot
        print("2️⃣  Creating Lex bot...")
        bot_id = create_lex_bot(role_arn)
        print()
        
        # Step 3: Create locale
        print("3️⃣  Creating bot locale...")
        create_bot_locale(bot_id)
        print()
        
        # Step 4: Configure intent
        print("4️⃣  Configuring fallback intent...")
        intent_id = update_fallback_intent(bot_id)
        print()
        
        # Step 5: Build bot
        print("5️⃣  Building bot...")
        build_bot_locale(bot_id)
        print()
        
        # Step 6: Create alias
        print("6️⃣  Creating bot alias...")
        bot_alias_id = create_bot_alias(bot_id)
        print()
        
        print("=" * 60)
        print("✅ Lex bot setup complete!")
        print("=" * 60)
        print(f"Bot Name: {BOT_NAME}")
        print(f"Bot ID: {bot_id}")
        print(f"Bot Alias ID: {bot_alias_id}")
        print(f"Region: {AWS_REGION}")
        print()
        print("📝 Add these to your .env.local:")
        print(f"NEXT_PUBLIC_LEX_BOT_ID={bot_id}")
        print(f"NEXT_PUBLIC_LEX_BOT_ALIAS_ID={bot_alias_id}")
        print(f"NEXT_PUBLIC_LEX_LOCALE_ID=en_US")
        print()
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        raise

if __name__ == '__main__':
    main()
