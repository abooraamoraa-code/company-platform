require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const apiRouter = require("./api");

const app = express();

const PORT = Number(
  process.env.PORT || 3000
);

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL || false,
    credentials: true
  })
);

app.use(compression());

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "company-platform",
    timestamp:
      new Date().toISOString()
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "Company Platform API",
    version: "1.0.0",
    status: "online"
  });
});

/*
 * API routes
 */

app.use("/api", apiRouter);

/*
 * Static uploads
 */

app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    ),
    {
      index: false
    }
  )
);

/*
 * 404
 */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found"
  });
});

/*
 * Error handler
 */

app.use(
  (error, _req, res, _next) => {
    console.error(
      "[SERVER ERROR]",
      error
    );

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
);

app.listen(PORT, () => {
  console.log(
    `Company Platform running on port ${PORT}`
  );
});
