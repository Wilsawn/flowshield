import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/index'
import Dashboard from './pages/dashboard'
import CopilotPage from './pages/copilot'
import OperatorPage from './pages/operator'
import PrivacyPolicy from './pages/privacy'
import TermsOfService from './pages/terms'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/operator" element={<OperatorPage />} />
      </Route>
    </Routes>
  )
}
