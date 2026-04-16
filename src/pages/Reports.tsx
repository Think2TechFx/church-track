import { useEffect, useState } from 'react'
import { getSessions, getOffering, getAttendance } from '../lib/db'
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

  async function handleGenerateReport() {
    if (!church) return
    setGenerating(true)
    try {
      // Load all offerings and attendance for month sessions
      const offeringsMap: Record<string, Offering> = {}
      const attendanceMap: Record<string, { male: number; female: number; children: number }> = {}

      for (const session of monthSessions) {
        const offering = await getOffering(session.id)
        if (offering) offeringsMap[session.id] = offering

        const att = await getAttendance(session.id)
        const male = att.filter((a: any) => a.members?.sex === 'Male').length
        const female = att.filter((a: any) => a.members?.sex === 'Female').length
        const children = att.filter((a: any) => a.members?.sex === 'Children').length
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
      console.error('Report generation error:', e)
    } finally {
      setGenerating(false)
    }
  }

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
    const remittances: Record<string, number> = {}

    SUNDAY_FIELDS.forEach(field => {
      totals[field.key] = 0
      remittances[field.key] = 0
    })
    WEEKLY_FIELDS.forEach(field => {
      totals[field.key] = 0
      remittances[field.key] = 0
    })

    Object.values(offerings).forEach(off => {
      SUNDAY_FIELDS.forEach(field => {
        const value = off[field.key as keyof Offering] as number || 0
        totals[field.key] += value
        remittances[field.key] += value * field.remittance
      })
      WEEKLY_FIELDS.forEach(field => {
        const value = off[field.key as keyof Offering] as number || 0
        totals[field.key] += value
        remittances[field.key] += value * field.remittance
      })
    })

    return { totals, remittances }
  }

  function downloadPDF() {
    const { totals, remittances } = calculateTotals()
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('Church Financial & Service Report', 20, 30)

    doc.setFontSize(12)
    let y = 50

    sessions.forEach(session => {
      const off = offerings[session.id]
      doc.text(`${session.date} - ${session.special_name || SERVICE_LABELS[session.type]}`, 20, y)
      y += 8
      doc.text(`Preacher: ${session.preacher || 'N/A'} | Attendance: ${session.male_count + session.female_count + session.children_count} (${session.male_count}M/${session.female_count}F/${session.children_count}C)`, 20, y)
      y += 10
      if (off) {
        if (session.type === 'sunday') {
          SUNDAY_FIELDS.forEach(field => {
            const value = off[field.key as keyof Offering] as number || 0
            doc.text(`${field.label}: ₦${value.toLocaleString()}`, 30, y)
            y += 8
          })
        } else {
          WEEKLY_FIELDS.forEach(field => {
            const value = off[field.key as keyof Offering] as number || 0
            doc.text(`${field.label}: ₦${value.toLocaleString()}`, 30, y)
            y += 8
          })
        }
      }
      y += 10
      if (y > 250) {
        doc.addPage()
        y = 30
      }
    })

    // Totals and Remittances
    if (y > 200) {
      doc.addPage()
      y = 30
    }
    doc.text('Summary - Totals, Remittances & Amount Left', 20, y)
    y += 20

    doc.text('Sunday Service Offerings:', 20, y)
    y += 10
    SUNDAY_FIELDS.forEach(field => {
      doc.text(`${field.label}: Total ₦${totals[field.key].toLocaleString()} | Remittance ₦${remittances[field.key].toFixed(2)} | Left ₦${(totals[field.key] - remittances[field.key]).toFixed(2)}`, 30, y)
      y += 8
    })

    y += 10
    doc.text('Weekly Offerings:', 20, y)
    y += 10
    WEEKLY_FIELDS.forEach(field => {
      doc.text(`${field.label}: Total ₦${totals[field.key].toLocaleString()} | Remittance ₦${remittances[field.key].toFixed(2)} | Left ₦${(totals[field.key] - remittances[field.key]).toFixed(2)}`, 30, y)
      y += 8
    })

    doc.save('church-report.pdf')
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading reports...</div>

  const { totals, remittances } = calculateTotals()

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Church Financial & Service Reports</h2>
        <div>
          <button
            onClick={downloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-4"
          >
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Print
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Service</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Preacher</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">Attendance</th>
              {SUNDAY_FIELDS.map(field => (
                <th key={field.key} className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">{field.label}</th>
              ))}
              {WEEKLY_FIELDS.map(field => (
                <th key={field.key} className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => {
              const off = offerings[session.id]
              return (
                <tr key={session.id} className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">{session.date}</td>
                  <td className="px-4 py-3 text-gray-400">{session.special_name || SERVICE_LABELS[session.type]}</td>
                  <td className="px-4 py-3 text-gray-400">{session.preacher || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{session.male_count + session.female_count + session.children_count} ({session.male_count}M/{session.female_count}F/{session.children_count}C)</td>
                  {SUNDAY_FIELDS.map(field => (
                    <td key={field.key} className="px-4 py-3 text-gray-400">{off ? '₦' + (off[field.key as keyof Offering] as number || 0).toLocaleString() : '—'}</td>
                  ))}
                  {WEEKLY_FIELDS.map(field => (
                    <td key={field.key} className="px-4 py-3 text-gray-400">{off ? '₦' + (off[field.key as keyof Offering] as number || 0).toLocaleString() : '—'}</td>
                  ))}
                </tr>
              )
            })}
            {/* Totals row */}
            <tr className="border-t-2 border-gray-700 bg-gray-800/50">
              <td className="px-4 py-3 text-white font-semibold" colSpan={4}>TOTALS</td>
              {SUNDAY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-white font-semibold">₦{totals[field.key].toLocaleString()}</td>
              ))}
              {WEEKLY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-white font-semibold">₦{totals[field.key].toLocaleString()}</td>
              ))}
            </tr>
            {/* Remittances row */}
            <tr className="bg-gray-800/30">
              <td className="px-4 py-3 text-yellow-400 font-semibold" colSpan={4}>REMITTANCES</td>
              {SUNDAY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-yellow-400 font-semibold">₦{remittances[field.key].toFixed(2)}</td>
              ))}
              {WEEKLY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-yellow-400 font-semibold">₦{remittances[field.key].toFixed(2)}</td>
              ))}
            </tr>
            {/* Amount Left row */}
            <tr className="bg-gray-800/30">
              <td className="px-4 py-3 text-green-400 font-semibold" colSpan={4}>AMOUNT LEFT</td>
              {SUNDAY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-green-400 font-semibold">₦{(totals[field.key] - remittances[field.key]).toFixed(2)}</td>
              ))}
              {WEEKLY_FIELDS.map(field => (
                <td key={field.key} className="px-4 py-3 text-green-400 font-semibold">₦{(totals[field.key] - remittances[field.key]).toFixed(2)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}