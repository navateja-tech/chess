import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "chess.db");

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables (SQLite equivalent of the PostgreSQL schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    score INTEGER DEFAULT 1200,
    stats TEXT DEFAULT '{"wins":0,"losses":0,"draws":0}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS games (
    game_id TEXT PRIMARY KEY,
    player_white_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    player_black_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    game_type TEXT NOT NULL CHECK (game_type IN ('blitz', 'bullet', 'friend', 'unlimited', 'checkrace')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
    start_time TEXT DEFAULT (datetime('now')),
    end_time TEXT,
    winner_id TEXT,
    score_delta_white INTEGER DEFAULT 0,
    score_delta_black INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS moves (
    move_id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(game_id) ON DELETE CASCADE,
    player_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    move_notation TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    board_state TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_games_player_white ON games(player_white_id);
  CREATE INDEX IF NOT EXISTS idx_games_player_black ON games(player_black_id);
  CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
  CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
  CREATE INDEX IF NOT EXISTS idx_moves_player_id ON moves(player_id);
  CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);
`);

// Migrations: safely add new columns if they don't exist
const existingCols = db.prepare("PRAGMA table_info(games)").all().map(c => c.name);
if (!existingCols.includes('winner_id')) {
  db.exec("ALTER TABLE games ADD COLUMN winner_id TEXT");
  console.log('[DB] Migration: added winner_id to games');
}
if (!existingCols.includes('score_delta_white')) {
  db.exec("ALTER TABLE games ADD COLUMN score_delta_white INTEGER DEFAULT 0");
  console.log('[DB] Migration: added score_delta_white to games');
}
if (!existingCols.includes('score_delta_black')) {
  db.exec("ALTER TABLE games ADD COLUMN score_delta_black INTEGER DEFAULT 0");
  console.log('[DB] Migration: added score_delta_black to games');
}

console.log("[DB] SQLite database initialized at", dbPath);

// Migration: expand game_type CHECK constraint to include 'unlimited' and 'checkrace'
// SQLite cannot ALTER CHECK constraints, so we recreate the table if needed.
try {
  // Try inserting and rolling back to test if the constraint already allows 'unlimited'
  const testStmt = db.prepare("INSERT INTO games (game_id, player_white_id, player_black_id, game_type) VALUES ('__test__', '__w__', '__b__', 'unlimited')");
  const deleteStmt = db.prepare("DELETE FROM games WHERE game_id = '__test__'");
  const transaction = db.transaction(() => {
    testStmt.run();
    deleteStmt.run();
  });
  transaction();
  console.log("[DB] game_type constraint already supports new types");
} catch (e) {
  // Constraint rejects 'unlimited' — recreate the table
  console.log("[DB] Migration: expanding game_type constraint...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS games_new (
      game_id TEXT PRIMARY KEY,
      player_white_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      player_black_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      game_type TEXT NOT NULL CHECK (game_type IN ('blitz', 'bullet', 'friend', 'unlimited', 'checkrace')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
      start_time TEXT DEFAULT (datetime('now')),
      end_time TEXT,
      winner_id TEXT,
      score_delta_white INTEGER DEFAULT 0,
      score_delta_black INTEGER DEFAULT 0
    );
    INSERT INTO games_new SELECT * FROM games;
    DROP TABLE games;
    ALTER TABLE games_new RENAME TO games;
    CREATE INDEX IF NOT EXISTS idx_games_player_white ON games(player_white_id);
    CREATE INDEX IF NOT EXISTS idx_games_player_black ON games(player_black_id);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
  `);
  console.log("[DB] Migration: game_type constraint expanded successfully");
}

/**
 * Compatibility wrapper: converts PostgreSQL-style queries to SQLite.
 * - Replaces $1, $2, ... with ?
 * - Returns { rows: [...] } to match pg's result format
 * - Handles SELECT, INSERT/UPDATE/DELETE with RETURNING, and plain writes
 */
export const query = (text, params) => {
  // Convert PostgreSQL-style $1, $2, etc. to SQLite ? placeholders
  // Handle cases where the same $N appears multiple times (e.g., WHERE a = $1 OR b = $1)
  const originalParams = params || [];
  const expandedValues = [];
  const sql = text.replace(/\$(\d+)/g, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1; // $1 -> index 0
    expandedValues.push(originalParams[idx]);
    return "?";
  });
  const values = expandedValues;

  const trimmed = sql.trim().toUpperCase();

  try {
    if (trimmed.startsWith("SELECT")) {
      const rows = db.prepare(sql).all(...values);
      // Parse JSON fields (stats, board_state)
      return { rows: rows.map(parseJsonFields) };
    } else if (trimmed.includes("RETURNING")) {
      const row = db.prepare(sql).get(...values);
      return { rows: row ? [parseJsonFields(row)] : [] };
    } else {
      const result = db.prepare(sql).run(...values);
      return { rows: [], rowCount: result.changes };
    }
  } catch (err) {
    console.error("[DB] Query error:", err.message);
    console.error("[DB] SQL:", sql);
    console.error("[DB] Params:", values);
    throw err;
  }
};

/**
 * Parse known JSON text fields back into objects (stats, board_state).
 * In PostgreSQL these were JSONB and came back as objects; in SQLite they're TEXT.
 */
function parseJsonFields(row) {
  if (!row) return row;
  const result = { ...row };
  for (const key of ["stats", "board_state"]) {
    if (typeof result[key] === "string") {
      try {
        result[key] = JSON.parse(result[key]);
      } catch {
        // leave as-is if not valid JSON
      }
    }
  }
  return result;
}

// Export db instance for advanced use if needed
export { db };
