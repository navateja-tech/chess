import { Link } from 'react-router-dom'
import './Welcome.css'

export default function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-container">
        <h1>♟️ Multiplayer Chess Platform</h1>
        <p>Play chess online with friends or random opponents</p>
        <div className="welcome-buttons">
          <Link to="/signin" className="btn btn-primary">Sign In</Link>
          <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
        </div>
      </div>
    </div>
  )
}
