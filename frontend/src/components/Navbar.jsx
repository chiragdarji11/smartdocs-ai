/**
 * Navbar Component
 * Top navigation bar with glassmorphism styling.
 * Shows app logo, user greeting, logout button, and mobile hamburger menu.
 */

import { Shield, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="h-full flex items-center justify-between px-4 sm:px-6">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
            id="hamburger-btn"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text hidden sm:block">
            SmartDocs AI
          </span>
        </div>

        {/* User info & logout */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden sm:inline">
            Welcome, <span className="text-white font-medium">{user?.username}</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 
                       bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 
                       rounded-lg transition-all duration-200"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
