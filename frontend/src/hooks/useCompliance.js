import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

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
    setError(null)
    try {
      const res = await fetch(`${API}/api/compliance/status/${address}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        setError(`API returned ${res.status}`)
        setData(null)
      }
    } catch (err) {
      setError(err.message || 'Backend unavailable')
      setData(null)
    }
    setLoading(false)
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, loading, error, refresh }
}
