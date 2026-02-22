// OnboardingFlow.jsx
// Walletless signup with passkey + invisible compliance verification.
//
// What to implement:
// - Email/passkey input using WebAuthn
// - Behind the scenes: trigger ZK-KYC verification
// - Show simple loading state while verification happens
// - On success: redirect to dashboard
// - On failure: show friendly error, suggest retry
// - User should never see anything about compliance, ZK proofs, or gas
