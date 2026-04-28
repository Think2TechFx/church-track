import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Dashboard from './pages/Dashboard'
import CheckIn from './pages/CheckIn'
import Members from './pages/Members'
import Services from './pages/Services'
import Offerings from './pages/Offerings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import QuarterlyWrap from './pages/QuarterlyWrap'
import PublicCheckIn from './pages/PublicCheckIn'
import OfferingEntry from './pages/OfferingEntry'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import type { ChurchUser } from './lib/auth'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route — go straight to welcome */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public member check-in — no auth needed */}
        <Route path="/checkin-public" element={<PublicCheckIn />} />

        {/* Admin pages — protected */}
        <Route path="/*" element={
          <AuthGuard>
            {(church: ChurchUser) => (
              <Layout church={church}>
                <Routes>
                  <Route path="/" element={<Dashboard church={church} />} />
                  <Route path="/checkin" element={<CheckIn />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/offerings" element={<Offerings />} />
                  <Route path="/offerings/:sessionId" element={<OfferingEntry />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            )}
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App