// lib/crypto.js
// AES-256-GCM encryption for custodial private keys at rest.
// Requires KEY_ENCRYPTION_KEY env var (64-char hex = 32 bytes).

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getEncryptionKey() {
  const hex = process.env.KEY_ENCRYPTION_KEY
  if (!hex || hex.length < 64) return null
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a private key string. Returns "iv:ciphertext:tag" in hex.
 * If KEY_ENCRYPTION_KEY is not set, returns the plaintext (dev mode).
 */
export function encryptKey(plaintext) {
  const key = getEncryptionKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KEY_ENCRYPTION_KEY is required in production — refusing to store plaintext private keys')
    }
    return plaintext // dev mode — no encryption
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

/**
 * Decrypt a private key. Accepts "iv:ciphertext:tag" hex format.
 * If input doesn't match encrypted format, returns as-is (backward compat).
 */
export function decryptKey(stored) {
  const key = getEncryptionKey()
  if (!key) return stored // dev mode — no encryption

  // Check if it looks like our encrypted format (hex:hex:hex)
  const parts = stored.split(':')
  if (parts.length !== 3) return stored // legacy plaintext — return as-is

  const [ivHex, ciphertextHex, tagHex] = parts
  try {
    const iv = Buffer.from(ivHex, 'hex')
    const ciphertext = Buffer.from(ciphertextHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')

    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    // Decryption failed — might be legacy plaintext that happens to contain colons
    return stored
  }
}

export function isEncryptionConfigured() {
  return !!getEncryptionKey()
}
