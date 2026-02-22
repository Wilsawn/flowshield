// anomaly-monitor.js
// Post-verification behavioral monitoring. Rule-based, no API needed.
//
// What to implement:
// - Define anomaly types: high frequency, large volume, rapid transfers,
//   dormancy spike, flagged contract interaction, split pattern,
//   counterparty spike, round amounts
// - Each anomaly has a severity (low, medium, high)
// - detectAnomalies(walletActivity) -> { anomalyCount, highestSeverity, recommendedAction, anomalies }
// - monitorAddress(address) -> fetch activity + detect anomalies
// - runMonitoringCycle(addresses) -> batch monitor all tracked wallets
