# Manual Database Setup (pgAdmin Method)

Since PostgreSQL command line tools aren't in your PATH, use pgAdmin (GUI) instead.

## Step 1: Open pgAdmin

1. Press `Win` key and search for "pgAdmin"
2. Open pgAdmin 4
3. Enter your PostgreSQL password when prompted (the one you set during installation)

## Step 2: Create Database

1. In the left sidebar, expand **Servers** → **PostgreSQL [version]**
2. Right-click on **Databases**
3. Click **Create** → **Database...**
4. In the **General** tab:
   - **Database name:** `chess_db`
5. Click **Save**

## Step 3: Run Schema

1. In the left sidebar, expand **chess_db**
2. Right-click on **chess_db** → **Query Tool**
3. Open `backend\database\schema.sql` in a text editor (Notepad, VS Code, etc.)
4. **Copy ALL contents** from the file
5. **Paste** into the Query Tool window
6. Click the **Execute** button (or press `F5`)
7. You should see: "Query returned successfully"

## Step 4: Verify Tables Were Created

1. In pgAdmin left sidebar, expand **chess_db** → **Schemas** → **public** → **Tables**
2. You should see three tables:
   - `moves`
   - `games`
   - `users`

## Step 5: Create .env File

1. Go to `backend` folder
2. Copy `.env.template` and rename it to `.env`
3. Open `.env` in a text editor
4. Replace `YOUR_PASSWORD_HERE` with your PostgreSQL password
5. Save the file

Example `.env` content:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/chess_db
JWT_SECRET=dev_secret_change_in_production
```

## Step 6: Test Connection

Open Command Prompt or PowerShell:

```bash
cd C:\Users\zenit\zenith\iomp\p2\backend
npm install
npm run setup-db
```

You should see: ✅ Database connected successfully!

---

## Alternative: Add PostgreSQL to PATH

If you want to use command line tools:

### Find PostgreSQL Installation

1. Open File Explorer
2. Go to `C:\Program Files\PostgreSQL`
3. Look for folders like `14`, `15`, or `16`
4. Note the version number

### Add to PATH

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → **Environment Variables**
3. Under **System variables**, find **Path** → Click **Edit**
4. Click **New**
5. Add: `C:\Program Files\PostgreSQL\[VERSION]\bin`
   - Replace `[VERSION]` with your version (e.g., `15`)
6. Click **OK** on all dialogs
7. **Close and reopen** Command Prompt/PowerShell

### Test

```bash
psql --version
```

If it shows a version number, you're good to go!

---

## Troubleshooting

### "pgAdmin not found"
- PostgreSQL might not be fully installed
- Reinstall PostgreSQL from: https://www.postgresql.org/download/windows/
- Make sure to install "pgAdmin" component

### "Connection refused" or "Cannot connect"
- Check if PostgreSQL service is running:
  1. Press `Win + R`, type `services.msc`
  2. Find "postgresql-x64-[version]"
  3. Right-click → Start (if stopped)

### "Password authentication failed"
- Use the password you set during PostgreSQL installation
- Default user is `postgres`

---

## Quick Reference

**Database Name:** `chess_db`  
**User:** `postgres`  
**Port:** `5432` (default)  
**Tables:** `users`, `games`, `moves`
