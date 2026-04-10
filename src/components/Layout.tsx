import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  HandCoins,
  BarChart3,
  ScanLine,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { clearSession } from '../lib/auth'
import type { ChurchUser } from '../lib/auth'

const navItems = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/checkin', icon: <ScanLine size={18} />, label: 'Check-In' },
  { to: '/members', icon: <Users size={18} />, label: 'Members' },
  { to: '/services', icon: <CalendarDays size={18} />, label: 'Services' },
  { to: '/offerings', icon: <HandCoins size={18} />, label: 'Offerings' },
  { to: '/reports', icon: <BarChart3 size={18} />, label: 'Reports' },
]

interface Props {
  children: React.ReactNode
  church: ChurchUser
}

export default function Layout({ children, church }: Props) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    clearSession()
    navigate('/welcome')
  }

  return (
    <div className="flex min-h-screen bg-gray-950 relative">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 relative`}>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white z-10 transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Logo */}
        <div className={`border-b border-gray-800 ${collapsed ? 'p-3' : 'p-5'}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-green-400 font-bold text-xs">CI</span>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-green-400">CLOCK IT!</h1>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{church.parish_name}</p>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
              title={collapsed ? item.label : ''}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className={`p-3 border-t border-gray-800`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}