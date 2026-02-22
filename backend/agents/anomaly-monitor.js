/**
 * anomaly-monitor.js
 * Post-verification monitoring agent for FlowShield.
 * Watches wallet behavior after compliance verification
 * and flags suspicious patterns.
 * Rule-based — no LLM API needed.
 */

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  // Transaction frequency
  MAX_TX_PER_HOUR: 50,
  MAX_TX_PER_DAY: 200,

  // Volume
  LARGE_TX_MULTIPLIER: 10, // 10x average transaction size
  DAILY_VOLUME_MULTIPLIER: 20, // 20x average daily volume

  // Pattern detection
  RAPID_TRANSFER_WINDOW_SECONDS: 300, // 5 minutes
  MIN_RAPID_TRANSFERS: 5, // 5+ transfers in 5 minutes = flag

  // Dormancy
  DORMANCY_THRESHOLD_DAYS: 60,
  POST_DORMANCY_TX_TRIGGER: 10,
};

// Anomaly types and their severity
const ANOMALY_TYPES = {
  HIGH_FREQUENCY: { severity: "high", description: "Unusually high transaction frequency" },
  LARGE_VOLUME: { severity: "high", description: "Transaction volume far exceeds historical average" },
  RAPID_TRANSFERS: { severity: "high", description: "Multiple rapid transfers detected (possible pass-through)" },
  DORMANCY_SPIKE: { severity: "medium", description: "Long-dormant account suddenly active" },
  FLAGGED_INTERACTION: { severity: "high", description: "Interaction with flagged contract post-verification" },
  ROUND_AMOUNTS: { severity: "low", description: "Repeated round-number transfers" },
  NEW_COUNTERPARTIES: { severity: "medium", description: "Sudden spike in unique counterparties" },
  SPLIT_PATTERN: { severity: "high", description: "Large deposit immediately split into many small transfers" },
};

/**
 * Analyze wallet activity for anomalies.
 * @param {Object} walletActivity - Recent activity data from Flow blockchain
 * @returns {Object} - Anomaly report
 */
