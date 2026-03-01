# Multiplayer Online Chess Platform

A full-stack multiplayer chess platform with real-time gameplay, matchmaking, spectator mode, and game history replay.

## Features

- **User Authentication**: Sign up, sign in, profile management with password hashing
- **Matchmaking**: Automatic matching for Blitz/Bullet games or create/join friend rooms
- **Real-time Gameplay**: WebSocket-based moves, timers, and synchronization
- **Game History**: View all past games and replay moves with timestamps
- **Spectator Mode**: Watch live games by game ID
- **Score & Stats**: Track wins, losses, draws, and rating

## Tech Stack

- **Frontend**: React + Vite + React Router + Socket.io Client + Chess.js
- **Backend**: Node.js + Express + Socket.io + PostgreSQL
- **Database**: PostgreSQL (with MySQL compatibility)

## Project Structure

```
p2/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express server + Socket.io
│   │   ├── db.js              # Database connection
│   │   ├── routes/
│   │   │   ├── auth.js        # Sign up / Sign in
│   │   │   ├── users.js       # Profile & history
│   │   │   └── games.js       # Game details & moves
│   │   ├── services/
│   │   │   ├── matchmaking.js # Queue management
│   │   │   └── gameService.js # Chess logic & move handling
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication
│   │   └── socket.js          # Socket.io event handlers
│   ├── database/
│   │   └── schema.sql         # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # All page components
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # Auth context
│   │   └── App.jsx           # Router setup
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- PostgreSQL (or MySQL with schema adjustments)
- npm or yarn

### 1. Database Setup

**📖 See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.**

Quick setup:

```bash
# Create database
createdb chess_db

# Run schema
psql chess_db < backend/database/schema.sql
```

Or use the setup script (after configuring `.env`):

```bash
cd backend
npm run setup-db:create
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/chess_db
JWT_SECRET=your_secret_key_here_change_in_production
```

Start the backend:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Run Both (from root)

```bash
npm install:all
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

### 5. Run on Other Devices (Local Network / LAN)

To play the game on other devices (like your phone or another laptop) connected to the same Wi-Fi network:

1. **Find your computer's local IP address:**
   - On Windows: Open Command Prompt and type `ipconfig` (look for "IPv4 Address", e.g., `192.168.1.5`).
   - On Mac/Linux: Open Terminal and type `ifconfig` or `ip a` (look for `inet` under `en0` or `wlan0`).

2. **Update the backend URL in the frontend:**
   By default, the frontend connects to `http://localhost:5000`. You need to change this to your local IP so other devices can reach the backend.
   Open `frontend/.env` (create it if it doesn't exist) or update where the socket connection is made (usually `frontend/src/socket.js` or similar) to point to your IP:
   ```env
   VITE_BACKEND_URL=http://YOUR_LOCAL_IP:5000
   ```
   *(Replace YOUR_LOCAL_IP with your actual IP, e.g., `http://192.168.1.5:5000`)*

3. **Start the backend on all interfaces:**
   By default, the backend might only listen on localhost. Ensure your `server.js` or backend configuration is set to listen on `0.0.0.0` or doesn't explicitly restrict to localhost.
   
4. **Start the frontend and expose it to the network:**
   You must run the Vite frontend with the `--host` flag to make it accessible to other devices.
   ```bash
   cd frontend
   npm run dev -- --host
   ```
   Vite will output a **Network URL** (e.g., `http://192.168.1.5:3000/`).

5. **Play!**
   Open the **Network URL** on any device connected to your Wi-Fi network to play!

## Usage

1. **Sign Up**: Create a new account
2. **Sign In**: Login with username/email and password
3. **Play Online**: Choose Blitz (5 min) or Bullet (1 min) to match with opponents
4. **Play With Friends**: Create a room and share the Game ID, or join an existing room
5. **Spectate**: Enter a Game ID to watch a live game
6. **History**: View past games and replay moves
7. **Profile**: View and update your profile and stats

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Login

### Users
- `GET /api/users/me` - Get current profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/me/history` - Get game history

### Games
- `GET /api/games/:gameId` - Get game details with moves
- `GET /api/games/:gameId/moves` - Get all moves for a game

## Socket.io Events

### Client → Server
- `auth:init` - Initialize with userId
- `matchmaking:join` - Join queue (type: 'blitz' | 'bullet')
- `friend:create` - Create friend room
- `friend:join` - Join friend room (gameId)
- `spectate:join` - Join as spectator (gameId)
- `game:move` - Make a move (gameId, move)

### Server → Client
- `matchmaking:matched` - Match found (gameId, whiteId, blackId)
- `matchmaking:queued` - Waiting in queue
- `friend:created` - Room created (gameId)
- `friend:ready` - Game ready (gameId, hostId, guestId)
- `spectate:state` - Initial game state (fen, timers)
- `game:move` - Move update (move, fen, timers)
- `game:end` - Game ended (reason)

## Database Schema

### Users
- `user_id` (UUID)
- `name`, `username`, `email`, `password` (hashed)
- `score` (INT), `stats` (JSONB)

### Games
- `game_id` (UUID)
- `player_white_id`, `player_black_id` (UUID → Users)
- `game_type` ('blitz' | 'bullet' | 'friend')
- `status` ('active' | 'finished')
- `start_time`, `end_time`

### Moves
- `move_id` (UUID)
- `game_id` (UUID → Games)
- `player_id` (UUID → Users)
- `move_notation` (VARCHAR)
- `timestamp`
- `board_state` (JSONB, optional)

## Notes

- Timers are managed server-side for fairness
- All moves are stored in the database for replay
- Spectators receive real-time updates via Socket.io rooms
- Game state uses chess.js for move validation
- JWT tokens are used for authentication

## Development

- Backend uses ES modules (`type: "module"`)
- Frontend uses Vite for fast development
- Socket.io enables real-time communication
- Chess.js handles chess rules and validation

## Database Options

See [DATABASE_COMPARISON.md](./DATABASE_COMPARISON.md) for detailed comparison of PostgreSQL, MySQL, Firebase, and MongoDB.

**Recommendation:** Use **PostgreSQL on Supabase** (free tier available) - see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## License

MIT
