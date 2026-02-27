import OperatorDashboard from '@/components/OperatorDashboard'
import GovernancePanel from '@/components/GovernancePanel'

export default function OperatorPage() {
  let userName = ''
  try {
    const u = JSON.parse(localStorage.getItem('flowshield_user') || '{}')
    if (u.displayName) userName = u.displayName
  } catch { /* ignore */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-white">
          {userName ? `${userName}'s Operator Panel` : 'Operator Dashboard'}
        </h1>
        <p className="text-[13px] text-white/30 mt-1">
          Monitor compliance status, risk scores, and audit logs across your protocol.
        </p>
      </div>
      <OperatorDashboard />

      {/* Governance — Multi-sig proposals */}
      <div className="mt-10 pt-8 border-t border-white/[0.04]">
        <GovernancePanel />
      </div>
    </div>
  )
}
