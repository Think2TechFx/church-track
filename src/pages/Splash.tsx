import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      const session = getSession()
      if (session) {
        navigate('/')
      } else {
        navigate('/welcome')
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⛪</span>
          </div>
          <h1 className="text-4xl font-bold text-green-400 tracking-tight">CLOCK IT!</h1>
          <p className="text-gray-400 text-sm mt-2">Church Management System</p>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}