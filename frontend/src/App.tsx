import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'
import LandingPage from './pages/index'
import Dashboard from './pages/dashboard'
import CopilotPage from './pages/copilot'
import OperatorPage from './pages/operator'
import PricingPage from './pages/pricing'
import PrivacyPolicy from './pages/privacy'
import TermsOfService from './pages/terms'
import DocsPage from './pages/docs'
import NotFound from './pages/NotFound'

function RequireAuth({ children }) {
  try {
    const token = localStorage.getItem('flowshield_token')
    const wallet = localStorage.getItem('flowshield_wallet')
    const parsed = wallet ? JSON.parse(wallet) : null

    // Must have both a session token AND a valid wallet with an address
    if (token && parsed?.loggedIn && parsed?.addr) return children
  } catch { /* ignore */ }

  // Clear any partial/stale auth state
  localStorage.removeItem('flowshield_token')
  localStorage.removeItem('flowshield_wallet')
  localStorage.removeItem('flowshield_user')
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/copilot" element={<RequireAuth><CopilotPage /></RequireAuth>} />
          <Route path="/operator" element={<RequireAuth><OperatorPage /></RequireAuth>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ToastProvider>
    </ErrorBoundary>
  )
}
