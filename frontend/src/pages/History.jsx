import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import './History.css'

export default function History() {
  const { token, user } = useAuth()
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      setLoading(true)
      fetch('/api/users/me/history', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setGames(Array.isArray(data) ? data : [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [token])

  const handleGameClick = async (gameId) => {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSelectedGame(data)
    } catch (err) {
      // silent
    }
  }

  const getOutcomeLabel = (outcome) => {
    if (outcome === 'win') return { label: 'WIN', cls: 'outcome-win' }
    if (outcome === 'loss') return { label: 'LOSS', cls: 'outcome-loss' }
    if (outcome === 'draw') return { label: 'DRAW', cls: 'outcome-draw' }
    return { label: 'ONGOING', cls: 'outcome-ongoing' }
  }

  const formatDuration = (start, end) => {
    if (!end) return '—'
    const diffMs = new Date(end) - new Date(start)
    const mins = Math.floor(diffMs / 60000)
    const secs = Math.floor((diffMs % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const formatDate = (ts) => {
    const d = new Date(ts)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="history">
        <Navbar />
        <div className="history-loading">
          <div className="loading-spinner"></div>
          <p>Loading game history...</p>
        </div>
      </div>
    )
  }

  const wins = games.filter(g => g.outcome === 'win').length
  const losses = games.filter(g => g.outcome === 'loss').length
  const draws = games.filter(g => g.outcome === 'draw').length

  return (
    <div className="history">
      <Navbar />
      <div className="history-content">
        <div className="history-header">
          <h1>Game History</h1>
          {games.length > 0 && (
            <div className="history-summary">
              <div className="summary-stat win">
                <span className="stat-num">{wins}</span>
                <span className="stat-label">Wins</span>
              </div>
              <div className="summary-stat loss">
                <span className="stat-num">{losses}</span>
                <span className="stat-label">Losses</span>
              </div>
              <div className="summary-stat draw">
                <span className="stat-num">{draws}</span>
                <span className="stat-label">Draws</span>
              </div>
              <div className="summary-stat total">
                <span className="stat-num">{games.length}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
          )}
        </div>

        {games.length === 0 ? (
          <div className="no-games">
            <p>No games played yet</p>
            <p className="subtext">Start playing to see your history here!</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {games.map(game => {
                const { label, cls } = getOutcomeLabel(game.outcome)
                const delta = game.scoreDelta ?? 0
                return (
                  <div
                    key={game.game_id}
                    className={`history-item ${cls} ${selectedGame?.game_id === game.game_id ? 'selected' : ''}`}
                    onClick={() => handleGameClick(game.game_id)}
                  >
                    {/* Top row */}
                    <div className="game-header">
                      <span className={`outcome-badge ${cls}`}>{label}</span>
                      <span className="game-type-badge">{game.game_type?.toUpperCase()}</span>
                    </div>

                    {/* Opponent */}
                    <div className="opponent-row">
                      <span className="opp-label">vs</span>
                      <span className="opp-name">
                        {game.opponentUsername || 'Unknown'}
                      </span>
                      {game.opponentScore != null && (
                        <span className="opp-score">({game.opponentScore})</span>
                      )}
                    </div>

                    {/* Score delta */}
                    {game.status === 'finished' && (
                      <div className={`score-delta-badge ${delta >= 0 ? 'positive' : 'negative'}`}>
                        {delta >= 0 ? '+' : ''}{delta} pts
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="game-meta">
                      <span className="meta-color">
                        {game.myColor === 'white' ? '⬜ White' : '⬛ Black'}
                      </span>
                      <span className="meta-duration">{formatDuration(game.start_time, game.end_time)}</span>
                    </div>
                    <div className="game-date">{formatDate(game.start_time)}</div>
                  </div>
                )
              })}
            </div>

            {selectedGame && (
              <div className="game-details">
                <div className="details-header">
                  <h2>Game Details</h2>
                  <span className="details-id">ID: {selectedGame.game_id?.slice(0, 8)}…</span>
                </div>

                <div className="details-meta-row">
                  <div className="detail-chip">
                    <span>⬜ White</span>
                    <strong>{selectedGame.white_username || selectedGame.player_white_id?.slice(0, 8)}</strong>
                    <span className="chip-score">{selectedGame.white_score}</span>
                  </div>
                  <span className="vs-separator">vs</span>
                  <div className="detail-chip">
                    <span>⬛ Black</span>
                    <strong>{selectedGame.black_username || selectedGame.player_black_id?.slice(0, 8)}</strong>
                    <span className="chip-score">{selectedGame.black_score}</span>
                  </div>
                </div>

                {selectedGame.winner_id && (
                  <div className="winner-row">
                    🏆 Winner: <strong>
                      {selectedGame.winner_id === selectedGame.player_white_id
                        ? selectedGame.white_username
                        : selectedGame.black_username}
                    </strong>
                  </div>
                )}

                <div className="score-deltas-row">
                  <div className="delta-item white-delta">
                    <span>⬜ {selectedGame.white_username}</span>
                    <span className={selectedGame.score_delta_white >= 0 ? 'pos' : 'neg'}>
                      {selectedGame.score_delta_white >= 0 ? '+' : ''}{selectedGame.score_delta_white ?? 0}
                    </span>
                  </div>
                  <div className="delta-item black-delta">
                    <span>⬛ {selectedGame.black_username}</span>
                    <span className={selectedGame.score_delta_black >= 0 ? 'pos' : 'neg'}>
                      {selectedGame.score_delta_black >= 0 ? '+' : ''}{selectedGame.score_delta_black ?? 0}
                    </span>
                  </div>
                </div>

                <div className="moves-section">
                  <h3>Move History ({selectedGame.moves?.length ?? 0} moves)</h3>
                  <div className="moves-list">
                    {selectedGame.moves?.map((move, idx) => (
                      <div key={move.move_id || idx} className="move-item">
                        <span className="move-number">{idx + 1}.</span>
                        <span className="move-notation">{move.move_notation}</span>
                        <span className="move-time">{new Date(move.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="details-actions">
                  <button
                    onClick={() => navigate(`/game/${selectedGame.game_id}`)}
                    className="btn btn-primary"
                  >
                    Replay Game
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
