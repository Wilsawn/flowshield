/**
 * @file FCL Timeout Wrapper
 * @module lib/flow-timeout
 * @description Wraps FCL query/mutate calls with a configurable timeout
 *              to prevent infinite hangs when Flow testnet is slow or unresponsive.
 */

const DEFAULT_QUERY_TIMEOUT = parseInt(process.env.FCL_QUERY_TIMEOUT || '15000')
const DEFAULT_TX_TIMEOUT = parseInt(process.env.FCL_TX_TIMEOUT || '60000')

class FlowTimeoutError extends Error {
  constructor(operation, timeoutMs) {
    super(`Flow ${operation} timed out after ${timeoutMs}ms`)
    this.name = 'FlowTimeoutError'
    this.operation = operation
    this.timeoutMs = timeoutMs
  }
}

/**
 * Wrap a promise with a timeout.
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} label - Label for error messages
 * @returns {Promise}
 */
export function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new FlowTimeoutError(label, ms)), ms)
    ),
  ])
}

/**
 * Wrap an FCL query with a timeout.
 */
export function queryWithTimeout(fcl, queryArgs, ms = DEFAULT_QUERY_TIMEOUT) {
  return withTimeout(fcl.query(queryArgs), ms, 'query')
}

/**
 * Wrap an FCL mutate + onceSealed with a timeout.
 */
export async function mutateWithTimeout(fcl, mutateArgs, ms = DEFAULT_TX_TIMEOUT) {
  const txId = await withTimeout(fcl.mutate(mutateArgs), ms / 2, 'mutate')
  const result = await withTimeout(fcl.tx(txId).onceSealed(), ms / 2, 'onceSealed')
  return { txId, result }
}

export { DEFAULT_QUERY_TIMEOUT, DEFAULT_TX_TIMEOUT, FlowTimeoutError }
