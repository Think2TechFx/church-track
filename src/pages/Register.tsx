import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerChurch, saveSession } from '../lib/auth'

const PROVINCES = ['Province 10']

const PROVINCE_DATA: Record<string, Record<string, Record<string, string[]>>> = {
  'Province 10': {
    'All-Sufficient Zone': {
      'Trinity Area': ['Trinity Parish'],
    },
  },
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    country: 'Nigeria',
    state: '',
    province_hq: '',
    zonal_hq: '',
    area_hq: '',
    parish_name: '',
    regional_hq: '',
    pastor_name: '',
    pastor_email: '',
    head_usher_name: '',
    head_usher_email: '',
    password: '',
    confirm_password: '',
  })

  const selectedProvince = form.province_hq
  const zones = selectedProvince ? Object.keys(PROVINCE_DATA[selectedProvince] || {}) : []
  const areas = form.zonal_hq ? Object.keys(PROVINCE_DATA[selectedProvince]?.[form.zonal_hq] || {}) : []
  const parishes = form.area_hq ? PROVINCE_DATA[selectedProvince]?.[form.zonal_hq]?.[form.area_hq] || [] : []

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError('')
    try {
      const church = await registerChurch(form)
      saveSession(church)
      navigate('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
  const labelClass = "text-xs text-gray-400 mb-1.5 block"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">CLOCK IT!</h1>
          <p className="text-sm text-gray-400 mt-2">Church Management System</p>
          <p className="text-xs text-gray-600 mt-1">Register your parish</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 transition-all ${
                  step > s ? 'bg-green-500' : 'bg-gray-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step 1 — Church Location */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Church Information</h2>

              <div>
                <label className={labelClass}>Country *</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>State *</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Province *</label>
                <select
                  value={form.province_hq}
                  onChange={(e) => update('province_hq', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Zone *</label>
                <select
                  value={form.zonal_hq}
                  onChange={(e) => update('zonal_hq', e.target.value)}
                  disabled={!form.province_hq}
                  className={inputClass}
                >
                  <option value="">Select Zone</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Area *</label>
                <select
                  value={form.area_hq}
                  onChange={(e) => update('area_hq', e.target.value)}
                  disabled={!form.zonal_hq}
                  className={inputClass}
                >
                  <option value="">Select Area</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Parish *</label>
                <select
                  value={form.parish_name}
                  onChange={(e) => update('parish_name', e.target.value)}
                  disabled={!form.area_hq}
                  className={inputClass}
                >
                  <option value="">Select Parish</option>
                  {parishes.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Regional HQ</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Regional HQ"
                  value={form.regional_hq}
                  onChange={(e) => update('regional_hq', e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                onClick={() => {
                  if (!form.country || !form.state || !form.province_hq || !form.zonal_hq || !form.area_hq || !form.parish_name) {
                    setError('Please fill all required fields')
                    return
                  }
                  setError('')
                  setStep(2)
                }}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all mt-2"
              >
                Next →
              </button>
            </div>
          )}

          {/* Step 2 — Pastor & Usher */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Leadership Information</h2>

              <div>
                <label className={labelClass}>Pastor-in-Charge Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pastor John Doe"
                  value={form.pastor_name}
                  onChange={(e) => update('pastor_name', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Pastor Email *</label>
                <input
                  type="email"
                  placeholder="pastor@example.com"
                  value={form.pastor_email}
                  onChange={(e) => update('pastor_email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Head Usher Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Brother James"
                  value={form.head_usher_name}
                  onChange={(e) => update('head_usher_name', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Head Usher Email *</label>
                <input
                  type="email"
                  placeholder="usher@example.com"
                  value={form.head_usher_email}
                  onChange={(e) => update('head_usher_email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!form.pastor_name || !form.pastor_email || !form.head_usher_name || !form.head_usher_email) {
                      setError('Please fill all required fields')
                      return
                    }
                    setError('')
                    setStep(3)
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Password */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Create Password</h2>

              <div>
                <label className={labelClass}>Password *</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirm_password}
                  onChange={(e) => update('confirm_password', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
                >
                  {saving ? 'Registering...' : 'Register Parish'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already registered?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-green-400 hover:text-green-300 underline underline-offset-2"
          >
            Login here
          </button>
        </p>

      </div>
    </div>
  )
}