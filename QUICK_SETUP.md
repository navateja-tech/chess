# Quick Database Setup Guide

## Step-by-Step Setup for Windows

### Step 1: Create the Database

Open **Command Prompt** or **PowerShell** and run:

```bash
# Navigate to project directory
cd C:\Users\zenit\zenith\iomp\p2

# Option A: Use the automated script
setup-database.bat

# Option B: Manual setup
psql -U postgres
```

If using manual setup, in the PostgreSQL prompt:
```sql
CREATE DATABASE chess_db;
\q
```

**Note:** If `psql` command is not found, add PostgreSQL to your PATH:
- Usually located at: `C:\Program Files\PostgreSQL\14\bin`
- Or use full path: `"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres`

### Step 2: Run the Schema

```bash
# Using the script (will prompt for password)
setup-database.bat

# OR manually:
psql -U postgres -d chess_db -f backend\database\schema.sql
```

### Step 3: Create .env File

```bash
# Option A: Use the automated script
cd backend
setup-env.bat

# Option B: Create manually
```

Create `backend\.env` file with:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/chess_db
JWT_SECRET=your_secret_key_here_change_in_production
```

**Replace:**
- `YOUR_PASSWORD` with your PostgreSQL password
- `your_secret_key_here_change_in_production` with a random secret (for production)

### Step 4: Test Connection

```bash
cd backend
npm install
npm run setup-db
```

You should see: ✅ Database connected successfully!

---

## Troubleshooting

### "psql: command not found"
- Add PostgreSQL bin to PATH:
  1. Search "Environment Variables" in Windows
  2. Edit "Path" variable
  3. Add: `C:\Program Files\PostgreSQL\14\bin` (adjust version number)
  4. Restart terminal

### "password authentication failed"
- Check your PostgreSQL password
- Default user is `postgres`
- If you forgot password, reset it in pgAdmin or reinstall PostgreSQL

### "database already exists"
- That's fine! The script will continue
- Or drop and recreate: `DROP DATABASE chess_db; CREATE DATABASE chess_db;`

### "permission denied"
- Make sure you're using the `postgres` superuser
- Or create a user with proper permissions

---

## Verify Setup

Run these commands to verify:

```bash
# Connect to database
psql -U postgres -d chess_db

# Check tables
\dt

# Should show: users, games, moves

# Check users table structure
\d users

# Exit
\q
```

---

## Next Steps

Once database is set up:

1. ✅ Database created
2. ✅ Schema executed
3. ✅ .env file configured
4. ✅ Connection tested

Start the backend:
```bash
cd backend
npm run dev
```

Start the frontend:
```bash
cd frontend
npm run dev
```

Visit: http://localhost:3000
