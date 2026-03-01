import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import gameRouter from "./routes/games.js";
import { initSocket } from "./socket.js";
import { query } from "./db.js";

dotenv.config();

// ── Startup cleanup ──────────────────────────────────────────────────────────
// Any game that was still 'active' when the server last shut down (crash,
// restart, or both players disconnected) will never self-resolve.  Mark them
// all as 'finished' now so they show a proper state in history.
try {
  const stale = query(
    "UPDATE games SET status = 'finished', end_time = datetime('now') WHERE status = 'active'"
  );
  if (stale.rowCount > 0) {
    console.log(`[Startup] Closed ${stale.rowCount} stale active game(s)`);
  }
} catch (e) {
  console.warn("[Startup] Could not clean up stale games:", e.message);
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// REST routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/games", gameRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Socket.io
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


