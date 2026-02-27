import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/index'
import Dashboard from './pages/dashboard'
import CopilotPage from './pages/copilot'
import OperatorPage from './pages/operator'
import PricingPage from './pages/pricing'
import PrivacyPolicy from './pages/privacy'
import TermsOfService from './pages/terms'

function RequireAuth({ children }) {
  try {
    const stored = localStorage.getItem('flowshield_user')
    if (stored && JSON.parse(stored).email) return children
  } catch { /* ignore */ }
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/copilot" element={<RequireAuth><CopilotPage /></RequireAuth>} />
        <Route path="/operator" element={<RequireAuth><OperatorPage /></RequireAuth>} />
        <Route path="/pricing" element={<PricingPage />} />
      </Route>
    </Routes>
  )
}
