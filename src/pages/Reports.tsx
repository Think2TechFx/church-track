import { useEffect, useState } from 'react'
import { getSessions, getOffering } from '../lib/db'
import type { Offering } from '../types'
import jsPDF from 'jspdf'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const s = await getSessions()
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
    doc.text('Remittance Report', 20, 30)

    doc.setFontSize(12)
    let y = 50

    doc.text('Sunday Service Offerings:', 20, y)
    y += 10

    SUNDAY_FIELDS.forEach(field => {
      doc.text(`${field.label}: ₦${totals[field.key].toLocaleString()} (Remittance: ₦${remittances[field.key].toFixed(2)})`, 30, y)
      y += 8
    })

    y += 10
    doc.text('Weekly Offerings:', 20, y)
    y += 10

    WEEKLY_FIELDS.forEach(field => {
      doc.text(`${field.label}: ₦${totals[field.key].toLocaleString()} (Remittance: ₦${remittances[field.key].toFixed(2)})`, 30, y)
      y += 8
    })

    doc.save('remittance-report.pdf')
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading reports...</div>

  const { totals, remittances } = calculateTotals()

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <button
          onClick={downloadPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Download PDF
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Remittance Report</h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-300 mb-2">Sunday Service Offerings</h4>
            <div className="space-y-2">
              {SUNDAY_FIELDS.map(field => (
                <div key={field.key} className="flex justify-between text-sm">
                  <span className="text-gray-400">{field.label}</span>
                  <span className="text-white">
                    ₦{totals[field.key].toLocaleString()} 
                    <span className="text-gray-500 ml-2">(Remittance: ₦{remittances[field.key].toFixed(2)})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-300 mb-2">Weekly Offerings</h4>
            <div className="space-y-2">
              {WEEKLY_FIELDS.map(field => (
                <div key={field.key} className="flex justify-between text-sm">
                  <span className="text-gray-400">{field.label}</span>
                  <span className="text-white">
                    ₦{totals[field.key].toLocaleString()} 
                    <span className="text-gray-500 ml-2">(Remittance: ₦{remittances[field.key].toFixed(2)})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}