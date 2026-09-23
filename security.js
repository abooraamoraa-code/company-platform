const crypto = require("crypto");

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function sanitizeString(value, maxLength = 5000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function safeBoolean(value) {
  return value === true || value === "true";
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return fallback;
  }

  return number;
}

module.exports = {
  generateSecureToken,
  hashToken,
  getClientIp,
  sanitizeString,
  safeBoolean,
  safeInteger
};
