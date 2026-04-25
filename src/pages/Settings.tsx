import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../lib/auth'
import type { ChurchUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const church = getSession() as ChurchUser
  const [showDelete, setShowDelete] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [transferForm, setTransferForm] = useState({
    new_pastor_name: '',
    new_pastor_email: '',
    new_password: '',
  })
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleDeleteAccount() {
    if (deleteConfirm !== church.parish_name) {
      setError('Parish name does not match')
      return
    }
    setDeleting(true)
    try {
      // Soft delete — keeps data for audit
      await supabase
        .from('churches')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: church.pastor_email,
        })
        .eq('id', church.id)

      clearSession()
      navigate('/welcome')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  async function handleTransfer() {
    if (!transferForm.new_pastor_name || !transferForm.new_pastor_email || !transferForm.new_password) {
      setError('All fields are required')
      return
    }
    setTransferring(true)
    setError('')
    try {
      // Save transfer record
      await supabase.from('church_transfers').insert({
        church_id: church.id,
        old_pastor_name: church.pastor_name,
        old_pastor_email: church.pastor_email,
        new_pastor_name: transferForm.new_pastor_name,
        new_pastor_email: transferForm.new_pastor_email,
        notes: 'Account transfer via Settings',
      })

      // Update church record
      const new_password_hash = btoa(transferForm.new_password)
      await supabase
        .from('churches')
        .update({
          pastor_name: transferForm.new_pastor_name,
          pastor_email: transferForm.new_pastor_email,
          password_hash: new_password_hash,
        })
        .eq('id', church.id)

      clearSession()
      setSuccess('Account transferred successfully! Please login with the new pastor credentials.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your parish account</p>
      </div>

      {/* Church Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Parish Information</h3>
        <div className="space-y-3">
          {[
            { label: 'Parish Name', value: church.parish_name },
            { label: 'Church Type', value: church.church_type?.toUpperCase() || 'Parish' },
            { label: 'Pastor', value: church.pastor_name },
            { label: 'Email', value: church.pastor_email },
            { label: 'Zone', value: church.zonal_hq },
            { label: 'Province', value: church.province_hq },
            { label: 'Region', value: church.regional_hq },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Transfer Account */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <RefreshCw size={18} className="text-blue-400" />
          <h3 className="text-white font-semibold">Transfer Account</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Transfer this account to a new pastor. The old pastor's data will be kept for records.
        </p>
        {!showTransfer ? (
          <button
            onClick={() => setShowTransfer(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 text-blue-400 font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
          >
            Transfer to New Pastor
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">New Pastor Name *</label>
              <input
                type="text"
                placeholder="Pastor John Doe"
                value={transferForm.new_pastor_name}
                onChange={(e) => setTransferForm({ ...transferForm, new_pastor_name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">New Pastor Email *</label>
              <input
                type="email"
                placeholder="newpastor@example.com"
                value={transferForm.new_pastor_email}
                onChange={(e) => setTransferForm({ ...transferForm, new_pastor_email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">New Password *</label>
              <input
                type="password"
                placeholder="Create a new password"
                value={transferForm.new_password}
                onChange={(e) => setTransferForm({ ...transferForm, new_password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setShowTransfer(false); setError('') }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 size={18} className="text-red-400" />
          <h3 className="text-white font-semibold">Delete Account</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          This will deactivate your account. Your data will be securely retained for audit purposes.
        </p>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs">
                This action cannot be undone. Type your parish name exactly to confirm.
              </p>
            </div>
            <input
              type="text"
              placeholder={`Type "${church.parish_name}" to confirm`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full bg-gray-800 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); setError('') }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== church.parish_name}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}