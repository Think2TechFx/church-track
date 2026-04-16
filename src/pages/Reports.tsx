import { useEffect, useState } from 'react'
import { getSessions, getOffering } from '../lib/db'
import { generateMonthlyReport } from '../lib/generateReport'
import type { Session, Offering } from '../types'
import type { ChurchUser } from '../lib/auth'
import { getSession } from '../lib/auth'
import { Download, FileText } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function Reports() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [church, setChurch] = useState<ChurchUser | null>(null)
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  useEffect(() => {
    const session = getSession()
    setChurch(session)
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
    } finally {
      setLoading(false)
    }
  }

  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  async function handleGenerateWithAttendance() {
    if (!church) return
    setGenerating(true)
    try {
      const offeringsMap: Record<string, Offering> = {}
      const attendanceMap: Record<string, { male: number; female: number; children: number }> = {}

      for (const session of monthSessions) {
        const offering = await getOffering(session.id)
        if (offering) offeringsMap[session.id] = offering

        const { supabase } = await import('../lib/supabase')
        const { data: att } = await supabase
          .from('attendance')
          .select('*, members(sex)')
          .eq('session_id', session.id)

        const male = att?.filter((a: any) => a.members?.sex === 'Male').length || 0
        const female = att?.filter((a: any) => a.members?.sex === 'Female').length || 0
        const children = att?.filter((a: any) => a.members?.sex === 'Children').length || 0
        attendanceMap[session.id] = { male, female, children }
      }

      await generateMonthlyReport(
        monthSessions,
        offeringsMap,
        attendanceMap,
        church,
        selectedMonth,
        selectedYear
      )
    } catch (e) {
      console.error('Report error:', e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports</h2>
          <p className="text-sm text-gray-400 mt-1">Generate monthly financial & attendance reports</p>
        </div>
      </div>

      {/* Month/Year selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Select Report Period</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1.5 block">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions preview */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">
          Services in {MONTHS[selectedMonth]} {selectedYear}
        </h3>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : monthSessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No services recorded for this period</p>
        ) : (
          <div className="space-y-2">
            {monthSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    s.type === 'sunday' ? 'bg-yellow-400' :
                    s.type === 'tuesday' ? 'bg-blue-400' :
                    s.type === 'thursday' ? 'bg-purple-400' : 'bg-green-400'
                  }`} />
                  <span className="text-sm text-white">
                    {s.special_name || {
                      sunday: 'Sunday Service',
                      tuesday: 'Digging Deep',
                      thursday: 'Faith Clinic',
                      special: 'Special Program',
                    }[s.type]}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{s.date}</p>
                  {s.preacher && <p className="text-xs text-gray-600">{s.preacher}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={handleGenerateWithAttendance}
          disabled={generating || monthSessions.length === 0}
          className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold px-6 py-4 rounded-2xl text-sm transition-all"
        >
          <Download size={18} />
          {generating ? 'Generating PDF...' : `Download ${MONTHS[selectedMonth]} ${selectedYear} Report`}
        </button>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <FileText size={16} className="text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Report includes:</p>
              <p className="text-xs text-gray-600 mt-1">
                Weekly breakdown (Digging Deep, Faith Clinic, Sunday Service) · 
                Full offering categories with remittance · 
                Attendance per service (Male, Female, Children) · 
                Special programs · Monthly totals · Parish header
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}