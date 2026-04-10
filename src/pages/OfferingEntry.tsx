import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessions, getOffering, upsertOffering } from '../lib/db'
import DenominationInput from '../components/DenominationInput'
import type { Session, Offering } from '../types'
import { ArrowLeft, Save } from 'lucide-react'

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

export default function OfferingEntry() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [form, setForm] = useState<typeof emptyOffering>(emptyOffering)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [sessionId])

  async function loadData() {
    const sessions = await getSessions()
    const found = sessions.find((s) => s.id === sessionId)
    if (!found) return
    setSession(found)
    const existing = await getOffering(found.id)
    if (existing) {
      setForm({
        member_tithe: existing.member_tithe,
        ministers_tithe: existing.ministers_tithe,
        sunday_love_offering: existing.sunday_love_offering,
        monthly_thanksgiving: existing.monthly_thanksgiving,
        gospel_fund: existing.gospel_fund,
        first_fruit: existing.first_fruit,
        crm: existing.crm,
        children_offering: existing.children_offering,
        house_fellowship: existing.house_fellowship,
        first_born_redemption: existing.first_born_redemption,
      })
    }
  }

  function getActiveFields(type: string) {
    return type === 'sunday' ? SUNDAY_FIELDS : WEEKLY_FIELDS
  }

  function getTotalCollected() {
    if (!session) return 0
    const fields = getActiveFields(session.type)
    return fields.reduce((a, field) => a + Number(form[field.key]), 0)
  }

  function formatNaira(amount: number) {
    return '₦' + amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    try {
      await upsertOffering({ session_id: session.id, ...form })
      setSaved(true)
      setTimeout(() => navigate('/offerings'), 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-gray-500">Loading...</div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => navigate('/offerings')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        Back to Offerings
      </button>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          {session.special_name || SERVICE_LABELS[session.type]}
        </h2>
        <p className="text-sm text-gray-400 mt-1">{session.date}</p>
        {session.preacher && (
          <p className="text-sm text-gray-500 mt-0.5">Preacher: {session.preacher}</p>
        )}
      </div>

      {/* Category badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6 ${
        session.type === 'sunday'
          ? 'bg-yellow-400/10 text-yellow-400'
          : 'bg-blue-400/10 text-blue-400'
      }`}>
        {session.type === 'sunday' ? '9 Offering Categories' : 'CRM Offering Only'}
      </div>

      {/* Denomination inputs */}
      <div className="space-y-3 mb-6">
        {getActiveFields(session.type).map((field) => (
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

      {/* Total */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Collected</span>
          <span className="text-white font-bold text-base">
            {formatNaira(getTotalCollected())}
          </span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-4 py-3 rounded-xl text-sm transition-all"
      >
        <Save size={15} />
        {saving ? 'Saving...' : saved ? '✓ Saved! Going back...' : 'Save Offering Record'}
      </button>

    </div>
  )
}