// Timer service to broadcast timer updates every second
import { getGame } from "./gameService.js";

export function startTimerBroadcast(io) {
  setInterval(() => {
    // Get all active games and broadcast timer updates
    // This is a simple implementation - in production, you'd want to track active games more efficiently
    // For now, we'll rely on move events to update timers
  }, 1000);
}

export function broadcastTimerUpdate(io, gameId) {
  const game = getGame(gameId);
  if (!game || game.status !== "active") return;

  const now = Date.now();
  const elapsed = now - game.timers.lastUpdate;
  const turnColor = game.chess.turn();

  // Update the timer for the current player
  if (turnColor === "w") {
    game.timers.whiteMs = Math.max(0, game.timers.whiteMs - elapsed);
  } else {
    game.timers.blackMs = Math.max(0, game.timers.blackMs - elapsed);
  }
  game.timers.lastUpdate = now;

  // Broadcast update
  io.to(gameId).emit("game:timer", {
    gameId,
    timers: { whiteMs: game.timers.whiteMs, blackMs: game.timers.blackMs }
  });

  // Check for timeout
  if (game.timers.whiteMs <= 0 || game.timers.blackMs <= 0) {
    import("./gameService.js").then(({ endGame, getGame: g }) => {
      const currentGame = g(gameId);
      if (!currentGame) return;
      const timeoutWinnerId = game.timers.whiteMs <= 0
        ? currentGame.playerBlackId
        : currentGame.playerWhiteId;
      endGame(gameId, "timeout", io, timeoutWinnerId);
    });
  }
}
