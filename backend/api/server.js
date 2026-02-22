// server.js
// Express API server connecting agents to frontend.
//
// What to implement:
// - POST /api/risk/score -> takes wallet address, returns risk score
// - POST /api/copilot/chat -> takes message + history, returns copilot response
// - GET /api/compliance/status/:address -> returns compliance status from Flow
// - POST /api/radar/simulate -> triggers regulatory change demo scenario
// - GET /health -> health check
// - Use cors, express.json middleware
// - Load env vars from .env
// - Connect to Flow blockchain via @onflow/fcl for real data
