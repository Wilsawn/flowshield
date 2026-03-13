/**
 * @file Flow Contract Addresses
 * @module lib/flow-addresses
 * @description Network-aware Flow system contract address resolver.
 *              Centralizes all address lookups for testnet/mainnet/emulator
 *              so Cadence imports never hardcode addresses.
 */

const ADDRESSES = {
  testnet: {
    FungibleToken: '0x9a0766d93b6608b7',
    FlowToken: '0x7e60df042a9c0868',
    NonFungibleToken: '0x631e88ae7f1d7c20',
    MetadataViews: '0x631e88ae7f1d7c20',
    EVM: '0xe467b9dd11fa00df',
  },
  mainnet: {
    FungibleToken: '0xf233dcee88fe0abe',
    FlowToken: '0x1654653399040a61',
    NonFungibleToken: '0x1d7e57aa55817448',
    MetadataViews: '0x1d7e57aa55817448',
    EVM: '0xe467b9dd11fa00df',
  },
  emulator: {
    FungibleToken: '0xee82856bf20e2aa6',
    FlowToken: '0x0ae53cb6e3f42a79',
    NonFungibleToken: '0xf8d6e0586b0a20c7',
    MetadataViews: '0xf8d6e0586b0a20c7',
    EVM: '0xf8d6e0586b0a20c7',
  },
}

const NETWORK = process.env.FLOW_NETWORK || 'testnet'

/**
 * Get the system contract address for the current network.
 * @param {string} contractName - e.g. 'FungibleToken', 'FlowToken'
 * @returns {string} The address (0x prefixed)
 */
export function getAddress(contractName) {
  const networkAddresses = ADDRESSES[NETWORK] || ADDRESSES.testnet
  const addr = networkAddresses[contractName]
  if (!addr) {
    throw new Error(`Unknown system contract: ${contractName} (network: ${NETWORK})`)
  }
  return addr
}

/**
 * Get all system addresses for the current network.
 */
export function getAllAddresses() {
  return ADDRESSES[NETWORK] || ADDRESSES.testnet
}

/**
 * Get the current network name.
 */
export function getNetwork() {
  return NETWORK
}

export { ADDRESSES }
