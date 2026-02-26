import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export default function useOperatorData() {
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
    const address = '0x93c691a98b975493'
    let riskData = null
    let monitorData = null
    let jurisdictionData = {}
    let isLive = false

    try {
      const [riskRes, monitorRes, ...jurisdictionResults] = await Promise.allSettled([
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

      // Parse jurisdiction rules
      const codes = ['US', 'EU', 'UK', 'SG', 'CA']
      jurisdictionResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value?.rules) {
          jurisdictionData[codes[i]] = result.value.rules
        }
      })
    } catch (err) {
      // API fetch error — will use fallback data
    }

    // Merge monitor activity data into walletData for display
    const walletData = {
      ...(riskData?.walletData || {}),
      ...(monitorData?.activity || {}),
    }

    setData({
      riskScore: riskData?.score ?? null,
      riskTier: riskData?.tier || null,
      riskFactors: riskData?.factors || [],
      walletData,
      anomalies: monitorData?.anomalies || [],
      anomalyCount: monitorData?.anomalyCount ?? monitorData?.anomalies?.length ?? 0,
      monitorRiskLevel: monitorData?.highestSeverity || monitorData?.riskLevel || null,
      jurisdictionRules: jurisdictionData,
      loading: false,
      lastUpdated: new Date(),
      isLive,
      address: '0x93c691a98b975493',
    })
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { ...data, refresh: fetchAll }
}
