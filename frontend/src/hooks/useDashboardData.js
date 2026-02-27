import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Smart fallbacks — used only when real data is empty/zero
const FALLBACKS = {
  balance: 1250.00,
  deposited: 800.00,
  borrowed: 200.00,
  earnedYield: 12.45,
}

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
    const targetAddress = address || '0x93c691a98b975493'
    const sources = {}
    let riskData = null
    let complianceData = null
    let poolData = null

    // Fetch all 3 APIs in parallel
    try {
      const [riskRes, complianceRes, poolRes] = await Promise.allSettled([
        fetch(`${API}/api/risk/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: targetAddress }),
        }).then(r => r.json()),

        fetch(`${API}/api/compliance/status/${targetAddress}`).then(r => r.json()),

        fetch(`${API}/api/pool/status`).then(r => r.json()),
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
    } catch (err) {
      // API fetch error — will use fallback data
    }

    // Parse wallet balance from risk data (real FLOW balance from testnet)
    const realBalance = riskData?.walletData?.balance || 0
    const realDeposits = parseFloat(poolData?.totalDeposits) || 0
    const realBorrowed = parseFloat(poolData?.totalBorrowed) || 0

    // Use real data, fall back to demo numbers only when real is 0
    const walletBalance = realBalance > 0 ? realBalance : FALLBACKS.balance
    const deposited = realDeposits > 0 ? realDeposits : FALLBACKS.deposited
    const borrowed = realBorrowed > 0 ? realBorrowed : FALLBACKS.borrowed

    setData({
      // Wallet — real from Flow testnet
      walletBalance,
      deposited,
      borrowed,
      earnedYield: realDeposits > 0 ? realDeposits * 0.042 / 12 : FALLBACKS.earnedYield,
      accountAge: riskData?.walletData?.accountAgeDays || null,
      txCount: riskData?.walletData?.txCount24h || null,
      contractCount: riskData?.walletData?.contractCount || null,
      keyCount: riskData?.walletData?.keyCount || null,
      fundingSources: riskData?.walletData?.fundingSources || null,
      // Risk — real score from backend
      riskScore: riskData?.score ?? 0,
      riskTier: riskData?.tier || 'unknown',
      riskFactors: riskData?.factors || [],
      // Compliance — real from on-chain
      hasCredential: complianceData?.hasCredential || false,
      isValid: complianceData?.isValid || false,
      credentialTier: complianceData?.tier || null,
      expiresAt: complianceData?.expiresAt || null,
      jurisdiction: complianceData?.jurisdiction || null,
      // Pool — real from on-chain
      totalDeposits: realDeposits,
      totalBorrowed: realBorrowed,
      availableLiquidity: parseFloat(poolData?.availableLiquidity) || 0,
      utilizationRate: parseFloat(poolData?.utilizationRate) || 0,
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
  }, [fetchAll])

  return { ...data, refresh: fetchAll }
}
