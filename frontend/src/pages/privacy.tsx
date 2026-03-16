import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FlowShieldLogo from '@/components/FlowShieldLogo'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#060e09] text-white">
      <nav className="border-b border-emerald-500/[0.06]">
        <div className="max-w-[720px] mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <FlowShieldLogo size={22} />
            <span className="text-[14px] font-semibold text-white">FlowShield</span>
          </button>
        </div>
      </nav>

      <div className="max-w-[720px] mx-auto px-6 py-16">
        <h1 className="text-[2rem] font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-white/25 mb-12">Last updated: February 25, 2026</p>

        <div className="space-y-10 text-[14px] text-white/45 leading-relaxed">
          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">1. Overview</h2>
            <p>
              FlowShield ("we," "our," "us") provides privacy-preserving compliance infrastructure for decentralized finance protocols on the Flow blockchain. This Privacy Policy describes how we collect, use, and protect information when you use our platform.
            </p>
            <p className="mt-3">
              Our core design principle: <span className="text-emerald-400/70">identity data never exists on-chain</span>. We use zero-knowledge proofs so that the blockchain only receives a boolean compliance result, never personal information.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">2. Information We Collect</h2>
            <p className="font-medium text-white/60 mb-2">Information you provide:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Email address (used for account identification and communication)</li>
              <li>Jurisdiction selection (used to apply appropriate compliance rules)</li>
              <li>WebAuthn passkey credentials (stored in your device's secure enclave, not on our servers)</li>
            </ul>
            <p className="font-medium text-white/60 mb-2 mt-4">Information generated during verification:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Zero-knowledge proof outputs (boolean compliance results only)</li>
              <li>Flow blockchain wallet address</li>
              <li>Compliance credential status (valid/expired/revoked)</li>
              <li>On-chain transaction hashes related to compliance checks</li>
            </ul>
            <p className="font-medium text-white/60 mb-2 mt-4">Information we do NOT collect or store:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Government-issued identification documents</li>
              <li>Biometric data (passkey biometrics stay on your device)</li>
              <li>Personal financial information beyond on-chain transaction data</li>
              <li>Social Security numbers or equivalent identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">3. Zero-Knowledge Architecture</h2>
            <p>
              FlowShield uses zero-knowledge proofs to verify compliance without revealing personal information. When you complete the verification process:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>A ZK proof is generated client-side on your device</li>
              <li>Only the proof result (true/false) is submitted to the blockchain</li>
              <li>Your identity data never leaves your device during this process</li>
              <li>The on-chain compliance credential contains no personally identifiable information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">4. How We Use Information</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>To provide and maintain the FlowShield compliance service</li>
              <li>To issue and manage compliance credentials on the Flow blockchain</li>
              <li>To apply jurisdiction-specific compliance rules</li>
              <li>To communicate service updates and credential expiration notices</li>
              <li>To comply with applicable legal and regulatory requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal information. We may share information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>On-chain data is publicly visible on the Flow blockchain by nature (this includes compliance credential status, not identity data)</li>
              <li>When required by law, regulation, or legal process</li>
              <li>With DeFi protocol operators who integrate FlowShield, limited to boolean compliance status</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit and at rest, WebAuthn for passwordless authentication, and zero-knowledge cryptography. Passkey credentials are stored in your device's secure enclave and are never transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Access the information we hold about you</li>
              <li>Request deletion of your off-chain data</li>
              <li>Revoke your compliance credential at any time</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              Note: On-chain data (compliance credential status, transaction records) is immutable by nature of blockchain technology and cannot be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">8. Cookies and Tracking</h2>
            <p>
              FlowShield does not use third-party tracking cookies or analytics. We may use essential cookies to maintain your session and preferences.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">9. Children's Privacy</h2>
            <p>
              FlowShield is not intended for users under the age of 18. We do not knowingly collect information from minors.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes via email or a notice on our platform. Your continued use of FlowShield after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">11. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at <span className="text-emerald-400/70">privacy@flowshield.xyz</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
