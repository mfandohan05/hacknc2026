import ThemeProvider from "./context/ThemeProvider"
import "./themes.css"
import './App.css'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ExplorePage from './pages/ExplorePage'
import RewardsPage from './pages/RewardsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import SignInPage from './pages/SignInPage'
import RequireAuth from './components/auth/RequireAuth'

function App() {
  const { pathname } = useLocation()
  const hideBottomNav = pathname === '/signin'

  return (
    <ThemeProvider><div className="app-shell relative grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      <div className="col-start-1 row-span-2 row-start-1 min-h-0 overflow-y-auto overflow-x-clip [view-transition-name:page] md:row-span-1">
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/explore" replace />} />
      </Routes>
      </div>
      {!hideBottomNav && <BottomNav />}
    </div></ThemeProvider>
  )
}

export default App
