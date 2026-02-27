/// Governance.cdc
/// Multi-signature governance for FlowShield admin operations.
///
/// Instead of a single admin key controlling fee changes, rule updates,
/// and treasury withdrawals, this contract requires M-of-N signers to
/// approve proposals before execution.
///
/// Designed for decentralized control of:
///   - Fee schedule changes (verification fee, issuance fee)
///   - Treasury withdrawals
///   - Trusted verifier registry updates
///   - RuleEngine jurisdiction rule changes
///   - Emergency credential revocations

access(all) contract Governance {

    // ── Paths ──
    access(all) let AdminStoragePath: StoragePath

    // ── Events ──
    access(all) event ProposalCreated(id: UInt64, proposer: Address, action: String, description: String)
    access(all) event ProposalApproved(id: UInt64, approver: Address, approvalsCount: Int)
    access(all) event ProposalExecuted(id: UInt64, action: String)
    access(all) event ProposalExpired(id: UInt64)
    access(all) event SignerAdded(address: Address, totalSigners: Int)
    access(all) event SignerRemoved(address: Address, totalSigners: Int)
    access(all) event QuorumUpdated(newQuorum: Int)

    // ── Proposal Status ──
    access(all) enum ProposalStatus: UInt8 {
        access(all) case pending     // 0: awaiting approvals
        access(all) case approved    // 1: quorum reached, ready to execute
        access(all) case executed    // 2: action completed
        access(all) case expired     // 3: timed out
        access(all) case rejected    // 4: explicitly rejected
    }

    // ── Proposal ──
    access(all) struct Proposal {
        access(all) let id: UInt64
        access(all) let proposer: Address
        access(all) let action: String          // "setFee", "withdraw", "addVerifier", "setRule", "revoke"
        access(all) let description: String
        access(all) let data: {String: String}  // Action-specific parameters
        access(all) var approvals: [Address]
        access(all) var status: ProposalStatus
        access(all) let createdAt: UFix64
        access(all) let expiresAt: UFix64       // Proposals expire after 7 days

        init(
            id: UInt64,
            proposer: Address,
            action: String,
            description: String,
            data: {String: String}
        ) {
            self.id = id
            self.proposer = proposer
            self.action = action
            self.description = description
            self.data = data
            self.approvals = [proposer]  // Proposer auto-approves
            self.status = ProposalStatus.pending
            self.createdAt = getCurrentBlock().timestamp
            self.expiresAt = getCurrentBlock().timestamp + 604800.0  // 7 days
        }
    }

    // ── State ──
    access(all) var proposals: {UInt64: Proposal}
    access(all) var nextProposalId: UInt64
    access(all) var authorizedSigners: [Address]
    access(all) var requiredApprovals: Int        // M-of-N quorum

    // ── Signer Resource ──
    // Each authorized signer holds one of these in their account
    access(all) resource Signer {
        access(all) let address: Address

        /// Create a new proposal
        access(all) fun createProposal(
            action: String,
            description: String,
            data: {String: String}
        ): UInt64 {
            pre {
                Governance.isAuthorizedSigner(self.address): "Not an authorized signer"
            }

            let id = Governance.nextProposalId
            let proposal = Proposal(
                id: id,
                proposer: self.address,
                action: action,
                description: description,
                data: data
            )

            Governance.proposals[id] = proposal
            Governance.nextProposalId = Governance.nextProposalId + 1

            emit ProposalCreated(id: id, proposer: self.address, action: action, description: description)

            // Check if single signer is enough (quorum = 1)
            if Governance.requiredApprovals <= 1 {
                Governance.proposals[id]!.status = ProposalStatus.approved
            }

            return id
        }

        /// Approve an existing proposal
        access(all) fun approveProposal(id: UInt64) {
            pre {
                Governance.isAuthorizedSigner(self.address): "Not an authorized signer"
                Governance.proposals.containsKey(id): "Proposal not found"
            }

            let proposal = Governance.proposals[id]!

            assert(proposal.status == ProposalStatus.pending, message: "Proposal is not pending")
            assert(getCurrentBlock().timestamp < proposal.expiresAt, message: "Proposal has expired")

            // Check not already approved by this signer
            for existing in proposal.approvals {
                if existing == self.address {
                    panic("Already approved by this signer")
                }
            }

            // Can't mutate struct in-place in dict, so rebuild
            var updatedProposal = proposal
            updatedProposal.approvals.append(self.address)

            if updatedProposal.approvals.length >= Governance.requiredApprovals {
                updatedProposal.status = ProposalStatus.approved
            }

            Governance.proposals[id] = updatedProposal

            emit ProposalApproved(
                id: id,
                approver: self.address,
                approvalsCount: updatedProposal.approvals.length
            )
        }

        init(address: Address) {
            self.address = address
        }
    }

    // ── Public Functions ──

    /// Check if an address is an authorized signer
    access(all) view fun isAuthorizedSigner(_ address: Address): Bool {
        for signer in self.authorizedSigners {
            if signer == address {
                return true
            }
        }
        return false
    }

    /// Get a proposal by ID
    access(all) view fun getProposal(id: UInt64): Proposal? {
        return self.proposals[id]
    }

    /// Get all pending proposals
    access(all) view fun getPendingProposals(): [Proposal] {
        var pending: [Proposal] = []
        for id in self.proposals.keys {
            let p = self.proposals[id]!
            if p.status == ProposalStatus.pending {
                pending.append(p)
            }
        }
        return pending
    }

    /// Get governance stats
    access(all) view fun getStats(): {String: UInt64} {
        return {
            "totalProposals": self.nextProposalId,
            "totalSigners": UInt64(self.authorizedSigners.length),
            "requiredApprovals": UInt64(self.requiredApprovals)
        }
    }

    /// Mark a proposal as executed (called after admin performs the action)
    access(all) fun markExecuted(id: UInt64) {
        pre {
            self.proposals.containsKey(id): "Proposal not found"
        }
        let proposal = self.proposals[id]!
        assert(proposal.status == ProposalStatus.approved, message: "Proposal not approved")

        var updated = proposal
        updated.status = ProposalStatus.executed
        self.proposals[id] = updated

        emit ProposalExecuted(id: id, action: proposal.action)
    }

    // ── Admin Resource ──
    // Only held by the contract deployer. Manages signer registry and quorum.
    access(all) resource Admin {

        /// Add a new authorized signer
        access(all) fun addSigner(address: Address): @Signer {
            // Check not already a signer
            for existing in Governance.authorizedSigners {
                if existing == address {
                    panic("Already an authorized signer")
                }
            }

            Governance.authorizedSigners.append(address)
            emit SignerAdded(address: address, totalSigners: Governance.authorizedSigners.length)

            return <- create Signer(address: address)
        }

        /// Remove a signer
        access(all) fun removeSigner(address: Address) {
            var i = 0
            while i < Governance.authorizedSigners.length {
                if Governance.authorizedSigners[i] == address {
                    Governance.authorizedSigners.remove(at: i)
                    emit SignerRemoved(address: address, totalSigners: Governance.authorizedSigners.length)

                    // Ensure quorum doesn't exceed signer count
                    if Governance.requiredApprovals > Governance.authorizedSigners.length {
                        Governance.requiredApprovals = Governance.authorizedSigners.length
                    }
                    return
                }
                i = i + 1
            }
        }

        /// Update quorum requirement
        access(all) fun setRequiredApprovals(count: Int) {
            pre {
                count > 0: "Must require at least 1 approval"
                count <= Governance.authorizedSigners.length: "Cannot require more approvals than signers"
            }
            Governance.requiredApprovals = count
            emit QuorumUpdated(newQuorum: count)
        }

        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Contract Init ──
    init() {
        self.AdminStoragePath = /storage/FlowShieldGovernanceAdmin
        self.proposals = {}
        self.nextProposalId = 0
        self.authorizedSigners = []
        self.requiredApprovals = 1  // Start with 1-of-N, increase after team setup

        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}
