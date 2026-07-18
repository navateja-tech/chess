import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { io } from 'socket.io-client'
import './PlayOnline.css'

export default function PlayOnline() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [gameType, setGameType] = useState(null)
  const [socket, setSocket] = useState(null)
  const [searching, setSearching] = useState(false)
  const [matchFound, setMatchFound] = useState(null) // { whiteName, blackName, gameId }
  const [dots, setDots] = useState('')
  const navigate = useNavigate()
  const matchTimerRef = useRef(null)

  // Animated dots for "Searching..."
  useEffect(() => {
    if (!searching) return
    const iv = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(iv)
  }, [searching])

  useEffect(() => {
    if (user && token) {
      const newSocket = io(import.meta.env.VITE_BACKEND_URL)
      newSocket.emit('auth:init', { userId: user.user_id })
      newSocket.on('matchmaking:matched', ({ gameId, whiteName, blackName }) => {
        setSearching(false)
        setMatchFound({ gameId, whiteName: whiteName || 'Player 1', blackName: blackName || 'Player 2' })
        // Navigate after 3 seconds
        matchTimerRef.current = setTimeout(() => {
          navigate(`/game/${gameId}`)
        }, 3000)
      })
      newSocket.on('matchmaking:queued', () => {
        setSearching(true)
      })
      setSocket(newSocket)
      return () => {
        if (matchTimerRef.current) clearTimeout(matchTimerRef.current)
        newSocket.close()
      }
    }
  }, [user, token, navigate, showToast])

  const handleJoinQueue = (type) => {
    setGameType(type)
    setSearching(true)
    socket?.emit('matchmaking:join', { type })
  }

  const handleCancel = () => {
    setGameType(null)
    setSearching(false)
    setMatchFound(null)
    socket?.emit('matchmaking:cancel')
  }

  const handleSkipToGame = () => {
    if (matchFound) {
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current)
      navigate(`/game/${matchFound.gameId}`)
    }
  }

  return (
    <div className="play-online">
      <Navbar />
      <div className="play-online-content">
        <h1>Play Online</h1>
        <p className="subtitle">Choose a time control and find an opponent</p>
        <div className="game-types">
          <button
            onClick={() => handleJoinQueue('blitz')}
            className="game-type-btn"
            disabled={!!gameType}
          >
            <span className="game-type-icon">⚡</span>
            <span className="game-type-name">Blitz</span>
            <span className="game-type-time">5 min</span>
          </button>
          <button
            onClick={() => handleJoinQueue('bullet')}
            className="game-type-btn"
            disabled={!!gameType}
          >
            <span className="game-type-icon">🔥</span>
            <span className="game-type-name">Bullet</span>
            <span className="game-type-time">1 min</span>
          </button>
          <button
            onClick={() => handleJoinQueue('unlimited')}
            className="game-type-btn"
            disabled={!!gameType}
          >
            <span className="game-type-icon">♾️</span>
            <span className="game-type-name">Unlimited</span>
            <span className="game-type-time">No timer</span>
          </button>
          <button
            onClick={() => handleJoinQueue('checkrace')}
            className="game-type-btn"
            disabled={!!gameType}
          >
            <span className="game-type-icon">🎯</span>
            <span className="game-type-name">Check Race</span>
            <span className="game-type-time">First to 5 checks</span>
          </button>
        </div>

        {/* ── Searching state (popup overlay) ── */}
        {searching && !matchFound && (
          <div className="match-overlay searching-overlay">
            <div className="match-popup searching-popup">
              <div className="searching-ring">
                <div className="ring-outer"></div>
                <div className="ring-inner">♟</div>
              </div>
              <p className="searching-text">Finding a match{dots}</p>
              <p className="searching-hint">Looking for a worthy opponent</p>
              <button onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Match found popup ── */}
        {matchFound && (
          <div className="match-overlay" onClick={handleSkipToGame}>
            <div className="match-popup">
              <div className="match-header">🎮 Match Found!</div>
              <div className="vs-container">
                <div className="vs-player white-player">
                  <span className="vs-color-dot white-dot"></span>
                  <span className="vs-name">{matchFound.whiteName}</span>
                </div>
                <div className="vs-badge">VS</div>
                <div className="vs-player black-player">
                  <span className="vs-name">{matchFound.blackName}</span>
                  <span className="vs-color-dot black-dot"></span>
                </div>
              </div>
              <div className="match-countdown-bar">
                <div className="match-countdown-fill"></div>
              </div>
              <p className="match-hint">Game starting shortly... Click anywhere to skip</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
