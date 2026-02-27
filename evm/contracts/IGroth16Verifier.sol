// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IGroth16Verifier
/// @notice Interface for the FlowShield Groth16 verifier on FlowEVM
interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[] calldata publicInputs
    ) external returns (bool valid);

    function totalVerifications() external view returns (uint256);
}
