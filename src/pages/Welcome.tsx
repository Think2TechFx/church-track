import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="mb-10">
          <div className="w-20 h-20 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⛪</span>
          </div>
          <h1 className="text-4xl font-bold text-green-400 tracking-tight">CLOCK IT!</h1>
          <p className="text-gray-400 text-sm mt-2">Church Management System</p>
          <p className="text-gray-600 text-xs mt-1">Powered by ThinkTech</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all"
          >
            Login to your Parish
          </button>
          <button
            onClick={() => navigate('/register')}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-medium px-4 py-3 rounded-xl text-sm transition-all"
          >
            Register a New Parish
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-8">
          CLOCK IT! — Attendance & Finance Management
        </p>
      </div>
    </div>
  )
}