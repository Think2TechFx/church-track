import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSession } from '../lib/auth'
import type { ChurchUser } from '../lib/auth'

interface Props {
  children: (church: ChurchUser) => React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [church, setChurch] = useState<ChurchUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      navigate('/welcome', { replace: true })
    } else {
      setChurch(session)
    }
    setChecking(false)
  }, [location.pathname])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⛪</span>
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!church) return null
  return <>{children(church)}</>
}