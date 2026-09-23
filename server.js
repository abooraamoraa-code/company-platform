require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const apiRouter = require("./api");

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");

/*
|--------------------------------------------------------------------------
| Basic security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const frontendUrl =
  process.env.FRONTEND_URL || "";

app.use(
  cors({
    origin: frontendUrl || false,
    credentials: true
  })
);

/*
|--------------------------------------------------------------------------
| Compression
|--------------------------------------------------------------------------
*/

app.use(compression());

/*
|--------------------------------------------------------------------------
| Body parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

/*
|--------------------------------------------------------------------------
| Global rate limit
|--------------------------------------------------------------------------
*/

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: {
    success: false,
    error:
      "Too many requests. Please try again later."
  }
});

app.use(globalLimiter);

/*
|--------------------------------------------------------------------------
| Admin login rate limit
|--------------------------------------------------------------------------
|
| This is intentionally stricter than the global API limit.
|
*/

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    success: false,
    error:
      "Too many login attempts. Please try again later."
  }
});

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "company-platform",
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| API information
|--------------------------------------------------------------------------
*/

app.get("/api", (_req, res) => {
  res.json({
    name: "Company Platform API",
    version: "1.0.0",
    status: "online"
  });
});

/*
|--------------------------------------------------------------------------
| Admin login protection
|--------------------------------------------------------------------------
|
| Only the login endpoint gets the stronger rate limit.
| All other admin endpoints are already protected by:
|
| authenticate()
| requireRole()
|
| inside api.js.
|
*/

app.use(
  "/api/auth/login",
  adminLoginLimiter
);

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

app.use("/api", apiRouter);

/*
|--------------------------------------------------------------------------
| Uploads
|--------------------------------------------------------------------------
*/

const uploadsPath = path.join(
  process.cwd(),
  "uploads"
);

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, {
    recursive: true
  });
}

app.use(
  "/uploads",
  express.static(uploadsPath, {
    index: false,

    dotfiles: "deny",

    setHeaders: (res) => {
      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=86400"
      );
    }
  })
);

/*
|--------------------------------------------------------------------------
| Admin page
|--------------------------------------------------------------------------
|
| The admin page is intentionally exposed through /admin.
|
| The actual data is NOT exposed here.
| Every protected API request still requires JWT + role.
|
*/

const adminPagePath = path.join(
  process.cwd(),
  "admin.html"
);

app.get("/admin", (_req, res) => {
  if (!fs.existsSync(adminPagePath)) {
    return res.status(404).send(
      "Admin page not found"
    );
  }

  res.sendFile(adminPagePath);
});

/*
|--------------------------------------------------------------------------
| Block direct access to admin.html
|--------------------------------------------------------------------------
|
| Use:
|
|     /admin
|
| instead of:
|
|     /admin.html
|
*/

app.get("/admin.html", (_req, res) => {
  res.redirect(302, "/admin");
});

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found"
  });
});

/*
|--------------------------------------------------------------------------
| Error handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      "[SERVER ERROR]",
      error
    );

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(
    `Company Platform running on port ${PORT}`
  );

  console.log(
    `Admin panel: /admin`
  );
});
