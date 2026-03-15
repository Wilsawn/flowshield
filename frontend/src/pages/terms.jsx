import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FlowShieldLogo from '@/components/FlowShieldLogo'

export default function TermsOfService() {
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
        <h1 className="text-[2rem] font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-[13px] text-white/25 mb-12">Last updated: February 25, 2026</p>

        <div className="space-y-10 text-[14px] text-white/45 leading-relaxed">
          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using FlowShield ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. FlowShield provides privacy-preserving compliance infrastructure for decentralized finance protocols on the Flow blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">2. Description of Service</h2>
            <p>FlowShield provides:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Zero-knowledge proof-based compliance verification for DeFi users</li>
              <li>On-chain compliance credentials stored as Cadence resources on the Flow blockchain</li>
              <li>WebAuthn/passkey-based account creation and authentication</li>
              <li>Multi-jurisdiction compliance rule management (US, EU, UK, Singapore, Canada)</li>
              <li>AI-powered regulatory monitoring and builder tools</li>
              <li>Compliance integration tools for DeFi protocol developers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">3. Eligibility</h2>
            <p>To use FlowShield, you must:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Be at least 18 years of age</li>
              <li>Not be a resident of a jurisdiction where use of the Platform is prohibited</li>
              <li>Not be listed on any sanctions list maintained by OFAC, the EU, the UK, or equivalent authorities</li>
              <li>Provide accurate information during the verification process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">4. User Accounts and Passkeys</h2>
            <p>
              Your FlowShield account is secured using WebAuthn passkeys. You are responsible for maintaining the security of your device and passkey credentials. FlowShield cannot recover lost passkeys as they are stored exclusively in your device's secure enclave.
            </p>
            <p className="mt-3">
              You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">5. Compliance Credentials</h2>
            <p>
              FlowShield issues compliance credentials as Cadence resources on the Flow blockchain. These credentials:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Are subject to expiration based on your jurisdiction's re-verification requirements</li>
              <li>May be revoked if you no longer meet compliance requirements</li>
              <li>Do not guarantee approval for any specific financial transaction</li>
              <li>Are specific to the jurisdiction selected during verification</li>
            </ul>
            <p className="mt-3">
              A valid compliance credential indicates that you passed a compliance check at the time of issuance. It does not constitute legal advice or a guarantee of regulatory compliance for any particular transaction or protocol.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">6. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Use the Platform for money laundering, terrorist financing, or other illicit activities</li>
              <li>Attempt to circumvent compliance checks or falsify verification information</li>
              <li>Interfere with or disrupt the Platform's infrastructure</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of our ZK circuits</li>
              <li>Use the Platform in violation of any applicable laws or regulations</li>
              <li>Transfer or share compliance credentials with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">7. Blockchain Transactions</h2>
            <p>
              You acknowledge that transactions on the Flow blockchain are irreversible. FlowShield is not responsible for transactions executed through third-party DeFi protocols that integrate our compliance tools. Gas fees for transactions may apply, though FlowShield sponsors certain transactions for user convenience.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">8. Protocol Integrators</h2>
            <p>
              If you are a DeFi protocol developer integrating FlowShield, you are responsible for ensuring your protocol's overall regulatory compliance. FlowShield provides compliance tooling but does not serve as a substitute for independent legal counsel or regulatory registration requirements.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">9. Limitation of Liability</h2>
            <p>
              FlowShield is provided "as is" without warranties of any kind. To the maximum extent permitted by law, FlowShield shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to loss of funds, regulatory penalties, or transaction failures.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">10. Regulatory Changes</h2>
            <p>
              Compliance requirements vary by jurisdiction and change over time. FlowShield's AI Regulatory Radar monitors changes, but we cannot guarantee immediate adaptation to all regulatory updates. You are ultimately responsible for understanding the compliance requirements that apply to your activities.
            </p>
          </section>

          <section id="refunds">
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">11. Refunds and Cancellation</h2>
            <p>
              Paid subscription tiers (e.g. Growth, Scale) may be cancelled at any time. Refund eligibility depends on your plan and the timing of the request. Contact <span className="text-emerald-400/70">support@flowshield.xyz</span> or use the billing portal for subscription changes. Refund requests are handled case-by-case and in line with our payment provider&apos;s terms.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to FlowShield at any time if we reasonably believe you have violated these Terms or applicable law. Upon termination, your compliance credential may be revoked. On-chain records of prior compliance checks will persist on the blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">13. Modifications</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated via email or platform notification at least 14 days before taking effect. Continued use of the Platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by applicable law. Any disputes shall be resolved through binding arbitration, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-white/80 mb-3">15. Contact</h2>
            <p>
              For questions about these Terms, contact us at <span className="text-emerald-400/70">legal@flowshield.xyz</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
