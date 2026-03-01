import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";

// In-memory game state for active games (board, timers, etc.)
const games = new Map(); // gameId -> { chess, playerWhiteId, playerBlackId, type, timers, turn, sockets }

// Proactive timeout: each game has a pending setTimeout that fires when the active clock hits 0
const timeoutTimers = new Map(); // gameId -> setTimeout handle

export function createGameRecord({ gameId, playerWhiteId, playerBlackId, type }) {
  const now = new Date().toISOString();
  query(
    `INSERT INTO games (game_id, player_white_id, player_black_id, game_type, status, start_time)
     VALUES ($1, $2, $3, $4, 'active', $5)`,
    [gameId, playerWhiteId, playerBlackId, type, now]
  );
}

export function initGame({ gameId, playerWhiteId, playerBlackId, type, whiteSocketId, blackSocketId }) {
  const chess = new Chess();

  // Unlimited games have no clock; checkrace uses 5 min like blitz
  let timers;
  if (type === "unlimited") {
    timers = { whiteMs: null, blackMs: null, lastUpdate: Date.now() };
  } else {
    const baseMinutes = type === "bullet" ? 1 : 5; // blitz, checkrace both 5 min
    timers = {
      whiteMs: baseMinutes * 60 * 1000,
      blackMs: baseMinutes * 60 * 1000,
      lastUpdate: Date.now()
    };
  }

  const gameData = {
    chess,
    playerWhiteId,
    playerBlackId,
    type,
    timers,
    startTime: Date.now(),
    sockets: { whiteSocketId, blackSocketId },
    status: "active",
    moves: []
  };

  // Check Race mode: track how many checks each colour has delivered
  if (type === "checkrace") {
    gameData.checkCounts = { w: 0, b: 0 };
  }

  games.set(gameId, gameData);
}

export function getGame(gameId) {
  return games.get(gameId);
}

// Get current timer values accounting for elapsed time
export function getCurrentTimers(gameId) {
  const game = games.get(gameId);
  if (!game || game.status !== "active") {
    return null;
  }

  const { timers, chess, type } = game;

  // Unlimited games have no timers
  if (type === "unlimited" || timers.whiteMs === null) {
    return { whiteMs: null, blackMs: null, lastUpdate: Date.now() };
  }

  const now = Date.now();
  const elapsed = now - timers.lastUpdate;
  const turnColor = chess.turn(); // 'w' or 'b'

  let whiteMs = timers.whiteMs;
  let blackMs = timers.blackMs;

  if (turnColor === "w") {
    whiteMs = Math.max(0, whiteMs - elapsed);
  } else {
    blackMs = Math.max(0, blackMs - elapsed);
  }

  return { whiteMs, blackMs, lastUpdate: now };
}

/**
 * FIDE-style insufficient material check.
 * Returns true if the given colour has enough pieces to theoretically checkmate.
 * Insufficient: lone K, K+B, K+N.  Everything else (K+2N, K+B+N, K+R, K+Q, any pawn) is sufficient.
 */
function hasSufficientMaterial(chess, color) {
  const board = chess.board();
  const pieces = [];
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.color === color && cell.type !== 'k') {
        pieces.push(cell.type);
      }
    }
  }
  if (pieces.length === 0) return false;                    // lone king
  if (pieces.length === 1 && (pieces[0] === 'b' || pieces[0] === 'n')) return false; // K+B or K+N
  return true; // everything else is sufficient
}

/**
 * Schedule (or reschedule) a server-side timeout that fires when the active
 * player's clock reaches zero.  When it fires, the game ends instantly with
 * FIDE‑style material evaluation.
 */
export function scheduleTimeoutTimer(gameId, io) {
  // Clear any existing timeout for this game
  if (timeoutTimers.has(gameId)) {
    clearTimeout(timeoutTimers.get(gameId));
    timeoutTimers.delete(gameId);
  }

  const game = games.get(gameId);
  if (!game || game.status !== "active") return;
  if (game.type === "unlimited" || game.timers.whiteMs === null) return;

  const { timers, chess } = game;
  const now = Date.now();
  const elapsed = now - timers.lastUpdate;
  const turnColor = chess.turn();
  const remainingMs = turnColor === "w"
    ? timers.whiteMs - elapsed
    : timers.blackMs - elapsed;

  // Clamp to at least 0 (fire immediately if already expired)
  const delayMs = Math.max(0, remainingMs);

  const handle = setTimeout(() => {
    timeoutTimers.delete(gameId);
    const g = games.get(gameId);
    if (!g || g.status !== "active") return;

    // Update timers to reflect the expiry
    const tc = g.chess.turn();
    if (tc === "w") g.timers.whiteMs = 0;
    else g.timers.blackMs = 0;
    g.timers.lastUpdate = Date.now();

    // FIDE rule: opponent wins only if they have sufficient material
    const opponentColor = tc === "w" ? "b" : "w";
    if (hasSufficientMaterial(g.chess, opponentColor)) {
      const winnerId = tc === "w" ? g.playerBlackId : g.playerWhiteId;
      endGame(gameId, "timeout", io, winnerId);
    } else {
      endGame(gameId, "timeout_draw", io, null);
    }
  }, delayMs);

  timeoutTimers.set(gameId, handle);
}

