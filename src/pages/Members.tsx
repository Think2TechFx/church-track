import { useEffect, useState } from 'react'
import { getMembers, addMember, updateMember } from '../lib/db'
import { generateBibleNickname } from '../lib/bibleNickname'
import type { Member, MemberRole, Sex, MaritalStatus } from '../types'
import { UserPlus, Search, CheckCircle, XCircle, X } from 'lucide-react'

const ROLES: MemberRole[] = ['Member', 'Pastor', 'Minister', 'Worker']

const emptyForm = {
  name: '',
  sex: 'Male' as Sex,
  phone: '',
  role: 'Member' as MemberRole,
  marital_status: 'Single' as MaritalStatus,
  date_of_birth: '',
  active: true,
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState<Partial<Member>>({})

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    try {
      const data = await getMembers()
      setMembers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.name) {
      setError('Name is required')
      return
    }
    if (form.sex !== 'Children' && !form.phone) {
      setError('Phone number is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        phone: form.sex === 'Children' ? `CHILD-${Date.now()}` : form.phone,
        role: form.sex === 'Children' ? 'Member' as MemberRole : form.role,
        marital_status: form.sex === 'Children' ? undefined : form.marital_status,
        bible_nickname: form.sex === 'Children' ? generateBibleNickname(form.name) : undefined,
      }
      const newMember = await addMember(payload)
      setMembers((prev) => [...prev, newMember])
      setShowModal(false)
      setForm(emptyForm)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSubmit() {
    if (!editMember) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateMember(editMember.id, editForm)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditMember(null)
      setEditForm({})
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(member: Member) {
    if (!confirm(`Remove ${member.name} from the database? This cannot be undone.`)) return
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.from('members').delete().eq('id', member.id)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleActive(member: Member) {
    try {
      const updated = await updateMember(member.id, { active: !member.active })
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch (e) {
      console.error(e)
    }
  }

  function openEdit(member: Member) {
    setEditMember(member)
    setEditForm({
      name: member.name,
      sex: member.sex,
      phone: member.phone,
      role: member.role,
      marital_status: member.marital_status,
      date_of_birth: member.date_of_birth || '',
    })
  }

  function getAge(dob?: string) {
    if (!dob) return '—'
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs'
  }

  function isBirthdayThisMonth(dob?: string) {
    if (!dob) return false
    return new Date(dob).getMonth() === new Date().getMonth()
  }

  function handleSexChange(sex: Sex) {
    setForm({
      ...form,
      sex,
      phone: sex === 'Children' ? '' : form.phone,
      role: sex === 'Children' ? 'Member' : form.role,
      marital_status: sex === 'Children' ? 'Single' : form.marital_status,
    })
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  )

  const birthdays = members.filter((m) => isBirthdayThisMonth(m.date_of_birth))

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Members</h2>
          <p className="text-sm text-gray-400 mt-1">{members.length} registered members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      {/* Birthday alert */}
      {birthdays.length > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-5 py-3.5 mb-6 flex items-center gap-3">
          <span className="text-xl">🎂</span>
          <div>
            <p className="text-sm text-yellow-400 font-medium">
              {birthdays.length} birthday{birthdays.length > 1 ? 's' : ''} this month
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {birthdays.map((m) => m.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading members...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? 'No members match your search' : 'No members yet — add your first one!'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Sex</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Marital</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Age</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm text-white font-medium">{member.name}</span>
                        {isBirthdayThisMonth(member.date_of_birth) && (
                          <span className="ml-2 text-xs">🎂</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      member.sex === 'Male'
                        ? 'bg-blue-500/10 text-blue-400'
                        : member.sex === 'Female'
                        ? 'bg-pink-500/10 text-pink-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {member.sex}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {member.sex === 'Children' 
                      ? <span className="text-yellow-400/70 text-xs">{member.bible_nickname || '—'}</span>
                      : member.phone}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {member.sex === 'Children' ? '—' : (member.marital_status || '—')}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {getAge(member.date_of_birth)}
                  </td>
                  <td className="px-5 py-4">
                    {member.active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle size={13} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <XCircle size={13} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(member)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors underline underline-offset-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(member)}
                        className="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-2"
                      >
                        {member.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleRemove(member)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Register New Member</h3>
              <button
                onClick={() => { setShowModal(false); setError(''); setForm(emptyForm) }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">

              {/* Name */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Adaeze Okonkwo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                />
              </div>

              {/* Sex */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Sex *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Male', 'Female', 'Children'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSexChange(s)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        form.sex === s
                          ? s === 'Male'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : s === 'Female'
                            ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                            : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone — hidden for children */}
              {form.sex !== 'Children' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                </div>
              )}

              {/* Role — locked for children */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Role</label>
                {form.sex === 'Children' ? (
                  <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                    Member (auto-assigned for children)
                  </div>
                ) : (
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as MemberRole })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Marital Status — hidden for children */}
              {form.sex !== 'Children' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Marital Status</label>
                  <select
                    value={form.marital_status}
                    onChange={(e) => setForm({ ...form, marital_status: e.target.value as MaritalStatus })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              )}

              {/* Date of Birth */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
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
                {saving ? 'Saving...' : 'Register Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Edit Member</h3>
              <button
                onClick={() => { setEditMember(null); setEditForm({}); setError('') }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                />
              </div>

              {/* Sex — allows upgrading child to adult */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Sex</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Male', 'Female', 'Children'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({
                        ...editForm,
                        sex: s,
                        role: s === 'Children' ? 'Member' : editForm.role,
                        phone: s === 'Children' ? '' : editForm.phone,
                      })}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        editForm.sex === s
                          ? s === 'Male'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : s === 'Female'
                            ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                            : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {editMember.sex === 'Children' && editForm.sex !== 'Children' && (
                  <p className="text-xs text-green-400 mt-2">
                    ✓ Upgrading from child to adult — phone and marital status will be required
                  </p>
                )}
              </div>

              {/* Phone */}
              {editForm.sex !== 'Children' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  />
                </div>
              )}

              {/* Role */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Role</label>
                {editForm.sex === 'Children' ? (
                  <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                    Member (auto-assigned for children)
                  </div>
                ) : (
                  <select
                    value={editForm.role || 'Member'}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as MemberRole })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Marital Status */}
              {editForm.sex !== 'Children' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Marital Status</label>
                  <select
                    value={editForm.marital_status || 'Single'}
                    onChange={(e) => setEditForm({ ...editForm, marital_status: e.target.value as MaritalStatus })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              )}

              {/* Date of Birth */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Date of Birth</label>
                <input
                  type="date"
                  value={editForm.date_of_birth || ''}
                  onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setEditMember(null); setEditForm({}); setError('') }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}