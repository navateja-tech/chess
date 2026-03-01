import { enqueuePlayer, createFriendRoom, joinFriendRoom } from "./services/matchmaking.js";
import { createGameRecord, initGame, handleMove, getGame, getCurrentTimers, endGame } from "./services/gameService.js";
import { query } from "./db.js";

// Track disconnect timers per socket so we can cancel on reconnect
const disconnectTimers = new Map(); // socketId -> timeoutHandle

export function initSocket(io) {
    io.on("connection", (socket) => {
        // Client should immediately send its userId after connecting
        socket.on("auth:init", ({ userId }) => {
            console.log(`[Socket] User ${userId} initialized socket ${socket.id}`);
            socket.data.userId = userId;

            // If this user was previously disconnected mid-game, cancel the abandon timer
            if (disconnectTimers.has(userId)) {
                clearTimeout(disconnectTimers.get(userId));
                disconnectTimers.delete(userId);
                console.log(`[Socket] User ${userId} reconnected; abandon timer cancelled`);
            }
        });

        // Automatic matchmaking for blitz/bullet
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
                const game = getGame(gameId);
                const currentTimers = getCurrentTimers(gameId) || game.timers;
                const gameState = {
                    gameId, whiteId, blackId, type,
                    fen: game.chess.fen(),
                    timers: currentTimers
                };
                io.to([socket.id, opponentSocketId]).emit("matchmaking:matched", gameState);
            } else {
                socket.emit("matchmaking:queued", { type });
            }
        });

        // Friend rooms
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
            const game = getGame(gameId);
            const currentTimers = getCurrentTimers(gameId) || game.timers;
            const gameState = {
                gameId,
                hostId: room.hostId, guestId: room.guestId,
                whiteId: room.hostId, blackId: room.guestId,
                fen: game.chess.fen(),
                timers: currentTimers
            };
            io.to(gameId).emit("friend:ready", gameState);
        });

        socket.on("spectate:join", ({ gameId }) => {
            console.log(`[Socket] Socket ${socket.id} joining game ${gameId} as spectator`);
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
                    moves: game.moves || []
                });
            } else {
                // Game not in memory — possibly finished, just ack with no state
                console.log(`[Socket] Game ${gameId} not in memory (finished or unknown)`);
            }
        });

        // Handle moves
        socket.on("game:move", ({ gameId, move }) => {
            const userId = socket.data.userId;
            if (!userId) {
                socket.emit("game:error", { message: "Not authenticated" });
                return;
            }
            const result = handleMove({ gameId, playerId: userId, move, io });
            if (result && result.error) {
                socket.emit("game:error", { message: result.error });
            }
        });

        // ── Disconnect handling ──────────────────────────────────────────────────
        // When a player disconnects from an active game, give them 30 s to
        // reconnect.  If they don't come back, end the game and award the win to
        // their opponent.  Spectators are ignored.
        socket.on("disconnect", () => {
            const userId = socket.data.userId;
            if (!userId) return;

            // Find any active game this user is part of
            let activeGameId = null;
            let winnerId = null;

            // We iterate socket rooms to find which game room this socket was in
            for (const room of socket.rooms) {
                if (room === socket.id) continue; // skip the socket's own room
                const game = getGame(room);
                if (!game || game.status !== "active") continue;
                // Confirm this user is actually a player (not a spectator)
                if (game.playerWhiteId !== userId && game.playerBlackId !== userId) continue;
                activeGameId = room;
                winnerId = game.playerWhiteId === userId
                    ? game.playerBlackId   // opponent wins if this user disconnected
                    : game.playerWhiteId;
                break;
            }

            if (!activeGameId) return;

            console.log(`[Socket] Player ${userId} disconnected from game ${activeGameId}. 30 s abandon timer started.`);

            // Notify the remaining player
            io.to(activeGameId).emit("game:opponent_disconnected", {
                gameId: activeGameId,
                message: "Opponent disconnected. Game will end in 30 seconds if they don't return."
            });

            const handle = setTimeout(async () => {
                disconnectTimers.delete(userId);
                const game = getGame(activeGameId);
                // Only abandon if still active (player might have reconnected and finished naturally)
                if (game && game.status === "active") {
                    console.log(`[Socket] Abandoning game ${activeGameId} — ${userId} did not reconnect`);
                    await endGame(activeGameId, "abandoned", io, winnerId);
                }
            }, 30_000);

            disconnectTimers.set(userId, handle);
        });
    });
}
