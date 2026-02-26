import { useState, useEffect } from 'react'

const RISK_FACTORS = [
  { id: 'account_age', label: 'Account age < 30 days', points: 8, active: false },
  { id: 'high_volume', label: 'High tx volume in 24h', points: 20, active: false },
  { id: 'rapid_pattern', label: 'Rapid in-out pattern', points: 25, active: false },
  { id: 'flagged_contract', label: 'Flagged contract interaction', points: 30, active: false },
  { id: 'mixer', label: 'Mixer interaction', points: 35, active: false },
  { id: 'multi_funding', label: 'Multiple wallet funding sources', points: 15, active: false },
  { id: 'dormancy_spike', label: 'Dormant then suddenly active', points: 12, active: false },
]

function getMockRiskData(address) {
  // Deterministic mock based on address
  const hash = (address || '0x0000').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const score = hash % 35 // Keep most users low risk for demo
  const tier = score <= 30 ? 'compliant' : score <= 70 ? 'semi-compliant' : 'non-compliant'
  const factors = RISK_FACTORS.map((f) => ({
    ...f,
    active: (hash + f.points) % 7 === 0,
  }))
  return { score, tier, factors: factors.filter((f) => f.active) }
}

export default function useRiskScore(address) {
  const [data, setData] = useState({ score: 0, tier: 'compliant', factors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!address) {
      setData({ score: 0, tier: 'compliant', factors: [] })
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchScore() {
      try {
        const res = await fetch('http://localhost:3002/api/risk/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        if (res.ok) {
          const result = await res.json()
          if (!cancelled) setData(result)
        } else {
          throw new Error('API unavailable')
        }
      } catch {
        // Fall back to mock
        if (!cancelled) setData(getMockRiskData(address))
      }
      if (!cancelled) setLoading(false)
    }

    fetchScore()
    return () => { cancelled = true }
  }, [address])

  return { ...data, loading, error }
}
