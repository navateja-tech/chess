import express from "express";
import { query } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get current profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = query(
      "SELECT user_id, name, username, email, score, stats, created_at FROM users WHERE user_id = $1",
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile basic fields (name, username)
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, username } = req.body;
    const result = query(
      "UPDATE users SET name = $1, username = $2 WHERE user_id = $3 RETURNING user_id, name, username, email, score, stats, created_at",
      [name, username, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// History of games for current user - enriched with opponent, outcome, score
router.get("/me/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = query(
      `SELECT
         g.game_id,
         g.player_white_id,
         g.player_black_id,
         g.game_type,
         g.status,
         g.start_time,
         g.end_time,
         g.winner_id,
         g.score_delta_white,
         g.score_delta_black,
         uw.username AS white_username,
         uw.score    AS white_score,
         ub.username AS black_username,
         ub.score    AS black_score
       FROM games g
       LEFT JOIN users uw ON uw.user_id = g.player_white_id
       LEFT JOIN users ub ON ub.user_id = g.player_black_id
       WHERE g.player_white_id = $1 OR g.player_black_id = $1
       ORDER BY g.start_time DESC`,
      [userId]
    );

    // Enrich each row with outcome and opponent from the current user's perspective
    const enriched = result.rows.map(g => {
      const isWhite = g.player_white_id === userId;
      const opponentUsername = isWhite ? g.black_username : g.white_username;
      const opponentScore = isWhite ? g.black_score : g.white_score;
      const myDelta = isWhite ? g.score_delta_white : g.score_delta_black;

      let outcome = "ongoing";
      if (g.status === "finished" || g.status === "abandoned") {
        if (!g.winner_id) outcome = "draw";
        else if (g.winner_id === userId) outcome = "win";
        else outcome = "loss";
      }

      return {
        ...g,
        myColor: isWhite ? "white" : "black",
        opponentUsername,
        opponentScore,
        outcome,
        scoreDelta: myDelta ?? 0
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
