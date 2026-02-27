/// verify_zk_via_evm.cdc
/// Bridges Cadence → FlowEVM to verify a Groth16 ZK proof via the Solidity verifier.
///
/// Flow: User submits proof → Cadence calls COA → COA calls Solidity Groth16Verifier
///       → returns boolean → Cadence mints ComplianceCredential
///
/// This transaction uses a Cadence-Owned Account (COA) to interact with FlowEVM.

import EVM from 0xe467b9dd11fa00df
import ZKVerifier from 0x93c691a98b975493
import ComplianceCredential from 0x93c691a98b975493

transaction(
    evmVerifierAddress: String,
    proofA: [UInt256; 2],
    proofB: [[UInt256; 2]; 2],
    proofC: [UInt256; 2],
    publicInputs: [UInt256],
    jurisdiction: String
) {
    let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount

    prepare(signer: auth(BorrowValue, SaveValue) &Account) {
        // Borrow the COA from the signer's storage
        // If no COA exists, create one
        if signer.storage.type(at: /storage/evm) == nil {
            let newCOA <- EVM.createCadenceOwnedAccount()
            signer.storage.save(<-newCOA, to: /storage/evm)
        }

        self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(
            from: /storage/evm
        ) ?? panic("Could not borrow COA")
    }

    execute {
        // Encode the function call: verifyProof(uint256[2], uint256[2][2], uint256[2], uint256[])
        // Function selector: first 4 bytes of keccak256("verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[])")
        let functionSelector: [UInt8] = [0x1e, 0x8e, 0x1e, 0x13]

        // ABI-encode the proof parameters
        var calldata: [UInt8] = functionSelector

        // Encode proofA (2 x uint256)
        for val in proofA {
            calldata = calldata.concat(self.encodeUInt256(val))
        }

        // Encode proofB (2x2 uint256)
        for pair in proofB {
            for val in pair {
                calldata = calldata.concat(self.encodeUInt256(val))
            }
        }

        // Encode proofC (2 x uint256)
        for val in proofC {
            calldata = calldata.concat(self.encodeUInt256(val))
        }

        // Encode publicInputs offset (dynamic array)
        let offset = UInt256(256) // 8 * 32 bytes for the fixed params
        calldata = calldata.concat(self.encodeUInt256(offset))

        // Encode publicInputs length
        calldata = calldata.concat(self.encodeUInt256(UInt256(publicInputs.length)))

        // Encode each public input
        for input in publicInputs {
            calldata = calldata.concat(self.encodeUInt256(input))
        }

        // Parse the EVM contract address
        let evmAddress = EVM.addressFromString(evmVerifierAddress)

        // Call the Solidity Groth16Verifier via COA
        let result = self.coa.call(
            to: evmAddress,
            data: calldata,
            gasLimit: 300000,
            value: EVM.Balance(attoflow: 0)
        )

        // Check the call succeeded
        assert(result.status == EVM.Status.successful, message: "EVM call failed: ZK verification reverted")

        // Decode the boolean result from the return data
        // Solidity returns bool as a 32-byte word (0x00...01 for true)
        assert(result.data.length >= 32, message: "Invalid return data from EVM verifier")

        let verified = result.data[31] == UInt8(1)
        assert(verified, message: "ZK proof verification failed on FlowEVM")

        // Proof verified on FlowEVM — the compliance credential can now be minted
        // The actual minting happens in a separate admin transaction
        log("ZK proof verified on FlowEVM via Groth16 pairing check")
        log("Jurisdiction: ".concat(jurisdiction))
    }

    // Helper: encode a UInt256 as 32 bytes (big-endian)
    access(self) fun encodeUInt256(_ value: UInt256): [UInt8] {
        var bytes: [UInt8] = []
        var v = value
        var i = 0
        while i < 32 {
            bytes.insert(at: 0, UInt8(v % 256))
            v = v / 256
            i = i + 1
        }
        return bytes
    }
}
