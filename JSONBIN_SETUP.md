# JSONBin.io Setup Guide for Speedy Delivery

## Why JSONBin.io?
- Simple, free JSON hosting
- No authentication headaches
- Works worldwide for all users
- Persistent storage (won't be reset on server restart)

## Step-by-Step Setup

### 1. Create JSONBin.io Account
1. Go to https://jsonbin.io
2. Click "Sign Up" 
3. Sign up with Google/GitHub or email
4. Verify your email

### 2. Get API Key
1. After login, click on your profile (top right)
2. Go to "API Keys"
3. Click "Create New API Key"
4. Name it "Speedy Delivery"
5. Copy the API Key (save this!)

### 3. Create a JSON Bin
1. Go to https://jsonbin.io
2. Click "Create New Bin"
3. In the content area, paste this initial data:
   ```json
   {
     "orders": {},
     "drivers": [],
     "kv": {}
   }
   ```
4. Click "Create"
5. Copy the Bin ID from the URL (it's the part after /b/)

### 4. Set Environment Variables on Render
1. Go to your Render dashboard
2. Open "speedy-delivery-service"
3. Go to "Environment" tab
4. Add two environment variables:
   - **Key**: `JSONBIN_KEY`
   - **Value**: Your API key from step 2
   - **Key**: `JSONBIN_BIN_ID`  
   - **Value**: Your Bin ID from step 3
5. Click "Save Changes"

### 5. Test Synchronization
1. Wait for Render to redeploy
2. Place an order on your main website
3. Check admin portal - order should appear
4. Check driver portal - order should appear
5. Have your dispatcher test from different country

## That's it!
Your dispatchers worldwide will now see the same real-time data across all portals.
