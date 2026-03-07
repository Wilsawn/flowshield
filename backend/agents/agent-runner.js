// agent-runner.js
// Core agentic loop engine using @anthropic-ai/sdk.
// Implements Claude tool-use loops with production-grade:
//   - Timeout handling (AbortController per API call + overall deadline)
//   - Retry with exponential backoff for transient failures
//   - Structured logging with severity, timestamps, request context
//   - Token usage tracking
//   - Tool result size limits
//   - Graceful degradation (returns null → agents fall back to deterministic)

import Anthropic from '@anthropic-ai/sdk'

// ── Configuration ────────────────────────────────────────────────────────────
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOOL_RESULT_BYTES = 50_000 // 50KB per tool result
const MAX_RETRIES = 2
const RETRY_BASE_MS = 1000
const DEFAULT_TIMEOUT_MS = 30_000 // 30s per API call
const DEFAULT_DEADLINE_MS = 120_000 // 2min total per agent run

// Transient error codes that are safe to retry
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529])

let client = null

function getClient() {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    agentLog('warn', 'AgentRunner', 'No CLAUDE_API_KEY set — agents will use deterministic fallback')
    return null
  }
  if (!client) {
    client = new Anthropic({
      apiKey,
      timeout: DEFAULT_TIMEOUT_MS,
      maxRetries: 0, // We handle retries ourselves for better control
    })
  }
  return client
}

// ── Structured Logging ───────────────────────────────────────────────────────

/**
 * Structured log entry for agent operations.
 * @param {'info'|'warn'|'error'} level
 * @param {string} agent - Agent identifier
 * @param {string} message
 * @param {object} [meta] - Additional structured data
 */
function agentLog(level, agent, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    agent,
    msg: message,
    ...meta,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

// ── Retry Logic ──────────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Call Anthropic API with retry + timeout.
 */
async function callWithRetry(anthropic, params, deadline) {
  let lastError
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Check deadline
    if (Date.now() > deadline) {
      throw new Error('Agent deadline exceeded')
    }

    try {
      const response = await anthropic.messages.create(params)
      return response
    } catch (err) {
      lastError = err
      const status = err?.status || err?.error?.status

      // Only retry on transient errors
      if (!RETRYABLE_STATUS.has(status) || attempt === MAX_RETRIES) {
        throw err
      }

      const backoff = RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 500
      agentLog('warn', 'AgentRunner', `Retrying API call (attempt ${attempt + 1}/${MAX_RETRIES})`, {
        status,
        backoffMs: Math.round(backoff),
        error: err.message,
      })
      await sleep(backoff)
    }
  }
  throw lastError
}

// ── Tool Execution ───────────────────────────────────────────────────────────

/**
 * Execute a tool handler with timeout and result size limits.
 */
async function executeTool(name, input, handler, toolTimeoutMs = 15_000) {
  return new Promise(async (resolve) => {
    const timer = setTimeout(() => {
      agentLog('warn', 'AgentRunner', `Tool ${name} timed out after ${toolTimeoutMs}ms`)
      resolve(JSON.stringify({ error: `Tool ${name} timed out after ${toolTimeoutMs}ms` }))
    }, toolTimeoutMs)

    try {
      let result = await handler(input)
      result = typeof result === 'string' ? result : JSON.stringify(result)

      // Enforce size limit
      if (result.length > MAX_TOOL_RESULT_BYTES) {
        agentLog('warn', 'AgentRunner', `Tool ${name} result truncated`, {
          originalSize: result.length,
          maxSize: MAX_TOOL_RESULT_BYTES,
        })
        result = result.slice(0, MAX_TOOL_RESULT_BYTES) + '\n...[truncated]'
      }

      clearTimeout(timer)
      resolve(result)
    } catch (err) {
      clearTimeout(timer)
      agentLog('warn', 'AgentRunner', `Tool ${name} error`, { error: err.message })
      resolve(JSON.stringify({ error: err.message }))
    }
  })
}

// ── Core Agent Loop ──────────────────────────────────────────────────────────

