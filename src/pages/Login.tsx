import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginChurch, saveSession } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const church = await loginChurch(email, password)
      if (!church) {
        setError('Invalid email or password')
        return
      }
      saveSession(church)
      navigate('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">CLOCK IT!</h1>
          <p className="text-sm text-gray-400 mt-2">Church Management System</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Login to your Parish</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Pastor Email</label>
              <input
                type="email"
                placeholder="pastor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all mt-6"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          New parish?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-green-400 hover:text-green-300 underline underline-offset-2"
          >
            Register here
          </button>
        </p>

      </div>
    </div>
  )
}