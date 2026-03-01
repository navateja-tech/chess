import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useToast } from '../contexts/ToastContext'
import './Spectate.css'

export default function Spectate() {
  const { showToast } = useToast()
  const [gameId, setGameId] = useState('')
  const navigate = useNavigate()

  const handleSpectate = () => {
    if (!gameId.trim()) {
      showToast('Please enter a Game ID', 'warning')
      return
    }
    navigate(`/game/${gameId.trim()}`)
  }

  return (
    <div className="spectate">
      <Navbar />
      <div className="spectate-content">
        <div className="spectate-header">
          <div className="spectate-icon">👁️</div>
          <h1>Spectate Game</h1>
          <p className="subtitle">Enter a Game ID to watch a live game</p>
        </div>
        <div className="spectate-form">
          <div className="form-group">
            <label>Game ID</label>
            <input
              type="text"
              placeholder="Enter Game ID (e.g., abc123-def456-...)"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSpectate()}
            />
          </div>
          <button onClick={handleSpectate} className="btn btn-primary">
            Watch Game
          </button>
        </div>
      </div>
    </div>
  )
}
