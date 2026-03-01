import { useState, useEffect } from 'react'
import { API } from '@/lib/api'

export default function useRiskScore(address) {
  const [data, setData] = useState({ score: null, tier: null, factors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!address) {
      setData({ score: null, tier: null, factors: [] })
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchScore() {
      try {
        const res = await fetch(`${API}/api/risk/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        if (res.ok) {
          const result = await res.json()
          if (!cancelled) setData(result)
        } else {
          if (!cancelled) setError(`API returned ${res.status}`)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Backend unavailable')
      }
      if (!cancelled) setLoading(false)
    }

    fetchScore()
    return () => { cancelled = true }
  }, [address])

  return { ...data, loading, error }
}