export function listActiveGame(gameId) {
  return games.get(gameId);
}

/**
 * Count pieces on the board. Returns { white: N, black: N }
 * Default full set = 15 (all non-king pieces: 8 pawns + 2 rooks + 2 knights + 2 bishops + 1 queen)
 */
function countPiecesLost(chess) {
  const board = chess.board();
  let whitePieces = 0;
  let blackPieces = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue; // skip empty and kings
      if (cell.color === 'w') whitePieces++;
      else blackPieces++;
    }
  }
  const maxNonKing = 15;
  return {
    whiteLost: maxNonKing - whitePieces,
    blackLost: maxNonKing - blackPieces
  };
}

/**
 * Calculate score delta using:
 * - Base: +100 for win, -60 for loss (-90 for resign), +10 for draw
 * - Time bonus: faster wins = more points (up to +50)
 * - Piece bonus: fewer pieces lost = more points (up to +30)
 * - Opponent rating: beating higher-rated opponent = more points
 * @param {string} reason  - game end reason, used to apply resign penalty
 */
function calculateScoreDelta({ outcome, timeTakenMs, opponentScore, myScore, piecesILost, reason }) {
  const maxGameMs = 10 * 60 * 1000; // 10 minutes ceiling

  if (outcome === "draw") {
    return { delta: 10, breakdown: { base: 10, time: 0, pieces: 0, rating: 0 } };
  }

  if (outcome === "win") {
    const base = 100;
    const timeRatio = Math.min(timeTakenMs / maxGameMs, 1);
    const timeBonus = Math.round((1 - timeRatio) * 50);
    const pieceBonus = Math.round(Math.max(0, (15 - piecesILost) / 15) * 30);
    const ratingDiff = opponentScore - myScore;
    const ratingBonus = Math.round(Math.min(Math.max(ratingDiff / 10, -20), 40));
    const delta = base + timeBonus + pieceBonus + ratingBonus;
    return { delta, breakdown: { base, time: timeBonus, pieces: pieceBonus, rating: ratingBonus } };
  }

  if (outcome === "loss") {
    // Resign carries an extra -30 penalty on top of the normal base loss
    const base = reason === "resign" ? -90 : -60;
    const ratingDiff = myScore - opponentScore;
    const ratingPenalty = Math.round(Math.min(Math.max(ratingDiff / 10, -20), 20));
    const delta = base - ratingPenalty;
    const breakdown = { base, time: 0, pieces: 0, rating: -ratingPenalty };
    if (reason === "resign") breakdown.resign = -30; // show explicit resign penalty
    return { delta, breakdown };
  }

  return { delta: 0, breakdown: {} };
}

