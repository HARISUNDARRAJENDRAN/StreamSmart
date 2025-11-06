# StreamSmart - Custom Domain Setup Guide

## Goal
Change from: `https://main.de7gjtsqdtkvr.amplifyapp.com`  
To: `https://www.streamsmart.com` ✅

## Prerequisites
- ✅ Amplify app already deployed
- ✅ Domain name (buy or already own)

## Option 1: AWS Route 53 (Easiest - Recommended)

### Step 1: Check Domain Availability
1. Go to Route 53: https://console.aws.amazon.com/route53/
2. Click **"Register Domain"**
3. Search for your desired domain (e.g., `streamsmart.com`)
4. Check availability and price

### Step 2: Purchase Domain (if available)
1. Click **"Add to cart"**
2. Fill in contact information
3. **Duration**: 1 year (auto-renew recommended)
4. **Privacy protection**: ✅ Enable (hides your contact info from WHOIS)
5. Complete purchase (~$12)

**Wait time**: 10-60 minutes for domain registration

### Step 3: Connect to Amplify
1. **Open Amplify Console**: https://console.aws.amazon.com/amplify/
2. Select your app: **"StreamSmart"**
3. Click **"Domain management"** in left sidebar
4. Click **"Add domain"** button

### Step 4: Configure Domain
1. **Domain**: Select `streamsmart.com` from dropdown (Route 53 auto-detects)
2. **Subdomains**: Amplify auto-configures:
   ```
   ✅ https://streamsmart.com      (root)
   ✅ https://www.streamsmart.com  (www subdomain)
   ```
3. **Redirect**: Choose one:
   - Redirect `streamsmart.com` to `www.streamsmart.com` (recommended)
   - Or redirect `www` to root
4. Click **"Save"**

### Step 5: Wait for SSL Certificate
**Automatic process (no action needed):**
- ✅ Amplify requests SSL certificate from AWS Certificate Manager
- ✅ DNS validation happens automatically (Route 53 integration)
- ✅ Certificate issued (~5-15 minutes)
- ✅ CloudFront distribution updated

**Status in Amplify:**
```
Domain: streamsmart.com
Status: Pending → Creating → Available ✅
```

### Step 6: Verify Domain Works
**Test URLs:**
```bash
# Test root domain
curl -I https://streamsmart.com

# Test www subdomain
curl -I https://www.streamsmart.com

# Should both return 200 OK
```

**Or open in browser:**
- https://streamsmart.com ✅
- https://www.streamsmart.com ✅

---

## Option 2: External Registrar (Namecheap, GoDaddy, Cloudflare)

### Step 1: Buy Domain
Purchase from any registrar:
- Namecheap: https://www.namecheap.com (~$9/year)
- GoDaddy: https://www.godaddy.com (~$12/year)
- Cloudflare: https://www.cloudflare.com/products/registrar/ (~$10/year)

### Step 2: In Amplify Console
1. Open your app in Amplify
2. Go to **"Domain management"**
3. Click **"Add domain"**
4. Enter: `streamsmart.com`
5. Click **"Configure domain"**

### Step 3: Get DNS Records from Amplify
Amplify will show you DNS records to add:

**Example output:**
```
Record 1 (For www subdomain):
Type:  CNAME
Name:  www
Value: main.de7gjtsqdtkvr.amplifyapp.com

Record 2 (For root domain - A record):
Type:  A
Name:  @
Value: 13.224.157.71

Record 3 (For root domain - AAAA record):
Type:  AAAA
Name:  @
Value: 2600:9000:a123:b456:c789::1

Record 4 (SSL verification - if required):
Type:  CNAME
Name:  _acme-challenge
Value: _verification.amplify.amazonaws.com
```

### Step 4: Add DNS Records (Namecheap Example)

**In Namecheap Dashboard:**
1. Go to **Domain List**
2. Click **"Manage"** next to your domain
3. Go to **"Advanced DNS"** tab
4. Click **"Add New Record"**

**Add each record:**

**Record 1 - WWW Subdomain:**
```
Type:  CNAME Record
Host:  www
Value: main.de7gjtsqdtkvr.amplifyapp.com
TTL:   Automatic
```

**Record 2 - Root Domain (A):**
```
Type:  A Record
Host:  @
Value: 13.224.157.71 (copy from Amplify)
TTL:   Automatic
```

**Record 3 - Root Domain (AAAA):**
```
Type:  AAAA Record
Host:  @
Value: 2600:9000:... (copy from Amplify)
TTL:   Automatic
```

**Record 4 - SSL Verification (if needed):**
```
Type:  CNAME Record
Host:  _acme-challenge
Value: _verification.amplify.amazonaws.com
TTL:   Automatic
```

5. Click **"Save All Changes"**

### Step 5: Wait for DNS Propagation
**Time:** 30 minutes to 48 hours (usually 1-2 hours)

**Check propagation status:**
```bash
# Check if DNS is propagated
nslookup streamsmart.com
nslookup www.streamsmart.com
```

Or use online tools:
- https://www.whatsmydns.net/
- https://dnschecker.org/

### Step 6: Verify in Amplify
**Status in Amplify Console:**
```
Domain: streamsmart.com
Status: Pending → Verifying → Available ✅
```

---

## Troubleshooting

