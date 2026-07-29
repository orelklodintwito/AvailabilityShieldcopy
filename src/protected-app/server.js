require("dotenv").config({
  path: process.env.DOTENV_CONFIG_PATH || ".env"
});

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const crypto = require("crypto");

const healthRoutes = require("./routes/health.routes");
const basicRoutes = require("./routes/basic.routes");
const heavyRoutes = require("./routes/heavy.routes");
const {
  loadStateMiddleware,
  getLoadSnapshot,
  resetLoadState
} = require("./services/load-state.service");

const app = express();

const PORT = Number(process.env.PORT) || Number(process.env.PROTECTED_APP_PORT) || 3000;
const HOST = process.env.PROTECTED_APP_HOST || "127.0.0.1";
const INTERNAL_TOKEN = process.env.PROTECTED_APP_AUTH_TOKEN || "";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

function hasValidInternalToken(req) {
  if (process.env.NODE_ENV !== "production" || !INTERNAL_TOKEN) return true;

  const supplied = req.get("x-availabilityshield-internal-token") || "";
  const expected = Buffer.from(INTERNAL_TOKEN);
  const received = Buffer.from(supplied);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

app.use((req, res, next) => {
  // Render and the public health check need to reach this service directly.
  if (req.path === "/health" || req.method === "OPTIONS" || hasValidInternalToken(req)) return next();

  return res.status(401).json({
    error: "PROTECTED_APP_AUTH_REQUIRED",
    message: "Protected app traffic must pass through AvailabilityShield Gateway",
    timestamp: new Date().toISOString()
  });
});

app.get("/__app/load", (req, res) => {
  res.json(getLoadSnapshot());
});

app.post("/__app/reset", (req, res) => {
  resetLoadState();

  res.json({
    status: "reset",
    message: "Protected app load state was reset",
    timestamp: new Date().toISOString()
  });
});

app.use(loadStateMiddleware);

app.use(healthRoutes);
app.use(basicRoutes);
app.use(heavyRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Protected Web App running on ${HOST}:${PORT}`);
});
