/**
 * @file Operator Data Hook
 * @module hooks/useOperatorData
 * @description Fetches operator-specific data: risk scores, anomaly monitoring,
 *              compliance status, and jurisdiction rules from all 5 supported regions.
 * @param {string} walletAddress - The Flow wallet address to monitor
 * @returns {Object} Operator state including risk, anomalies, compliance, and jurisdiction rules
 */
import { useState, useEffect, useCallback } from 'react'
import { API } from '@/lib/api'

export default function useOperatorData(walletAddress) {
  const [data, setData] = useState({
    // Risk monitoring
    riskScore: null,
    riskTier: null,
    riskFactors: [],
    walletData: null,
    // Anomaly detection
    anomalies: [],
    anomalyCount: 0,
    // Jurisdiction rules (on-chain)
    jurisdictionRules: {},
    // Regulatory radar
    radarAlerts: [],
    // Meta
    loading: true,
    lastUpdated: null,
    isLive: false,
  })

  const fetchAll = useCallback(async () => {
    const address = walletAddress
    if (!address) { setData(prev => ({ ...prev, loading: false })); return }
    let riskData = null
    let monitorData = null
    let complianceData = null
    let jurisdictionData = {}
    let isLive = false

    try {
      const [riskRes, monitorRes, complianceRes, ...jurisdictionResults] = await Promise.allSettled([
        // Risk score
        fetch(`${API}/api/risk/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }).then(r => r.json()),

        // Anomaly monitor
        fetch(`${API}/api/risk/monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }).then(r => r.json()),

        // Compliance status
        fetch(`${API}/api/compliance/status/${address}`).then(r => r.json()),

        // Jurisdiction rules from on-chain
        ...['US', 'EU', 'UK', 'SG', 'CA'].map(code =>
          fetch(`${API}/api/compliance/rules/${code}`).then(r => r.json())
        ),
      ])

      if (riskRes.status === 'fulfilled') {
        riskData = riskRes.value
        if (riskData.walletData?.source === 'flow-testnet') isLive = true
      }
      if (monitorRes.status === 'fulfilled') {
        monitorData = monitorRes.value
      }
      if (complianceRes.status === 'fulfilled') {
        complianceData = complianceRes.value
      }

      // Parse jurisdiction rules
      const codes = ['US', 'EU', 'UK', 'SG', 'CA']
      jurisdictionResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value?.rules) {
          jurisdictionData[codes[i]] = result.value.rules
        }
      })
    } catch (err) {
      // API fetch error — data will show as defaults
    }

    // Merge monitor activity data into walletData for display
    const walletData = {
      ...(riskData?.walletData || {}),
      ...(monitorData?.activity || {}),
    }

    // Check if monitor is using live data
    if (monitorData?.activity?.source === 'flow-testnet-live') isLive = true

    setData({
      riskScore: riskData?.score ?? null,
      riskTier: riskData?.tier || null,
      riskFactors: riskData?.factors || [],
      walletData,
      hasCredential: complianceData?.hasCredential || false,
      credentialTier: complianceData?.tier || null,
      anomalies: monitorData?.anomalies || [],
      anomalyCount: monitorData?.anomalyCount ?? monitorData?.anomalies?.length ?? 0,
      monitorRiskLevel: monitorData?.highestSeverity || monitorData?.riskLevel || null,
      monitorSummary: monitorData?.summary || null,
      analysisSource: monitorData?.analysisSource || null,
      jurisdictionRules: jurisdictionData,
      loading: false,
      lastUpdated: new Date(),
      isLive,
      address: walletAddress || null,
    })
  }, [walletAddress])

  useEffect(() => {
    fetchAll()
    // No auto-refresh — operator triggers updates manually via "Run Monitoring Cycle"
  }, [fetchAll])

  return { ...data, refresh: fetchAll }
}
