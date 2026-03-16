/**
 * @file Dashboard Data Hook
 * @module hooks/useDashboardData
 * @description Fetches and manages all dashboard data from the FlowShield API.
 *              Fires 4 API calls in parallel (risk, compliance, pool, position)
 *              and renders data progressively as each responds.
 *              Auto-refreshes every 30 seconds.
 * @param {string} address - The Flow wallet address to fetch data for
 * @returns {Object} Dashboard state including risk score, compliance status, pool data, and loading state
 */
import { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

// No fake fallbacks — always show real chain data or 0
// Data renders progressively as each API responds.

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
    deposited: 0,
    borrowed: 0,
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

    // Fire all 4 requests independently — update state as each one resolves
    // This way the UI renders progressively instead of waiting for all 4.

    // 1. Risk score (usually slowest)
    authFetch(`${API}/api/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: targetAddress }),
    })
      .then(r => r.json())
      .then(riskData => {
        setData(prev => ({
          ...prev,
          walletBalance: riskData?.walletData?.balance ?? prev.walletBalance,
          accountAge: riskData?.walletData?.accountAgeDays || prev.accountAge,
          txCount: riskData?.walletData?.txCount24h || prev.txCount,
          contractCount: riskData?.walletData?.contractCount || prev.contractCount,
          keyCount: riskData?.walletData?.keyCount || prev.keyCount,
          fundingSources: riskData?.walletData?.fundingSources || prev.fundingSources,
          riskScore: riskData?.score ?? prev.riskScore,
          riskTier: riskData?.tier || prev.riskTier,
          riskFactors: riskData?.factors || prev.riskFactors,
          sources: { ...prev.sources, risk: riskData?.walletData?.source || 'api' },
          loading: false,
          lastUpdated: new Date(),
          address: targetAddress,
        }))
      })
      .catch(() => {
        setData(prev => ({ ...prev, loading: false }))
      })

    // 2. Compliance status
    authFetch(`${API}/api/compliance/status/${targetAddress}`)
      .then(r => r.json())
      .then(complianceData => {
        setData(prev => ({
          ...prev,
          hasCredential: complianceData?.hasCredential || false,
          isValid: complianceData?.isValid || false,
          credentialTier: complianceData?.tier || null,
          expiresAt: complianceData?.expiresAt || null,
          jurisdiction: complianceData?.jurisdiction || null,
          sources: { ...prev.sources, compliance: complianceData?.source || 'api' },
          loading: false,
          lastUpdated: new Date(),
          address: targetAddress,
        }))
      })
      .catch(() => {})

    // 3. Global pool stats
    authFetch(`${API}/api/pool/status`)
      .then(r => r.json())
      .then(poolData => {
        setData(prev => ({
          ...prev,
          totalDeposits: parseFloat(poolData?.totalDeposits) || 0,
          totalBorrowed: parseFloat(poolData?.totalBorrowed) || 0,
          availableLiquidity: parseFloat(poolData?.availableLiquidity) || 0,
          utilizationRate: parseFloat(poolData?.utilizationRate) || 0,
          baseAPYPercent: poolData?.baseAPYPercent ?? null,
          maxLTVPercent: poolData?.maxLTVPercent ?? null,
          borrowRatePercent: poolData?.borrowRatePercent ?? null,
          sources: { ...prev.sources, pool: poolData?.source || 'api' },
          loading: false,
          lastUpdated: new Date(),
          address: targetAddress,
        }))
      })
      .catch(() => {})

    // 4. User pool position
    authFetch(`${API}/api/pool/position/${targetAddress}`)
      .then(r => r.json())
      .then(userPosition => {
        setData(prev => ({
          ...prev,
          deposited: userPosition?.deposited ?? 0,
          borrowed: userPosition?.borrowed ?? 0,
          maxBorrowRemaining: userPosition?.maxBorrowRemaining ?? 0,
          loading: false,
          lastUpdated: new Date(),
          address: targetAddress,
        }))
      })
      .catch(() => {})

  }, [address])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const isLive = Object.values(data.sources).some(s => s === 'flow-testnet')

  return { ...data, isLive, refresh: fetchAll }
}
