import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import './Profile.css'

const API = 'http://localhost:5000/api'

export default function Profile() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [gameHistory, setGameHistory] = useState([])

  useEffect(() => {
    if (token) {
      setLoading(true)
      Promise.all([
        fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API}/users/me/history`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ])
        .then(([profileData, historyData]) => {
          setProfile(profileData)
          setName(profileData.name || '')
          setUsername(profileData.username || '')
          setGameHistory(Array.isArray(historyData) ? historyData : [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [token])

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, username })
      })
      const data = await res.json()
      if (res.ok) {
        setProfile(data)
        setEditing(false)
        showToast('Profile updated successfully!', 'success')
      } else {
        showToast('Failed to update profile', 'error')
      }
    } catch (err) {
      showToast('Error updating profile', 'error')
    }
  }

  if (loading) {
    return (
      <div className="profile">
        <Navbar />
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const stats = typeof profile.stats === 'string' ? JSON.parse(profile.stats) : profile.stats
  const totalGames = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0)
  const winRate = totalGames > 0 ? Math.round((stats.wins || 0) / totalGames * 100) : 0

  return (
    <div className="profile">
      <Navbar />
      <div className="profile-content">
        <h1>Profile</h1>
        <div className="profile-card">
          {!editing ? (
            <>
              <div className="profile-header">
                <div className="avatar">{profile.name?.charAt(0).toUpperCase() || 'U'}</div>
                <div>
                  <h2>{profile.name}</h2>
                  <p className="username">@{profile.username}</p>
                </div>
              </div>

              <div className="profile-info">
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rating</span>
                  <span className="info-value score">{profile.score}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Member since</span>
                  <span className="info-value">{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="stats-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-card wins">
                    <div className="stat-value">{stats.wins || 0}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                  <div className="stat-card losses">
                    <div className="stat-value">{stats.losses || 0}</div>
                    <div className="stat-label">Losses</div>
                  </div>
                  <div className="stat-card draws">
                    <div className="stat-value">{stats.draws || 0}</div>
                    <div className="stat-label">Draws</div>
                  </div>
                  <div className="stat-card total">
                    <div className="stat-value">{totalGames}</div>
                    <div className="stat-label">Total Games</div>
                  </div>
                </div>
                {totalGames > 0 && (
                  <div className="win-rate">
                    Win Rate: <strong>{winRate}%</strong>
                  </div>
                )}
              </div>

              {/* ── Game History Table ── */}
              <div className="game-history-section">
                <h3>Game History</h3>
                {gameHistory.length === 0 ? (
                  <div className="history-empty">No games played yet. Start a match to see your history!</div>
                ) : (
                  <div className="history-table-wrapper">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Match</th>
                          <th>Type</th>
                          <th>Rating</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameHistory.map((game, idx) => {
                          const delta = game.scoreDelta ?? 0
                          return (
                            <tr key={game.game_id} className={`history-row ${game.outcome}`}>
                              <td className="history-num">{idx + 1}</td>
                              <td className="history-match">
                                <span className="match-you">You</span>
                                <span className="match-vs">vs</span>
                                <span className="match-opp">{game.opponentUsername || 'Anonymous'}</span>
                              </td>
                              <td className="history-type">{game.game_type}</td>
                              <td className={`history-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}`}>
                                {delta > 0 ? '+' : ''}{delta}
                              </td>
                              <td className="history-result">
                                <span className={`result-badge ${game.outcome}`}>
                                  {game.outcome === 'win' ? '🏆 Win' : game.outcome === 'loss' ? '💀 Loss' : game.outcome === 'draw' ? '🤝 Draw' : '⏳ Ongoing'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button onClick={() => setEditing(true)} className="btn btn-primary">
                Edit Profile
              </button>
            </>
          ) : (
            <>
              <h3>Edit Profile</h3>
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                  />
                </div>
                <div className="profile-actions">
                  <button onClick={handleUpdate} className="btn btn-primary">Save</button>
                  <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
