# Database Setup Guide

This guide will help you set up the PostgreSQL database for the Multiplayer Chess Platform.

## Option 1: PostgreSQL (Recommended)

### Step 1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create the Database

Open a terminal/command prompt and run:

**Windows (using psql):**
```bash
# Navigate to PostgreSQL bin directory (usually C:\Program Files\PostgreSQL\14\bin)
# Or add it to your PATH
psql -U postgres
```

**macOS/Linux:**
```bash
sudo -u postgres psql
# Or if you have a user account:
psql -U postgres
```

Then in the PostgreSQL prompt:
```sql
CREATE DATABASE chess_db;
\q
```

### Step 3: Run the Schema

**Method 1: Using psql command line**
```bash
psql -U postgres -d chess_db -f backend/database/schema.sql
```

**Method 2: Using psql interactive**
```bash
psql -U postgres -d chess_db
```
Then copy and paste the contents of `backend/database/schema.sql`

**Method 3: Using pgAdmin (GUI)**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on `chess_db` → Query Tool
4. Open `backend/database/schema.sql` and execute it

### Step 4: Create a Database User (Optional but Recommended)

For better security, create a dedicated user:

```sql
psql -U postgres
```

```sql
CREATE USER chess_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE chess_db TO chess_user;
\c chess_db
GRANT ALL ON ALL TABLES IN SCHEMA public TO chess_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO chess_user;
\q
```

### Step 5: Configure Backend Connection

Create a `.env` file in the `backend` directory:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/chess_db
JWT_SECRET=your_secret_key_here_change_in_production
```

**If you created a dedicated user:**
```env
DATABASE_URL=postgresql://chess_user:your_secure_password@localhost:5432/chess_db
```

**Format:** `postgresql://username:password@host:port/database_name`

### Step 6: Verify Setup

Test the connection by running:

```bash
cd backend
npm install
node -e "import('./src/db.js').then(m => m.pool.query('SELECT NOW()').then(r => console.log('Connected!', r.rows[0])))"
```

---

## Option 2: MySQL (Alternative)

If you prefer MySQL, you'll need to modify the schema slightly.

### Step 1: Install MySQL

**Windows:** Download from https://dev.mysql.com/downloads/installer/
**macOS:** `brew install mysql`
**Linux:** `sudo apt install mysql-server`

### Step 2: Create Database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE chess_db;
USE chess_db;
```

### Step 3: Modified Schema for MySQL

Create `backend/database/schema_mysql.sql`:

```sql
-- Multiplayer Chess Platform Database Schema (MySQL)

CREATE TABLE IF NOT EXISTS users (
    user_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    score INT DEFAULT 1200,
    stats JSON DEFAULT ('{"wins":0,"losses":0,"draws":0}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    game_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_white_id CHAR(36),
    player_black_id CHAR(36),
    game_type ENUM('blitz', 'bullet', 'friend') NOT NULL,
    status ENUM('active', 'finished') DEFAULT 'active',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    FOREIGN KEY (player_white_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (player_black_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moves (
    move_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    game_id CHAR(36),
    player_id CHAR(36),
    move_notation VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    board_state JSON,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_games_player_white ON games(player_white_id);
CREATE INDEX idx_games_player_black ON games(player_black_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_player_id ON moves(player_id);
CREATE INDEX idx_moves_timestamp ON moves(timestamp);
```

### Step 4: Update Backend Connection

Install MySQL driver:
```bash
cd backend
npm install mysql2
```

Update `backend/src/db.js`:
```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const query = (text, params) => {
  return pool.execute(text, params);
};
```

Update `.env`:
```env
DATABASE_URL=mysql://username:password@localhost:3306/chess_db
```

---

## Option 3: Using Docker (Easiest)

### Quick PostgreSQL Setup with Docker

```bash
# Pull PostgreSQL image
docker pull postgres:14

# Run PostgreSQL container
docker run --name chess-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chess_db \
  -p 5432:5432 \
  -d postgres:14

# Run schema
docker exec -i chess-postgres psql -U postgres -d chess_db < backend/database/schema.sql
```

Then use in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess_db
```

---

## Troubleshooting

### Connection Refused
- Check if PostgreSQL is running: `pg_isready` or check services
- Verify port (default: 5432)
- Check firewall settings

### Authentication Failed
- Verify username/password in `.env`
- Check `pg_hba.conf` for authentication method
- Try connecting with `psql` first to test credentials

### UUID Extension Missing
- PostgreSQL should have `uuid-ossp` extension by default
- If needed: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### Permission Denied
- Ensure database user has proper permissions
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE chess_db TO your_user;`

---

## Quick Test Query

After setup, test with:

```sql
SELECT * FROM users;
SELECT * FROM games;
SELECT * FROM moves;
```

If tables are empty, that's normal - they'll populate as you use the app!
