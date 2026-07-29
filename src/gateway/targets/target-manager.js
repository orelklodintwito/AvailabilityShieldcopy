const dns = require("dns").promises;
const net = require("net");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { findOneDocument, upsertDocument } = require("../../db/database");

const POLICY_PATH = path.resolve(__dirname, "../../../config/site-policy.json");
const policyDefaults = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
const DEFAULT_TARGET = (process.env.PROTECTED_TARGET || policyDefaults.protectedTarget || "").replace(/\/$/, "");

let activeTarget = DEFAULT_TARGET;
let activeInternal = activeTarget === DEFAULT_TARGET;
let updatedAt = null;

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIp(address) {
  if (net.isIPv4(address)) return isPrivateIpv4(address);
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return false;
}

function normalizeTarget(rawTarget) {
  if (typeof rawTarget !== "string" || !rawTarget.trim()) {
    const error = new Error("A target URL is required");
    error.code = "TARGET_URL_REQUIRED";
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(rawTarget.trim());
  } catch {
    const error = new Error("Target must be a valid http:// or https:// URL");
    error.code = "TARGET_URL_INVALID";
    throw error;
  }

  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    const error = new Error("Target URL may use only http/https and must not contain credentials, query parameters, or a fragment");
    error.code = "TARGET_URL_UNSUPPORTED";
    throw error;
  }

  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString().replace(/\/$/, "");
}

function privateTargetsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_PRIVATE_TARGET === "true";
}

async function validateTargetReachability(target) {
  const parsed = new URL(target);
  const hostname = parsed.hostname.toLowerCase();
  if (!privateTargetsAllowed() && (hostname === "localhost" || isPrivateIp(hostname))) {
    const error = new Error("Private and localhost targets are disabled in production");
    error.code = "TARGET_PRIVATE_ADDRESS_BLOCKED";
    throw error;
  }

  if (!net.isIP(hostname)) {
    let addresses;
    try {
      addresses = (await dns.lookup(hostname, { all: true })).map((item) => item.address);
    } catch {
      // DNS can be temporarily unavailable while a lecturer is entering a
      // newly created public hostname. The subsequent target check/proxy
      // request reports reachability; only a positively resolved private
      // address is blocked here.
      addresses = [];
    }
    if (!privateTargetsAllowed() && addresses.some(isPrivateIp)) {
      const error = new Error("Target hostname resolves to a private address");
      error.code = "TARGET_PRIVATE_ADDRESS_BLOCKED";
      throw error;
    }
  }

  return target;
}

async function initializeTarget() {
  try {
    const saved = await findOneDocument("target_configs", { key: "active" });
    if (saved?.target) {
      activeTarget = normalizeTarget(saved.target);
      activeInternal = saved.internal !== false;
      updatedAt = saved.updatedAt || saved.createdAt || null;
    }
  } catch (error) {
    console.error(`[AvailabilityShield] target configuration could not be loaded: ${error.message}`);
  }
  return getTargetConfig();
}

function getTarget() {
  return activeTarget;
}

function isInternalTarget() {
  return activeInternal;
}

function getTargetConfig() {
  return {
    target: activeTarget,
    internal: activeInternal,
    source: activeTarget === DEFAULT_TARGET ? "environment" : "dashboard",
    updatedAt
  };
}

async function setTarget(rawTarget) {
  const target = normalizeTarget(rawTarget);
  await validateTargetReachability(target);
  activeTarget = target;
  activeInternal = target === DEFAULT_TARGET;
  updatedAt = new Date().toISOString();
  await upsertDocument("target_configs", { key: "active" }, {
    target,
    internal: activeInternal,
    updatedAt
  });
  return getTargetConfig();
}

async function checkTarget(timeoutMs = 3000) {
  const target = getTarget();
  const checkedAt = new Date().toISOString();
  try {
    const response = await axios.get(target || "/", {
      timeout: timeoutMs,
      maxRedirects: 3,
      validateStatus: () => true
    });
    return {
      reachable: true,
      status: response.status,
      statusText: response.statusText,
      target,
      checkedAt
    };
  } catch (error) {
    return {
      reachable: false,
      target,
      error: error.code === "ECONNABORTED" ? "Target check timed out" : "Target could not be reached",
      checkedAt
    };
  }
}

module.exports = {
  initializeTarget,
  getTarget,
  getTargetConfig,
  setTarget,
  checkTarget,
  isInternalTarget,
  normalizeTarget,
  validateTargetReachability
};