/**
 * Run an agentic tool-use loop.
 * Claude receives tools, decides which to call, we execute them, feed results back, repeat.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt - System prompt for Claude
 * @param {string} opts.userMessage - The user's message/task
 * @param {Array} opts.tools - Tool definitions in Anthropic format
 * @param {Object} opts.toolHandlers - Map of tool_name -> async handler(input) => result
 * @param {number} [opts.maxIterations=10] - Max tool-use loops
 * @param {string} [opts.model] - Model override
 * @param {number} [opts.maxTokens=4096] - Max tokens per response
 * @param {number} [opts.timeoutMs=30000] - Timeout per API call (ms)
 * @param {number} [opts.deadlineMs=120000] - Overall deadline for entire run (ms)
 * @returns {{ text: string, toolCalls: Array, iterations: number, usage: object } | null}
 */
export async function runAgentLoop({
  systemPrompt,
  userMessage,
  tools = [],
  toolHandlers = {},
  maxIterations = 10,
  model,
  maxTokens = 4096,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  deadlineMs = DEFAULT_DEADLINE_MS,
}) {
  const anthropic = getClient()
  if (!anthropic) return null

  const resolvedModel = model || process.env.CLAUDE_MODEL || DEFAULT_MODEL
  const deadline = Date.now() + deadlineMs
  const messages = [{ role: 'user', content: userMessage }]
  const allToolCalls = []
  let iterations = 0
  const usage = { inputTokens: 0, outputTokens: 0, apiCalls: 0 }

  agentLog('info', 'AgentRunner', 'Starting agent loop', {
    model: resolvedModel,
    maxIterations,
    toolCount: tools.length,
    tools: tools.map(t => t.name),
  })

  while (iterations < maxIterations) {
    iterations++

    if (Date.now() > deadline) {
      agentLog('warn', 'AgentRunner', 'Deadline exceeded, forcing final response', { iterations })
      break
    }

    const response = await callWithRetry(anthropic, {
      model: resolvedModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    }, deadline)

    usage.apiCalls++
    usage.inputTokens += response.usage?.input_tokens || 0
    usage.outputTokens += response.usage?.output_tokens || 0

    const textBlocks = response.content.filter(b => b.type === 'text')
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

    // No tool calls → done
    if (toolUseBlocks.length === 0) {
      const finalText = textBlocks.map(b => b.text).join('\n')
      agentLog('info', 'AgentRunner', 'Agent loop completed (text response)', {
        iterations,
        toolCalls: allToolCalls.length,
        usage,
      })
      return { text: finalText, toolCalls: allToolCalls, iterations, usage }
    }

    // Process tool calls
    const toolResults = []
    for (const toolUse of toolUseBlocks) {
      allToolCalls.push({ name: toolUse.name, input: toolUse.input })

      const handler = toolHandlers[toolUse.name]
      let result
      if (handler) {
        result = await executeTool(toolUse.name, toolUse.input, handler, timeoutMs)
      } else {
        result = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` })
        agentLog('warn', 'AgentRunner', `Unknown tool called: ${toolUse.name}`)
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    // end_turn with text means Claude is done
    if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
      const finalText = textBlocks.map(b => b.text).join('\n')
      agentLog('info', 'AgentRunner', 'Agent loop completed (end_turn)', {
        iterations,
        toolCalls: allToolCalls.length,
        usage,
      })
      return { text: finalText, toolCalls: allToolCalls, iterations, usage }
    }
  }

  // Max iterations or deadline — force a final summary
  agentLog('warn', 'AgentRunner', 'Max iterations reached, requesting final summary', { iterations })

  const finalResponse = await callWithRetry(anthropic, {
    model: resolvedModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      ...messages,
      { role: 'user', content: 'Please provide your final answer based on the tool results you have gathered so far.' },
    ],
  }, deadline)

  usage.apiCalls++
  usage.inputTokens += finalResponse.usage?.input_tokens || 0
  usage.outputTokens += finalResponse.usage?.output_tokens || 0

  const finalText = finalResponse.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  agentLog('info', 'AgentRunner', 'Agent loop completed (forced summary)', {
    iterations,
    toolCalls: allToolCalls.length,
    usage,
  })

  return { text: finalText, toolCalls: allToolCalls, iterations, usage }
}

/**
 * Run an agentic chat loop with conversation history (for copilot multi-turn).
 * Same loop as runAgentLoop but accepts full conversation history.
 */
export async function runAgentChat({
  systemPrompt,
  conversationHistory = [],
  tools = [],
  toolHandlers = {},
  maxIterations = 10,
  model,
  maxTokens = 4096,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  deadlineMs = DEFAULT_DEADLINE_MS,
}) {
  const anthropic = getClient()
  if (!anthropic) return null

  const resolvedModel = model || process.env.CLAUDE_MODEL || DEFAULT_MODEL
  const deadline = Date.now() + deadlineMs
  const messages = conversationHistory.map(m => ({ role: m.role, content: m.content }))
  const allToolCalls = []
  let iterations = 0
  const usage = { inputTokens: 0, outputTokens: 0, apiCalls: 0 }

  agentLog('info', 'AgentRunner', 'Starting agent chat', {
    model: resolvedModel,
    maxIterations,
    historyLength: conversationHistory.length,
    toolCount: tools.length,
  })

  while (iterations < maxIterations) {
    iterations++

    if (Date.now() > deadline) {
      agentLog('warn', 'AgentRunner', 'Chat deadline exceeded', { iterations })
      break
    }

    const response = await callWithRetry(anthropic, {
      model: resolvedModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    }, deadline)

    usage.apiCalls++
    usage.inputTokens += response.usage?.input_tokens || 0
    usage.outputTokens += response.usage?.output_tokens || 0

    const textBlocks = response.content.filter(b => b.type === 'text')
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

    if (toolUseBlocks.length === 0) {
      const finalText = textBlocks.map(b => b.text).join('\n')
      agentLog('info', 'AgentRunner', 'Agent chat completed', {
        iterations,
        toolCalls: allToolCalls.length,
        usage,
      })
      return { text: finalText, toolCalls: allToolCalls, iterations, usage }
    }

    // Process tool calls
    const toolResults = []
    for (const toolUse of toolUseBlocks) {
      allToolCalls.push({ name: toolUse.name, input: toolUse.input })

      const handler = toolHandlers[toolUse.name]
      let result
      if (handler) {
        result = await executeTool(toolUse.name, toolUse.input, handler, timeoutMs)
      } else {
        result = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` })
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
      const finalText = textBlocks.map(b => b.text).join('\n')
      agentLog('info', 'AgentRunner', 'Agent chat completed (end_turn)', {
        iterations,
        toolCalls: allToolCalls.length,
        usage,
      })
      return { text: finalText, toolCalls: allToolCalls, iterations, usage }
    }
  }

  // Force final response
  const finalResponse = await callWithRetry(anthropic, {
    model: resolvedModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      ...messages,
      { role: 'user', content: 'Please provide your final response based on the information gathered.' },
    ],
  }, deadline)

  usage.apiCalls++
  usage.inputTokens += finalResponse.usage?.input_tokens || 0
  usage.outputTokens += finalResponse.usage?.output_tokens || 0

  const finalText = finalResponse.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  return { text: finalText, toolCalls: allToolCalls, iterations, usage }
}

/**
 * Extract JSON from Claude's text response.
 * Handles: raw JSON, ```json fences, mixed text+JSON.
 */
export function parseJsonFromText(text) {
  if (!text) return null

  // Try direct parse first
  try {
    return JSON.parse(text.trim())
  } catch { /* not pure JSON */ }

  // Try extracting from code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch { /* bad JSON in fence */ }
  }

  // Try finding JSON object in text
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0])
    } catch { /* not valid JSON object */ }
  }

  // Try finding JSON array in text
  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0])
    } catch { /* not valid JSON array */ }
  }

  return null
}

/**
 * Validate a Flow address format.
 * @param {string} address
 * @returns {boolean}
 */
export function isValidFlowAddress(address) {
  return typeof address === 'string' && /^0x[a-fA-F0-9]{16}$/.test(address)
}

// Export logger for use by other agents
export { agentLog }
