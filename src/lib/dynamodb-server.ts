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
const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || process.env.STREAMSMART_AWS_REGION || 'ap-south-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.STREAMSMART_AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY || '';

console.log('[DYNAMODB-SERVER] Initializing client with:', {
  region,
  hasAccessKey: !!accessKeyId,
  accessKeyPrefix: accessKeyId.substring(0, 8) + '...',
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
