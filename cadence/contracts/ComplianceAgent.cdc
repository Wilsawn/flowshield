/// ComplianceAgent.cdc
/// Flow Agent that runs on Scheduled Transactions for autonomous monitoring.
/// TODO: Implement full Flow Agent interface once confirmed with Flow team.
/// This agent checks credential expiry, updates risk scores, and
/// triggers re-verification when anomalies are detected.

import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract ComplianceAgent {

    // ===== Events =====
    access(all) event MonitoringCycleCompleted(timestamp: UFix64, accountsChecked: UInt64)
    access(all) event RiskScoreUpdated(address: Address, oldScore: UInt8, newScore: UInt8)
    access(all) event ReVerificationTriggered(address: Address, reason: String)

    // ===== State =====
    // Addresses being monitored
    access(self) var monitoredAddresses: [Address]

    // Last monitoring cycle timestamp
    access(self) var lastCycleTimestamp: UFix64

    // ===== Public Functions =====

    access(all) view fun getMonitoredCount(): Int {
        return self.monitoredAddresses.length
    }

    access(all) view fun getLastCycleTimestamp(): UFix64 {
        return self.lastCycleTimestamp
    }

    // ===== Admin Resource =====
    access(all) resource Admin {

        // Add an address to monitoring
        access(all) fun addToMonitoring(address: Address) {
            if !ComplianceAgent.monitoredAddresses.contains(address) {
                ComplianceAgent.monitoredAddresses.append(address)
            }
        }

        // Remove an address from monitoring
        access(all) fun removeFromMonitoring(address: Address) {
            if let index = ComplianceAgent.monitoredAddresses.firstIndex(of: address) {
                ComplianceAgent.monitoredAddresses.remove(at: index)
            }
        }

        // Run a monitoring cycle
        // In production, this would be triggered by a Scheduled Transaction
        access(all) fun runMonitoringCycle() {
            var checked: UInt64 = 0

            for address in ComplianceAgent.monitoredAddresses {
                let account = getAccount(address)

                if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                    ComplianceCredential.CredentialPublicPath
                ) {
                    // Check for expiration
                    if credentialRef.isExpired() {
                        emit ReVerificationTriggered(address: address, reason: "Credential expired")
                    }
                }

                checked = checked + 1
            }

            ComplianceAgent.lastCycleTimestamp = getCurrentBlock().timestamp
            emit MonitoringCycleCompleted(
                timestamp: getCurrentBlock().timestamp,
                accountsChecked: checked
            )
        }
    }

    // ===== Contract Init =====
    init() {
        self.monitoredAddresses = []
        self.lastCycleTimestamp = 0.0

        let admin <- create Admin()
        self.account.storage.save(<- admin, to: /storage/FlowShieldComplianceAgentAdmin)
    }
}