export async function endGame(gameId, reason, io, winnerId = null) {
  const game = games.get(gameId);
  if (!game) return;
  game.status = "finished";
  games.set(gameId, game);

  // Clear any pending timeout timer for this game
  if (timeoutTimers.has(gameId)) {
    clearTimeout(timeoutTimers.get(gameId));
    timeoutTimers.delete(gameId);
  }

  const now = new Date().toISOString();
  const timeTakenMs = Date.now() - (game.startTime || Date.now());
  const isFriendGame = game.type === "friend"; // friend games don't affect rating

  // Determine winner/loser IDs
  const { playerWhiteId, playerBlackId, chess } = game;

  // Count pieces lost
  const { whiteLost, blackLost } = countPiecesLost(chess);

  // Fetch current scores for both players
  let whiteScore = 1200, blackScore = 1200;
  try {
    const wr = query("SELECT score, stats FROM users WHERE user_id = $1", [playerWhiteId]);
    const br = query("SELECT score, stats FROM users WHERE user_id = $1", [playerBlackId]);
    if (wr.rows[0]) whiteScore = wr.rows[0].score || 1200;
    if (br.rows[0]) blackScore = br.rows[0].score || 1200;

    // Parse stats
    let whiteStats = wr.rows[0]?.stats || { wins: 0, losses: 0, draws: 0 };
    let blackStats = br.rows[0]?.stats || { wins: 0, losses: 0, draws: 0 };
    if (typeof whiteStats === "string") whiteStats = JSON.parse(whiteStats);
    if (typeof blackStats === "string") blackStats = JSON.parse(blackStats);

    let whiteOutcome = "draw", blackOutcome = "draw";
    let effectiveWinnerId = winnerId;

    if (reason === "checkmate") {
      // Side to move after checkmate is the loser
      const loserColor = chess.turn();
      effectiveWinnerId = loserColor === "w" ? playerBlackId : playerWhiteId;
      if (effectiveWinnerId === playerWhiteId) {
        whiteOutcome = "win"; blackOutcome = "loss";
      } else {
        whiteOutcome = "loss"; blackOutcome = "win";
      }

    } else if (reason === "timeout") {
      // winnerId already set to the opponent of the timed-out player
      effectiveWinnerId = winnerId;
      if (effectiveWinnerId === playerWhiteId) {
        whiteOutcome = "win"; blackOutcome = "loss";
      } else {
        whiteOutcome = "loss"; blackOutcome = "win";
      }

    } else if (reason === "resign" || reason === "abandoned" || reason === "checkrace") {
      // winnerId = the opponent (who wins)
      effectiveWinnerId = winnerId;
      if (effectiveWinnerId === playerWhiteId) {
        whiteOutcome = "win"; blackOutcome = "loss";
      } else {
        whiteOutcome = "loss"; blackOutcome = "win";
      }

    } else if (reason === "timeout_draw" || reason === "stalemate" || reason === "draw") {
      // No winner — both get draw points
      effectiveWinnerId = null;
      whiteOutcome = "draw"; blackOutcome = "draw";
    }

    // Calculate deltas — pass the reason so resign penalty can be applied
    const { delta: whiteDelta, breakdown: whiteBreakdown } = calculateScoreDelta({
      outcome: whiteOutcome,
      timeTakenMs,
      opponentScore: blackScore,
      myScore: whiteScore,
      piecesILost: whiteLost,
      reason: whiteOutcome === "loss" ? reason : undefined
    });
    const { delta: blackDelta, breakdown: blackBreakdown } = calculateScoreDelta({
      outcome: blackOutcome,
      timeTakenMs,
      opponentScore: whiteScore,
      myScore: blackScore,
      piecesILost: blackLost,
      reason: blackOutcome === "loss" ? reason : undefined
    });

    const newWhiteScore = Math.max(0, whiteScore + whiteDelta);
    const newBlackScore = Math.max(0, blackScore + blackDelta);

    // ── Persist to DB ────────────────────────────────────────────────────────
    // Always record the game result and score deltas (for history display).
    // For friend games, do NOT update the user's actual rating or stats.
    query(
      "UPDATE games SET status = 'finished', end_time = $2, winner_id = $3, score_delta_white = $4, score_delta_black = $5 WHERE game_id = $1",
      [gameId, now, effectiveWinnerId || null, whiteDelta, blackDelta]
    );

    if (!isFriendGame) {
      // Ranked game — update rating and win/loss/draw counters
      if (whiteOutcome === "win") whiteStats.wins = (whiteStats.wins || 0) + 1;
      else if (whiteOutcome === "loss") whiteStats.losses = (whiteStats.losses || 0) + 1;
      else whiteStats.draws = (whiteStats.draws || 0) + 1;

      if (blackOutcome === "win") blackStats.wins = (blackStats.wins || 0) + 1;
      else if (blackOutcome === "loss") blackStats.losses = (blackStats.losses || 0) + 1;
      else blackStats.draws = (blackStats.draws || 0) + 1;

      query("UPDATE users SET score = $1, stats = $2 WHERE user_id = $3", [newWhiteScore, JSON.stringify(whiteStats), playerWhiteId]);
      query("UPDATE users SET score = $1, stats = $2 WHERE user_id = $3", [newBlackScore, JSON.stringify(blackStats), playerBlackId]);
      console.log(`[gameService] Ranked game ${gameId} ended — scores updated`);
    } else {
      console.log(`[gameService] Friend game ${gameId} ended — scores calculated but NOT saved`);
    }

    // ── Emit game:end ────────────────────────────────────────────────────────
    // For friend games newScore == oldScore (rating unchanged) but delta is
    // still shown so players can see their performance.
    io.to(gameId).emit("game:end", {
      gameId,
      reason,
      winnerId: effectiveWinnerId,
      isFriendGame,          // frontend uses this to show "Rating not affected"
      scores: {
        white: {
          playerId: playerWhiteId,
          outcome: whiteOutcome,
          oldScore: whiteScore,
          newScore: isFriendGame ? whiteScore : newWhiteScore,  // unchanged for friend
          delta: whiteDelta,
          piecesLost: whiteLost,
          breakdown: whiteBreakdown
        },
        black: {
          playerId: playerBlackId,
          outcome: blackOutcome,
          oldScore: blackScore,
          newScore: isFriendGame ? blackScore : newBlackScore,  // unchanged for friend
          delta: blackDelta,
          piecesLost: blackLost,
          breakdown: blackBreakdown
        }
      }
    });

  } catch (err) {
    console.error("[gameService] endGame error:", err);
    query(
      "UPDATE games SET status = 'finished', end_time = $2 WHERE game_id = $1",
      [gameId, now]
    );
    io.to(gameId).emit("game:end", { gameId, reason, winnerId });
  }
}

