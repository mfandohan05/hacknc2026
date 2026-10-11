import './App.css'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ExplorePage from './pages/ExplorePage'
import RewardsPage from './pages/RewardsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import SignInPage from './pages/SignInPage'

function App() {
  const { pathname } = useLocation()
  const hideBottomNav = pathname === '/signin'

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/explore" replace />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </>
  )
}

export default App
