import { useEffect, useState } from 'react'
import { getSessions, getOffering } from '../lib/db'
import type { Offering, Session } from '../types'
import jsPDF from 'jspdf'

const SERVICE_LABELS: Record<string, string> = {
  sunday: 'Sunday Service',
  tuesday: 'Digging Deep',
  thursday: 'Faith Clinic',
  special: 'Special Program',
}

const SUNDAY_FIELDS = [
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

const WEEKLY_FIELDS = [
  { key: 'crm', label: 'CRM Offering', remittance: 0.60 },
]

export default function Reports() {
  const [offerings, setOfferings] = useState<Record<string, Offering>>({})
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const s = await getSessions()
      setSessions(s)
      const offs: Record<string, Offering> = {}
      for (const session of s) {
        const off = await getOffering(session.id)
        if (off) offs[session.id] = off
      }
      setOfferings(offs)
      setLoading(false)
    }
    load()
  }, [])

  function calculateTotals() {
    const totals: Record<string, number> = {}
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