# MongoDB Atlas Setup Guide for StreamSmart

## 📋 Complete Step-by-Step Setup

### Step 1: Create MongoDB Atlas Account
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click **"Try Free"** or **"Sign up"**
3. Fill out the registration form:
   - Email address
   - Password
   - First & Last Name
4. Verify your email address

### Step 2: Create Your First Cluster
1. After logging in, you'll see the **"Welcome to Atlas"** screen
2. Click **"Build a Database"**
3. Choose **"M0 Sandbox"** (FREE tier):
   - ✅ 512 MB storage
   - ✅ Shared RAM and vCPU
   - ✅ No credit card required
4. Cloud Provider & Region:
   - Choose **AWS**, **Google Cloud**, or **Azure**
   - Select a region close to you (e.g., `us-east-1` for East Coast)
5. Cluster Name: Leave as default or change to `StreamSmart-Cluster`
6. Click **"Create Cluster"** (takes 1-3 minutes to provision)

### Step 3: Create Database User
1. While your cluster is being created, you'll see **"Security Quickstart"**
2. **Create a Database User**:
   - Username: `streamsmartuser` (or your preferred username)
   - Password: Click **"Autogenerate Secure Password"** and **SAVE IT** somewhere safe
   - Or create your own password (save it!)
   - Database User Privileges: **Read and write to any database**
3. Click **"Create User"**

### Step 4: Add Your IP Address
1. **Add IP Address**:
   - Click **"Add My Current IP Address"** 
   - Description: `My Local Development`
   - Click **"Add Entry"**
2. For production/Render deployment, you'll also need:
   - Click **"Allow Access from Anywhere"** (IP: `0.0.0.0/0`)
   - Description: `Render Production Server`
   - Click **"Add Entry"**

### Step 5: Connect to Your Cluster
1. Go to **"Database"** in the left sidebar
2. Your cluster should now show as **"Active"**
3. Click the **"Connect"** button on your cluster
4. Choose **"Connect your application"**
5. Driver: **Node.js**
6. Version: **4.1 or later**
7. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://streamsmartuser:<password>@streamsmart-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Prepare Your Connection String
1. Take the connection string from Step 5
2. Replace `<password>` with the actual password you saved in Step 3
3. Add your database name at the end. Your final string should look like:
   ```
   mongodb+srv://streamsmartuser:YOUR_ACTUAL_PASSWORD@streamsmart-cluster.xxxxx.mongodb.net/streamsmart?retryWrites=true&w=majority
   ```

### Step 7: Set Environment Variable Locally
1. **Create a `.env.local` file** in your project root (if it doesn't exist):
   ```bash
   # In your StreamSmart folder
   touch .env.local    # On Mac/Linux
   # Or create the file manually on Windows
   ```

2. **Add your connection string** to `.env.local`:
   ```env
   MONGO_URI=mongodb+srv://streamsmartuser:YOUR_ACTUAL_PASSWORD@streamsmart-cluster.xxxxx.mongodb.net/streamsmart?retryWrites=true&w=majority
   NODE_ENV=development
   ```

3. **Make sure `.env.local` is in your `.gitignore`** (it should be already):
   ```gitignore
   .env*.local
   .env
   ```

### Step 8: Test Your Connection
1. **Run the connection test**:
   ```bash
   node check-users.js
   ```
   
   You should see:
   ```
   🔗 MongoDB connecting to: mongodb+srv://***:***@streamsmart-cluster.xxxxx.mongodb.net/streamsmart?retryWrites=true&w=majority
   🌍 Environment: development
   ✅ MongoDB Atlas connected successfully
   Connected to MongoDB
   
   Found 0 users:
   No users found in database.
   ```

2. **If you get connection errors**, check:
   - ✅ Password is correct (no special characters causing issues)
   - ✅ IP address is whitelisted
   - ✅ Username is correct
   - ✅ Cluster is running (should say "Active")

### Step 9: Create Sample Data
1. **Run the seed script** to populate your Atlas database:
   ```bash
   node seed-sample-data.js
   ```

2. **Verify data was created**:
   ```bash
   node check-users.js
   node check-viewing-history.js
   ```

### Step 10: Test Your Application
1. **Start your Next.js app**:
   ```bash
   npm run dev
   ```

2. **Check the console** - you should see:
   ```
   🔗 MongoDB connecting to: mongodb+srv://***:***@streamsmart-cluster.xxxxx.mongodb.net/streamsmart
   🌍 Environment: development
   ✅ MongoDB Atlas connected successfully
   ```

3. **Test the app** by:
   - Registering a new user
   - Logging in
   - Checking if recommendations load

## 🚀 For Render Deployment

When you deploy to Render, you'll set the same `MONGO_URI` environment variable in the Render dashboard:

1. Go to your Render service dashboard
2. Go to **Environment** tab
3. Add environment variable:
   - **Key**: `MONGO_URI`
   - **Value**: `mongodb+srv://streamsmartuser:YOUR_PASSWORD@streamsmart-cluster.xxxxx.mongodb.net/streamsmart?retryWrites=true&w=majority`

## ❌ Troubleshooting Common Issues

### "Authentication failed"
- Double-check your username and password
- Ensure no special characters are causing URL encoding issues
- Try creating a new database user with a simpler password

### "Network timeout" or "ENOTFOUND"
- Check your IP whitelist in Atlas Security settings
- Make sure you have internet connection
- Try adding `0.0.0.0/0` to allow all IPs (temporary troubleshooting)

### "Server selection timeout"
- Your cluster might still be starting up (wait 2-3 minutes)
- Check if cluster status is "Active" in Atlas dashboard
- Verify the cluster URL in your connection string

### "Database not found"
- MongoDB Atlas will create the database automatically when you first write data
- Make sure you're running the seed script: `node seed-sample-data.js`

## 📊 Monitoring Your Database
1. In MongoDB Atlas dashboard, go to **"Database"**
2. Click **"Browse Collections"** on your cluster
3. You should see your collections: `users`, `contents`, `userviewinghistories`, etc.

## 💡 Pro Tips
- **Free Tier Limits**: 512MB storage, but plenty for development
- **Connection Pooling**: Already optimized in your code
- **Backup**: Atlas automatically backs up your data
- **Monitoring**: Use Atlas monitoring to see connection stats

Your StreamSmart app is now connected to MongoDB Atlas! 🎉 