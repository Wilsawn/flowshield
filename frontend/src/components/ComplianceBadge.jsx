import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const tierConfig = {
  compliant: {
    icon: ShieldCheck,
    label: 'Compliant',
    variant: 'success',
    color: 'text-emerald-400',
  },
  semiCompliant: {
    icon: ShieldAlert,
    label: 'Semi-Compliant',
    variant: 'warning',
    color: 'text-yellow-400',
  },
  nonCompliant: {
    icon: ShieldX,
    label: 'Non-Compliant',
    variant: 'danger',
    color: 'text-red-400',
  },
}

export default function ComplianceBadge({ tier = 'compliant', expiresAt, size = 'default' }) {
  const config = tierConfig[tier] || tierConfig.compliant
  const Icon = config.icon

  const expiryDate = expiresAt ? new Date(expiresAt * 1000).toLocaleDateString() : null

  if (size === 'sm') {
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
        tier === 'compliant' ? 'bg-emerald-500/20' :
        tier === 'semiCompliant' ? 'bg-yellow-500/20' : 'bg-red-500/20'
      }`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>
      <div>
        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
        {expiryDate && (
          <p className="text-xs text-muted-foreground">Expires {expiryDate}</p>
        )}
      </div>
    </div>
  )
}
