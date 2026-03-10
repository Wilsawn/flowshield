import { useState } from 'react'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { API } from '@/lib/api'

export default function ComplianceReportExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API}/api/compliance/report`, { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) throw new Error(`Server error (${res.status})`)
      const data = await res.json()
      if (!data.auditLog || !Array.isArray(data.auditLog) || data.auditLog.length === 0) {
        throw new Error('No audit data available')
      }

      // Generate CSV — handle Supabase shape (action/detail object) and local shape (type/detail string)
      const csvRows = [
        ['Timestamp', 'Action', 'Agent', 'Severity', 'Detail', 'Address'],
        ...data.auditLog.map(e => {
          const detail = typeof e.detail === 'object' ? JSON.stringify(e.detail) : (e.detail || '')
          return [
            e.created_at || e.time || '',
            e.action || e.type || '',
            e.agent || '',
            e.severity || '',
            `"${detail.replace(/"/g, '""')}"`,
            e.operator_address || e.address || '',
          ]
        }),
      ]
      const csv = csvRows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flowshield-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err.name === 'AbortError'
        ? 'Backend still starting — try again in a few seconds'
        : err.message || 'Export failed'
      setError(msg)
      setTimeout(() => setError(null), 4000)
    }
    setExporting(false)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/[0.08] bg-white/[0.02] text-[10px] font-medium text-white/40 hover:text-white/60 hover:border-emerald-500/[0.12] transition-all disabled:opacity-40"
      >
        {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        Export Report
      </button>
      {error && (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80">
          <AlertCircle className="w-3 h-3" />
          {error}
        </span>
      )}
    </div>
  )
}
