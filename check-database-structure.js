const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseStructure() {
  console.log('🔍 Checking MongoDB Database Structure\n');
  
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB');
    
    // Get the current database name
    const currentDb = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    console.log(`📊 Current Database: ${dbName}\n`);
    
    // List all collections in the current database
    const collections = await currentDb.listCollections().toArray();
    console.log(`📋 Collections in "${dbName}" database:`);
    console.log('='.repeat(50));
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await currentDb.collection(collectionName).countDocuments();
      console.log(`📁 ${collectionName}: ${count} documents`);
      
      // Show sample document structure for each collection
      if (count > 0) {
        const sample = await currentDb.collection(collectionName).findOne();
        const fields = Object.keys(sample).filter(key => key !== '_id');
        console.log(`   📝 Fields: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
      }
      console.log('');
    }
    
    // Check if there are any other databases (if we have admin access)
    try {
      const admin = currentDb.admin();
      const dbList = await admin.listDatabases();
      
      console.log('🗄️  All Databases on this MongoDB instance:');
      console.log('='.repeat(50));
      
      for (const db of dbList.databases) {
        const isCurrentDb = db.name === dbName;
        const marker = isCurrentDb ? '👉' : '  ';
        console.log(`${marker} ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      }
      
    } catch (adminError) {
      console.log('ℹ️  Cannot list other databases (insufficient permissions)');
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Database: ${dbName}`);
    console.log(`   Collections: ${collections.length}`);
    console.log(`   Total documents: ${collections.reduce((sum, col) => sum + (col.count || 0), 0)}`);
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabaseStructure(); 