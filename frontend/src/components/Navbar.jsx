import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/home">♟️ Chess</Link>
      </div>
      <div className="navbar-links">
        <Link to="/play-online">🎮 Play</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/history">History</Link>
        {user && (
          <span className="navbar-user">
            👤 {user.username || user.name || 'Player'}
            <span className="navbar-user-id">#{String(user.user_id).slice(0, 6)}</span>
          </span>
        )}
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  )
}
