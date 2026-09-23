const express = require("express");
const { z } = require("zod");

const {
  query
} = require("./database");

const {
  authenticate,
  requireRole,
  hashPassword,
  verifyPassword,
  createToken,
  recordSecurityEvent
} = require("./auth");

const {
  sanitizeString,
  getClientIp
} = require("./security");

const {
  upload,
  getPublicFileName
} = require("./upload");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Validation schemas
|--------------------------------------------------------------------------
*/

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200)
});

const clientRequestSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  project_type: z.string().max(150).optional(),
  details: z.string().min(10).max(10000),
  budget: z.string().max(100).optional(),
  deadline: z.string().max(100).optional(),
  website_url: z.string().url().max(500).optional()
});

const contactSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(5).max(5000)
});

/*
|--------------------------------------------------------------------------
| Public projects
|--------------------------------------------------------------------------
*/

router.get("/projects", async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        title,
        slug,
        short_description,
        cover_image,
        demo_url,
        github_url,
        technologies,
        is_featured,
        created_at
      FROM projects
      WHERE is_published = TRUE
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      projects: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Unable to load projects"
    });
  }
});

/*
|--------------------------------------------------------------------------
| Single public project
|--------------------------------------------------------------------------
*/

router.get("/projects/:slug", async (req, res) => {
  try {
    const slug = sanitizeString(
      req.params.slug,
      220
    );

    const result = await query(
      `
      SELECT
        id,
        title,
        slug,
        short_description,
        description,
        cover_image,
        demo_url,
        github_url,
        client_name,
        technologies,
        is_featured,
        created_at
      FROM projects
      WHERE slug = $1
        AND is_published = TRUE
      LIMIT 1
      `,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    res.json({
      success: true,
      project: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Unable to load project"
    });
  }
});

/*
|--------------------------------------------------------------------------
| Public services
|--------------------------------------------------------------------------
*/

router.get("/services", async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        title,
        slug,
        description,
        icon,
        sort_order
      FROM services
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, created_at DESC
    `);

    res.json({
      success: true,
      services: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Unable to load services"
    });
  }
});

/*
|--------------------------------------------------------------------------
| Public jobs
|--------------------------------------------------------------------------
*/

router.get("/jobs", async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        created_at
      FROM jobs
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      jobs: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Unable to load jobs"
    });
  }
});

/*
|--------------------------------------------------------------------------
| Client request
|--------------------------------------------------------------------------
*/

router.post(
  "/requests",
  upload.single("attachment"),
  async (req, res) => {
    try {
      const data = clientRequestSchema.parse({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        project_type: req.body.project_type,
        details: req.body.details,
        budget: req.body.budget,
        deadline: req.body.deadline,
        website_url: req.body.website_url
      });

      const attachmentUrl =
        getPublicFileName(req.file);

      const result = await query(
        `
        INSERT INTO client_requests
        (
          name,
          email,
          phone,
          project_type,
          details,
          budget,
          deadline,
          website_url,
          attachment_url
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, created_at
        `,
        [
          data.name,
          data.email,
          data.phone || null,
          data.project_type || null,
          data.details,
          data.budget || null,
          data.deadline || null,
          data.website_url || null,
          attachmentUrl
        ]
      );

      res.status(201).json({
        success: true,
        message:
          "Your project request has been received.",
        request: result.rows[0]
      });
    } catch (error) {
      console.error(error);

      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.issues
        });
      }

      res.status(500).json({
        success: false,
        error: "Unable to submit request"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Contact form
|--------------------------------------------------------------------------
*/

router.post(
  "/messages",
  async (req, res) => {
    try {
      const data =
        contactSchema.parse(req.body);

      const result = await query(
        `
        INSERT INTO messages
        (
          name,
          email,
          phone,
          subject,
          message
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id, created_at
        `,
        [
          data.name,
          data.email,
          data.phone || null,
          data.subject || null,
          data.message
        ]
      );

      res.status(201).json({
        success: true,
        message:
          "Your message has been received.",
        data: result.rows[0]
      });
    } catch (error) {
      console.error(error);

      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid message data"
        });
      }

      res.status(500).json({
        success: false,
        error: "Unable to send message"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin login
|--------------------------------------------------------------------------
*/

router.post(
  "/auth/login",
  async (req, res) => {
    try {
      const data =
        loginSchema.parse(req.body);

      const result = await query(
        `
        SELECT
          id,
          full_name,
          email,
          password_hash,
          role,
          is_active
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [data.email]
      );

      if (result.rows.length === 0) {
        await recordSecurityEvent(
          "login_failed",
          req,
          {
            reason: "unknown_email"
          }
        );

        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: "Account disabled"
        });
      }

      const valid =
        await verifyPassword(
          data.password,
          user.password_hash
        );

      if (!valid) {
        await recordSecurityEvent(
          "login_failed",
          req,
          {
            reason: "invalid_password"
          }
        );

        return res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }

      const token = createToken(user);

      await query(
        `
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = $1
        `,
        [user.id]
      );

      await recordSecurityEvent(
        "login_success",
        req
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);

      res.status(400).json({
        success: false,
        error: "Invalid login request"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Current authenticated user
|--------------------------------------------------------------------------
*/

router.get(
  "/auth/me",
  authenticate,
  async (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  }
);

/*
|--------------------------------------------------------------------------
| Admin statistics
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/stats",
  authenticate,
  requireRole(
    "admin",
    "manager"
  ),
  async (_req, res) => {
    try {
      const [
        projects,
        requests,
        applications,
        messages,
        users
      ] = await Promise.all([
        query(`
          SELECT COUNT(*)::int AS count
          FROM projects
        `),

        query(`
          SELECT COUNT(*)::int AS count
          FROM client_requests
          WHERE status = 'new'
        `),

        query(`
          SELECT COUNT(*)::int AS count
          FROM job_applications
          WHERE status = 'new'
        `),

        query(`
          SELECT COUNT(*)::int AS count
          FROM messages
          WHERE status = 'unread'
        `),

        query(`
          SELECT COUNT(*)::int AS count
          FROM users
          WHERE is_active = TRUE
        `)
      ]);

      res.json({
        success: true,
        stats: {
          projects:
            projects.rows[0].count,

          new_requests:
            requests.rows[0].count,

          new_applications:
            applications.rows[0].count,

          unread_messages:
            messages.rows[0].count,

          active_users:
            users.rows[0].count
        }
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Unable to load dashboard"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin projects
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/projects",
  authenticate,
  requireRole("admin", "manager"),
  async (_req, res) => {
    try {
      const result = await query(`
        SELECT *
        FROM projects
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        projects: result.rows
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Unable to load admin projects"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin requests
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/requests",
  authenticate,
  requireRole("admin", "manager"),
  async (_req, res) => {
    try {
      const result = await query(`
        SELECT *
        FROM client_requests
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        requests: result.rows
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Unable to load requests"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin applications
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/applications",
  authenticate,
  requireRole("admin", "manager"),
  async (_req, res) => {
    try {
      const result = await query(`
        SELECT
          job_applications.*,
          jobs.title AS job_title
        FROM job_applications
        LEFT JOIN jobs
          ON jobs.id = job_applications.job_id
        ORDER BY job_applications.created_at DESC
      `);

      res.json({
        success: true,
        applications: result.rows
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error:
          "Unable to load applications"
      });
    }
  }
);

module.exports = router;