### Issue 1: "Domain verification failed"
**Solution:**
- Check DNS records are correct (exact copy from Amplify)
- Wait longer (DNS propagation can take 24-48 hours)
- Use `nslookup` to verify DNS is resolving

### Issue 2: "SSL certificate not issued"
**Solution:**
- Domain must be verified first
- Check CNAME record for `_acme-challenge` is correct
- Wait up to 30 minutes for certificate

### Issue 3: "www works but root doesn't (or vice versa)"
**Solution:**
- Make sure you added BOTH A/AAAA records (for root) AND CNAME (for www)
- Check redirect settings in Amplify

### Issue 4: "DNS_PROBE_FINISHED_NXDOMAIN"
**Solution:**
- DNS not propagated yet, wait longer
- Check nameservers are correct (for external registrars)
- Verify DNS records in registrar

### Issue 5: Domain shows "Not Secure" warning
**Solution:**
- SSL certificate still being issued, wait 15-30 minutes
- Force refresh: Ctrl+Shift+R
- Check certificate status in Amplify

---

## DNS Record Types Explained

### CNAME (Canonical Name)
- **Purpose**: Points subdomain to another domain
- **Example**: `www.streamsmart.com` → `main.de7gjtsqdtkvr.amplifyapp.com`
- **Use for**: www, api, blog subdomains

### A Record (IPv4 Address)
- **Purpose**: Points domain to an IP address
- **Example**: `streamsmart.com` → `13.224.157.71`
- **Use for**: Root domain

### AAAA Record (IPv6 Address)
- **Purpose**: Points domain to IPv6 address
- **Example**: `streamsmart.com` → `2600:9000:...`
- **Use for**: Root domain (for IPv6 support)

---

## Best Practices

### 1. Enable Auto-Renew
- ✅ Enable in domain registrar
- Prevents accidental domain expiration

### 2. Privacy Protection
- ✅ Enable WHOIS privacy
- Hides personal contact info

### 3. Use Both Root and WWW
- ✅ Configure both `streamsmart.com` and `www.streamsmart.com`
- Set up redirect (choose one as primary)

### 4. HTTPS Only
- ✅ Amplify automatically redirects HTTP → HTTPS
- Never disable HTTPS

### 5. CloudFront Cache
- ✅ Automatically enabled with custom domain
- Speeds up global access

---

## Custom Domain for Backend (Optional)

If you want:
- Frontend: `https://www.streamsmart.com`
- Backend: `https://api.streamsmart.com`

**Steps:**
1. Deploy backend to App Runner first
2. In Route 53, create CNAME record:
   ```
   Type:  CNAME
   Name:  api
   Value: your-apprunner-url.awsapprunner.com
   ```
3. In App Runner, add custom domain
4. Configure SSL certificate in App Runner

---

## Timeline Summary

| Method | Setup Time | DNS Propagation | Total Time |
|--------|------------|-----------------|------------|
| **Route 53** | 10 min | 0-5 min | 15-20 min |
| **External Registrar** | 15 min | 1-48 hours | 1-48 hours |

**Recommendation**: Use Route 53 for fastest setup!

---

## Cost Summary

### Route 53 Method:
```
Domain Registration:     $12/year
Route 53 Hosted Zone:    $0.50/month ($6/year)
SSL Certificate:         FREE (via Amplify)
Total:                   ~$18/year
```

### External Registrar Method:
```
Domain Registration:     $9-12/year
DNS Management:          FREE (via registrar)
SSL Certificate:         FREE (via Amplify)
Total:                   ~$9-12/year
```

---

## Updating Your App After Domain Setup

### Update Environment Variables:

**In Amplify Console:**
1. Go to Environment variables
2. Update:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://api.streamsmart.com
   NEXT_PUBLIC_FRONTEND_URL=https://www.streamsmart.com
   ```
3. Redeploy

**In Backend (App Runner):**
1. Go to App Runner → Configuration
2. Update CORS settings to allow:
   ```
   ALLOWED_ORIGINS=https://www.streamsmart.com,https://streamsmart.com
   ```

### Update Extension (Later):
1. Update `manifest.json`:
   ```json
   "host_permissions": [
     "https://www.streamsmart.com/*",
     "https://api.streamsmart.com/*"
   ]
   ```

---

## Verification Checklist

After setup, verify:
- [ ] `https://streamsmart.com` loads correctly
- [ ] `https://www.streamsmart.com` loads correctly
- [ ] HTTP redirects to HTTPS automatically
- [ ] SSL certificate is valid (green padlock)
- [ ] Both URLs show same content
- [ ] Redirect works (www → root or root → www)
- [ ] Backend API calls work from custom domain
- [ ] Extension works with custom domain

---

## Support Links

- AWS Route 53: https://console.aws.amazon.com/route53/
- AWS Amplify Domains: https://docs.amplify.aws/
- DNS Propagation Checker: https://www.whatsmydns.net/
- SSL Checker: https://www.ssllabs.com/ssltest/

---

## Summary

✅ **Route 53 Method**: Easiest, fastest (15-20 min total)  
✅ **External Registrar**: Cheaper, but slower (1-48 hours)  
✅ **SSL Automatic**: Amplify handles everything  
✅ **No Code Changes**: Just DNS configuration  
✅ **Professional**: Custom domain looks better for users
