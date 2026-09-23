const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
  query
} = require("./database");

const {
  getClientIp
} = require("./security");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "[AUTH] JWT_SECRET is not configured yet."
  );
}

const TOKEN_EXPIRES_IN = "2h";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createToken(user) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN,
      issuer: "company-platform"
    }
  );
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.verify(token, JWT_SECRET, {
    issuer: "company-platform"
  });
}

function extractToken(req) {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7).trim();
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const payload = verifyToken(token);

    const result = await query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        is_active
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid session"
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Account disabled"
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("[AUTH]", error.message);

    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication"
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions"
      });
    }

    next();
  };
}

async function recordSecurityEvent(
  type,
  req,
  metadata = {}
) {
  try {
    await query(
      `
      INSERT INTO security_events
      (
        event_type,
        email,
        ip_address,
        user_agent,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        type,
        req.body?.email || null,
        getClientIp(req),
        req.headers["user-agent"] || null,
        JSON.stringify(metadata)
      ]
    );
  } catch (error) {
    console.error(
      "[SECURITY EVENT]",
      error.message
    );
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  authenticate,
  requireRole,
  recordSecurityEvent
};
