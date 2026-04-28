import { useEffect, useState } from 'react'
import { getSessions, getMembers } from '../lib/db'
import { getSession } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Member, Session } from '../types'

interface MemberStats {
  member: Member
  count: number
  firstArrival: number
}

export default function QuarterlyWrap() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberStats, setMemberStats] = useState<MemberStats[]>([])
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3))
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const church = getSession()

  const QUARTERS = [
    { q: 1, label: 'Q1 (Jan - Mar)' },
    { q: 2, label: 'Q2 (Apr - Jun)' },
    { q: 3, label: 'Q3 (Jul - Sep)' },
    { q: 4, label: 'Q4 (Oct - Dec)' },
  ]

  useEffect(() => {
    loadData()
  }, [selectedQuarter, selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [allSessions, allMembers] = await Promise.all([getSessions(), getMembers()])

      const startMonth = (selectedQuarter - 1) * 3
      const endMonth = startMonth + 2

      const quarterSessions = allSessions.filter((s) => {
        const d = new Date(s.date)
        return (
          d.getFullYear() === selectedYear &&
          d.getMonth() >= startMonth &&
          d.getMonth() <= endMonth
        )
      })

      setSessions(quarterSessions)
      setMembers(allMembers)

      // Get attendance stats for each member
      const stats: MemberStats[] = []
      for (const member of allMembers) {
        const { data: att } = await supabase
          .from('attendance')
          .select('checked_in_at, session_id')
          .eq('member_id', member.id)
          .in('session_id', quarterSessions.map(s => s.id))
          .order('checked_in_at', { ascending: true })

        if (att && att.length > 0) {
          stats.push({
            member,
            count: att.length,
            firstArrival: att.filter(a => {
              const time = new Date(a.checked_in_at)
              return time.getHours() < 9
            }).length,
          })
        }
      }

      stats.sort((a, b) => b.count - a.count)
      setMemberStats(stats)
    } finally {
      setLoading(false)
    }
  }

  const totalServices = sessions.length
  const totalAttendance = memberStats.reduce((a, s) => a + s.count, 0)
  const avgAttendance = totalServices > 0 ? Math.round(totalAttendance / totalServices) : 0

  const topOverall = memberStats[0]
  const topMale = memberStats.find(s => s.member.sex === 'Male')
  const topFemale = memberStats.find(s => s.member.sex === 'Female')
  const topChild = memberStats.find(s => s.member.sex === 'Children')
  const mostEarly = [...memberStats].sort((a, b) => b.firstArrival - a.firstArrival)[0]

  const newMembers = members.filter(m => {
    if (!m.created_at) return false
    const d = new Date(m.created_at)
    const startMonth = (selectedQuarter - 1) * 3
    return d.getFullYear() === selectedYear && d.getMonth() >= startMonth && d.getMonth() <= startMonth + 2
  })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🏆</div>
          <p className="text-gray-400">Loading your quarterly wrap...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-1">Quarterly Wrap</h1>
        <p className="text-green-400 text-sm">{church?.parish_name}</p>
      </div>

      {/* Quarter selector */}
      <div className="flex gap-4 mb-8 justify-center">
        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
        >
          {QUARTERS.map(q => (
            <option key={q.q} value={q.q}>{q.label}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
        >
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {totalServices === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500">No services recorded for this quarter yet</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500/20 to-green-900/20 border border-green-500/20 rounded-2xl p-5 text-center">
              <p className="text-4xl font-bold text-green-400">{totalServices}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Services Held</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-900/20 border border-yellow-500/20 rounded-2xl p-5 text-center">
              <p className="text-4xl font-bold text-yellow-400">{totalAttendance}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Total Check-ins</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-900/20 border border-blue-500/20 rounded-2xl p-5 text-center">
              <p className="text-4xl font-bold text-blue-400">{avgAttendance}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Avg Per Service</p>
            </div>
          </div>

          {/* New members */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-900/10 border border-purple-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">🌱 New Members This Quarter</p>
                <p className="text-3xl font-bold text-purple-400">{newMembers.length}</p>
                <p className="text-xs text-gray-500 mt-1">souls added to the family</p>
              </div>
              <div className="text-5xl opacity-20">✝</div>
            </div>
          </div>

          {/* Awards */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🎖️ Quarterly Awards
            </h2>
            <div className="grid grid-cols-1 gap-4">

              {/* Top overall */}
              {topOverall && (
                <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-900/10 to-transparent border border-yellow-500/30 rounded-2xl p-5 flex items-center gap-5">
                  <div className="text-5xl">👑</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">Most Faithful Member</p>
                    <p className="text-xl font-bold text-white">{topOverall.member.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Attended <span className="text-yellow-400 font-bold">{topOverall.count}</span> out of {totalServices} services this quarter
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-yellow-400">{Math.round((topOverall.count / totalServices) * 100)}%</p>
                    <p className="text-xs text-gray-500">attendance rate</p>
                  </div>
                </div>
              )}

              {/* Top male */}
              {topMale && (
                <div className="bg-gradient-to-r from-blue-500/20 via-blue-900/10 to-transparent border border-blue-500/30 rounded-2xl p-5 flex items-center gap-5">
                  <div className="text-5xl">🦁</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Most Faithful Brother</p>
                    <p className="text-xl font-bold text-white">{topMale.member.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      <span className="text-blue-400 font-bold">{topMale.count}</span> services attended
                    </p>
                  </div>
                  <div className="text-4xl">💙</div>
                </div>
              )}

              {/* Top female */}
              {topFemale && (
                <div className="bg-gradient-to-r from-pink-500/20 via-pink-900/10 to-transparent border border-pink-500/30 rounded-2xl p-5 flex items-center gap-5">
                  <div className="text-5xl">🌸</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1">Most Faithful Sister</p>
                    <p className="text-xl font-bold text-white">{topFemale.member.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      <span className="text-pink-400 font-bold">{topFemale.count}</span> services attended
                    </p>
                  </div>
                  <div className="text-4xl">💗</div>
                </div>
              )}

              {/* Top child */}
              {topChild && (
                <div className="bg-gradient-to-r from-green-500/20 via-green-900/10 to-transparent border border-green-500/30 rounded-2xl p-5 flex items-center gap-5">
                  <div className="text-5xl">⭐</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">Shining Star — Most Faithful Child</p>
                    <p className="text-xl font-bold text-white">{topChild.member.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      <span className="text-green-400 font-bold">{topChild.count}</span> services attended
                    </p>
                  </div>
                  <div className="text-4xl">🌟</div>
                </div>
              )}

              {/* Early bird */}
              {mostEarly && mostEarly.firstArrival > 0 && (
                <div className="bg-gradient-to-r from-orange-500/20 via-orange-900/10 to-transparent border border-orange-500/30 rounded-2xl p-5 flex items-center gap-5">
                  <div className="text-5xl">⏰</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Early Bird Award</p>
                    <p className="text-xl font-bold text-white">{mostEarly.member.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Arrived early <span className="text-orange-400 font-bold">{mostEarly.firstArrival}</span> times this quarter
                    </p>
                  </div>
                  <div className="text-4xl">🌅</div>
                </div>
              )}

            </div>
          </div>

          {/* Top 5 attendees */}
          {memberStats.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">📊 Top Attendees This Quarter</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">#</th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">Member</th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">Category</th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">Services</th>
                      <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberStats.slice(0, 10).map((stat, i) => (
                      <tr key={stat.member.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">
                              {stat.member.name.charAt(0)}
                            </div>
                            <span className="text-sm text-white font-medium">{stat.member.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            stat.member.sex === 'Male' ? 'bg-blue-500/10 text-blue-400' :
                            stat.member.sex === 'Female' ? 'bg-pink-500/10 text-pink-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {stat.member.sex}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-white font-semibold">{stat.count}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-800 rounded-full h-1.5 w-16">
                              <div
                                className="h-1.5 rounded-full bg-green-400"
                                style={{ width: `${Math.min((stat.count / totalServices) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">
                              {Math.round((stat.count / totalServices) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}