export function handleMove({ gameId, playerId, move, promotion, io }) {
  const game = games.get(gameId);
  if (!game || game.status !== "active") return { error: "Game not found" };

  const { chess, playerWhiteId, playerBlackId, timers } = game;
  const turnColor = chess.turn(); // 'w' or 'b'
  const isWhite = playerId === playerWhiteId;
  if ((turnColor === "w" && !isWhite) || (turnColor === "b" && isWhite)) {
    return { error: "Not your turn" };
  }

  // Update timers BEFORE move (skip for unlimited games)
  const now = Date.now();
  const isUnlimited = game.type === "unlimited" || timers.whiteMs === null;

  if (!isUnlimited) {
    const elapsed = now - timers.lastUpdate;
    if (turnColor === "w") {
      timers.whiteMs = Math.max(0, timers.whiteMs - elapsed);
    } else {
      timers.blackMs = Math.max(0, timers.blackMs - elapsed);
    }
    timers.lastUpdate = now;

    if (timers.whiteMs <= 0 || timers.blackMs <= 0) {
      // FIDE-style timeout rule:
      //   • Opponent has sufficient mating material → opponent wins
      //   • Opponent does NOT have sufficient material → draw
      const opponentColor = timers.whiteMs <= 0 ? 'b' : 'w';
      if (hasSufficientMaterial(chess, opponentColor)) {
        const timeoutWinnerId = timers.whiteMs <= 0 ? playerBlackId : playerWhiteId;
        endGame(gameId, "timeout", io, timeoutWinnerId);
      } else {
        endGame(gameId, "timeout_draw", io, null);
      }
      return { error: "Time out" };
    }
  } else {
    timers.lastUpdate = now;
  }

  // Parse move notation (format: "e2-e4" or "e2e4")
  let moveObj;
  if (move.includes('-')) {
    const [from, to] = move.split('-');
    moveObj = { from, to };
  } else if (move.length >= 4) {
    moveObj = { from: move.substring(0, 2), to: move.substring(2, 4) };
  } else {
    return { error: "Invalid move format" };
  }

  const result = chess.move({ ...moveObj, promotion: promotion || 'q' });
  if (!result) {
    return { error: "Illegal move" };
  }

  const fen = chess.fen();
  const notation = `${result.from}-${result.to}${result.promotion ? "=" + result.promotion : ""}`;
  const timestamp = new Date().toISOString();

  query(
    `INSERT INTO moves (move_id, game_id, player_id, move_notation, timestamp, board_state)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuidv4(), gameId, playerId, notation, timestamp, JSON.stringify({ fen })]
  );

  game.moves = game.moves || [];
  game.moves.push(notation);

  timers.lastUpdate = Date.now();
  const currentTimers = getCurrentTimers(gameId) || timers;

  // Build the emit payload
  const movePayload = {
    gameId,
    playerId,
    move: notation,
    fen,
    timers: { whiteMs: currentTimers.whiteMs, blackMs: currentTimers.blackMs }
  };

  // ── Check Race mode: count checks and end at 5 ──────────────────────────
  if (game.type === "checkrace" && game.checkCounts) {
    if (chess.inCheck()) {
      // The side that just moved delivered the check
      const checkerColor = isWhite ? 'w' : 'b';
      game.checkCounts[checkerColor] = (game.checkCounts[checkerColor] || 0) + 1;
    }
    // Attach check counts so the client can display them
    movePayload.checkCounts = { ...game.checkCounts };

    if (game.checkCounts.w >= 5 || game.checkCounts.b >= 5) {
      io.to(gameId).emit("game:move", movePayload);
      const crWinnerId = game.checkCounts.w >= 5 ? playerWhiteId : playerBlackId;
      endGame(gameId, "checkrace", io, crWinnerId);
      return { ok: true };
    }
  }

  io.to(gameId).emit("game:move", movePayload);

  if (chess.isGameOver()) {
    let reason = "ended";
    if (chess.isCheckmate()) reason = "checkmate";
    else if (chess.isStalemate()) reason = "stalemate";
    else if (chess.isDraw()) reason = "draw";
    endGame(gameId, reason, io);
  } else if (!isUnlimited) {
    // Reschedule the proactive timeout for the next player's clock
    scheduleTimeoutTimer(gameId, io);
  }

  return { ok: true };
}
