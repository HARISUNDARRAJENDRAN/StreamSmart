// Server-side DynamoDB service
// This file should NEVER be imported in client-side code
// Use API routes to access these functions from the client

import { connectToDatabase } from './dynamodb-server';
import { GetCommand, QueryCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Ensure this only runs server-side
if (typeof window !== 'undefined') {
  throw new Error('dynamodb-service-server.ts must only be imported in server-side code!');
}

// Table names
export const TABLES = {
  Users: 'Users',
  Playlists: 'Playlists',
  Activities: 'Activities',
  Videos: 'Videos',
};

// Initialize unique ID generation
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * USER OPERATIONS FOR AUTH
 */

export interface DynamoDBUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: number;
  lastLoginDate: number;
  learningStreak: number;
  totalLearningTime: number;
  weeklyGoal: number;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
  authProvider: 'email' | 'google' | 'demo' | 'cognito';
  password?: string;
  googleId?: string;
  cognitoId?: string;
}

export async function createUser(userData: Partial<DynamoDBUser>): Promise<DynamoDBUser> {
  const client = await connectToDatabase();
  const now = Date.now();
  
  if (!userData.name || !userData.email) {
    throw new Error('Name and email are required fields');
  }
  
  const normalizedEmail = userData.email.toLowerCase();
  
  // Check for duplicate email
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('A user with this email already exists');
  }
  
  const userId = generateId();
  const user: DynamoDBUser = {
    id: userId,
    name: userData.name,
    email: normalizedEmail,
    avatarUrl: userData.avatarUrl,
    phoneNumber: userData.phoneNumber,
    bio: userData.bio,
    createdAt: now,
    lastLoginDate: now,
    learningStreak: 0,
    totalLearningTime: 0,
    weeklyGoal: 15,
    preferences: userData.preferences || { theme: 'system', notifications: true },
    authProvider: userData.authProvider || 'email',
    password: userData.password,
    googleId: userData.googleId,
    cognitoId: userData.cognitoId,
  };

  try {
    await client.send(new PutCommand({
      TableName: TABLES.Users,
      Item: user,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      throw new Error('User with this ID already exists (race condition)');
    }
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return user;
}

export async function findUserByEmail(email: string): Promise<DynamoDBUser | null> {
  const client = await connectToDatabase();
  
  try {
    const result = await client.send(new QueryCommand({
      TableName: TABLES.Users,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    }));

    return result.Items?.[0] as DynamoDBUser || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

export async function findUserByCognitoId(cognitoId: string): Promise<DynamoDBUser | null> {
  const client = await connectToDatabase();
  
  try {
    const result = await client.send(new QueryCommand({
      TableName: TABLES.Users,
      IndexName: 'cognitoId-index',
      KeyConditionExpression: 'cognitoId = :cognitoId',
      ExpressionAttributeValues: {
        ':cognitoId': cognitoId,
      },
    }));

    return result.Items?.[0] as DynamoDBUser || null;
  } catch (error) {
    console.error('Error finding user by cognitoId:', error);
    return null;
  }
}

export async function updateUser(id: string, updates: Partial<DynamoDBUser>): Promise<DynamoDBUser> {
  const client = await connectToDatabase();
  
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};
  
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id') {
      // Use attribute names for reserved keywords
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      expressionAttributeNames[attrName] = key;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length === 0) {
    const result = await client.send(new GetCommand({
      TableName: TABLES.Users,
      Key: { id },
    }));
    
    if (!result.Item) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result.Item as DynamoDBUser;
  }

  const result = await client.send(new UpdateCommand({
    TableName: TABLES.Users,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as DynamoDBUser;
}
