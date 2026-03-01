import express from "express";
import { query } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get game details including all moves
router.get("/:gameId", authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameResult = query(
      `SELECT g.game_id, g.player_white_id, g.player_black_id, g.game_type,
              g.status, g.start_time, g.end_time, g.winner_id,
              g.score_delta_white, g.score_delta_black,
              uw.username AS white_username, uw.score AS white_score,
              ub.username AS black_username, ub.score AS black_score
       FROM games g
       LEFT JOIN users uw ON uw.user_id = g.player_white_id
       LEFT JOIN users ub ON ub.user_id = g.player_black_id
       WHERE g.game_id = $1`,
      [gameId]
    );
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ message: "Game not found" });
    }
    const game = gameResult.rows[0];
    const movesResult = query(
      `SELECT move_id, player_id, move_notation, timestamp, board_state
       FROM moves WHERE game_id = $1 ORDER BY timestamp ASC`,
      [gameId]
    );
    res.json({ ...game, moves: movesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all moves for a game (for replay)
router.get("/:gameId/moves", authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const result = query(
      `SELECT move_id, player_id, move_notation, timestamp, board_state
       FROM moves WHERE game_id = $1 ORDER BY timestamp ASC`,
      [gameId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
