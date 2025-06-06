# 🗃️ MongoDB Atlas Setup for StreamSmart

## Why You Need This
Your current MongoDB (`mongodb://localhost:27017/streamsmart`) only works on your computer. Remote users testing your app need a cloud database.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/atlas
2. Click "Start Free" 
3. Sign up with email
4. Choose "Free" plan (M0 Sandbox)

### Step 2: Create Cluster
1. **Choose Cloud Provider:** AWS (default is fine)
2. **Choose Region:** Closest to your location
3. **Cluster Name:** `streamsmart-cluster`
4. Click "Create Cluster" (takes 2-3 minutes)

### Step 3: Create Database User
1. Click "Database Access" in left sidebar
2. Click "Add New Database User"
3. **Authentication Method:** Password
4. **Username:** `streamsmartuser`
5. **Password:** Generate secure password (save it!)
6. **Database User Privileges:** Atlas admin
7. Click "Add User"

### Step 4: Configure Network Access
1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. **For testing:** Click "Allow Access from Anywhere" (0.0.0.0/0)
4. **For production:** Add specific IPs only
5. Click "Confirm"

### Step 5: Get Connection String
1. Click "Database" in left sidebar
2. Click "Connect" button on your cluster
3. Choose "Connect your application"
4. **Driver:** Node.js
5. **Version:** 4.1 or later
6. Copy the connection string (looks like):
   ```
   mongodb+srv://streamsmartuser:<password>@streamsmart-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Your App
1. Create/update `.env.local` file in your project root:
   ```
   # Replace <password> with your actual password
   # Replace the database name if needed
   MONGODB_URI=mongodb+srv://streamsmartuser:YOUR_PASSWORD@streamsmart-cluster.xxxxx.mongodb.net/streamsmart?retryWrites=true&w=majority
   ```

2. **Important:** Replace `<password>` with the actual password you created!

### Step 7: Test Connection
1. Stop your development server (Ctrl+C)
2. Start it again:
   ```powershell
   npm run dev
   ```
3. Try logging in - you should see no errors
4. Check Atlas dashboard - you should see data appearing

## 🔄 Migrate Existing Data (Optional)

If you have existing data in local MongoDB:

### Export from Local MongoDB:
```powershell
# Install MongoDB tools if needed
mongodump --host localhost:27017 --db streamsmart --out backup

# Or export specific collections
mongoexport --host localhost:27017 --db streamsmart --collection users --out users.json
mongoexport --host localhost:27017 --db streamsmart --collection playlists --out playlists.json
```

### Import to Atlas:
```powershell
# Import using Atlas connection string
mongoimport --uri "mongodb+srv://streamsmartuser:PASSWORD@cluster.xxxxx.mongodb.net/streamsmart" --collection users --file users.json
mongoimport --uri "mongodb+srv://streamsmartuser:PASSWORD@cluster.xxxxx.mongodb.net/streamsmart" --collection playlists --file playlists.json
```

## ✅ Verification Checklist

After setup, verify:
- [ ] App starts without database errors
- [ ] User registration works
- [ ] Data appears in Atlas dashboard
- [ ] Search history is being saved
- [ ] Playlists and activities sync

## 🔧 Atlas Dashboard Overview

Navigate to understand your data:
1. **Collections:** View your data (users, playlists, search history, etc.)
2. **Metrics:** Monitor database performance
3. **Logs:** Debug connection issues
4. **Triggers:** Set up automated functions (future use)

## 🛡️ Security Best Practices

### For Testing:
- ✅ Use IP whitelist 0.0.0.0/0 (temporary)
- ✅ Strong database user password
- ✅ Don't commit credentials to Git

### For Production:
- 🔒 Restrict IP access to specific IPs
- 🔒 Use environment variables for credentials
- 🔒 Enable database auditing
- 🔒 Set up connection monitoring

## 🆘 Common Issues & Solutions

**Connection timeout:**
- Check IP whitelist in Network Access
- Verify username/password in connection string

**Authentication failed:**
- Double-check username/password
- Ensure user has Atlas admin privileges

**Database not found:**
- Database will be created automatically when first data is inserted
- Make sure database name in connection string is correct

**Connection string format:**
```
mongodb+srv://<username>:<password>@<cluster>.<xxxxx>.mongodb.net/<database>?retryWrites=true&w=majority
```

## 📊 Monitoring Your Data

Once remote users start testing:
1. **Atlas Dashboard:** See real-time connections
2. **Collections:** Watch user data grow
3. **Performance:** Monitor query performance
4. **Storage:** Track data usage (M0 has 512MB limit)

## 🚀 Ready for Port Forwarding

Once Atlas is set up:
1. Your local app connects to cloud database ✅
2. Remote users can access same database ✅  
3. All user data persists in the cloud ✅
4. Ready to share your app with ngrok! ✅ 