function detectAnomalies(walletActivity) {
  const anomalies = [];
  let highestSeverity = "none";

  const {
    address,
    txCountLastHour = 0,
    txCountLastDay = 0,
    avgTxSize = 0,
    largestRecentTx = 0,
    dailyVolume = 0,
    avgDailyVolume = 0,
    rapidTransferCount = 0,
    dormantDays = 0,
    recentTxCount = 0,
    flaggedContractInteractions = 0,
    roundAmountTxCount = 0,
    uniqueCounterpartiesLastDay = 0,
    avgUniqueCounterpartiesPerDay = 0,
    hasSplitPattern = false,
  } = walletActivity;

  // High frequency check
  if (txCountLastHour > ANOMALY_THRESHOLDS.MAX_TX_PER_HOUR) {
    anomalies.push({
      type: "HIGH_FREQUENCY",
      ...ANOMALY_TYPES.HIGH_FREQUENCY,
      detail: `${txCountLastHour} transactions in the last hour (threshold: ${ANOMALY_THRESHOLDS.MAX_TX_PER_HOUR})`,
    });
  }

  // Large volume check
  if (avgTxSize > 0 && largestRecentTx > avgTxSize * ANOMALY_THRESHOLDS.LARGE_TX_MULTIPLIER) {
    anomalies.push({
      type: "LARGE_VOLUME",
      ...ANOMALY_TYPES.LARGE_VOLUME,
      detail: `Transaction of ${largestRecentTx} is ${Math.round(largestRecentTx / avgTxSize)}x the average`,
    });
  }

  // Daily volume spike
  if (avgDailyVolume > 0 && dailyVolume > avgDailyVolume * ANOMALY_THRESHOLDS.DAILY_VOLUME_MULTIPLIER) {
    anomalies.push({
      type: "LARGE_VOLUME",
      ...ANOMALY_TYPES.LARGE_VOLUME,
      detail: `Daily volume ${dailyVolume} is ${Math.round(dailyVolume / avgDailyVolume)}x the average`,
    });
  }

  // Rapid transfers (pass-through detection)
  if (rapidTransferCount >= ANOMALY_THRESHOLDS.MIN_RAPID_TRANSFERS) {
    anomalies.push({
      type: "RAPID_TRANSFERS",
      ...ANOMALY_TYPES.RAPID_TRANSFERS,
      detail: `${rapidTransferCount} transfers within ${ANOMALY_THRESHOLDS.RAPID_TRANSFER_WINDOW_SECONDS / 60} minutes`,
    });
  }

  // Dormancy spike
  if (dormantDays > ANOMALY_THRESHOLDS.DORMANCY_THRESHOLD_DAYS && recentTxCount > ANOMALY_THRESHOLDS.POST_DORMANCY_TX_TRIGGER) {
    anomalies.push({
      type: "DORMANCY_SPIKE",
      ...ANOMALY_TYPES.DORMANCY_SPIKE,
      detail: `Account dormant for ${dormantDays} days, then ${recentTxCount} transactions`,
    });
  }

  // Flagged contract interaction
  if (flaggedContractInteractions > 0) {
    anomalies.push({
      type: "FLAGGED_INTERACTION",
      ...ANOMALY_TYPES.FLAGGED_INTERACTION,
      detail: `${flaggedContractInteractions} interaction(s) with flagged contracts since verification`,
    });
  }

  // Split pattern (structuring)
  if (hasSplitPattern) {
    anomalies.push({
      type: "SPLIT_PATTERN",
      ...ANOMALY_TYPES.SPLIT_PATTERN,
      detail: "Large inflow followed by multiple small outflows detected",
    });
  }

  // Counterparty spike
  if (avgUniqueCounterpartiesPerDay > 0 && uniqueCounterpartiesLastDay > avgUniqueCounterpartiesPerDay * 5) {
    anomalies.push({
      type: "NEW_COUNTERPARTIES",
      ...ANOMALY_TYPES.NEW_COUNTERPARTIES,
      detail: `${uniqueCounterpartiesLastDay} unique counterparties today vs ${avgUniqueCounterpartiesPerDay} average`,
    });
  }

  // Determine highest severity
  for (const anomaly of anomalies) {
    if (anomaly.severity === "high") {
      highestSeverity = "high";
      break;
    } else if (anomaly.severity === "medium" && highestSeverity !== "high") {
      highestSeverity = "medium";
    } else if (anomaly.severity === "low" && highestSeverity === "none") {
      highestSeverity = "low";
    }
  }

  // Determine recommended action
  let action = "none";
  if (highestSeverity === "high") {
    action = "trigger_reverification";
  } else if (highestSeverity === "medium") {
    action = "increase_monitoring";
  } else if (highestSeverity === "low") {
    action = "log_and_watch";
  }

  return {
    address,
    anomalyCount: anomalies.length,
    highestSeverity,
    recommendedAction: action,
    anomalies,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock function to fetch recent wallet activity from Flow blockchain.
 * In production, this would use Flow's Access API and event indexing.
 * @param {string} address - Flow wallet address
 * @returns {Object} - Wallet activity data
 */
async function fetchWalletActivity(address) {
  // TODO: Replace with actual Flow Access API calls
  return {
    address,
    txCountLastHour: 5,
    txCountLastDay: 22,
    avgTxSize: 150.0,
    largestRecentTx: 200.0,
    dailyVolume: 3300.0,
    avgDailyVolume: 2800.0,
    rapidTransferCount: 0,
    dormantDays: 0,
    recentTxCount: 22,
    flaggedContractInteractions: 0,
    roundAmountTxCount: 2,
    uniqueCounterpartiesLastDay: 4,
    avgUniqueCounterpartiesPerDay: 3,
    hasSplitPattern: false,
  };
}

/**
 * Run monitoring for a single address.
 * @param {string} address - Flow wallet address
 * @returns {Object} - Monitoring result with anomalies and recommended action
 */
async function monitorAddress(address) {
  const activity = await fetchWalletActivity(address);
  const result = detectAnomalies(activity);

  if (result.anomalyCount > 0) {
    console.log(`[Anomaly Monitor] ${address}: ${result.anomalyCount} anomalies detected (${result.highestSeverity})`);
    console.log(`[Anomaly Monitor] Recommended action: ${result.recommendedAction}`);
  }

  return result;
}

/**
 * Run monitoring for all tracked addresses.
 * In production, this would be triggered by Scheduled Transactions.
 * @param {string[]} addresses - Array of Flow wallet addresses to monitor
 * @returns {Object[]} - Array of monitoring results
 */
async function runMonitoringCycle(addresses) {
  console.log(`[Anomaly Monitor] Starting monitoring cycle for ${addresses.length} addresses...`);

  const results = [];
  for (const address of addresses) {
    const result = await monitorAddress(address);
    results.push(result);
  }

  const flagged = results.filter((r) => r.anomalyCount > 0);
  console.log(`[Anomaly Monitor] Cycle complete. ${flagged.length}/${addresses.length} addresses flagged.`);

  return {
    totalMonitored: addresses.length,
    totalFlagged: flagged.length,
    results,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  detectAnomalies,
  fetchWalletActivity,
  monitorAddress,
  runMonitoringCycle,
  ANOMALY_THRESHOLDS,
  ANOMALY_TYPES,
};
