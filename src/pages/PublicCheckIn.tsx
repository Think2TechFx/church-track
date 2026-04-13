import { useState, useEffect } from 'react'
import { getMemberByPhone, getTodaySession, checkInMember, getAttendance, getMemberByBibleNickname } from '../lib/db'
import { supabase } from '../lib/supabase'
import type { Member, Session, Attendance } from '../types'

export default function PublicCheckIn() {
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [phone, setPhone] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [isChildMode, setIsChildMode] = useState(false)
  const [searching, setSearching] = useState(false)
  const [foundMember, setFoundMember] = useState<Member | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [success, setSuccess] = useState(false)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [streakMessage, setStreakMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTodaySession()
  }, [])

  async function fetchTodaySession() {
    try {
      const data = await getTodaySession()
      setSession(data)
      if (data) {
        const att = await getAttendance(data.id)
        setAttendance(att)
      }
    } catch (e) {
      console.error('Session error:', e)
      setError('Failed to load session. Please refresh.')
    } finally {
      setLoadingSession(false)
    }
  }

  async function getStreak(memberId: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('attendance')
        .select('session_id')
        .eq('member_id', memberId)
        .order('checked_in_at', { ascending: false })
        .limit(10)
      return data?.length || 0
    } catch {
      return 0
    }
  }

  function getStreakMessage(streak: number, name: string): string {
    const first = name.split(' ')[0]
    if (streak >= 10) return `🏆 Unstoppable ${first}! 10 services in a row — Heaven is proud of you!`
    if (streak >= 5) return `🔥 On fire ${first}! 5 services straight — your consistency is inspiring!`
    if (streak >= 3) return `⭐ Way to go ${first}! 3 services in a row — keep the fire burning!`
    return ''
  }

  async function handleSearch() {
    const input = isChildMode ? nicknameInput.trim() : phone.trim()
    if (!input) return
    setSearching(true)
    setNotFound(false)
    setFoundMember(null)
    setAlreadyCheckedIn(false)
    setSuccess(false)
    setStreakMessage('')
    setError('')

    try {
      const member = isChildMode
        ? await getMemberByBibleNickname(input)
        : await getMemberByPhone(input)

      if (!member) {
        setNotFound(true)
        return
      }
      const alreadyIn = attendance.some((a) => a.member_id === member.id)
      if (alreadyIn) {
        setFoundMember(member)
        setAlreadyCheckedIn(true)
        return
      }
      setFoundMember(member)
    } catch (e) {
      console.error('Search error:', e)
      setError('Something went wrong. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleCheckIn() {
    if (!session || !foundMember) return
    try {
      const att = await checkInMember(session.id, foundMember.id)
      setAttendance((prev) => [...prev, att])
      const streak = await getStreak(foundMember.id)
      const msg = getStreakMessage(streak, foundMember.name)
      setStreakMessage(msg)
      setSuccess(true)
      setPhone('')
      setNicknameInput('')
      setFoundMember(null)
    } catch (e) {
      console.error('Check-in error:', e)
      setError('Check-in failed. Please try again.')
    }
  }

  function handleReset() {
    setPhone('')
    setNicknameInput('')
    setFoundMember(null)
    setNotFound(false)
    setAlreadyCheckedIn(false)
    setSuccess(false)
    setStreakMessage('')
    setError('')
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⛪</div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => { setError(''); fetchTodaySession() }}
            className="mt-4 text-xs text-yellow-400 underline"
          >
            Tap to retry
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✝</div>
          <h1 className="text-xl font-bold text-white mb-2">CLOCK IT!</h1>
          <p className="text-gray-400 text-sm">No service is currently active.</p>
          <p className="text-gray-600 text-xs mt-2">Please check back during service time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Church header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⛪</div>
          <h1 className="text-xl font-bold text-green-400">CLOCK IT!</h1>
          <p className="text-sm text-yellow-400 mt-1">
            {session.special_name || {
              sunday: 'Sunday Service',
              tuesday: 'Digging Deep',
              thursday: 'Faith Clinic',
              special: session.special_name,
            }[session.type]}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🙏</div>
            <h2 className="text-white font-bold text-lg mb-1">Welcome!</h2>
            <p className="text-green-400 text-sm mb-1">You're checked in successfully</p>
            {streakMessage && (
              <p className="text-yellow-400 text-sm font-medium mt-3 leading-relaxed">
                {streakMessage}
              </p>
            )}
            <button
              onClick={handleReset}
              className="mt-5 text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
            >
              Check in another person
            </button>
          </div>
        )}

        {/* Already checked in */}
        {alreadyCheckedIn && foundMember && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-white font-bold text-lg mb-1">{foundMember.name}</h2>
            <p className="text-blue-400 text-sm">Already checked in for this service</p>
            <button
              onClick={handleReset}
              className="mt-5 text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
            >
              Check in another person
            </button>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">❓</div>
            <h2 className="text-white font-bold mb-1">Not Registered</h2>
            <p className="text-red-400 text-sm">
              {isChildMode
                ? 'No child found with this nickname.'
                : 'No member found with this number.'}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Please see the usher at the entrance to get registered.
            </p>
            <button
              onClick={handleReset}
              className="mt-5 text-xs text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Member found — confirm */}
        {foundMember && !alreadyCheckedIn && !success && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 text-xl font-bold mx-auto mb-3">
                {foundMember.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-white font-bold">{foundMember.name}</h2>
              <p className="text-gray-400 text-xs mt-1">
                {foundMember.sex === 'Children'
                  ? `🏷️ ${foundMember.bible_nickname}`
                  : foundMember.role}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-3 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-4 py-3 rounded-xl text-sm transition-all"
              >
                Check In ✓
              </button>
            </div>
          </div>
        )}

        {/* Check in input */}
        {!success && !notFound && !foundMember && !alreadyCheckedIn && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

            {/* Toggle adult/child */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setIsChildMode(false); setNicknameInput(''); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  !isChildMode
                    ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                Adult
              </button>
              <button
                onClick={() => { setIsChildMode(true); setPhone(''); setNotFound(false); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isChildMode
                    ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                Child
              </button>
            </div>

            {!isChildMode ? (
              <>
                <label className="text-xs text-gray-400 mb-3 block text-center">
                  Enter your phone number to check in
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-lg text-white text-center placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 tracking-widest mb-4"
                />
              </>
            ) : (
              <>
                <label className="text-xs text-gray-400 mb-3 block text-center">
                  Enter your Bible nickname to check in
                </label>
                <input
                  type="text"
                  placeholder="e.g. Timi-David"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-lg text-white text-center placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 tracking-widest mb-4"
                />
              </>
            )}

            <button
              onClick={handleSearch}
              disabled={searching || (!isChildMode ? !phone.trim() : !nicknameInput.trim())}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-bold px-4 py-3 rounded-xl text-sm transition-all"
            >
              {searching ? 'Searching...' : 'Check In'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}