import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import './Home.css'

const API = 'http://localhost:5000/api'

export default function Home() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/users/me/history`, { headers: { Authorization: `Bearer ${token}` } })
        ])

        const profileData = await profileRes.json()
        const historyData = await historyRes.json()

        setProfile(profileData)
        setRecentGames(Array.isArray(historyData) ? historyData.slice(0, 4) : [])
      } catch (err) {
        console.error("Failed to load dashboard data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  const stats = profile?.stats
    ? (typeof profile.stats === 'string' ? JSON.parse(profile.stats) : profile.stats)
    : { wins: 0, losses: 0, draws: 0 }

  const totalGames = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0)
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0

  const getOutcomeDetails = (outcome) => {
    switch (outcome) {
      case 'win': return { icon: '🏆', label: 'Victory', class: 'win' }
      case 'loss': return { icon: '🔻', label: 'Defeat', class: 'loss' }
      case 'draw': return { icon: '🤝', label: 'Draw', class: 'draw' }
      default: return { icon: '⏳', label: 'Ongoing', class: 'ongoing' }
    }
  }

  return (
    <div className="home-dashboard">
      <Navbar />

      {/* ── Hero Banner ── */}
      <header className="home-hero">
        <div className="hero-container">
          <div className="user-profile-brief">
            <div className="big-avatar">
              {(user?.username || 'P')[0].toUpperCase()}
            </div>
            <div className="welcome-text">
              <h1>Welcome back, <span>{user?.username || 'Player'}</span></h1>
              <p>Your current rating: <strong>{profile?.score ?? 1200}</strong></p>
            </div>
          </div>
          <div className="hero-stats">
            <div className="h-stat">
              <span className="h-val">{stats.wins ?? 0}</span>
              <span className="h-lbl">Wins</span>
            </div>
            <div className="h-stat">
              <span className="h-val">{stats.losses ?? 0}</span>
              <span className="h-lbl">Losses</span>
            </div>
            <div className="h-stat">
              <span className="h-val">{winRate}%</span>
              <span className="h-lbl">Win Rate</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="main-grid">

          {/* ── Action Section ── */}
          <section className="dashboard-section action-section">
            <h2 className="section-title">⚡ Quick Play</h2>
            <div className="game-modes-grid">
              <Link to="/play-online" className="mode-card">
                <div className="mode-icon">⚡</div>
                <h3 className="mode-title">Play Online</h3>
                <p className="mode-desc">Match with players for Blitz or Bullet games</p>
              </Link>

              <Link to="/play-friends" className="mode-card">
                <div className="mode-icon">👥</div>
                <h3 className="mode-title">Play With Friends</h3>
                <p className="mode-desc">Create or join a private room</p>
              </Link>

              <Link to="/spectate" className="mode-card">
                <div className="mode-icon">👁️</div>
                <h3 className="mode-title">Spectate Game</h3>
                <p className="mode-desc">Watch live games by game ID</p>
              </Link>
            </div>
          </section>

          {/* ── Secondary Section (History) ── */}
          <section className="dashboard-section history-section">
            <div className="section-header">
              <h2 className="section-title">🕑 Recent Activity</h2>
              <Link to="/history" className="view-all">View History</Link>
            </div>

            {loading ? (
              <div className="loader-placeholder">Loading matches...</div>
            ) : recentGames.length === 0 ? (
              <div className="empty-state">
                No games played recently. Start a match to see your history!
              </div>
            ) : (
              <div className="history-list">
                {recentGames.map(game => {
                  const outcome = getOutcomeDetails(game.outcome)
                  return (
                    <div key={game.game_id} className={`history-item ${outcome.class}`}>
                      <div className="outcome-icon">{outcome.icon}</div>
                      <div className="match-info">
                        <span className="match-opp">vs {game.opponentUsername || 'Anonymous'}</span>
                        <span className="match-type">{game.game_type} Match</span>
                      </div>
                      <div className="match-score">
                        <span className={`score-delta ${game.scoreDelta >= 0 ? 'plus' : 'minus'}`}>
                          {game.scoreDelta > 0 ? '+' : ''}{game.scoreDelta ?? 0}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
