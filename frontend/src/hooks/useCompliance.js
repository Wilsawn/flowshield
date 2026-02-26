import { useState, useEffect, useCallback } from 'react'

function getMockCompliance(address) {
  const hash = (address || '0x0000').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const daysUntilExpiry = 10 + (hash % 50)
  const expiresAt = new Date(Date.now() + daysUntilExpiry * 86400000).toISOString().split('T')[0]
  return {
    isValid: true,
    tier: 'standard',
    riskScore: hash % 35,
    expiresAt,
    jurisdiction: 'US',
    credentialId: `0x${hash.toString(16).padStart(8, '0')}`,
    zkProofValid: true,
    lastVerified: new Date(Date.now() - (hash % 48) * 3600000).toISOString(),
  }
}

export default function useCompliance(address) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:3002/api/compliance/status/${address}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setLoading(false)
        return
      }
    } catch {
      // Fall back to mock
    }
    setData(getMockCompliance(address))
    setLoading(false)
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, loading, error, refresh }
}
