/**
 * risk-scoring.js
 * Rule-based risk scoring agent for FlowShield.
 * Analyzes public on-chain Flow data to assign risk tiers.
 * No LLM API needed — runs on deterministic rules.
 */

// Risk score thresholds
const RISK_THRESHOLDS = {
  LOW: 30,      // 0-30: compliant
  MEDIUM: 70,   // 31-70: semi-compliant
  HIGH: 100,    // 71-100: non-compliant
};

// Risk factors and their point values
const RISK_FACTORS = {
  // Account age
  ACCOUNT_AGE_UNDER_7_DAYS: 15,
  ACCOUNT_AGE_UNDER_30_DAYS: 8,

  // Transaction patterns
  HIGH_TX_VOLUME_24H: 20,        // > 100 transactions in 24 hours
  RAPID_IN_OUT_PATTERN: 25,      // Funds in and out within minutes
  ROUND_NUMBER_TRANSFERS: 10,    // Repeated exact round numbers

  // Interaction patterns
  FLAGGED_CONTRACT_INTERACTION: 30,
  MIXER_INTERACTION: 35,
  MULTIPLE_WALLET_FUNDING: 15,   // Funded by many wallets quickly

  // Behavioral
  FIRST_TIME_DEFI_USER: 5,
  UNUSUAL_HOURS_ACTIVITY: 8,
  DORMANT_THEN_ACTIVE: 12,      // Long dormancy then sudden activity
};

/**
 * Calculate risk score for a wallet address.
 * @param {Object} walletData - Public on-chain data for the wallet
 * @returns {Object} - Risk score and breakdown
 */
function calculateRiskScore(walletData) {
  let totalScore = 0;
  const factors = [];

  // Account age check
  const accountAgeDays = walletData.accountAgeDays || 0;
  if (accountAgeDays < 7) {
    totalScore += RISK_FACTORS.ACCOUNT_AGE_UNDER_7_DAYS;
    factors.push({ factor: "Account less than 7 days old", points: RISK_FACTORS.ACCOUNT_AGE_UNDER_7_DAYS });
  } else if (accountAgeDays < 30) {
    totalScore += RISK_FACTORS.ACCOUNT_AGE_UNDER_30_DAYS;
    factors.push({ factor: "Account less than 30 days old", points: RISK_FACTORS.ACCOUNT_AGE_UNDER_30_DAYS });
  }

  // Transaction volume check
  const txCount24h = walletData.transactionCount24h || 0;
  if (txCount24h > 100) {
    totalScore += RISK_FACTORS.HIGH_TX_VOLUME_24H;
    factors.push({ factor: "High transaction volume (24h)", points: RISK_FACTORS.HIGH_TX_VOLUME_24H });
  }

  // Rapid in-out pattern
  if (walletData.hasRapidInOutPattern) {
    totalScore += RISK_FACTORS.RAPID_IN_OUT_PATTERN;
    factors.push({ factor: "Rapid fund in/out pattern detected", points: RISK_FACTORS.RAPID_IN_OUT_PATTERN });
  }

  // Flagged contract interaction
  if (walletData.flaggedContractInteractions > 0) {
    totalScore += RISK_FACTORS.FLAGGED_CONTRACT_INTERACTION;
    factors.push({ factor: "Interaction with flagged contracts", points: RISK_FACTORS.FLAGGED_CONTRACT_INTERACTION });
  }

  // Mixer interaction
  if (walletData.mixerInteractions > 0) {
    totalScore += RISK_FACTORS.MIXER_INTERACTION;
    factors.push({ factor: "Mixer service interaction", points: RISK_FACTORS.MIXER_INTERACTION });
  }

  // Multiple wallet funding
  if (walletData.uniqueFundingSources > 10) {
    totalScore += RISK_FACTORS.MULTIPLE_WALLET_FUNDING;
    factors.push({ factor: "Funded by many wallets", points: RISK_FACTORS.MULTIPLE_WALLET_FUNDING });
  }

  // Dormant then active
  if (walletData.dormantDays > 90 && walletData.transactionCount24h > 20) {
    totalScore += RISK_FACTORS.DORMANT_THEN_ACTIVE;
    factors.push({ factor: "Dormant account suddenly active", points: RISK_FACTORS.DORMANT_THEN_ACTIVE });
  }

  // Cap at 100
  totalScore = Math.min(totalScore, 100);

  // Determine tier
  let tier;
  if (totalScore <= RISK_THRESHOLDS.LOW) {
    tier = "compliant";
  } else if (totalScore <= RISK_THRESHOLDS.MEDIUM) {
    tier = "semi-compliant";
  } else {
    tier = "non-compliant";
  }

  return {
    score: totalScore,
    tier,
    factors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock function to fetch wallet data from Flow blockchain.
 * In production, this would use Flow's Access API.
 */
async function fetchWalletData(address) {
  // TODO: Replace with actual Flow Access API calls
  // https://developers.flow.com/tools/clients/fcl-js
  return {
    address,
    accountAgeDays: 45,
    transactionCount24h: 12,
    hasRapidInOutPattern: false,
    flaggedContractInteractions: 0,
    mixerInteractions: 0,
    uniqueFundingSources: 3,
    dormantDays: 0,
  };
}

// Export for use in API server
module.exports = {
  calculateRiskScore,
  fetchWalletData,
  RISK_THRESHOLDS,
  RISK_FACTORS,
};
