# Database Setup Instructions

## Quick Setup (Choose One Method)

---

## Method 1: Automated Scripts (Easiest)

### Step 1: Create Database and Run Schema

Open **Command Prompt** in the project folder and run:

```bash
setup-database.bat
```

This will:
- Create the `chess_db` database
- Run the schema to create all tables
- You'll be prompted for your PostgreSQL password

### Step 2: Create .env File

```bash
cd backend
setup-env.bat
```

Enter:
- Your PostgreSQL password
- JWT secret (or press Enter for default)

### Step 3: Test Connection

```bash
npm install
npm run setup-db
```

---

## Method 2: Manual Setup

### Step 1: Create Database

Open **Command Prompt** or **PowerShell**:

```bash
psql -U postgres
```

Enter your PostgreSQL password when prompted.

In the PostgreSQL prompt:
```sql
CREATE DATABASE chess_db;
\q
```

**Note:** If `psql` command not found:
- Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\14\bin`)
- Use full path: `"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres`
- Or add to PATH (see troubleshooting below)

### Step 2: Run Schema

```bash
psql -U postgres -d chess_db -f backend\database\schema.sql
```

Enter your password when prompted.

### Step 3: Create .env File

Create `backend\.env` file with this content:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/chess_db
JWT_SECRET=your_secret_key_here_change_in_production
```

**Replace:**
- `YOUR_PASSWORD` with your actual PostgreSQL password
- `your_secret_key_here_change_in_production` with a random string (for security)

### Step 4: Test Connection

```bash
cd backend
npm install
npm run setup-db
```

You should see: ✅ Database connected successfully!

---

## Method 3: Using pgAdmin (GUI)

### Step 1: Open pgAdmin

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → Create → Database
4. Name: `chess_db`
5. Click Save

### Step 2: Run Schema

1. Right-click on `chess_db` → Query Tool
2. Open `backend\database\schema.sql` in a text editor
3. Copy all contents
4. Paste into Query Tool
5. Click Execute (F5)

### Step 3: Create .env File

Same as Method 2, Step 3.

---

## Verify Setup

Check if everything worked:

```bash
psql -U postgres -d chess_db
```

In PostgreSQL:
```sql
-- List all tables
\dt

-- Should show: users, games, moves

-- Check users table
\d users

-- Exit
\q
```

---

## Troubleshooting

### "psql: command not found"

**Solution:** Add PostgreSQL to PATH

1. Find PostgreSQL installation:
   - Usually: `C:\Program Files\PostgreSQL\14\bin` (version may differ)
   
2. Add to PATH:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System variables", find "Path" → Edit
   - Click "New" → Add: `C:\Program Files\PostgreSQL\14\bin`
   - Click OK on all dialogs
   - **Restart Command Prompt/PowerShell**

3. Or use full path:
   ```bash
   "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres
   ```

### "password authentication failed"

- Check your PostgreSQL password
- Default user is `postgres`
- If forgotten, reset via pgAdmin or reinstall PostgreSQL

### "database already exists"

- That's fine! Continue to Step 2
- Or drop and recreate:
  ```sql
  DROP DATABASE chess_db;
  CREATE DATABASE chess_db;
  ```

### "permission denied"

- Make sure you're using `postgres` superuser
- Or create a user:
  ```sql
  CREATE USER chess_user WITH PASSWORD 'your_password';
  GRANT ALL PRIVILEGES ON DATABASE chess_db TO chess_user;
  ```

---

## Next Steps

Once database is set up:

1. ✅ Database created
2. ✅ Tables created
3. ✅ .env file configured
4. ✅ Connection tested

**Start the application:**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit: http://localhost:3000

---

## Quick Reference

**Database Name:** `chess_db`  
**Default User:** `postgres`  
**Port:** `5432`  
**Tables:** `users`, `games`, `moves`

**Connection String Format:**
```
postgresql://postgres:password@localhost:5432/chess_db
```
