# 🚀 Deployment Guide - Who Am I? Game

## Overview
- **Frontend (Next.js)** → Vercel
- **Backend (Socket.io)** → Railway

---

## Step 1: Deploy Backend to Railway

1. **Go to [Railway](https://railway.app/)** and sign up/login (GitHub login is easiest)

2. **Create New Project**:
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Connect your GitHub account if needed
   - Push your code to GitHub first, or use **"Empty Project"** → **"Add Service"** → **"GitHub Repo"**

3. **If you don't have a GitHub repo**, create one:
   ```bash
   cd "d:\UNI Prep\Build\Who am i"
   git init
   git add .
   git commit -m "Initial commit"
   # Create repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/who-am-i.git
   git push -u origin main
   ```

4. **Configure the service in Railway**:
   - Set **Root Directory**: `server`
   - Railway will auto-detect Node.js

5. **Add Environment Variable**:
   - Go to **Variables** tab
   - Add: `CLIENT_URL` = `https://your-app.vercel.app` (update after Vercel deploy)

6. **Get your Railway URL**:
   - Go to **Settings** → **Networking** → **Generate Domain**
   - Copy the URL (e.g., `https://who-am-i-server-production.up.railway.app`)

---

## Step 2: Deploy Frontend to Vercel

1. **Go to [Vercel](https://vercel.com/)** and sign up/login

2. **Import Project**:
   - Click **"Add New..."** → **"Project"**
   - Import your GitHub repo

3. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `client`

4. **Add Environment Variable**:
   - Name: `NEXT_PUBLIC_SOCKET_URL`
   - Value: Your Railway URL from Step 1 (e.g., `https://who-am-i-server-production.up.railway.app`)

5. **Deploy!**

---

## Step 3: Update Railway with Vercel URL

1. Go back to Railway
2. Update the `CLIENT_URL` environment variable with your Vercel URL
3. Railway will auto-redeploy

---

## 🎮 You're Done!

Share your Vercel URL with friends and start playing!

---

## Quick Alternative: Local Tunnel (Temporary)

If you just want to test quickly without full deployment:

```bash
# Install and run localtunnel (no signup required)
npx localtunnel --port 3001 --subdomain whoami-server

# In another terminal
npx localtunnel --port 3000 --subdomain whoami-game
```

Then update `client/.env.local` with the server tunnel URL.

---

## Troubleshooting

### WebSocket connection fails
- Ensure `NEXT_PUBLIC_SOCKET_URL` has the correct Railway URL
- Check Railway logs for errors
- Make sure `CLIENT_URL` in Railway matches your Vercel domain

### CORS errors
- Verify `CLIENT_URL` environment variable in Railway
- The server uses this for CORS configuration

### Build fails on Vercel
- Check that root directory is set to `client`
- Ensure all dependencies are in package.json
