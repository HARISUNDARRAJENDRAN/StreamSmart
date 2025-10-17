import { connectToDatabase } from './mongodb';
import { GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

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
 * USER OPERATIONS
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
  authProvider: 'email' | 'google' | 'demo';
  password?: string;
  googleId?: string;
}

export async function createUser(userData: Partial<DynamoDBUser>): Promise<DynamoDBUser> {
  const client = await connectToDatabase();
  const now = Date.now();
  
  // Validate required fields
  if (!userData.name || !userData.email) {
    throw new Error('Name and email are required fields');
  }
  
  // Normalize email
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
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Users,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email.toLowerCase(),
    },
  }));

  return result.Items?.[0] as DynamoDBUser || null;
}

export async function findUserById(id: string): Promise<DynamoDBUser | null> {
  const client = await connectToDatabase();
  
  const result = await client.send(new GetCommand({
    TableName: TABLES.Users,
    Key: { id },
  }));

  return result.Item as DynamoDBUser || null;
}

export async function findUserByGoogleId(googleId: string): Promise<DynamoDBUser | null> {
  const client = await connectToDatabase();
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Users,
    IndexName: 'googleId-index',
    KeyConditionExpression: 'googleId = :googleId',
    ExpressionAttributeValues: {
      ':googleId': googleId,
    },
  }));

  return result.Items?.[0] as DynamoDBUser || null;
}

export async function updateUser(id: string, updates: Partial<DynamoDBUser>): Promise<DynamoDBUser> {
  const client = await connectToDatabase();
  
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id') {
      updateExpressions.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  // Handle case where no updatable fields are provided
  if (updateExpressions.length === 0) {
    // No fields to update - retrieve and return existing user
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
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as DynamoDBUser;
}

/**
 * PLAYLIST OPERATIONS
 */

export interface DynamoDBPlaylist {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  videos: Array<{
    id: string;
    youtubeId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    duration: string;
    url: string;
    youtubeURL: string;
    description: string;
    completionStatus: number;
    addedAt: string;
    addedBy: string;
  }>;
  overallProgress: number;
  createdAt: number;
  updatedAt: number;
}

export async function createPlaylist(playlistData: Partial<DynamoDBPlaylist>): Promise<DynamoDBPlaylist> {
  const client = await connectToDatabase();
  const now = Date.now();
  
  const playlist: DynamoDBPlaylist = {
    id: generateId(),
    userId: playlistData.userId || '',
    title: playlistData.title || '',
    description: playlistData.description || '',
    category: playlistData.category || 'General',
    tags: playlistData.tags || [],
    isPublic: playlistData.isPublic || false,
    videos: playlistData.videos || [],
    overallProgress: playlistData.overallProgress || 0,
    createdAt: now,
    updatedAt: now,
  };

  await client.send(new PutCommand({
    TableName: TABLES.Playlists,
    Item: playlist,
  }));

  return playlist;
}

export async function getPlaylistsByUserId(userId: string): Promise<DynamoDBPlaylist[]> {
  const client = await connectToDatabase();
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Playlists,
    IndexName: 'userId-createdAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Sort by createdAt descending
  }));

  return (result.Items || []) as DynamoDBPlaylist[];
}

export async function getPlaylistById(id: string): Promise<DynamoDBPlaylist | null> {
  const client = await connectToDatabase();
  
  const result = await client.send(new GetCommand({
    TableName: TABLES.Playlists,
    Key: { id },
  }));

  return result.Item as DynamoDBPlaylist || null;
}

