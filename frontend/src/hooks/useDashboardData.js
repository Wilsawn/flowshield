import { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

// No fake fallbacks — always show real chain data or 0

export default function useDashboardData(address) {
  const [data, setData] = useState({
    // Wallet
    walletBalance: null,
    accountAge: null,
    txCount: null,
    contractCount: null,
    keyCount: null,
    fundingSources: null,
    // Risk
    riskScore: null,
    riskTier: null,
    riskFactors: [],
    // Compliance
    hasCredential: false,
    isValid: false,
    credentialTier: null,
    expiresAt: null,
    jurisdiction: null,
    // Pool
    totalDeposits: null,
    totalBorrowed: null,
    availableLiquidity: null,
    utilizationRate: null,
    // Meta
    loading: true,
    lastUpdated: null,
    sources: {},
  })

  const fetchAll = useCallback(async () => {
    if (!address) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }
    const targetAddress = address
    const sources = {}
    let riskData = null
    let complianceData = null
    let poolData = null

    // Fetch all 4 APIs in parallel — risk, compliance, global pool stats, and per-user position
    let userPosition = null
    try {
      const [riskRes, complianceRes, poolRes, positionRes] = await Promise.allSettled([
        authFetch(`${API}/api/risk/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: targetAddress }),
        }).then(r => r.json()),

        authFetch(`${API}/api/compliance/status/${targetAddress}`).then(r => r.json()),

        authFetch(`${API}/api/pool/status`).then(r => r.json()),

        authFetch(`${API}/api/pool/position/${targetAddress}`).then(r => r.json()),
      ])

      if (riskRes.status === 'fulfilled') {
        riskData = riskRes.value
        sources.risk = riskData.walletData?.source || 'api'
      }
      if (complianceRes.status === 'fulfilled') {
        complianceData = complianceRes.value
        sources.compliance = complianceData.source || 'api'
      }
      if (poolRes.status === 'fulfilled') {
        poolData = poolRes.value
        sources.pool = poolData.source || 'api'
      }
      if (positionRes.status === 'fulfilled') {
        userPosition = positionRes.value
      }
    } catch (err) {
      // API fetch error — data will show as 0 or null
    }

    // Parse wallet balance from risk data (real FLOW balance from testnet)
    const walletBalance = riskData?.walletData?.balance ?? 0
    // Per-user position from on-chain (not global pool totals)
    const deposited = userPosition?.deposited ?? 0
    const borrowed = userPosition?.borrowed ?? 0

    setData({
      // Wallet — real from Flow testnet
      walletBalance,
      deposited,
      borrowed,
      earnedYield: deposited > 0 && poolData?.baseAPY ? deposited * parseFloat(poolData.baseAPY) / 12 : 0,
      accountAge: riskData?.walletData?.accountAgeDays || null,
      txCount: riskData?.walletData?.txCount24h || null,
      contractCount: riskData?.walletData?.contractCount || null,
      keyCount: riskData?.walletData?.keyCount || null,
      fundingSources: riskData?.walletData?.fundingSources || null,
      // Risk — real score from backend (null = unavailable, distinct from 0 = low risk)
      riskScore: riskData?.score ?? null,
      riskTier: riskData?.tier || null,
      riskFactors: riskData?.factors || [],
      // Compliance — real from on-chain
      hasCredential: complianceData?.hasCredential || false,
      isValid: complianceData?.isValid || false,
      credentialTier: complianceData?.tier || null,
      expiresAt: complianceData?.expiresAt || null,
      jurisdiction: complianceData?.jurisdiction || null,
      // Pool — global stats from on-chain
      totalDeposits: parseFloat(poolData?.totalDeposits) || 0,
      totalBorrowed: parseFloat(poolData?.totalBorrowed) || 0,
      availableLiquidity: parseFloat(poolData?.availableLiquidity) || 0,
      utilizationRate: parseFloat(poolData?.utilizationRate) || 0,
      baseAPYPercent: poolData?.baseAPYPercent ?? null,
      maxLTVPercent: poolData?.maxLTVPercent ?? null,
      borrowRatePercent: poolData?.borrowRatePercent ?? null,
      maxBorrowRemaining: userPosition?.maxBorrowRemaining ?? 0,
      // Meta
      loading: false,
      lastUpdated: new Date(),
      sources,
      isLive: Object.values(sources).some(s => s === 'flow-testnet'),
      address: targetAddress,
    })
  }, [address])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { ...data, refresh: fetchAll }
}
