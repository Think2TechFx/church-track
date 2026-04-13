import { useEffect, useState } from 'react'
import { getSessions, getMembers, clearAllData } from '../lib/db'
import type { Member, Session } from '../types'
import { Users, CalendarDays, TrendingUp, Baby } from 'lucide-react'

import type { ChurchUser } from '../lib/auth'
export default function Dashboard({ church }: { church: ChurchUser }) {
  const [members, setMembers] = useState<Member[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const [m, s] = await Promise.all([getMembers(), getSessions()])
      setMembers(m)
      setSessions(s)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()

  const totalMembers = members.filter((m) => m.active && m.sex !== 'Children').length
  const totalChildren = members.filter((m) => m.active && m.sex === 'Children').length
  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const birthdaysThisMonth = members.filter((m) => {
    if (!m.date_of_birth) return false
    return new Date(m.date_of_birth).getMonth() === thisMonth
  })

  async function handleClearData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
      try {
        await clearAllData()
        alert('All data cleared successfully.')
        window.location.reload() // Reload to refresh the dashboard
      } catch (error) {
        alert('Error clearing data: ' + (error as Error).message)
      }
    }
    setShowClearConfirm(false)
  }

  const SERVICE_LABELS: Record<string, string> = {
    sunday: 'Sunday Service',
    tuesday: 'Digging Deep',
    thursday: 'Faith Clinic',
    special: 'Special Program',
  }

  const SERVICE_COLORS: Record<string, string> = {
    sunday: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    tuesday: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    thursday: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    special: 'text-green-400 bg-green-400/10 border-green-400/20',
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>
  }

  return (
    <div className="p-8">

     {/* Welcome */}
      <div className="flex items-start justify-between mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pastor in Charge</p>
          <h2 className="text-2xl font-bold text-white">{church.pastor_name}</h2>
          <p className="text-sm text-green-400 mt-0.5">Pastor-in-Charge</p>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold text-white">{church.parish_name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{church.zonal_hq}</p>
          <p className="text-xs text-gray-600 mt-0.5">{church.province_hq} · {church.regional_hq}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center">
              <Users size={18} className="text-yellow-400" />
            </div>
            <span className="text-xs text-gray-400">Total Members</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalMembers}</p>
          <p className="text-xs text-gray-500 mt-1">Active adults</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-pink-400/10 flex items-center justify-center">
              <Baby size={18} className="text-pink-400" />
            </div>
            <span className="text-xs text-gray-400">Children</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalChildren}</p>
          <p className="text-xs text-gray-500 mt-1">Registered</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <CalendarDays size={18} className="text-blue-400" />
            </div>
            <span className="text-xs text-gray-400">This Month</span>
          </div>
          <p className="text-3xl font-bold text-white">{thisMonthSessions.length}</p>
          <p className="text-xs text-gray-500 mt-1">Services held</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-400/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-400" />
            </div>
            <span className="text-xs text-gray-400">Total Services</span>
          </div>
          <p className="text-3xl font-bold text-white">{sessions.length}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent services */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Services</h3>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No services yet</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${SERVICE_COLORS[session.type]}`}>
                      {session.special_name || SERVICE_LABELS[session.type]}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{session.date}</p>
                    {session.preacher && (
                      <p className="text-xs text-gray-600 mt-0.5">{session.preacher}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Birthdays */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">🎂 Birthdays This Month</h3>
            {birthdaysThisMonth.length === 0 ? (
              <p className="text-gray-500 text-sm">No birthdays this month</p>
            ) : (
              <div className="space-y-2">
                {birthdaysThisMonth.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-white">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(m.date_of_birth!).toLocaleDateString('en-NG', {
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">👥 Member Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">Males</span>
                <span className="text-white font-medium">
                  {members.filter((m) => m.sex === 'Male' && m.active).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-pink-400">Females</span>
                <span className="text-white font-medium">
                  {members.filter((m) => m.sex === 'Female' && m.active).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400">Children</span>
                <span className="text-white font-medium">{totalChildren}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-bold">
                  {members.filter((m) => m.active).length}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Admin Actions */}
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">⚠️ Admin Actions</h3>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Clear All Data
        </button>
        {showClearConfirm && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm mb-3">
              This will permanently delete ALL members, sessions, attendance, and offerings data. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Yes, Clear Everything
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}