/**
 * server.js
 * FlowShield backend API server.
 * Handles compliance checks, risk scoring, and Builder Copilot.
 */

require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");

const { calculateRiskScore, fetchWalletData } = require("../agents/risk-scoring");
const { chat } = require("../agents/builder-copilot");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ===== Health Check =====
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "flowshield-api" });
});

// ===== Risk Scoring =====
app.post("/api/risk/score", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const walletData = await fetchWalletData(address);
    const riskResult = calculateRiskScore(walletData);

    res.json({
      address,
      ...riskResult,
    });
  } catch (error) {
    console.error("Risk scoring error:", error);
    res.status(500).json({ error: "Risk scoring failed" });
  }
});

// ===== Builder Copilot =====
app.post("/api/copilot/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const result = await chat(message, history || []);
    res.json(result);
  } catch (error) {
    console.error("Copilot error:", error);
    res.status(500).json({ error: "Copilot request failed", details: error.message });
  }
});

// ===== Compliance Status =====
app.get("/api/compliance/status/:address", async (req, res) => {
  try {
    const { address } = req.params;

    // TODO: Query Flow blockchain for credential status
    // For now, return mock data
    res.json({
      address,
      hasCredential: true,
      isValid: true,
      tier: "compliant",
      riskScore: 15,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Compliance status error:", error);
    res.status(500).json({ error: "Failed to fetch compliance status" });
  }
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`FlowShield API running on http://localhost:${PORT}`);
  console.log(`Claude API key: ${process.env.CLAUDE_API_KEY ? "configured" : "NOT SET"}`);
});
