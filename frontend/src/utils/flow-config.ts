// flow-config.js
// Flow Client Library (FCL) configuration.
// Docs: https://developers.flow.com/tools/clients/fcl-js

const NETWORKS = {
  emulator: {
    accessNode: 'http://localhost:8888',
    discoveryWallet: 'http://localhost:8701/fcl/authn',
    contracts: {
      ComplianceCredential: '0xf8d6e0586b0a20c7',
      ComplianceAction: '0xf8d6e0586b0a20c7',
      ComplianceAgent: '0xf8d6e0586b0a20c7',
      RuleEngine: '0xf8d6e0586b0a20c7',
      ZKVerifier: '0xf8d6e0586b0a20c7',
      DemoLendingPool: '0xf8d6e0586b0a20c7',
    },
  },
  testnet: {
    accessNode: 'https://rest-testnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
    contracts: {
      ComplianceCredential: '0x93c691a98b975493',
      ComplianceAction: '0x93c691a98b975493',
      ComplianceAgent: '0x93c691a98b975493',
      RuleEngine: '0x93c691a98b975493',
      ZKVerifier: '0x93c691a98b975493',
      DemoLendingPool: '0x93c691a98b975493',
    },
  },
  mainnet: {
    accessNode: 'https://rest-mainnet.onflow.org',
    discoveryWallet: 'https://fcl-discovery.onflow.org/authn',
    contracts: {},
  },
}

const NETWORK = import.meta.env.VITE_FLOW_NETWORK || 'testnet'

export function configureFCL(fcl) {
  const config = NETWORKS[NETWORK]
  if (!config) throw new Error(`Unknown network: ${NETWORK}`)

  fcl.config()
    .put('app.detail.title', 'FlowShield')
    .put('app.detail.icon', 'https://flowshield.netlify.app/logo.png')
    .put('accessNode.api', config.accessNode)
    .put('discovery.wallet', config.discoveryWallet)
    .put('flow.network', NETWORK)

  // Map contract addresses
  Object.entries(config.contracts).forEach(([name, address]) => {
    fcl.config().put(`0x${name}`, address)
  })

  return fcl
}

export function getContractAddress(name) {
  return NETWORKS[NETWORK]?.contracts?.[name] || null
}

export { NETWORK, NETWORKS }
