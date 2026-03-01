import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Welcome from './pages/Welcome'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Home from './pages/Home'
import Profile from './pages/Profile'
import History from './pages/History'
import PlayOnline from './pages/PlayOnline'
import PlayWithFriends from './pages/PlayWithFriends'
import Spectate from './pages/Spectate'
import Game from './pages/Game'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/play-online" element={<PrivateRoute><PlayOnline /></PrivateRoute>} />
            <Route path="/play-friends" element={<PrivateRoute><PlayWithFriends /></PrivateRoute>} />
            <Route path="/spectate" element={<PrivateRoute><Spectate /></PrivateRoute>} />
            <Route path="/game/:gameId" element={<PrivateRoute><Game /></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
