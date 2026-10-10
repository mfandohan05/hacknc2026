import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ExplorePage from './pages/ExplorePage'
import RewardsPage from './pages/RewardsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/explore" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default App
