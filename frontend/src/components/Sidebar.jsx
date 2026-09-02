/**
 * Sidebar Component — SmartDocs AI
 * Side navigation with icon links for all main pages including AI Studio.
 * Mobile responsive: toggles via hamburger menu.
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  Sparkles,
  X
} from 'lucide-react'

// Navigation items configuration
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/intelligence', icon: Sparkles, label: 'AI Studio' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/upload', icon: Upload, label: 'Upload' },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-surface-950/95 backdrop-blur-md border-r border-white/5 z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Mobile close button */}
          <div className="flex justify-end lg:hidden mb-2">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 mt-2 lg:mt-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20 shadow-lg shadow-primary-500/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Bottom info */}
          <div className="p-4 glass-card text-center">
            <p className="text-xs text-gray-500">SmartDocs Platform v2.0</p>
            <p className="text-xs text-primary-400 font-medium mt-0.5">LangChain + Llama 3.2</p>
          </div>
        </div>
      </aside>
    </>
  )
}
