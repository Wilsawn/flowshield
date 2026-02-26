/// ComplianceAgent.cdc
/// Flow Agent for autonomous compliance monitoring.
///
/// This agent resource lives in the protocol's account and monitors
/// wallet compliance status. It runs via Scheduled Transactions to
/// autonomously check credential expiry, flag risk changes, and
/// trigger re-verification.
///
/// Designed for the Flow Agent pattern:
///   1. Agent resource stored in protocol account
///   2. Scheduled Transaction calls runMonitoringCycle()
///   3. Agent checks all monitored addresses
///   4. Emits events for expired/expiring credentials
///   5. Each cycle schedules the next one (recurring)

import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract ComplianceAgent {

    // ── Paths ──
    access(all) let AgentStoragePath: StoragePath
    access(all) let AdminStoragePath: StoragePath

    // ── Events ──
    access(all) event MonitoringCycleCompleted(checked: Int, expired: Int, expiringSoon: Int, healthy: Int, cycleId: UInt64)
    access(all) event CredentialExpiringSoon(address: Address, expiresAt: UFix64, daysRemaining: Int)
    access(all) event CredentialExpiredDetected(address: Address, expiredAt: UFix64)
    access(all) event CredentialMissing(address: Address)
    access(all) event AddressAddedToMonitoring(address: Address)
    access(all) event AddressRemovedFromMonitoring(address: Address)
    access(all) event ReverificationTriggered(address: Address, reason: String)

    // ── Global State ──
    access(all) var totalCyclesRun: UInt64
    access(all) var totalAddressesMonitored: UInt64

    // ── Monitoring Result ──
    access(all) struct MonitoringResult {
        access(all) let address: Address
        access(all) let status: String          // "healthy", "expiring_soon", "expired", "missing", "revoked"
        access(all) let daysRemaining: Int
        access(all) let riskScore: UInt64
        access(all) let jurisdiction: String

        init(address: Address, status: String, daysRemaining: Int, riskScore: UInt64, jurisdiction: String) {
            self.address = address
            self.status = status
            self.daysRemaining = daysRemaining
            self.riskScore = riskScore
            self.jurisdiction = jurisdiction
        }
    }

    // ── Agent Resource ──
    // Lives in the protocol operator's account
    access(all) resource Agent {

        // Addresses being monitored
        access(all) var monitoredAddresses: [Address]

        // Warning threshold in seconds (default: 7 days = 604800)
        access(all) var expiryWarningThreshold: UFix64

        // Last cycle timestamp
        access(all) var lastCycleTime: UFix64

        /// Add an address to monitoring
        access(all) fun addAddress(_ address: Address) {
            // Check not already monitored
            for existing in self.monitoredAddresses {
                if existing == address {
                    return
                }
            }
            self.monitoredAddresses.append(address)
            ComplianceAgent.totalAddressesMonitored = ComplianceAgent.totalAddressesMonitored + 1
            emit AddressAddedToMonitoring(address: address)
        }

        /// Remove an address from monitoring
        access(all) fun removeAddress(_ address: Address) {
            var i = 0
            while i < self.monitoredAddresses.length {
                if self.monitoredAddresses[i] == address {
                    self.monitoredAddresses.remove(at: i)
                    emit AddressRemovedFromMonitoring(address: address)
                    return
                }
                i = i + 1
            }
        }

        /// Run a full monitoring cycle across all tracked addresses
        /// This is the function called by Scheduled Transactions
        access(all) fun runMonitoringCycle(): [MonitoringResult] {
            let currentTime = getCurrentBlock().timestamp
            var results: [MonitoringResult] = []
            var expiredCount = 0
            var expiringSoonCount = 0
            var healthyCount = 0

            for address in self.monitoredAddresses {
                let result = self.checkAddress(address, currentTime: currentTime)
                results.append(result)

                switch result.status {
                    case "expired":
                        expiredCount = expiredCount + 1
                    case "expiring_soon":
                        expiringSoonCount = expiringSoonCount + 1
                    case "healthy":
                        healthyCount = healthyCount + 1
                    default:
                        break
                }
            }

            self.lastCycleTime = currentTime
            ComplianceAgent.totalCyclesRun = ComplianceAgent.totalCyclesRun + 1

            emit MonitoringCycleCompleted(
                checked: self.monitoredAddresses.length,
                expired: expiredCount,
                expiringSoon: expiringSoonCount,
                healthy: healthyCount,
                cycleId: ComplianceAgent.totalCyclesRun
            )

            return results
        }

        /// Check a single address's compliance status
        access(all) fun checkAddress(_ address: Address, currentTime: UFix64): MonitoringResult {
            let account = getAccount(address)
            let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                ComplianceCredential.PublicPath
            )

            if credRef == nil {
                emit CredentialMissing(address: address)
                return MonitoringResult(
                    address: address,
                    status: "missing",
                    daysRemaining: 0,
                    riskScore: 0,
                    jurisdiction: ""
                )
            }

            let cred = credRef!

            // Check if expired
            if cred.isExpired() {
                emit CredentialExpiredDetected(address: address, expiredAt: cred.getExpiresAt())
                emit ReverificationTriggered(address: address, reason: "Credential expired")
                return MonitoringResult(
                    address: address,
                    status: "expired",
                    daysRemaining: 0,
                    riskScore: cred.getRiskScore(),
                    jurisdiction: cred.getJurisdiction()
                )
            }

            // Check if expiring soon
            let timeRemaining = cred.getExpiresAt() - currentTime
            let daysRemaining = Int(timeRemaining / 86400.0)

            if timeRemaining < self.expiryWarningThreshold {
                emit CredentialExpiringSoon(
                    address: address,
                    expiresAt: cred.getExpiresAt(),
                    daysRemaining: daysRemaining
                )
                return MonitoringResult(
                    address: address,
                    status: "expiring_soon",
                    daysRemaining: daysRemaining,
                    riskScore: cred.getRiskScore(),
                    jurisdiction: cred.getJurisdiction()
                )
            }

            // Check if valid
            if !cred.isValid() {
                emit ReverificationTriggered(address: address, reason: "Credential revoked")
                return MonitoringResult(
                    address: address,
                    status: "revoked",
                    daysRemaining: daysRemaining,
                    riskScore: cred.getRiskScore(),
                    jurisdiction: cred.getJurisdiction()
                )
            }

            // Healthy
            return MonitoringResult(
                address: address,
                status: "healthy",
                daysRemaining: daysRemaining,
                riskScore: cred.getRiskScore(),
                jurisdiction: cred.getJurisdiction()
            )
        }

        /// Update the expiry warning threshold
        access(all) fun setExpiryWarningThreshold(seconds: UFix64) {
            self.expiryWarningThreshold = seconds
        }

        /// Get count of monitored addresses
        access(all) view fun getMonitoredCount(): Int {
            return self.monitoredAddresses.length
        }

        init() {
            self.monitoredAddresses = []
            self.expiryWarningThreshold = 604800.0  // 7 days in seconds
            self.lastCycleTime = 0.0
        }
    }

    // ── Admin Resource ──
    access(all) resource Admin {
        /// Create a new Agent resource for a protocol operator
        access(all) fun createAgent(): @Agent {
            return <- create Agent()
        }

        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Contract Init ──
    init() {
        self.AgentStoragePath = /storage/FlowShieldComplianceAgent
        self.AdminStoragePath = /storage/FlowShieldComplianceAgentAdmin
        self.totalCyclesRun = 0
        self.totalAddressesMonitored = 0

        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}
