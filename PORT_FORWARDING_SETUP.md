# 🌐 StreamSmart Port Forwarding Setup Guide

## 🚀 Quick Start - Get Your App Online

### Method 1: ngrok (Recommended for Testing)

1. **Download ngrok:**
   - Visit: https://ngrok.com/download
   - Download Windows version
   - Extract to `C:\ngrok\`

2. **Setup ngrok:**
   ```powershell
   # In a new PowerShell window
   cd C:\ngrok
   
   # Expose your StreamSmart app
   .\ngrok http 3000
   ```

3. **You'll get a public URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Share this URL with users to test your app!**

### Method 2: Router Port Forwarding (Permanent Access)

1. **Find your local IP:**
   ```powershell
   ipconfig
   ```
   Note your IPv4 address (e.g., `192.168.1.100`)

2. **Access router admin:**
   - Browser: `192.168.1.1` or `192.168.0.1`
   - Login with admin credentials

3. **Configure port forwarding:**
   ```
   Service Name: StreamSmart
   External Port: 3000
   Internal Port: 3000
   Internal IP: [Your PC's IP]
   Protocol: TCP
   ```

4. **Get public IP:**
   - Visit: https://whatismyipaddress.com
   - Users access: `http://[your-public-ip]:3000`

## 🗃️ Database Configuration for Remote Users

### Problem: Local MongoDB Won't Work
Your current MongoDB (`mongodb://localhost:27017/streamsmart`) is only accessible from your PC.

### Solution Options:

#### Option A: MongoDB Atlas (Cloud) - RECOMMENDED
1. **Create free account:** https://www.mongodb.com/atlas
2. **Create cluster** (M0 Free tier)
3. **Get connection string:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/streamsmart
   ```
4. **Update your .env.local:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/streamsmart
   ```

#### Option B: Expose Local MongoDB (Not Recommended)
```powershell
# Forward MongoDB port too
ngrok tcp 27017
```
**⚠️ Security Risk:** Don't expose MongoDB publicly without proper authentication!

#### Option C: Deploy to Cloud Platform
- **Vercel:** Easy Next.js deployment
- **Railway:** Full-stack with MongoDB
- **Heroku:** Classic platform

## 🛡️ Security Checklist

Before port forwarding:

- [ ] Change default MongoDB admin credentials
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules
- [ ] Use HTTPS (ngrok provides this automatically)
- [ ] Monitor access logs
- [ ] Consider VPN access for sensitive data

## 🚀 Recommended Workflow

### For Testing (Quick & Easy):
1. Use **ngrok** for port forwarding
2. Use **MongoDB Atlas** for database
3. Share ngrok URL with test users

### For Production:
1. Deploy to **Vercel/Railway**
2. Use **MongoDB Atlas**
3. Set up custom domain

## 📝 Step-by-Step Commands

1. **Start your app:**
   ```powershell
   npm run dev
   ```

2. **In another terminal, start ngrok:**
   ```powershell
   cd C:\ngrok
   .\ngrok http 3000
   ```

3. **Update MongoDB (if using Atlas):**
   - Create `.env.local` file
   - Add: `MONGODB_URI=mongodb+srv://...`

4. **Test with users:**
   - Share the ngrok HTTPS URL
   - Monitor your app logs
   - Check MongoDB for new user data

## 🔍 Verification Steps

After setup, verify:
- [ ] Public URL loads your app
- [ ] User registration works
- [ ] Data appears in MongoDB
- [ ] All tracking APIs work
- [ ] Search functionality works

## 🆘 Troubleshooting

**ngrok not found:**
- Download from ngrok.com and extract to `C:\ngrok\`

**Database connection errors:**
- Check MONGODB_URI in .env.local
- Verify Atlas IP whitelist (use 0.0.0.0/0 for testing)

**Port 3000 already in use:**
- Kill existing process or use different port
- `netstat -ano | findstr :3000`

**Firewall blocking:**
- Add exception for ngrok.exe
- Check Windows Defender settings 