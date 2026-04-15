import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Save, Download } from 'lucide-react'
import DenominationInput from '../components/DenominationInput'
import { getSessions, getOffering, upsertOffering } from '../lib/db'
import type { Session, Offering } from '../types'
import jsPDF from 'jspdf'

const SERVICE_LABELS: Record<string, string> = {
  sunday: 'Sunday Service',
  tuesday: 'Digging Deep',
  thursday: 'Faith Clinic',
  special: 'Special Program',
}

const SUNDAY_FIELDS: {
  key: keyof Omit<Offering, 'id' | 'session_id' | 'recorded_at'>
  label: string
  remittance: number
}[] = [
  { key: 'member_tithe', label: 'Member Tithe', remittance: 0.58 },
  { key: 'ministers_tithe', label: 'Ministers Tithe', remittance: 0.62 },
  { key: 'sunday_love_offering', label: 'Sunday Love Offering', remittance: 0.30 },
  { key: 'monthly_thanksgiving', label: 'Monthly Thanksgiving', remittance: 0.70 },
  { key: 'gospel_fund', label: 'Gospel Fund', remittance: 0.25 },
  { key: 'first_fruit', label: 'First Fruit', remittance: 0.90 },
  { key: 'children_offering', label: 'Children Offering', remittance: 0.30 },
  { key: 'first_born_redemption', label: 'First Born Redemption', remittance: 1.00 },
  { key: 'house_fellowship', label: 'House Fellowship', remittance: 1.00 },
]

const WEEKLY_FIELDS: {
  key: keyof Omit<Offering, 'id' | 'session_id' | 'recorded_at'>
  label: string
  remittance: number
}[] = [
  { key: 'crm', label: 'CRM Offering', remittance: 0.60 },
]

const emptyOffering = {
  member_tithe: 0,
  ministers_tithe: 0,
  sunday_love_offering: 0,
  monthly_thanksgiving: 0,
  gospel_fund: 0,
  first_fruit: 0,
  crm: 0,
  children_offering: 0,
  house_fellowship: 0,
  first_born_redemption: 0,
}

function getMonth(date: string) {
  return new Date(date).getMonth() + 1
}

function getMonthLabel(m: number, year: number) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return `${months[m - 1]} ${year}`
}

