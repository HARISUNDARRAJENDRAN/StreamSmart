// Server-side DynamoDB client configuration
// This file should NEVER be imported in client-side code

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand,
  BatchWriteCommand 
} from '@aws-sdk/lib-dynamodb';

// Ensure this only runs server-side
if (typeof window !== 'undefined') {
  throw new Error('dynamodb-server.ts must only be imported in server-side code!');
}

// Server-side DynamoDB client with proper credentials
// Force region to ap-south-2 since that's where our tables are
const region = process.env.STREAMSMART_AWS_REGION || 'ap-south-2';
const accessKeyId = process.env.STREAMSMART_AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY || '';

console.log('[DYNAMODB-SERVER] Initializing client with:', {
  region,
  hasAccessKey: !!accessKeyId,
  accessKeyPrefix: accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'MISSING',
  hasSecretKey: !!secretAccessKey,
  envVars: {
    hasSTREAMSMART_AWS_REGION: !!process.env.STREAMSMART_AWS_REGION,
    hasAWS_REGION: !!process.env.AWS_REGION,
    AWS_REGION_value: process.env.AWS_REGION,
  },
});

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const dynamoDbServer = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export default dynamoDbServer;

export const connectDB = async () => {
  // DynamoDB doesn't require explicit connection
  return dynamoDbServer;
};

export const connectToDatabase = connectDB;

export const disconnectDB = async () => {
  // DynamoDB doesn't require explicit disconnection
};

export { 
  dynamoDbServer,
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand,
  BatchWriteCommand 
};
