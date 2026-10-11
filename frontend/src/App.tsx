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
    // one grid owns the viewport: the content spans the full height and the tab bar overlaps its bottom row,
    // so page backgrounds show through the bar's frosted glass
    <div className="relative grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      <div className="col-start-1 row-span-2 row-start-1 min-h-0 overflow-y-auto overflow-x-clip">
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/explore" replace />} />
      </Routes>
      </div>
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}

export default App
