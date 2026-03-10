import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { API } from '@/lib/api'

export default function ComplianceReportExport() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API}/api/compliance/report`)
      const data = await res.json()

      // Generate CSV
      const csvRows = [
        ['Timestamp', 'Type', 'Severity', 'Detail', 'Address'],
        ...data.auditLog.map(e => [
          e.created_at || e.time || '',
          e.type || '',
          e.severity || '',
          `"${(e.detail || '').replace(/"/g, '""')}"`,
          e.address || '',
        ]),
      ]
      const csv = csvRows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flowshield-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent fail — button will re-enable
    }
    setExporting(false)
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/[0.08] bg-white/[0.02] text-[10px] font-medium text-white/40 hover:text-white/60 hover:border-emerald-500/[0.12] transition-all disabled:opacity-40"
    >
      {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      Export Report
    </button>
  )
}
