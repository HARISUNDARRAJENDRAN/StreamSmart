/**
 * DynamoDB Client Configuration
 * Handles AWS DynamoDB operations
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.STREAMSMART_AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.STREAMSMART_AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table names
const TABLES = {
  USERS: 'Users',
  PLAYLISTS: 'Playlists',
  VIDEOS: process.env.VIDEOS_TABLE || 'Videos',
  ACTIVITIES: 'Activities',
  TRANSCRIPTS: 'Transcripts',
};

// Mock connectToDatabase for backward compatibility
export async function connectToDatabase() {
  return { client: docClient };
}

export { docClient, QueryCommand, GetCommand, PutCommand, ScanCommand, TABLES };
export default docClient;
