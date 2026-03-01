# Deployment Guide - PostgreSQL on Supabase (Recommended)

## Quick Deploy to Supabase (Free Tier)

### Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project
4. Choose a region close to your users
5. Set a database password (save it!)

### Step 2: Get Connection String

1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy the connection string
4. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`

### Step 3: Run Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Open `backend/database/schema.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**

### Step 4: Update Backend `.env`

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
JWT_SECRET=your_random_secret_key_here
```

**Important:** Enable SSL for Supabase:
```javascript
// Update backend/src/db.js
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});
```

### Step 5: Test Connection

```bash
cd backend
npm install
npm run setup-db
```

Should see: ✅ Database connected successfully!

---

## Alternative: Neon (Serverless PostgreSQL)

### Step 1: Create Account
1. Go to https://neon.tech
2. Sign up (free)
3. Create project

### Step 2: Get Connection String
1. Copy connection string from dashboard
2. Format: `postgresql://[user]:[password]@[endpoint].neon.tech/[db]?sslmode=require`

### Step 3: Run Schema
1. Use Neon SQL Editor
2. Paste `backend/database/schema.sql`
3. Execute

### Step 4: Update `.env`
```env
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[db]?sslmode=require
```

---

## Deploy Backend (Railway/Render)

### Option 1: Railway (Easiest)

1. Go to https://railway.app
2. Sign up with GitHub
3. **New Project** → **Deploy from GitHub**
4. Select your repository
5. Add environment variables:
   - `DATABASE_URL` (from Supabase)
   - `JWT_SECRET` (random string)
   - `PORT` (Railway sets this automatically)
6. Deploy!

### Option 2: Render

1. Go to https://render.com
2. **New** → **Web Service**
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Environment:** Node
5. Add environment variables (same as Railway)
6. Deploy!

---

## Deploy Frontend (Vercel/Netlify)

### Option 1: Vercel (Recommended)

1. Go to https://vercel.com
2. **Import Project** from GitHub
3. Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` = your backend URL
5. Deploy!

Update `frontend/src/pages/Game.jsx` and other files:
```javascript
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000')
```

### Option 2: Netlify

1. Go to https://netlify.com
2. **Add new site** → **Import from Git**
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variables
5. Deploy!

---

## Full Stack Deployment Checklist

- [ ] Database created on Supabase/Neon
- [ ] Schema executed successfully
- [ ] Backend `.env` configured with database URL
- [ ] Backend deployed (Railway/Render)
- [ ] Frontend `.env` configured with backend URL
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] CORS configured on backend (allow frontend domain)
- [ ] Socket.io CORS configured
- [ ] Test sign up / sign in
- [ ] Test creating a game
- [ ] Test making moves

---

## Environment Variables Summary

### Backend `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
NODE_ENV=production
```

### Frontend `.env`:
```env
VITE_API_URL=https://your-backend.railway.app
```

---

## Cost Estimate

**Free Tier (MVP):**
- Supabase: $0/month
- Railway: $5 credit/month (free)
- Vercel: $0/month
- **Total: $0/month** ✅

**Production (1000+ users):**
- Supabase Pro: $25/month
- Railway: $20/month
- Vercel Pro: $20/month
- **Total: ~$65/month**

---

## Troubleshooting

### Database Connection Issues
- Check SSL settings (Supabase requires SSL)
- Verify connection string format
- Check firewall/network access

### CORS Errors
- Update backend CORS to allow frontend domain
- Check Socket.io CORS settings

### Socket.io Not Connecting
- Verify backend URL in frontend
- Check WebSocket support on hosting platform
- Ensure Socket.io CORS allows frontend origin

---

## Quick Start Commands

```bash
# 1. Setup database (Supabase)
# - Create project
# - Run schema.sql
# - Copy connection string

# 2. Backend
cd backend
npm install
# Create .env with DATABASE_URL
npm run setup-db  # Test connection
npm start

# 3. Frontend
cd frontend
npm install
# Create .env with VITE_API_URL
npm run dev
```

---

**Recommended Stack:**
- **Database:** Supabase PostgreSQL (Free)
- **Backend:** Railway (Free tier)
- **Frontend:** Vercel (Free)

Total cost: **$0/month** for MVP! 🎉
