import { useEffect, useState } from 'react'
import { getSessions, addSession, deleteSession } from '../lib/db'
import type { Session, ServiceType } from '../types'
import { Plus, Calendar, Printer, Download, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

const SERVICE_LABELS: Record<ServiceType, string> = {
  sunday: 'Sunday Service',
  tuesday: 'Digging Deep',
  thursday: 'Faith Clinic',
  special: 'Special Program',
}

const SERVICE_COLORS: Record<ServiceType, string> = {
  sunday: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  tuesday: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  thursday: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  special: 'text-green-400 bg-green-400/10 border-green-400/20',
}

const emptyForm = {
  type: 'sunday' as ServiceType,
  special_name: '',
  date: new Date().toISOString().split('T')[0],
  preacher: '',
  male_count: 0,
  female_count: 0,
  children_count: 0,
  notes: '',
}

export default function Services() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [endingSession, setEndingSession] = useState<Session | null>(null)
  const [showReport, setShowReport] = useState<Session | null>(null)
  const [reportAttendance, setReportAttendance] = useState<any[]>([])

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.date) {
      setError('Date is required')
      return
    }
    if (form.type === 'special' && !form.special_name) {
      setError('Please enter the special program name')
      return
    }
    setSaving(true)
    setError('')
    try {
      const newSession = await addSession(form)
      setSessions((prev) => [newSession, ...prev])
      setShowModal(false)
      setForm(emptyForm)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

async function handleEndService(session: Session) {
  setEndingSession(null)
  setShowReport(null)
  setReportAttendance([])
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase
    .from('attendance')
    .select('*, members(*)')
    .eq('session_id', session.id)
  setReportAttendance(data || [])
  setShowReport(session)
}

  function handlePrint() {
    window.print()
  }

  async function downloadQR(session: Session) {
    const qrData = `checkin:${session.id}` // Encode session ID for check-in
    const qrDataURL = await QRCode.toDataURL(qrData, { width: 200 })

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Check-in QR Code', 20, 30)
    doc.setFontSize(12)
    doc.text(`Service: ${SERVICE_LABELS[session.type]}`, 20, 45)
    doc.text(`Date: ${session.date}`, 20, 55)
    if (session.preacher) doc.text(`Preacher: ${session.preacher}`, 20, 65)

    // Add QR code image
    doc.addImage(qrDataURL, 'PNG', 20, 75, 50, 50)

    doc.save(`checkin-qr-${session.date}.pdf`)
  }

  async function handleDelete(session: Session) {
    if (!confirm(`Delete ${SERVICE_LABELS[session.type]} on ${session.date}? This will remove all related attendance and offerings.`)) return
    try {
      await deleteSession(session.id)
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Services</h2>
          <p className="text-sm text-gray-400 mt-1">{sessions.length} sessions recorded</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
        >
          <Plus size={16} />
          New Service
        </button>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading services...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Calendar size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No services yet — create your first one!</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Preacher</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${SERVICE_COLORS[session.type]}`}>
                      {session.special_name || SERVICE_LABELS[session.type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">{session.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-400">{session.preacher || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEndingSession(session)}
                        className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                      >
                        End Service
                      </button>
                      <button
                        onClick={() => handleEndService(session)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors flex items-center gap-1"
                      >
                        <Printer size={12} />
                        Report
                      </button>
                      <button
                        onClick={() => downloadQR(session)}
                        className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors flex items-center gap-1"
                      >
                        <Download size={12} />
                        QR PDF
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-5">Create New Service</h3>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Service Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ServiceType })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                >
                  {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {form.type === 'special' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Program Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Easter Convention"
                    value={form.special_name}
                    onChange={(e) => setForm({ ...form, special_name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Preacher</label>
                <input
                  type="text"
                  placeholder="e.g. Pastor John"
                  value={form.preacher}
                  onChange={(e) => setForm({ ...form, preacher: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setError(''); setForm(emptyForm) }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                {saving ? 'Saving...' : 'Create Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Service Confirmation */}
      {endingSession && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-4">🛑</div>
            <h3 className="text-lg font-bold text-white mb-2">End Service?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to end the{' '}
              <span className="text-white font-medium">
                {endingSession.special_name || SERVICE_LABELS[endingSession.type]}
              </span>
              ? This will generate the attendance report.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setEndingSession(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                No, Continue
              </button>
              <button
                onClick={() => handleEndService(endingSession)}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all border border-red-500/20"
              >
                Yes, End Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" id="print-report">

            {/* Report Header */}
            <div className="text-center mb-6 border-b border-gray-200 pb-4">
              <h1 className="text-xl font-bold text-gray-900">✝ Grace Assembly</h1>
              <h2 className="text-lg font-semibold text-gray-700 mt-1">
                {showReport.special_name || SERVICE_LABELS[showReport.type]}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{showReport.date}</p>
              {showReport.preacher && (
                <p className="text-sm text-gray-500">Preacher: {showReport.preacher}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{reportAttendance.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Check-ins</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {reportAttendance.filter((a) => a.members?.sex === 'Male').length}
                </p>
                <p className="text-xs text-blue-500 mt-1">Males</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-pink-700">
                  {reportAttendance.filter((a) => a.members?.sex === 'Female').length}
                </p>
                <p className="text-xs text-pink-500 mt-1">Females</p>
              </div>
            </div>

            {/* Attendance list */}
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Attendance List ({reportAttendance.length})
            </h3>
            {reportAttendance.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No check-ins recorded</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">#</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">Name</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">Sex</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">Role</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reportAttendance.map((att, i) => (
                    <tr key={att.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 text-gray-900 font-medium">{att.members?.name || '—'}</td>
                      <td className="py-2 text-gray-500">{att.members?.sex || '—'}</td>
                      <td className="py-2 text-gray-500">{att.members?.role || '—'}</td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(att.checked_in_at).toLocaleTimeString('en-NG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6 print:hidden">
              <button
                onClick={() => setShowReport(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                <Printer size={15} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}