import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { io } from 'socket.io-client'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import './Game.css'

export default function Game() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [socket, setSocket] = useState(null)
  const [chess, setChess] = useState(new Chess())
  const [fen, setFen] = useState('start')
  const [whiteTimer, setWhiteTimer] = useState(0)
  const [blackTimer, setBlackTimer] = useState(0)
  const [moves, setMoves] = useState([])
  const [gameStatus, setGameStatus] = useState('')
  const [isPlayer, setIsPlayer] = useState(false)
  const [playerColor, setPlayerColor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gameOverData, setGameOverData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [resignConfirm, setResignConfirm] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [optionSquares, setOptionSquares] = useState({})
  const [lastMoveSquares, setLastMoveSquares] = useState({})        // last move from/to highlight
  const [promotionSquare, setPromotionSquare] = useState(null)      // pending pawn promotion target
  const [disconnectCountdown, setDisconnectCountdown] = useState(null) // seconds remaining
  const [checkCounts, setCheckCounts] = useState({ w: 0, b: 0 })     // check race counters
  const [gameType, setGameType] = useState(null)                      // track game type
  const [whiteName, setWhiteName] = useState('White')                 // player names
  const [blackName, setBlackName] = useState('Black')
  const timerInterval = useRef(null)
  const chessRef = useRef(new Chess())
  const lastConfirmedFenRef = useRef('start')

  const copyGameId = useCallback(() => {
    navigator.clipboard.writeText(gameId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [gameId])

  useEffect(() => {
    if (user && token) {
      setLoading(true)
      const newSocket = io(import.meta.env.VITE_BACKEND_URL)
      newSocket.emit('auth:init', { userId: user.user_id })
      newSocket.emit('spectate:join', { gameId })

      newSocket.on('spectate:state', ({ fen, timers, whiteId, blackId, moves, gameType: gt, checkCounts: cc, whiteName: wn, blackName: bn }) => {
        const game = new Chess()
        const currentFen = fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        if (fen && fen !== 'start') {
          game.load(fen)
        }
        chessRef.current = game
        setChess(game)
        setFen(currentFen)
        lastConfirmedFenRef.current = currentFen
        if (moves) setMoves(moves)

        if (user && user.user_id) {
          const userIdStr = String(user.user_id).toLowerCase()
          const whiteIdStr = String(whiteId).toLowerCase()
          const blackIdStr = String(blackId).toLowerCase()
          if (userIdStr === whiteIdStr) {
            setIsPlayer(true)
            setPlayerColor('w')
          } else if (userIdStr === blackIdStr) {
            setIsPlayer(true)
            setPlayerColor('b')
          }
        }

        if (timers) {
          setWhiteTimer(timers.whiteMs || 0)
          setBlackTimer(timers.blackMs || 0)
        }
        if (gt) setGameType(gt)
        if (cc) setCheckCounts(cc)
        if (wn) setWhiteName(wn)
        if (bn) setBlackName(bn)
        setLoading(false)
      })

      newSocket.on('matchmaking:matched', ({ whiteId, blackId, fen, timers, gameType: gt, checkCounts: cc, whiteName: wn, blackName: bn }) => {
        setIsPlayer(true)
        setLoading(false)
        const userIdStr = String(user.user_id).toLowerCase()
        if (userIdStr === String(whiteId).toLowerCase()) {
          setPlayerColor('w')
          showToast('Game started! You are playing as White', 'success')
        } else if (userIdStr === String(blackId).toLowerCase()) {
          setPlayerColor('b')
          showToast('Game started! You are playing as Black', 'success')
        }
        if (fen) {
          const game = new Chess()
          game.load(fen)
          chessRef.current = game
          setChess(game)
          setFen(fen)
        }
        if (timers) {
          setWhiteTimer(timers.whiteMs || 0)
          setBlackTimer(timers.blackMs || 0)
        }
        if (gt) setGameType(gt)
        if (cc) setCheckCounts(cc)
        if (wn) setWhiteName(wn)
        if (bn) setBlackName(bn)
      })

      newSocket.on('friend:ready', ({ hostId, guestId, whiteId, blackId, fen, timers, whiteName: wn, blackName: bn }) => {
        setIsPlayer(true)
        setLoading(false)
        const userIdStr = String(user.user_id).toLowerCase()
        if (userIdStr === String(hostId).toLowerCase() || userIdStr === String(whiteId).toLowerCase()) {
          setPlayerColor('w')
          showToast('Game started! You are playing as White', 'success')
        } else if (userIdStr === String(guestId).toLowerCase() || userIdStr === String(blackId).toLowerCase()) {
          setPlayerColor('b')
          showToast('Game started! You are playing as Black', 'success')
        }
        if (fen) {
          const game = new Chess()
          game.load(fen)
          chessRef.current = game
          setChess(game)
          setFen(fen)
        }
        if (timers) {
          setWhiteTimer(timers.whiteMs || 0)
          setBlackTimer(timers.blackMs || 0)
        }
        if (wn) setWhiteName(wn)
        if (bn) setBlackName(bn)
      })

      newSocket.on('game:move', ({ move, fen, timers, checkCounts: cc }) => {
        const game = new Chess()
        if (fen) {
          game.load(fen)
        } else {
          game.load(chessRef.current?.fen() || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        }
        chessRef.current = game
        setChess(game)
        const finalFen = game.fen()
        setFen(finalFen)
        lastConfirmedFenRef.current = finalFen
        if (timers) {
          setWhiteTimer(timers.whiteMs)
          setBlackTimer(timers.blackMs)
        }
        if (cc) setCheckCounts(cc)
        setMoves(prev => [...prev, move])
      })

      newSocket.on('game:timer', ({ timers }) => {
        if (timers) {
          setWhiteTimer(timers.whiteMs)
          setBlackTimer(timers.blackMs)
        }
      })

      newSocket.on('game:end', ({ reason, winnerId, scores, isFriendGame }) => {
        if (timerInterval.current) clearInterval(timerInterval.current)

        const reasonLabel =
          reason === 'checkmate' ? 'Checkmate' :
            reason === 'stalemate' ? 'Stalemate' :
              reason === 'timeout' ? 'Time Out – Win' :
                reason === 'timeout_draw' ? 'Time Out – Draw' :
                  reason === 'draw' ? 'Draw' :
                    reason === 'resign' ? 'Resignation' :
                      reason === 'abandoned' ? 'Opponent Left' :
                        reason === 'checkrace' ? 'Check Race – 5 Checks!' : 'Game Over'

        setGameStatus(reasonLabel)

        // Build game over display data for the current user
        if (user && scores) {
          // Coerce both sides to String — DB may send integer IDs
          const myId = String(user.user_id)
          const isWhite = String(scores.white?.playerId) === myId
          const myData = isWhite ? scores.white : scores.black
          const oppData = isWhite ? scores.black : scores.white

          setGameOverData({
            reason: reasonLabel,
            outcome: myData?.outcome ?? 'draw',
            oldScore: myData?.oldScore,
            newScore: myData?.newScore,
            delta: myData?.delta,
            piecesLost: myData?.piecesLost,
            breakdown: myData?.breakdown,
            opponentScore: oppData?.oldScore,
            opponentDelta: oppData?.delta,
            winnerId,
            isFriendGame: !!isFriendGame
          })
        } else {
          // Spectator or no scores info
          setGameOverData({
            reason: reasonLabel,
            outcome: 'draw',
            winnerId
          })
        }
      })

      newSocket.on('game:opponent_disconnected', ({ secondsRemaining }) => {
        setDisconnectCountdown(secondsRemaining ?? 30)
      })

      newSocket.on('game:opponent_countdown', ({ secondsRemaining }) => {
        setDisconnectCountdown(secondsRemaining)
        if (secondsRemaining <= 0) setDisconnectCountdown(null)
      })

      newSocket.on('game:error', ({ message }) => {
        const game = new Chess()
        const lastFen = lastConfirmedFenRef.current === 'start'
          ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          : lastConfirmedFenRef.current
        game.load(lastFen)
        chessRef.current = game
        setChess(game)
        setFen(game.fen())
        showToast(message || 'Move failed', 'error')
      })

      timerInterval.current = setInterval(() => {
        const currentChess = chessRef.current
        if (currentChess && gameType !== 'unlimited') {
          const turn = currentChess.turn()
          if (turn === 'w') {
            setWhiteTimer(prev => Math.max(0, prev - 1000))
          } else {
            setBlackTimer(prev => Math.max(0, prev - 1000))
          }
        }
      }, 1000)

      setSocket(newSocket)
      return () => {
        newSocket.close()
        if (timerInterval.current) clearInterval(timerInterval.current)
      }
    }
  }, [gameId, user, token])

  const onDrop = (sourceSquare, targetSquare, promotionPiece = 'q') => {
    if (!isPlayer || !socket || playerColor === null) return false
    const currentChess = chessRef.current
    if (!currentChess) return false
    const currentTurn = currentChess.turn()
    if (currentTurn !== playerColor) {
      showToast('Not your turn!', 'warning')
      return false
    }
    try {
      const testChess = new Chess(currentChess.fen())
      const move = testChess.move({ from: sourceSquare, to: targetSquare, promotion: promotionPiece })
      if (move) {
        const newFen = testChess.fen()
        chessRef.current = testChess
        setChess(testChess)
        setFen(newFen)
        // Highlight last move
        setLastMoveSquares({
          [sourceSquare]: { background: 'rgba(255, 170, 0, 0.35)' },
          [targetSquare]: { background: 'rgba(255, 170, 0, 0.5)' }
        })
        socket.emit('game:move', { gameId, move: `${sourceSquare}-${targetSquare}`, promotion: promotionPiece })
        return true
      } else {
        showToast('Invalid move', 'error')
        return false
      }
    } catch (e) {
      showToast('Invalid move', 'error')
      return false
    }
  }

  const formatTime = (ms) => {
    if (ms === null || ms === undefined || gameType === 'unlimited') return '∞'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isCheckrace = gameType === 'checkrace'

  // ── Captured pieces computation ────────────────────────────────────────
  const STARTING_PIECES = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 }
  const PIECE_SYMBOLS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  }
  const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 }

  const getCapturedPieces = () => {
    const currentChess = chessRef.current
    if (!currentChess) return { w: [], b: [] }

    // Count pieces currently on the board
    const board = currentChess.board()
    const onBoard = { w: {}, b: {} }
    for (const row of board) {
      for (const cell of row) {
        if (cell) {
          onBoard[cell.color][cell.type] = (onBoard[cell.color][cell.type] || 0) + 1
        }
      }
    }

    // Captured = starting count - on board count
    const captured = { w: [], b: [] }
    for (const color of ['w', 'b']) {
      for (const [piece, startCount] of Object.entries(STARTING_PIECES)) {
        const remaining = onBoard[color][piece] || 0
        const lost = startCount - remaining
        for (let i = 0; i < lost; i++) {
          captured[color].push({ type: piece, symbol: PIECE_SYMBOLS[color][piece], value: PIECE_VALUES[piece] })
        }
      }
      // Sort by value descending (queen first, pawns last)
      captured[color].sort((a, b) => b.value - a.value)
    }
    return captured
  }

  const capturedPieces = getCapturedPieces()
  // White captured = pieces white lost = captured by black (shown on black's side)
  // materialDiff: positive means white has more material
  const whiteMaterial = capturedPieces.b.reduce((s, p) => s + p.value, 0)
  const blackMaterial = capturedPieces.w.reduce((s, p) => s + p.value, 0)
  const materialDiff = whiteMaterial - blackMaterial // pieces black lost vs pieces white lost

  const currentPosition = fen === 'start' || !fen
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : fen

  const boardOrientation = playerColor === 'b' ? 'black' : 'white'

  // ── Click-to-move helpers ────────────────────────────────────────────────
  /**
   * canInteract: true only when it's this player's turn and the game is live.
   */
  const canInteract = isPlayer && playerColor !== null && !gameStatus && chess && chess.turn() === playerColor

  /**
   * Compute and set highlighted squares for all legal moves from `square`.
   * Returns true if the square has at least one legal move.
   */
  const getMoveOptions = useCallback((square) => {
    const currentChess = chessRef.current
    if (!currentChess) return false
    const moves = currentChess.moves({ square, verbose: true })
    if (moves.length === 0) { setOptionSquares({}); return false }

    const highlights = { [square]: { background: 'rgba(255, 214, 0, 0.55)' } }
    moves.forEach(({ to }) => {
      const isCapture = !!currentChess.get(to)
      highlights[to] = isCapture
        // Capture: ring around enemy piece
        ? {
          background:
            'radial-gradient(circle, transparent 58%, rgba(30,200,80,0.65) 58%)',
          borderRadius: '50%'
        }
        // Empty square: filled dot
        : {
          background:
            'radial-gradient(circle, rgba(30,200,80,0.6) 28%, transparent 28%)',
          borderRadius: '50%'
        }
    })
    setOptionSquares(highlights)
    return true
  }, [])

  /**
   * Handle square clicks for click-to-move.
   * Also detects pawn-to-last-rank moves and opens the promotion dialog.
   */
  const onSquareClick = useCallback((square) => {
    if (!canInteract) return
    const currentChess = chessRef.current

    // ── Phase 2: a piece is already selected ──────────────────────────────
    if (selectedSquare) {
      const legalMoves = currentChess.moves({ square: selectedSquare, verbose: true })
      const isLegal = legalMoves.some(m => m.to === square)

      if (isLegal) {
        // Check if this move is a pawn promotion
        const piece = currentChess.get(selectedSquare)
        const isPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && square[1] === '8') ||
            (piece.color === 'b' && square[1] === '1'))

        if (isPromotion) {
          // Pause and show promotion dialog
          setPromotionSquare({ from: selectedSquare, to: square })
          setSelectedSquare(null)
          setOptionSquares({})
          return
        }

        onDrop(selectedSquare, square)
        setSelectedSquare(null)
        setOptionSquares({})
        return
      }

      // Clicked own piece → switch selection
      const piece = currentChess.get(square)
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square)
        getMoveOptions(square)
        return
      }

      // Clicked empty / enemy → deselect
      setSelectedSquare(null)
      setOptionSquares({})
      return
    }

    // ── Phase 1: nothing selected yet ────────────────────────────────────
    const piece = currentChess.get(square)
    if (!piece || piece.color !== playerColor) return
    const hasMoves = getMoveOptions(square)
    if (hasMoves) setSelectedSquare(square)
  }, [canInteract, selectedSquare, playerColor, getMoveOptions, onDrop])

  /**
   * Called by react-chessboard's built-in promotion dialog when the player
   * picks a piece (or cancels).
   */
  const onPromotionPieceSelect = useCallback((piece) => {
    if (!piece || !promotionSquare) {
      setPromotionSquare(null)
      return
    }
    // piece is like 'wQ', 'bR' etc — extract the lowercase letter
    const promotionPiece = piece[1].toLowerCase() // 'q','r','b','n'
    onDrop(promotionSquare.from, promotionSquare.to, promotionPiece)
    setPromotionSquare(null)
  }, [promotionSquare, onDrop])

  // Clear selection whenever the game ends
  useEffect(() => {
    if (gameStatus) {
      setSelectedSquare(null)
      setOptionSquares({})
    }
  }, [gameStatus])

  if (loading) {
    return (
      <div className="game">
        <Navbar />
        <div className="game-loading">
          <div className="loading-spinner"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game">
      <Navbar />

      {/* Game Over Modal */}
      {gameOverData && (
        <div className="game-over-overlay">
          <div className={`game-over-modal ${gameOverData.outcome}`}>
            <div className="game-over-icon">
              {gameOverData.outcome === 'win' ? '🏆' :
                gameOverData.outcome === 'loss' ? '💀' : '🤝'}
            </div>
            <h2 className="game-over-title">
              {gameOverData.outcome === 'win' ? 'You Won!' :
                gameOverData.outcome === 'loss' ? 'You Lost' : 'Draw'}
            </h2>
            <p className="game-over-reason">{gameOverData.reason}</p>

            {gameOverData.delta !== undefined && (
              <div className="score-display">
                <div className={`score-delta ${gameOverData.delta >= 0 ? 'positive' : 'negative'}`}>
                  {gameOverData.delta >= 0 ? '+' : ''}{gameOverData.delta} pts
                </div>

                {gameOverData.isFriendGame ? (
                  /* Friend game — rating unchanged, just show a note */
                  <div className="friend-game-badge">
                    🤝 Friendly match — Rating not affected
                  </div>
                ) : (
                  /* Ranked game — show old → new score */
                  <div className="score-change">
                    <span className="score-old">{gameOverData.oldScore}</span>
                    <span className="score-arrow">→</span>
                    <span className="score-new">{gameOverData.newScore}</span>
                  </div>
                )}

                {gameOverData.breakdown && (
                  <div className="score-breakdown">
                    <div className="breakdown-title">Score Breakdown</div>
                    <div className="breakdown-item">
                      <span>Base</span>
                      <span className={gameOverData.breakdown.base >= 0 ? 'pos' : 'neg'}>
                        {gameOverData.breakdown.base >= 0 ? '+' : ''}{gameOverData.breakdown.base}
                      </span>
                    </div>
                    {gameOverData.breakdown.time !== 0 && (
                      <div className="breakdown-item">
                        <span>⚡ Speed Bonus</span>
                        <span className="pos">+{gameOverData.breakdown.time}</span>
                      </div>
                    )}
                    {gameOverData.breakdown.pieces !== 0 && (
                      <div className="breakdown-item">
                        <span>♟ Pieces Saved</span>
                        <span className="pos">+{gameOverData.breakdown.pieces}</span>
                      </div>
                    )}
                    {gameOverData.breakdown.rating !== 0 && (
                      <div className="breakdown-item">
                        <span>⚖ Rating Diff</span>
                        <span className={gameOverData.breakdown.rating >= 0 ? 'pos' : 'neg'}>
                          {gameOverData.breakdown.rating >= 0 ? '+' : ''}{gameOverData.breakdown.rating}
                        </span>
                      </div>
                    )}
                    {gameOverData.breakdown.resign && (
                      <div className="breakdown-item resign-penalty-row">
                        <span>🏳️ Resign Penalty</span>
                        <span className="neg">{gameOverData.breakdown.resign}</span>
                      </div>
                    )}
                    {gameOverData.piecesLost !== undefined && (
                      <div className="breakdown-item">
                        <span>Pieces You Lost</span>
                        <span>{gameOverData.piecesLost}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="game-over-actions">
              <button className="btn-home" onClick={() => navigate('/home')}>
                🏠 Return to Home
              </button>
              <button className="btn-play-again" onClick={() => navigate('/play-online')}>
                ♟ Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="game-content">
        <div className="game-board-container">
          {/* Left timer column */}
          <div className="timer-column">
            <div className={`timer black-timer ${chess?.turn() === 'b' && !gameStatus ? 'active' : ''}`}>
              <span className="timer-color-dot black-dot"></span>
              <div className="timer-info">
                <span className="timer-label">Black</span>
                <span className="timer-value">{formatTime(blackTimer)}</span>
              </div>
            </div>
            <div className={`timer white-timer ${chess?.turn() === 'w' && !gameStatus ? 'active' : ''}`}>
              <span className="timer-color-dot white-dot"></span>
              <div className="timer-info">
                <span className="timer-label">White</span>
                <span className="timer-value">{formatTime(whiteTimer)}</span>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="board-wrapper">
            {/* Check Race counters */}
            {isCheckrace && (
              <div className="checkrace-banner">
                <span className="check-count white-checks">♔ White: {checkCounts.w}/5 checks</span>
                <span className="check-count black-checks">♚ Black: {checkCounts.b}/5 checks</span>
              </div>
            )}
            {/* Disconnect countdown banner */}
            {disconnectCountdown !== null && (
              <div className="disconnect-banner">
                <div
                  className="disconnect-progress"
                  style={{ width: `${(disconnectCountdown / 30) * 100}%` }}
                />
                <span className="disconnect-text">
                  ⚠️ Opponent disconnected — abandoning in{' '}
                  <strong>{disconnectCountdown}s</strong>
                </span>
              </div>
            )}
            {/* Captured pieces: top row (opponent's side) */}
            <div className="captured-row top">
              <div className="captured-pieces">
                {(boardOrientation === 'white' ? capturedPieces.b : capturedPieces.w).map((p, i) => (
                  <span key={i} className="captured-piece" title={p.type}>{p.symbol}</span>
                ))}
                {materialDiff !== 0 && (
                  <span className={`material-diff ${(boardOrientation === 'white' ? materialDiff > 0 : materialDiff < 0) ? '' : 'negative'}`}>
                    {boardOrientation === 'white'
                      ? (materialDiff > 0 ? `+${materialDiff}` : '')
                      : (materialDiff < 0 ? materialDiff : '')}
                  </span>
                )}
              </div>
            </div>
            <Chessboard
              key={`board-${playerColor}-${fen}`}
              position={currentPosition}
              boardOrientation={boardOrientation}
              arePiecesDraggable={false}
              onSquareClick={onSquareClick}
              customSquareStyles={{ ...lastMoveSquares, ...optionSquares }}
              boardWidth={600}
              promotionDialogVariant="modal"
              onPromotionPieceSelect={promotionSquare ? onPromotionPieceSelect : undefined}
            />
            {/* Captured pieces: bottom row (player's perspective) */}
            <div className="captured-row bottom">
              <div className="captured-pieces">
                {(boardOrientation === 'white' ? capturedPieces.w : capturedPieces.b).map((p, i) => (
                  <span key={i} className="captured-piece" title={p.type}>{p.symbol}</span>
                ))}
                {materialDiff !== 0 && (
                  <span className={`material-diff ${(boardOrientation === 'white' ? materialDiff < 0 : materialDiff > 0) ? 'negative' : ''}`}>
                    {boardOrientation === 'white'
                      ? (materialDiff < 0 ? materialDiff : '')
                      : (materialDiff > 0 ? `+${materialDiff}` : '')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="game-sidebar">
          {/* Game ID Share Section */}
          <div className="game-id-section">
            <h3>🎮 Game ID</h3>
            <div className="game-id-display">
              <span className="game-id-text">{gameId?.slice(0, 8)}…</span>
              <button className="copy-btn" onClick={copyGameId} title="Copy full Game ID">
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <p className="share-hint">Share this ID so others can spectate</p>
          </div>

          <div className="game-info-section">
            <h3>Players</h3>
            <div className="players-panel">
              <div className={`player-row ${chess?.turn() === 'w' && !gameStatus ? 'active-turn' : ''}`}>
                <span className="color-indicator white"></span>
                <span className="player-name">{whiteName}{playerColor === 'w' ? ' (You)' : ''}</span>
                {chess?.turn() === 'w' && !gameStatus && <span className="turn-dot">●</span>}
              </div>
              <div className="vs-divider">vs</div>
              <div className={`player-row ${chess?.turn() === 'b' && !gameStatus ? 'active-turn' : ''}`}>
                <span className="color-indicator black"></span>
                <span className="player-name">{blackName}{playerColor === 'b' ? ' (You)' : ''}</span>
                {chess?.turn() === 'b' && !gameStatus && <span className="turn-dot">●</span>}
              </div>
            </div>
            {gameStatus && <span className="game-ended-badge">Game Over</span>}
            {!isPlayer && <p className="spectator-badge">👁️ Spectating</p>}
          </div>

          {/* ── Resign button – only shown to active players ── */}
          {isPlayer && !gameStatus && (
            <div className="resign-section">
              {!resignConfirm ? (
                <button
                  className="btn-resign"
                  onClick={() => setResignConfirm(true)}
                >
                  🏳️ Resign Game
                </button>
              ) : (
                <div className="resign-confirm">
                  <p className="resign-warn">
                    ⚠️ Resigning deducts extra points. Are you sure?
                  </p>
                  <div className="resign-actions">
                    <button
                      className="btn-confirm-resign"
                      onClick={() => {
                        socket?.emit('game:resign', { gameId })
                        setResignConfirm(false)
                      }}
                    >
                      Yes, Resign
                    </button>
                    <button
                      className="btn-cancel-resign"
                      onClick={() => setResignConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="moves-section">
            <h3>Move History</h3>
            <div className="moves-list">
              {moves.length === 0 ? (
                <p className="no-moves">No moves yet</p>
              ) : (
                <div className="moves-grid">
                  {moves.map((move, idx) => (
                    <div key={idx} className="move-item">
                      <span className="move-number">{Math.floor(idx / 2) + 1}.</span>
                      <span className="move-notation">{move}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {gameStatus && !gameOverData && (
            <div className="game-status">
              <h3>Game Over</h3>
              <p>{gameStatus}</p>
              <button className="btn-home-inline" onClick={() => navigate('/')}>Return to Home</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
