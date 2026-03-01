import { enqueuePlayer, createFriendRoom, joinFriendRoom } from "./services/matchmaking.js";
import { createGameRecord, initGame, handleMove, getGame, getCurrentTimers, endGame, scheduleTimeoutTimer } from "./services/gameService.js";
import { query } from "./db.js";

// Helper: look up a username by user_id
function getUsername(userId) {
  try {
    const result = query("SELECT username FROM users WHERE user_id = $1", [userId]);
    return result.rows[0]?.username || 'Player';
  } catch { return 'Player'; }
}

// Track per-user abandon timers: userId -> timeoutHandle
const disconnectTimers = new Map();

export function initSocket(io) {
  io.on("connection", (socket) => {

    // ── Auth init ────────────────────────────────────────────────────────────
    socket.on("auth:init", ({ userId }) => {
      console.log(`[Socket] User ${userId} initialized socket ${socket.id}`);
      socket.data.userId = userId;

      // If this user was previously disconnected mid-game, cancel the abandon timer
      if (disconnectTimers.has(userId)) {
        const { abandon, tick } = disconnectTimers.get(userId);
        clearTimeout(abandon);
        clearInterval(tick);
        disconnectTimers.delete(userId);
        console.log(`[Socket] User ${userId} reconnected — abandon timer cancelled`);
        // Notify remaining player that the opponent came back
        // (we'll broadcast to any game room this socket may rejoin shortly)
        socket.data.reconnecting = true;
      }
    });

    // ── Matchmaking ──────────────────────────────────────────────────────────
    socket.on("matchmaking:join", ({ type }) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const result = enqueuePlayer(userId, type, socket.id);
      if (result.matched) {
        const { gameId, whiteId, blackId, opponentSocketId } = result;
        createGameRecord({ gameId, playerWhiteId: whiteId, playerBlackId: blackId, type });
        initGame({
          gameId,
          playerWhiteId: whiteId,
          playerBlackId: blackId,
          type,
          whiteSocketId: opponentSocketId,
          blackSocketId: socket.id
        });
        socket.join(gameId);
        io.sockets.sockets.get(opponentSocketId)?.join(gameId);
        // Start the proactive clock
        scheduleTimeoutTimer(gameId, io);
        const game = getGame(gameId);
        const currentTimers = getCurrentTimers(gameId) || game.timers;
        const gameState = {
          gameId, whiteId, blackId, type,
          fen: game.chess.fen(),
          timers: currentTimers,
          gameType: type,
          checkCounts: game.checkCounts || null,
          whiteName: getUsername(whiteId),
          blackName: getUsername(blackId)
        };
        io.to([socket.id, opponentSocketId]).emit("matchmaking:matched", gameState);
      } else {
        socket.emit("matchmaking:queued", { type });
      }
    });

    // ── Friend rooms ─────────────────────────────────────────────────────────
    socket.on("friend:create", () => {
      const userId = socket.data.userId;
      if (!userId) return;
      const gameId = createFriendRoom(userId, socket.id);
      socket.join(gameId);
      socket.emit("friend:created", { gameId });
    });

    socket.on("friend:join", ({ gameId }) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const room = joinFriendRoom(userId, gameId, socket.id);
      if (!room) {
        return socket.emit("friend:error", { message: "Invalid or full room" });
      }
      createGameRecord({
        gameId,
        playerWhiteId: room.hostId,
        playerBlackId: room.guestId,
        type: "friend"
      });
      initGame({
        gameId,
        playerWhiteId: room.hostId,
        playerBlackId: room.guestId,
        type: "friend",
        whiteSocketId: room.hostSocketId,
        blackSocketId: room.guestSocketId
      });
      socket.join(gameId);
      const hostSocket = io.sockets.sockets.get(room.hostSocketId);
      if (hostSocket) hostSocket.join(gameId);
      // Start the proactive clock (friend games use blitz timers)
      scheduleTimeoutTimer(gameId, io);
      const game = getGame(gameId);
      const currentTimers = getCurrentTimers(gameId) || game.timers;
      const gameState = {
        gameId,
        hostId: room.hostId, guestId: room.guestId,
        whiteId: room.hostId, blackId: room.guestId,
        fen: game.chess.fen(),
        timers: currentTimers,
        whiteName: getUsername(room.hostId),
        blackName: getUsername(room.guestId)
      };
      io.to(gameId).emit("friend:ready", gameState);
    });

    // ── Spectate ─────────────────────────────────────────────────────────────
    socket.on("spectate:join", ({ gameId }) => {
      socket.join(gameId);
      const game = getGame(gameId);
      if (game) {
        const currentTimers = getCurrentTimers(gameId) || game.timers;
        socket.emit("spectate:state", {
          gameId,
          fen: game.chess.fen(),
          timers: currentTimers,
          whiteId: game.playerWhiteId,
          blackId: game.playerBlackId,
          moves: game.moves || [],
          gameType: game.type,
          checkCounts: game.checkCounts || null,
          whiteName: getUsername(game.playerWhiteId),
          blackName: getUsername(game.playerBlackId)
        });
      }
    });

    // ── Move ─────────────────────────────────────────────────────────────────
    socket.on("game:move", ({ gameId, move, promotion }) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("game:error", { message: "Not authenticated" });
        return;
      }
      const result = handleMove({ gameId, playerId: userId, move, promotion, io });
      if (result && result.error) {
        socket.emit("game:error", { message: result.error });
      }
    });

    // ── Resign ────────────────────────────────────────────────────────────────
    // Player voluntarily exits the game. Opponent wins; resigner loses extra points.
    socket.on("game:resign", ({ gameId }) => {
      const userId = socket.data.userId;
      if (!userId) return;

      const game = getGame(gameId);
      if (!game || game.status !== "active") {
        socket.emit("game:error", { message: "No active game to resign from" });
        return;
      }
      // Confirm the user is actually a player in this game
      if (game.playerWhiteId !== userId && game.playerBlackId !== userId) {
        socket.emit("game:error", { message: "You are not a player in this game" });
        return;
      }

      const winnerId = game.playerWhiteId === userId
        ? game.playerBlackId   // white resigned → black wins
        : game.playerWhiteId;  // black resigned → white wins

      console.log(`[Socket] Player ${userId} resigned from game ${gameId}`);
      endGame(gameId, "resign", io, winnerId);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    // When a player drops, give them 30 s to reconnect before ending the game.
    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (!userId) return;

      // Find any active game this player was in
      let activeGameId = null;
      let winnerId = null;

      for (const room of socket.rooms) {
        if (room === socket.id) continue;
        const game = getGame(room);
        if (!game || game.status !== "active") continue;
        if (game.playerWhiteId !== userId && game.playerBlackId !== userId) continue;
        activeGameId = room;
        winnerId = game.playerWhiteId === userId ? game.playerBlackId : game.playerWhiteId;
        break;
      }

      if (!activeGameId) return;

      console.log(`[Socket] Player ${userId} disconnected from game ${activeGameId}. Abandon timer: 30 s`);

      const GRACE_SECONDS = 30;

      // Emit the initial disconnect notice + first countdown tick
      io.to(activeGameId).emit("game:opponent_disconnected", {
        gameId: activeGameId,
        secondsRemaining: GRACE_SECONDS
      });

      // Tick every second so the UI can show a live countdown
      let remaining = GRACE_SECONDS - 1;
      const tickInterval = setInterval(() => {
        remaining--;
        io.to(activeGameId).emit("game:opponent_countdown", {
          gameId: activeGameId,
          secondsRemaining: remaining
        });
        if (remaining <= 0) clearInterval(tickInterval);
      }, 1000);

      const handle = setTimeout(async () => {
        clearInterval(tickInterval);
        disconnectTimers.delete(userId);
        const game = getGame(activeGameId);
        if (game && game.status === "active") {
          console.log(`[Socket] Abandoning game ${activeGameId} after disconnect timeout`);
          await endGame(activeGameId, "abandoned", io, winnerId);
        }
      }, GRACE_SECONDS * 1000);

      // Store both handles so reconnect can cancel them
      disconnectTimers.set(userId, { abandon: handle, tick: tickInterval });
    });
  });
}
