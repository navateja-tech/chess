import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";

const router = express.Router();

// Helper to create JWT
function createToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );
}

// Sign up
router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = query(
      "SELECT user_id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Username or email already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const result = query(
      `INSERT INTO users (user_id, name, username, email, password, score, stats)
       VALUES ($1, $2, $3, $4, $5, 1200, '{"wins":0,"losses":0,"draws":0}')
       RETURNING user_id, name, username, email, score, stats`,
      [userId, name, username, email, hashed]
    );

    const user = result.rows[0];
    const token = createToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Sign in
router.post("/signin", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const result = query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [identifier]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    delete user.password;
    const token = createToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


