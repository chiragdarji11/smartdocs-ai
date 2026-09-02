/**
 * Layout Component
 * Main layout wrapper that combines Navbar, Sidebar, and content area.
 * Used by all authenticated pages. Mobile responsive.
 */

import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main content area — offset by navbar height and sidebar width on desktop */}
      <main className="lg:ml-64 mt-16 p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
