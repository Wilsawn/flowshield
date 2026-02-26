import OperatorDashboard from '@/components/OperatorDashboard'

export default function OperatorPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-white">Operator Dashboard</h1>
        <p className="text-[13px] text-white/30 mt-1">
          Monitor compliance status, risk scores, and audit logs across your protocol.
        </p>
      </div>
      <OperatorDashboard />
    </div>
  )
}
