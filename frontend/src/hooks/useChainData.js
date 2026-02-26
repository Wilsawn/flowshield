import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export default function useChainData(address) {
  const [data, setData] = useState({
    account: null,
    contracts: [],
    latestBlock: null,
    compliance: null,
    jurisdictionRules: null,
    loading: true,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    const addr = address || '0x93c691a98b975493'
    try {
      const [accountRes, contractsRes, blockRes, complianceRes] = await Promise.allSettled([
        fetch(`${API}/api/chain/account/${addr}`).then(r => r.json()),
        fetch(`${API}/api/chain/contracts/${addr}`).then(r => r.json()),
        fetch(`${API}/api/chain/blocks/latest`).then(r => r.json()),
        fetch(`${API}/api/compliance/status/${addr}`).then(r => r.json()),
      ])

      setData({
        account: accountRes.status === 'fulfilled' ? accountRes.value : null,
        contracts: contractsRes.status === 'fulfilled' ? contractsRes.value.contracts || [] : [],
        latestBlock: blockRes.status === 'fulfilled' ? blockRes.value : null,
        compliance: complianceRes.status === 'fulfilled' ? complianceRes.value : null,
        loading: false,
        error: null,
      })
    } catch (err) {
      setData(prev => ({ ...prev, loading: false, error: err.message }))
    }
  }, [address])

  const fetchRules = useCallback(async (jurisdictionCode) => {
    try {
      const res = await fetch(`${API}/api/compliance/rules/${jurisdictionCode}`)
      if (res.ok) {
        const data = await res.json()
        setData(prev => ({ ...prev, jurisdictionRules: data }))
        return data
      }
    } catch { /* silent */ }
    return null
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { ...data, refresh: fetchAll, fetchRules }
}
