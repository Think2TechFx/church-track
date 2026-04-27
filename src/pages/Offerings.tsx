import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Save, Download } from 'lucide-react'
import DenominationInput from '../components/DenominationInput'
import { getSessions, getOffering, upsertOffering } from '../lib/db'
import { getSession } from '../lib/auth'
import type { Session, Offering } from '../types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7)
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

  function getTotalCollected(f: any, type: string) {
    const fields = getActiveFields(type)
    return fields.reduce((a, field) => a + Number(f[field.key] || 0), 0)
  }

  function getTotalRemittance(f: any, type: string) {
    const fields = getActiveFields(type)
    return fields.reduce((a, field) => a + Number(f[field.key] || 0) * field.remittance, 0)
  }

  function getTotalRetained(f: any, type: string) {
    return getTotalCollected(f, type) - getTotalRemittance(f, type)
  }

  function getMonthTotals() {
    const collected = reportData.reduce((a, { session, offering }) =>
      a + (offering ? getTotalCollected(offering, session.type) : 0), 0)
    const remitted = reportData.reduce((a, { session, offering }) =>
      a + (offering ? getTotalRemittance(offering, session.type) : 0), 0)
    return { collected, remitted, retained: collected - remitted }
  }

  function formatNaira(amount: number) {
    return 'N' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function downloadPDF() {
    const church = getSession()
    const parishName = church?.parish_name || 'CLOCK IT!'
    const [year, m] = selectedMonth.split('-')
    const monthName = getMonthLabel(Number(m), Number(year))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(0, 128, 0)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('CLOCK IT! — Monthly Offering Report', pageWidth / 2, 9, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`${parishName}  |  Zone: ${church?.zonal_hq || ''}  |  ${church?.province_hq || ''}`, pageWidth / 2, 16, { align: 'center' })
    doc.text(`Pastor: ${church?.pastor_name || ''}  |  Period: ${monthName}`, pageWidth / 2, 22, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    let yPos = 34

    // Group by week
    const weekMap: Record<number, { session: Session; offering: Offering }[]> = {}
    reportData
      .filter(({ session }) => session.type !== 'special')
      .sort((a, b) => new Date(a.session.date).getTime() - new Date(b.session.date).getTime())
      .forEach(({ session, offering }) => {
        const w = getWeekNumber(new Date(session.date))
        if (!weekMap[w]) weekMap[w] = []
        weekMap[w].push({ session, offering })
      })

    const order = ['tuesday', 'thursday', 'sunday']

    Object.entries(weekMap).forEach(([weekNum, items]) => {
      const dates = items.map(i => new Date(i.session.date))
      const minD = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxD = new Date(Math.max(...dates.map(d => d.getTime())))

      if (yPos > 175) { doc.addPage(); yPos = 15 }

      // Week header
      doc.setFillColor(230, 255, 230)
      doc.setDrawColor(0, 128, 0)
      doc.rect(10, yPos, pageWidth - 20, 7, 'FD')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 100, 0)
      doc.text(
        `WEEK ${weekNum}  (${minD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} - ${maxD.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        14, yPos + 5
      )
      doc.setTextColor(0, 0, 0)
      yPos += 9

      const sorted = [...items].sort((a, b) => order.indexOf(a.session.type) - order.indexOf(b.session.type))

      sorted.forEach(({ session, offering }) => {
        if (yPos > 175) { doc.addPage(); yPos = 15 }

        const fields = getActiveFields(session.type)
        const colors: Record<string, number[]> = {
          sunday: [184, 134, 11],
          tuesday: [0, 71, 171],
          thursday: [75, 0, 130],
        }
        const c = colors[session.type] || [80, 80, 80]

        doc.setFillColor(c[0], c[1], c[2])
        doc.rect(10, yPos, pageWidth - 20, 7, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(
          `${SERVICE_LABELS[session.type]}  |  Date: ${session.date}  |  Preacher: ${session.preacher || 'N/A'}`,
          14, yPos + 5
        )
        doc.setTextColor(0, 0, 0)
        yPos += 8

        let sessionCollected = 0
        let sessionRemitted = 0
        const rows: string[][] = fields.map(field => {
          const amt = Number(offering[field.key as keyof Offering] || 0)
          const remit = amt * field.remittance
          sessionCollected += amt
          sessionRemitted += remit
          return [field.label, `${(field.remittance * 100).toFixed(0)}%`, formatNaira(amt), formatNaira(remit), formatNaira(amt - remit)]
        })

        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Remit %', 'Collected', 'To Remit', 'Retained']],
          body: rows,
          foot: [['TOTAL', '', formatNaira(sessionCollected), formatNaira(sessionRemitted), formatNaira(sessionCollected - sessionRemitted)]],
          margin: { left: 10, right: 10 },
          styles: { fontSize: 7.5, cellPadding: 1.8 },
          headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 50, halign: 'right' },
          },
        })
        yPos = (doc as any).lastAutoTable.finalY + 5
      })
    })

    // Special programs
    const specials = reportData.filter(({ session }) => session.type === 'special')
    if (specials.length > 0) {
      if (yPos > 170) { doc.addPage(); yPos = 15 }
      doc.setFillColor(0, 120, 0)
      doc.rect(10, yPos, pageWidth - 20, 7, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('SPECIAL PROGRAMS', 14, yPos + 5)
      doc.setTextColor(0, 0, 0)
      yPos += 9

      specials.forEach(({ session, offering }) => {
        if (yPos > 175) { doc.addPage(); yPos = 15 }
        doc.setFillColor(0, 160, 0)
        doc.rect(10, yPos, pageWidth - 20, 7, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(`${session.special_name || 'Special'}  |  ${session.date}  |  Preacher: ${session.preacher || 'N/A'}`, 14, yPos + 5)
        doc.setTextColor(0, 0, 0)
        yPos += 8

        const amt = Number(offering.crm || 0)
        const remit = amt * 0.60
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Remit %', 'Collected', 'To Remit', 'Retained']],
          body: [['CRM Offering', '60%', formatNaira(amt), formatNaira(remit), formatNaira(amt - remit)]],
          margin: { left: 10, right: 10 },
          styles: { fontSize: 7.5, cellPadding: 1.8 },
          headStyles: { fillColor: [40, 40, 40], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 50, halign: 'right' },
            4: { cellWidth: 50, halign: 'right' },
          },
        })
        yPos = (doc as any).lastAutoTable.finalY + 5
      })
    }

    // Monthly summary
    if (yPos > 170) { doc.addPage(); yPos = 15 }
    const { collected, remitted, retained } = getMonthTotals()
    doc.setFillColor(0, 80, 0)
    doc.rect(10, yPos, pageWidth - 20, 7, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('MONTHLY SUMMARY', 14, yPos + 5)
    doc.setTextColor(0, 0, 0)
    yPos += 9

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: [
        ['Total Collected', formatNaira(collected)],
        ['Total to Remit', formatNaira(remitted)],
        ['Parish Retains', formatNaira(retained)],
      ],
      margin: { left: 10, right: 10 },
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [0, 100, 0], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 80, halign: 'right' },
      },
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `CLOCK IT!  |  ${parishName}  |  Generated: ${new Date().toLocaleString('en-NG')}  |  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      )
    }

    doc.save(`${parishName}-${monthName}-Offerings.pdf`)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Offerings & Tithe</h2>
          <p className="text-sm text-gray-400 mt-1">Select a service to record offerings · View monthly reports</p>
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
            className="bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
          >
            Monthly Report
          </button>
        </div>
      </div>

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
              className="text-left bg-gray-900 border border-gray-800 hover:border-green-500/40 hover:bg-green-500/5 rounded-2xl p-5 transition-all group"
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
              <p className="text-xs text-green-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-5 ${
                selectedSession.type === 'sunday' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-blue-400/10 text-blue-400'
              }`}>
                {selectedSession.type === 'sunday' ? '9 Offering Categories' : 'CRM Offering Only'}
              </div>
              <div className="space-y-3 mb-6">
                {getActiveFields(selectedSession.type).map((field) => (
                  <DenominationInput
                    key={field.key}
                    label={field.label}
                    remittancePct={field.remittance}
                    value={Number(form[field.key as keyof typeof form])}
                    onChange={(total) => setForm({ ...form, [field.key]: total })}
                    showRemittance={false}
                  />
                ))}
              </div>
              <div className="bg-gray-800 rounded-xl p-4 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Collected</span>
                  <span className="text-white font-bold text-base">
                    {formatNaira(getTotalCollected(form, selectedSession.type))}
                  </span>
                </div>
              </div>
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
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  ✝ {getSession()?.parish_name || 'CLOCK IT!'}
                </h2>
                <p className="text-sm text-gray-500">
                  Monthly Offering Report · {getMonthLabel(Number(selectedMonth.split('-')[1]), Number(selectedMonth.split('-')[0]))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm"
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
              <p className="text-center text-gray-400 py-8">No offering records found for this month</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {reportData.map(({ session, offering }) => {
                    const fields = getActiveFields(session.type)
                    const collected = getTotalCollected(offering, session.type)
                    const remitted = getTotalRemittance(offering, session.type)
                    const retained = getTotalRetained(offering, session.type)
                    return (
                      <div key={session.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {session.special_name || SERVICE_LABELS[session.type]}
                            </p>
                            <p className="text-xs text-gray-500">{session.date} {session.preacher && `· ${session.preacher}`}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Collected</p>
                            <p className="text-sm font-bold text-gray-900">{formatNaira(collected)}</p>
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
                              const amt = Number(offering[field.key as keyof Offering] || 0)
                              if (amt === 0) return null
                              return (
                                <tr key={field.key} className="border-b border-gray-50">
                                  <td className="py-1.5 text-gray-600">{field.label}</td>
                                  <td className="py-1.5 text-right text-gray-700">N{amt.toLocaleString()}</td>
                                  <td className="py-1.5 text-right text-red-500">N{(amt * field.remittance).toLocaleString()}</td>
                                  <td className="py-1.5 text-right text-green-600">N{(amt - amt * field.remittance).toLocaleString()}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td className="py-2 font-semibold text-gray-800">Subtotal</td>
                              <td className="py-2 text-right font-semibold text-gray-800">{formatNaira(collected)}</td>
                              <td className="py-2 text-right font-semibold text-red-600">{formatNaira(remitted)}</td>
                              <td className="py-2 text-right font-semibold text-green-700">{formatNaira(retained)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-gray-900 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Monthly Summary</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Collected</p>
                      <p className="text-base font-bold text-white">{formatNaira(getMonthTotals().collected)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Remitted</p>
                      <p className="text-base font-bold text-red-400">{formatNaira(getMonthTotals().remitted)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Church Retains</p>
                      <p className="text-base font-bold text-green-400">{formatNaira(getMonthTotals().retained)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
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