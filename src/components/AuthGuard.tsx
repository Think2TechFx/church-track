import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'
import type { ChurchUser } from '../lib/auth'

interface Props {
  children: (church: ChurchUser) => React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const navigate = useNavigate()
  const [church, setChurch] = useState<ChurchUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      navigate('/welcome')
    } else {
      setChurch(session)
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!church) return null
  return <>{children(church)}</>
}