export async function updatePlaylist(id: string, updates: Partial<DynamoDBPlaylist>): Promise<DynamoDBPlaylist> {
  const client = await connectToDatabase();
  
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  
  updates.updatedAt = Date.now();
  
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'userId' && key !== 'createdAt') {
      updateExpressions.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  const result = await client.send(new UpdateCommand({
    TableName: TABLES.Playlists,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as DynamoDBPlaylist;
}

export async function deletePlaylist(id: string): Promise<void> {
  const client = await connectToDatabase();
  
  await client.send(new DeleteCommand({
    TableName: TABLES.Playlists,
    Key: { id },
  }));
}

export async function getAllPlaylists(limit: number = 20, exclusiveStartKey?: Record<string, any>): Promise<{
  items: DynamoDBPlaylist[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = await connectToDatabase();
  
  const result = await client.send(new ScanCommand({
    TableName: TABLES.Playlists,
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  }));

  return {
    items: (result.Items || []) as DynamoDBPlaylist[],
    lastEvaluatedKey: result.LastEvaluatedKey
  };
}

/**
 * ACTIVITY OPERATIONS
 */

export interface DynamoDBActivity {
  id: string;
  userId: string;
  action: string;
  item: string;
  type: 'completed' | 'started' | 'created' | 'quiz';
  timestamp: number;
}

export async function createActivity(activityData: Partial<DynamoDBActivity>): Promise<DynamoDBActivity> {
  const client = await connectToDatabase();
  const now = Date.now();
  
  const activity: DynamoDBActivity = {
    id: generateId(),
    userId: activityData.userId || '',
    action: activityData.action || '',
    item: activityData.item || '',
    type: activityData.type || 'started',
    timestamp: now,
  };

  await client.send(new PutCommand({
    TableName: TABLES.Activities,
    Item: activity,
  }));

  return activity;
}

export async function getActivitiesByUserId(userId: string, limit: number = 100): Promise<DynamoDBActivity[]> {
  const client = await connectToDatabase();
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Activities,
    IndexName: 'userId-timestamp-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Sort by timestamp descending
    Limit: limit,
  }));

  return (result.Items || []) as DynamoDBActivity[];
}

export async function getActivitiesByUserIdAndType(userId: string, type: string, limit: number = 100): Promise<DynamoDBActivity[]> {
  const client = await connectToDatabase();
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Activities,
    IndexName: 'userId-type-timestamp-index',
    KeyConditionExpression: 'userId = :userId AND #type = :type',
    ExpressionAttributeNames: {
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':type': type,
    },
    ScanIndexForward: false,
    Limit: limit,
  }));

  return (result.Items || []) as DynamoDBActivity[];
}

/**
 * VIDEO OPERATIONS
 */

export interface DynamoDBVideo {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  url: string;
  youtubeURL: string;
  description: string;
  completionStatus: number;
  addedAt: string;
  addedBy: string;
}

export async function createVideo(videoData: Partial<DynamoDBVideo>): Promise<DynamoDBVideo> {
  const client = await connectToDatabase();
  const now = Date.now();
  
  const video: DynamoDBVideo = {
    id: generateId(),
    youtubeId: videoData.youtubeId || '',
    title: videoData.title || '',
    channelTitle: videoData.channelTitle || '',
    thumbnail: videoData.thumbnail || '',
    duration: videoData.duration || '',
    url: videoData.url || '',
    youtubeURL: videoData.youtubeURL || '',
    description: videoData.description || '',
    completionStatus: videoData.completionStatus || 0,
    addedAt: now.toString(),
    addedBy: videoData.addedBy || '',
  };

  await client.send(new PutCommand({
    TableName: TABLES.Videos,
    Item: video,
  }));

  return video;
}

export async function getVideosByYoutubeId(youtubeId: string): Promise<DynamoDBVideo[]> {
  const client = await connectToDatabase();
  
  const result = await client.send(new QueryCommand({
    TableName: TABLES.Videos,
    IndexName: 'youtubeId-index',
    KeyConditionExpression: 'youtubeId = :youtubeId',
    ExpressionAttributeValues: {
      ':youtubeId': youtubeId,
    },
  }));

  return (result.Items || []) as DynamoDBVideo[];
}

export async function getVideoById(id: string): Promise<DynamoDBVideo | null> {
  const client = await connectToDatabase();
  
  const result = await client.send(new GetCommand({
    TableName: TABLES.Videos,
    Key: { id },
  }));

  return result.Item as DynamoDBVideo || null;
}

export async function updateVideo(id: string, updates: Partial<DynamoDBVideo>): Promise<DynamoDBVideo> {
  const client = await connectToDatabase();
  
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  
  // Don't set default values in an update function - only update fields that are explicitly provided
  Object.entries(updates).forEach(([key, value]) => {
    // Skip immutable keys (id and youtubeId)
    if (key !== 'id' && key !== 'youtubeId') {
      updateExpressions.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  // Guard against empty update expressions
  if (updateExpressions.length === 0) {
    throw new Error('No valid fields to update. Cannot update immutable fields (id, youtubeId) or when no fields are provided.');
  }

  const result = await client.send(new UpdateCommand({
    TableName: TABLES.Videos,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as DynamoDBVideo;
}

export async function deleteVideo(id: string): Promise<void> {
  const client = await connectToDatabase();
  
  await client.send(new DeleteCommand({
    TableName: TABLES.Videos,
    Key: { id },
  }));
}

export async function getAllVideos(limit: number = 20): Promise<DynamoDBVideo[]> {
  const client = await connectToDatabase();
  
  const result = await client.send(new ScanCommand({
    TableName: TABLES.Videos,
    Limit: limit,
  }));

  return (result.Items || []) as DynamoDBVideo[];
}
