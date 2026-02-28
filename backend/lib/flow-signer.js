// lib/flow-signer.js
// Shared server-side Flow transaction signing utility.
// Loads private key from .pkey file OR FLOW_PRIVATE_KEY env var (for hosted deployments).

import elliptic from 'elliptic'
import pkg from 'js-sha3'
const { sha3_256 } = pkg
const EC = elliptic.ec
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ec = new EC('p256')

// ── Load private key: env var first, then .pkey file ──
let PRIVATE_KEY = null

// 1. Try FLOW_PRIVATE_KEY env var (for Railway, Fly.io, etc.)
if (process.env.FLOW_PRIVATE_KEY) {
  let raw = process.env.FLOW_PRIVATE_KEY.trim()
  if (raw.startsWith('0x')) raw = raw.slice(2)
  PRIVATE_KEY = raw
}

// 2. Fallback: read from .pkey file (local development)
if (!PRIVATE_KEY) {
  try {
    const pkeyPath = path.resolve(__dirname, '../../flowshield-testnet2.pkey')
    let raw = fs.readFileSync(pkeyPath, 'utf8').trim()
    if (raw.startsWith('0x')) raw = raw.slice(2)
    PRIVATE_KEY = raw
  } catch {
    // Neither env var nor file available
  }
}

if (PRIVATE_KEY) {
  console.log('[FlowSigner] Private key loaded successfully')
} else {
  console.warn('[FlowSigner] No private key available — write transactions will fail')
}

/**
 * Sign a message using ECDSA_P256 + SHA3_256 (Flow's signature scheme).
 */
export function signWithKey(privateKey, message) {
  const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'))
  const digest = sha3_256(Buffer.from(message, 'hex'))
  const sig = key.sign(Buffer.from(digest, 'hex'))
  const n = 32
  const r = sig.r.toArrayLike(Buffer, 'be', n)
  const s = sig.s.toArrayLike(Buffer, 'be', n)
  return Buffer.concat([r, s]).toString('hex')
}

/**
 * Create an FCL authorization function for server-side signing.
 */
export function serverAuthorization(fcl, address, keyIndex = 0) {
  return (account) => ({
    ...account,
    tempId: `${address}-${keyIndex}`,
    addr: fcl.sansPrefix(address),
    keyId: Number(keyIndex),
    signingFunction: async (signable) => ({
      addr: fcl.withPrefix(address),
      keyId: Number(keyIndex),
      signature: signWithKey(PRIVATE_KEY, signable.message),
    }),
  })
}

/**
 * Check if a private key is available for signing.
 */
export function hasPrivateKey() {
  return !!PRIVATE_KEY
}

/**
 * Create an FCL authorization function for a custodial user account.
 * Uses the user's stored private key to sign on their behalf.
 */
export function custodialAuthorization(fcl, userAddress, userPrivateKey, keyIndex = 0) {
  return (account) => ({
    ...account,
    tempId: `${userAddress}-${keyIndex}`,
    addr: fcl.sansPrefix(userAddress),
    keyId: Number(keyIndex),
    signingFunction: async (signable) => ({
      addr: fcl.withPrefix(userAddress),
      keyId: Number(keyIndex),
      signature: signWithKey(userPrivateKey, signable.message),
    }),
  })
}

/**
 * Generate a new ECDSA_P256 keypair for a custodial user account.
 * Returns { privateKey, publicKey } as hex strings.
 */
export function generateKeyPair() {
  const key = ec.genKeyPair()
  const privateKey = key.getPrivate('hex').padStart(64, '0')
  const publicKey = key.getPublic(false, 'hex').slice(2) // remove '04' prefix
  return { privateKey, publicKey }
}

/**
 * Create a new Flow account on-chain funded by the deployer.
 * The new account gets the provided public key.
 * Returns the new account's address.
 */
export async function createFlowAccount(fcl, deployerAddress, userPublicKey) {
  if (!PRIVATE_KEY) throw new Error('Deployer private key not available')

  const authz = serverAuthorization(fcl, deployerAddress)

  const txId = await fcl.mutate({
    cadence: `
      transaction(publicKey: String) {
        prepare(signer: auth(BorrowValue) &Account) {
          let key = PublicKey(
            publicKey: publicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
          )
          let account = Account(payer: signer)
          account.keys.add(
            publicKey: key,
            hashAlgorithm: HashAlgorithm.SHA3_256,
            weight: 1000.0
          )
        }
      }
    `,
    args: (arg, t) => [arg(userPublicKey, t.String)],
    proposer: authz,
    payer: authz,
    authorizations: [authz],
    limit: 999,
  })

  const txResult = await fcl.tx(txId).onceSealed()

  // Extract the new account address from AccountCreated event
  const createdEvent = txResult.events?.find(e => e.type === 'flow.AccountCreated')
  if (!createdEvent?.data?.address) {
    throw new Error('Account creation failed — no AccountCreated event')
  }

  return {
    address: createdEvent.data.address,
    transactionId: txId,
    blockHeight: txResult.blockHeight,
  }
}

export { PRIVATE_KEY }
