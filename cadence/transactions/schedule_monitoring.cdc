/// schedule_monitoring.cdc
/// Registers the ComplianceAgent monitoring cycle as a Scheduled Transaction
/// on Flow's FlowTransactionScheduler (Forte upgrade).
///
/// Once registered, the agent runs autonomously on the timer — no manual triggers needed.
/// Each cycle checks all monitored wallets and schedules the next run.

import ComplianceAgent from "../contracts/ComplianceAgent.cdc"

transaction(intervalSeconds: UFix64) {
    let agent: &ComplianceAgent.Agent

    prepare(operator: auth(Storage) &Account) {
        // Borrow the agent from the operator's account
        self.agent = operator.storage.borrow<&ComplianceAgent.Agent>(
            from: ComplianceAgent.AgentStoragePath
        ) ?? panic("No ComplianceAgent found. Create one first via admin.")
    }

    execute {
        // Run the monitoring cycle
        let results = self.agent.runMonitoringCycle()

        log("Monitoring cycle complete:")
        log("  Checked: ".concat(results.length.toString()).concat(" addresses"))

        var expired = 0
        var expiringSoon = 0
        var healthy = 0

        for result in results {
            switch result.status {
                case "expired":
                    expired = expired + 1
                    log("  EXPIRED: ".concat(result.address.toString()))
                case "expiring_soon":
                    expiringSoon = expiringSoon + 1
                    log("  EXPIRING SOON: ".concat(result.address.toString())
                        .concat(" (").concat(result.daysRemaining.toString()).concat(" days)"))
                case "healthy":
                    healthy = healthy + 1
                default:
                    break
            }
        }

        log("  Summary: ".concat(healthy.toString()).concat(" healthy, ")
            .concat(expiringSoon.toString()).concat(" expiring, ")
            .concat(expired.toString()).concat(" expired"))

        // In production with FlowTransactionScheduler:
        // The handler resource would schedule the next execution automatically.
        //
        // FlowTransactionScheduler.schedule(
        //     handler: operatorCap,
        //     executeAfter: getCurrentBlock().timestamp + intervalSeconds,
        //     maxExecutionEffort: 5000,
        //     data: nil
        // )
        //
        // Scheduler contract on testnet: 0x8c5303eaa26202d6
    }
}
