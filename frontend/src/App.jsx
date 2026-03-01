import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/index'
import Dashboard from './pages/dashboard'
import CopilotPage from './pages/copilot'
import OperatorPage from './pages/operator'
import PricingPage from './pages/pricing'
import PrivacyPolicy from './pages/privacy'
import TermsOfService from './pages/terms'
import NotFound from './pages/NotFound'

function RequireAuth({ children }) {
  try {
    const stored = localStorage.getItem('flowshield_user')
    const wallet = localStorage.getItem('flowshield_wallet')
    // Allow access for both email users and wallet-connected users
    if (stored && JSON.parse(stored).email) return children
    if (stored && JSON.parse(stored).flowAddress) return children
    if (wallet && JSON.parse(wallet).loggedIn) return children
  } catch { /* ignore */ }
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}
