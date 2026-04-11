import { useState, useEffect } from 'react'
import { getMemberByPhone, getTodaySession, checkInMember, getAttendance, getMemberByBibleNickname } from '../lib/db'
import type { Member, Session, Attendance } from '../types'
import { Phone, CheckCircle, XCircle, Users, Printer } from 'lucide-react'

export default function CheckIn() {
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
  const [checkedInCount, setCheckedInCount] = useState(0)

  const qrUrl = `${window.location.origin}/checkin-public`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`

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
        setCheckedInCount(att.length)
      }
    } finally {
      setLoadingSession(false)
    }
  }

  async function handleSearch() {
    const input = isChildMode ? nicknameInput.trim() : phone.trim()
    if (!input) return
    setSearching(true)
    setNotFound(false)
    setFoundMember(null)
    setAlreadyCheckedIn(false)
    setSuccess(false)
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
    } finally {
      setSearching(false)
    }
  }

  async function handleCheckIn() {
    if (!session || !foundMember) return
    try {
      const att = await checkInMember(session.id, foundMember.id)
      setAttendance((prev) => [...prev, att])
      setCheckedInCount((prev) => prev + 1)
      setSuccess(true)
      setPhone('')
      setNicknameInput('')
      setFoundMember(null)
      setTimeout(() => setSuccess(false), 4000)
    } catch (e) {
      console.error(e)
    }
  }

  function handleReset() {
    setPhone('')
    setNicknameInput('')
    setFoundMember(null)
    setNotFound(false)
    setAlreadyCheckedIn(false)
    setSuccess(false)
  }

  function handlePrintQR() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>CLOCK IT! - Check-In QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: sans-serif;
              background: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              border: 2px solid #000;
              border-radius: 16px;
              max-width: 400px;
            }
            h1 { font-size: 24px; margin-bottom: 4px; }
            p { color: #555; font-size: 14px; margin: 4px 0; }
            img { margin: 24px 0; width: 200px; height: 200px; }
            .instruction {
              font-size: 13px;
              color: #333;
              margin-top: 8px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⛪ CLOCK IT!</h1>
            <p>Scan to Check In</p>
            <img src="${qrImageUrl}" alt="Check-in QR Code" />
            <p class="instruction">
              Scan this QR code with your phone camera<br/>
              then enter your phone number to check in
            </p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  const serviceLabels: Record<string, string> = {
    sunday: 'Sunday Service',
    tuesday: 'Digging Deep',
    thursday: 'Faith Clinic',
    special: 'Special Program',
  }

  if (loadingSession) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="p-8 max-w-lg mx-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Check-In</h2>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-NG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* No service today */}
      {!session ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <XCircle size={40} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">No Service Today</h3>
          <p className="text-sm text-gray-500">
            Go to the Services page and create a service for today first.
          </p>
        </div>
      ) : (
        <>
          {/* Active service banner */}
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Service</p>
              <p className="text-sm font-semibold text-yellow-400 mt-0.5">
                {session.special_name || serviceLabels[session.type]}
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Users size={16} />
              <span className="text-sm font-semibold">{checkedInCount} checked in</span>
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <p className="text-sm text-green-400 font-medium">
                Check-in successful! God bless you 🙏
              </p>
            </div>
          )}

          {/* Check-in card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <p className="text-xs text-gray-400 mb-3 text-center">
              Manual check-in
            </p>

            {/* Adult/Child toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setIsChildMode(false)
                  setNicknameInput('')
                  setNotFound(false)
                  setFoundMember(null)
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  !isChildMode
                    ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                Adult
              </button>
              <button
                onClick={() => {
                  setIsChildMode(true)
                  setPhone('')
                  setNotFound(false)
                  setFoundMember(null)
                }}
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
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      setNotFound(false)
                      setFoundMember(null)
                      setAlreadyCheckedIn(false)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 tracking-widest"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !phone.trim()}
                  className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-5 py-3 rounded-lg text-sm transition-all"
                >
                  {searching ? '...' : 'Find'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. Timi-David"
                  value={nicknameInput}
                  onChange={(e) => {
                    setNicknameInput(e.target.value)
                    setNotFound(false)
                    setFoundMember(null)
                    setAlreadyCheckedIn(false)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 tracking-widest"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !nicknameInput.trim()}
                  className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-semibold px-5 py-3 rounded-lg text-sm transition-all"
                >
                  {searching ? '...' : 'Find'}
                </button>
              </div>
            )}

            {/* Member found */}
            {foundMember && !alreadyCheckedIn && (
              <div className="mt-4 bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold">
                    {foundMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{foundMember.name}</p>
                    <p className="text-gray-400 text-xs">
                      {foundMember.sex === 'Children'
                        ? `🏷️ ${foundMember.bible_nickname}`
                        : `${foundMember.role} · ${foundMember.sex}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCheckIn}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
                  >
                    Confirm Check-In
                  </button>
                </div>
              </div>
            )}

            {/* Already checked in */}
            {alreadyCheckedIn && foundMember && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                <CheckCircle size={24} className="text-blue-400 mx-auto mb-2" />
                <p className="text-blue-400 font-semibold text-sm">{foundMember.name}</p>
                <p className="text-gray-400 text-xs mt-1">Already checked in for this service</p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-xs text-gray-500 hover:text-white underline underline-offset-2"
                >
                  Check in another person
                </button>
              </div>
            )}

            {/* Not found */}
            {notFound && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <XCircle size={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-red-400 font-semibold text-sm">
                  {isChildMode ? 'Child not found' : 'Member not found'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {isChildMode
                    ? 'No child with this nickname. Please register them in the Members page.'
                    : 'No member with this phone number. Please register them in the Members page.'}
                </p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-xs text-gray-500 hover:text-white underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-white font-semibold mb-1">Church Entrance QR Code</p>
            <p className="text-xs text-gray-500 mb-4">
              Print and display this at the entrance
            </p>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <img
                src={qrImageUrl}
                alt="Check-in QR Code"
                className="w-40 h-40"
              />
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Members scan this to open the check-in page
            </p>
            <button
              onClick={handlePrintQR}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all mx-auto"
            >
              <Printer size={15} />
              Print QR Code
            </button>
          </div>
        </>
      )}
    </div>
  )
}