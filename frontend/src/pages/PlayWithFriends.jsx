import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { io } from 'socket.io-client'
import './PlayWithFriends.css'

export default function PlayWithFriends() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [gameId, setGameId] = useState('')
  const [createdGameId, setCreatedGameId] = useState('')
  const [waiting, setWaiting] = useState(false)   // host is waiting for guest
  const [joiningLoading, setJoiningLoading] = useState(false) // guest is joining
  const navigate = useNavigate()

  // Keep a stable ref to the socket so event handlers never go stale
  const socketRef = useRef(null)

  // Stable refs for callbacks that change between renders
  const navigateRef = useRef(navigate)
  const showToastRef = useRef(showToast)
  useEffect(() => { navigateRef.current = navigate }, [navigate])
  useEffect(() => { showToastRef.current = showToast }, [showToast])

  // ── Connect once on mount, disconnect on unmount ──────────────────────────
  useEffect(() => {
    if (!user || !token) return

    const sock = io('http://localhost:5000')
    socketRef.current = sock

    sock.emit('auth:init', { userId: user.user_id })

    // Host: room created → show the ID and stop the create spinner
    sock.on('friend:created', ({ gameId: gid }) => {
      setCreatedGameId(gid)
      setWaiting(true)
      showToastRef.current('Room created! Share the Game ID with your friend.', 'success')
    })

    // Both players: game is ready → navigate to game page
    sock.on('friend:ready', ({ gameId: gid }) => {
      showToastRef.current('Game starting!', 'success')
      navigateRef.current(`/game/${gid}`)
    })

    sock.on('friend:error', ({ message }) => {
      showToastRef.current(message || 'Error joining room', 'error')
      setJoiningLoading(false)
    })

    return () => {
      sock.disconnect()
      socketRef.current = null
    }
  }, [user, token]) // ← only re-run if the user/token actually changes

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    socketRef.current?.emit('friend:create')
  }, [])

  const handleJoin = useCallback(() => {
    const id = gameId.trim()
    if (!id) {
      showToastRef.current('Please enter a Game ID', 'warning')
      return
    }
    setJoiningLoading(true)
    socketRef.current?.emit('friend:join', { gameId: id })
  }, [gameId])

  const copyGameId = useCallback(() => {
    navigator.clipboard.writeText(createdGameId)
    showToastRef.current('Game ID copied!', 'success')
  }, [createdGameId])

  return (
    <div className="play-friends">
      <Navbar />
      <div className="play-friends-content">
        <h1>Play With Friends</h1>
        <p className="subtitle">Create a private room or join a friend's game</p>

        <div className="friend-options">
          {/* ── Create Room ── */}
          <div className="option-section">
            <div className="section-icon">👥</div>
            <h2>Create Room</h2>
            <p className="section-description">
              Create a new game room and share the ID with your friend
            </p>

            {!createdGameId ? (
              <button onClick={handleCreate} className="btn btn-primary">
                Create Room
              </button>
            ) : (
              <div className="game-id-display">
                <p>Share this Game ID with your friend:</p>
                <div className="game-id-box">
                  <code>{createdGameId}</code>
                  <button onClick={copyGameId} className="btn-copy">Copy</button>
                </div>
                {waiting && (
                  <p className="waiting-text">
                    <span className="waiting-spinner" /> Waiting for friend to join…
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Join Room ── */}
          <div className="option-section">
            <div className="section-icon">🔑</div>
            <h2>Join Room</h2>
            <p className="section-description">
              Enter a Game ID to join your friend's room
            </p>
            <input
              type="text"
              placeholder="Enter Game ID"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              disabled={joiningLoading}
            />
            <button
              onClick={handleJoin}
              className="btn btn-primary"
              disabled={joiningLoading || !gameId.trim()}
            >
              {joiningLoading ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
