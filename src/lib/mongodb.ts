import mongoose from 'mongoose';

// MongoDB Atlas connection URI from environment variable
const MONGO_URI = process.env.MONGO_URI;

// Fallback for development (optional)
const DEVELOPMENT_URI = process.env.NODE_ENV === 'development' 
  ? process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart'
  : null;

// Use Atlas URI for production, fallback for development
const connectionString = MONGO_URI || DEVELOPMENT_URI;

// Default DB name if URI omits a database path
const DEFAULT_DB_NAME = process.env.MONGO_DB_NAME || 'streamsmart';
// Detect if the URI already includes a db name segment after the host
const uriHasDbName = /mongodb(?:\+srv)?:\/\/[^\/]+\/(?!\?)([^?\/]+)(?=\?|$)/.test(connectionString);

// Validate connection string
if (!connectionString) {
  throw new Error(
    'Please define the MONGO_URI environment variable for MongoDB Atlas connection. ' +
    'Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority'
  );
}

// Validate Atlas connection string format in production
if (process.env.NODE_ENV === 'production' && !connectionString.startsWith('mongodb+srv://')) {
  throw new Error(
    'Production requires MongoDB Atlas connection string starting with mongodb+srv://'
  );
}

// Log connection info (without credentials)
const logUri = connectionString.replace(/\/\/[^:\/]+:[^@\/]+@/, '//***:***@');
console.log(`🔗 MongoDB connecting to: ${logUri}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

/**
 * Global mongoose cache for connection reuse
 * Prevents connection growth during API route hot reloads in development
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose as MongooseCache;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB Atlas
 * Uses connection pooling and proper error handling for production
 */
async function connectDB(): Promise<typeof mongoose> {
  try {
    // Return existing connection if available
    if (cached.conn) {
      console.log('📡 Using existing MongoDB connection');
      return cached.conn;
    }

    // Return existing promise if connection is in progress
    if (!cached.promise) {
      const connectionOptions = {
        // Connection pooling options for production
        maxPoolSize: 10, // Maximum number of connections
        serverSelectionTimeoutMS: 5000, // How long to try selecting a server
        socketTimeoutMS: 45000, // How long a socket can be inactive
        bufferCommands: false, // Disable mongoose buffering
        
        // Development vs Production timeouts
        ...(process.env.NODE_ENV === 'production' ? {
          connectTimeoutMS: 10000,
          heartbeatFrequencyMS: 10000,
        } : {
          connectTimeoutMS: 30000,
          heartbeatFrequencyMS: 30000,
        })
      } as Parameters<typeof mongoose.connect>[1];

      // If no db name is present in the URI, enforce the intended database
      const finalOptions = uriHasDbName ? connectionOptions : { ...connectionOptions, dbName: DEFAULT_DB_NAME };

      console.log('🚀 Initiating MongoDB Atlas connection...');
      if (!uriHasDbName) {
        console.log(`🛠️  URI has no database path; forcing dbName='${DEFAULT_DB_NAME}'`);
      }
      cached.promise = mongoose.connect(connectionString, finalOptions);
    }

    // Wait for connection to complete
    cached.conn = await cached.promise;
    
    // Connection success logging
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
    console.log(`🏷️  Database name: ${mongoose.connection.name}`);
    
    return cached.conn;

  } catch (error) {
    // Reset promise on error to allow retry
    cached.promise = null;
    
    // Enhanced error logging
    console.error('❌ MongoDB Atlas connection failed:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('authentication failed')) {
        console.error('🔐 Authentication failed - check username/password in MONGO_URI');
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('🌐 Network error - check cluster URL in MONGO_URI');
      } else if (error.message.includes('serverSelectionTimeoutMS')) {
        console.error('⏱️  Server selection timeout - check cluster accessibility');
      }
    }
    
    throw error;
  }
}

/**
 * Gracefully close the MongoDB connection
 * Useful for cleanup in serverless environments
 */
async function disconnectDB(): Promise<void> {
  try {
    if (cached.conn) {
      await mongoose.disconnect();
      cached.conn = null;
      cached.promise = null;
      console.log('🔌 MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
}

// Export the connection functions
export default connectDB;
export { connectDB, disconnectDB };
export const connectToDatabase = connectDB; // Legacy compatibility 