export default function Offerings() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [form, setForm] = useState<typeof emptyOffering>(emptyOffering)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<{ session: Session; offering: Offering }[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [months, setMonths] = useState<string[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
      const ms = new Set<string>()
      data.forEach((s) => {
        const m = getMonth(s.date)
        const y = new Date(s.date).getFullYear()
        ms.add(`${y}-${String(m).padStart(2, '0')}`)
      })
      const sorted = Array.from(ms).sort().reverse()
      setMonths(sorted)
      if (sorted.length > 0) setSelectedMonth(sorted[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!selectedSession) return
    setSaving(true)
    try {
      await upsertOffering({ session_id: selectedSession.id, ...form })
      setSaved(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleViewReport() {
    if (!selectedMonth) return
    const [year, m] = selectedMonth.split('-')
    const filtered = sessions.filter((s) => {
      return (
        getMonth(s.date) === Number(m) &&
        new Date(s.date).getFullYear() === Number(year)
      )
    })
    const results: { session: Session; offering: Offering }[] = []
    for (const s of filtered) {
      const offering = await getOffering(s.id)
      if (offering) results.push({ session: s, offering })
    }
    setReportData(results)
    setShowReport(true)
  }

  function getActiveFields(type: string) {
    return type === 'sunday' ? SUNDAY_FIELDS : WEEKLY_FIELDS
  }

  function getTotalCollected(f = form, type = selectedSession?.type || '') {
    const fields = getActiveFields(type)
    return fields.reduce((a, field) => a + Number(f[field.key]), 0)
  }

  function getTotalRemittance(f = form, type = selectedSession?.type || '') {
    const fields = getActiveFields(type)
    return fields.reduce((a, field) => a + Number(f[field.key]) * field.remittance, 0)
  }

  function getTotalRetained(f = form, type = selectedSession?.type || '') {
    return getTotalCollected(f, type) - getTotalRemittance(f, type)
  }

  function getQuarterTotals() {
    const collected = reportData.reduce(
      (a, { session, offering }) => a + (offering ? getTotalCollected(offering, session.type) : 0), 0
    )
    const remitted = reportData.reduce(
      (a, { session, offering }) => a + (offering ? getTotalRemittance(offering, session.type) : 0), 0
    )
    return { collected, remitted, retained: collected - remitted }
  }

  function downloadPDF() {
    const { collected, remitted, retained } = getQuarterTotals()
    const [year, m] = selectedMonth.split('-')
    const monthName = getMonthLabel(Number(m), Number(year))

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Monthly Offerings Report', 20, 30)
    doc.setFontSize(14)
    doc.text(`Month: ${monthName}`, 20, 45)
    doc.setFontSize(12)
    doc.text(`Total Collected: ${formatNaira(collected)}`, 20, 60)
    doc.text(`Total Remitted: ${formatNaira(remitted)}`, 20, 75)
    doc.text(`Total Retained: ${formatNaira(retained)}`, 20, 90)

    let y = 110
    doc.text('Service Breakdown:', 20, y)
    y += 10

    reportData.forEach(({ session, offering }) => {
      const coll = offering ? getTotalCollected(offering, session.type) : 0
      const rem = offering ? getTotalRemittance(offering, session.type) : 0
      const ret = coll - rem
      doc.text(`${SERVICE_LABELS[session.type]} (${session.date}):`, 30, y)
      y += 8
      doc.text(`  Collected: ${formatNaira(coll)} | Remitted: ${formatNaira(rem)} | Retained: ${formatNaira(ret)}`, 30, y)
      y += 10
    })

    doc.save(`monthly-offerings-${selectedMonth}.pdf`)
  }

  function formatNaira(amount: number) {
    return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Offerings & Tithe</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select a service to record offerings · View monthly reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50"
          >
            {months.map((m) => {
              const [year, mNum] = m.split('-')
              return (
                <option key={m} value={m}>
                  {getMonthLabel(Number(mNum), Number(year))}
                </option>
              )
            })}
          </select>
          <button
            onClick={handleViewReport}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
          >
            Monthly Report
          </button>
        </div>
      </div>

      {/* Sessions grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500">No services yet — create one in the Services page first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => navigate(`/offerings/${session.id}`)}
              className="text-left bg-gray-900 border border-gray-800 hover:border-yellow-400/40 hover:bg-yellow-400/5 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  session.type === 'sunday'
                    ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                    : session.type === 'tuesday'
                    ? 'bg-blue-400/10 border-blue-400/20 text-blue-400'
                    : session.type === 'thursday'
                    ? 'bg-purple-400/10 border-purple-400/20 text-purple-400'
                    : 'bg-green-400/10 border-green-400/20 text-green-400'
                }`}>
                  {session.special_name || SERVICE_LABELS[session.type]}
                </span>
              </div>
              <p className="text-white font-semibold text-sm mb-1">{session.date}</p>
              {session.preacher && (
                <p className="text-xs text-gray-500 mb-2">Preacher: {session.preacher}</p>
              )}
              <p className="text-xs text-gray-600">
                {session.type === 'sunday' ? '9 offering categories' : 'CRM offering only'}
              </p>
              <p className="text-xs text-yellow-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to record offerings →
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Offering Input Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h3 className="text-white font-semibold">
                  {selectedSession.special_name || SERVICE_LABELS[selectedSession.type]}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedSession.date}</p>
              </div>
              <button
                onClick={() => { setSelectedSession(null); setForm(emptyOffering); setSaved(false) }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5">

              {/* Category badge */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-5 ${
                selectedSession.type === 'sunday'
                  ? 'bg-yellow-400/10 text-yellow-400'
                  : 'bg-blue-400/10 text-blue-400'
              }`}>
                {selectedSession.type === 'sunday' ? '9 Offering Categories' : 'CRM Offering Only'}
              </div>

              {/* Denomination inputs */}
              <div className="space-y-3 mb-6">
                {getActiveFields(selectedSession.type).map((field) => (
                  <DenominationInput
                    key={field.key}
                    label={field.label}
                    remittancePct={field.remittance}
                    value={Number(form[field.key])}
                    onChange={(total) => setForm({ ...form, [field.key]: total })}
                    showRemittance={false}
                  />
                ))}
              </div>

              {/* Total collected */}
              <div className="bg-gray-800 rounded-xl p-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Collected</span>
                  <span className="text-white font-bold text-base">
                    {formatNaira(getTotalCollected(form, selectedSession.type))}
                  </span>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-4 py-3 rounded-xl text-sm transition-all"
              >
                <Save size={15} />
                {saving ? 'Saving...' : saved ? '✓ Saved Successfully' : 'Save Offering Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">✝ Grace Assembly</h2>
                <p className="text-sm text-gray-500">
                  Monthly Offering Report · {getMonthLabel(Number(selectedMonth.split('-')[1]), Number(selectedMonth.split('-')[0]))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {reportData.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No offering records found for this quarter
              </p>
            ) : (
              <>
                {/* Per session breakdown */}
                <div className="space-y-4 mb-6">
                  {reportData.map(({ session, offering }) => {
                    const fields = getActiveFields(session.type)
                    const collected = offering ? getTotalCollected(offering, session.type) : 0
                    const remitted = offering ? getTotalRemittance(offering, session.type) : 0
                    const retained = offering ? getTotalRetained(offering, session.type) : 0
                    return (
                      <div key={session.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {session.special_name || SERVICE_LABELS[session.type]}
                            </p>
                            <p className="text-xs text-gray-500">{session.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Collected</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatNaira(collected)}
                            </p>
                          </div>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-1.5 text-gray-400 font-medium">Category</th>
                              <th className="text-right py-1.5 text-gray-400 font-medium">Amount</th>
                              <th className="text-right py-1.5 text-gray-400 font-medium">Remit</th>
                              <th className="text-right py-1.5 text-gray-400 font-medium">Retain</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fields.map((field) => {
                              const amt = offering ? Number(offering[field.key as keyof Offering]) : 0
                              if (amt === 0) return null
                              return (
                                <tr key={field.key} className="border-b border-gray-50">
                                  <td className="py-1.5 text-gray-600">{field.label}</td>
                                  <td className="py-1.5 text-right text-gray-700">
                                    ₦{amt.toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-right text-red-500">
                                    ₦{(amt * field.remittance).toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-right text-green-600">
                                    ₦{(amt - amt * field.remittance).toLocaleString()}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 font-semibold text-gray-800">Subtotal</td>
                              <td className="py-2 text-right font-semibold text-gray-800">
                                {formatNaira(collected)}
                              </td>
                              <td className="py-2 text-right font-semibold text-red-600">
                                {formatNaira(remitted)}
                              </td>
                              <td className="py-2 text-right font-semibold text-green-700">
                                {formatNaira(retained)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
                  })}
                </div>

                {/* Quarter totals */}
                <div className="bg-gray-900 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                    Quarter Summary
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Collected</p>
                      <p className="text-base font-bold text-white">
                        {formatNaira(getQuarterTotals().collected)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Remitted</p>
                      <p className="text-base font-bold text-red-400">
                        {formatNaira(getQuarterTotals().remitted)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Church Retains</p>
                      <p className="text-base font-bold text-green-400">
                        {formatNaira(getQuarterTotals().retained)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}