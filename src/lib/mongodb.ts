import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// Determine AWS region from available environment variables (custom names allowed for Amplify)
const region =
  process.env.STREAMSMART_AWS_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'ap-south-1';

// Log connection info
console.log(`DynamoDB connecting to region: ${region}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

/**
 * Global DynamoDB client cache for connection reuse
 * Prevents creating multiple clients during API route hot reloads
 */
interface DynamoDBCache {
  client: DynamoDBDocumentClient | null;
  promise: Promise<DynamoDBDocumentClient> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var dynamodb: DynamoDBCache | undefined;
}

let cached: DynamoDBCache = global.dynamodb as DynamoDBCache;

if (!cached) {
  cached = global.dynamodb = { client: null, promise: null };
}

/**
 * Initialize DynamoDB client
 * Uses DynamoDBDocumentClient for simplified API
 */
async function connectDB(): Promise<DynamoDBDocumentClient> {
  try {
    if (cached.client) {
      console.log('📡 Using existing DynamoDB client');
      return cached.client;
    }

    if (!cached.promise) {
      console.log('Initializing DynamoDB client...');
      
      cached.promise = (async () => {
        const explicitCredentials =
          process.env.STREAMSMART_AWS_ACCESS_KEY_ID && process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.STREAMSMART_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY,
              }
            : undefined;

        const baseClient = new DynamoDBClient({
          region,
          // Use explicit credentials when provided; otherwise fall back to the default provider chain
          credentials: explicitCredentials ?? fromNodeProviderChain(),
        });

        const docClient = DynamoDBDocumentClient.from(baseClient, {
          marshallOptions: {
            removeUndefinedValues: true,
            convertEmptyValues: false,
            convertClassInstanceToMap: true,
          },
          unmarshallOptions: {
            wrapNumbers: false,
          },
        });

        return docClient;
      })();
    }

    cached.client = await cached.promise;
    
    console.log('DynamoDB client initialized successfully');
    console.log(`Connected to region: ${region}`);
    console.log('Tables: Users, Playlists, Activities, Videos');
    
    return cached.client;

  } catch (error) {
    cached.promise = null;
    console.error('DynamoDB initialization failed:', error);
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        console.error('Credentials error - ensure SSO or environment credentials are configured');
      } else if (error.message.includes('region')) {
        console.error('Region error - check AWS_REGION/AWS_DEFAULT_REGION');
      }
    }
    throw error;
  }
}

async function disconnectDB(): Promise<void> {
  try {
    if (cached.client) {
      cached.client = null;
      cached.promise = null;
      console.log('DynamoDB client closed');
    }
  } catch (error) {
    console.error('Error closing DynamoDB client:', error);
    throw error;
  }
}

export default connectDB;
export { connectDB, disconnectDB };
export const connectToDatabase = connectDB; // Legacy compatibility
export { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand, BatchWriteCommand }; 