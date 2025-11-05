// MongoDB removed - using DynamoDB exclusively
// Legacy imports redirected to DynamoDB implementation

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

const client = new DynamoDBClient({ region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2' });
const dynamoDb = DynamoDBDocumentClient.from(client);

export default dynamoDb;

export const connectDB = async () => {
  // DynamoDB doesn't require explicit connection
  return dynamoDb;
};

export const connectToDatabase = connectDB;

export const disconnectDB = async () => {
  // DynamoDB doesn't require explicit disconnection
};

export { 
  dynamoDb,
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand,
  BatchWriteCommand 
};
