-- Multiplayer Chess Platform Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 1200,
    stats JSONB DEFAULT '{"wins":0,"losses":0,"draws":0}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_white_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    player_black_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('blitz', 'bullet', 'friend')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP
);

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
    move_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(game_id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    move_notation VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    board_state JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_player_white ON games(player_white_id);
CREATE INDEX IF NOT EXISTS idx_games_player_black ON games(player_black_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_player_id ON moves(player_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);
