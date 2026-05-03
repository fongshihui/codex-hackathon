import * as Sentry from "@sentry/node";
import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import pinoHttp from "pino-http";
import { z } from "zod";
import { requireSupabaseAuth } from "./src/auth.js";
import { generateAiCandidate } from "./src/gemini.js";
import { extractGithubProjects, isGithubUrl } from "./src/github.js";
import { extractResumeText } from "./src/resume-parser.js";
import {
  extractJobPosting,
  extractLinkedInProfile,
  isLinkedInProfileUrl,
  isSupportedJobPostingUrl,
} from "./src/scrapegraph.js";

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 8001);
const host = process.env.HOST || "127.0.0.1";
const publicOrigin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || publicOrigin)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const supabaseUrl = process.env.SUPABASE_URL;
const sentryEnabled = Boolean(process.env.SENTRY_DSN);

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required. Copy .env.example to .env and configure it.");
}

const app = express();

app.set("trust proxy", isProduction ? 1 : false);
app.use(
  pinoHttp({
    level: process.env.LOG_LEVEL || "info",
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return process.env.HTTP_ACCESS_LOGS === "true" ? "info" : "silent";
    },
  }),
);
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "https://cdn.jsdelivr.net"],
        "connect-src": [
          "'self'",
          supabaseUrl,
          "https://*.ingest.sentry.io",
          "https://*.ingest.us.sentry.io",
        ],
      },
    },
  }),
);
app.use(
  cors((req, callback) => {
    callback(null, {
      origin(origin, originCallback) {
        if (!origin || isAllowedCorsOrigin(origin, req)) {
          originCallback(null, true);
          return;
        }
        originCallback(new Error("Origin is not allowed by CORS."));
      },
      credentials: false,
    });
  }),
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "256kb" }));

function isAllowedCorsOrigin(origin, req) {
  if (allowedOrigins.includes(origin) || origin === publicOrigin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = req.get("host");
    if (!requestHost || originUrl.host !== requestHost) return false;
    if (isProduction) {
      return originUrl.protocol === "https:";
    }
    return originUrl.protocol === `${req.protocol}:`;
  } catch {
    return false;
  }
}

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 60),
  standardHeaders: true,
  legacyHeaders: false,
});
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.RESUME_UPLOAD_LIMIT_BYTES || 8 * 1024 * 1024),
    files: 1,
  },
});

const textField = z.string().trim().max(20_000).optional().default("");
const urlField = z
  .string()
  .trim()
  .max(2_000)
  .optional()
  .default("")
  .refine((value) => !value || /^https?:\/\/[^\s]+$/i.test(value), "URL must start with http:// or https://.");

const analysisSchema = z
  .object({
    resumeText: textField,
    notesText: textField,
    linkedinText: textField,
    githubText: textField,
    jobText: textField,
    linkedinUrl: urlField,
    githubUrl: urlField,
    jobUrl: urlField,
  })
  .refine(
    (input) => input.resumeText || input.notesText || input.linkedinText || input.githubText || input.jobText,
    "Add resume, LinkedIn text, GitHub project text, notes, or a job description first.",
  );

const aiSchema = z.object({
  context: analysisSchema,
});

const linkedInExtractSchema = z.object({
  url: urlField.refine(isLinkedInProfileUrl, "Enter a valid public LinkedIn profile URL like https://www.linkedin.com/in/name."),
});

const jobExtractSchema = z.object({
  url: urlField.refine(isSupportedJobPostingUrl, "Enter a valid public job posting URL."),
});

const githubExtractSchema = z.object({
  url: urlField.refine(isGithubUrl, "Enter a public GitHub profile or repository URL."),
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    environment: process.env.NODE_ENV || "development",
    sentry: sentryEnabled,
  });
});

app.get("/config.local.js", (_req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(
    `window.SUPABASE_CONFIG = ${JSON.stringify({
      url: process.env.SUPABASE_URL || "",
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    })};
window.APP_CONFIG = ${JSON.stringify({
      apiBaseUrl: process.env.BROWSER_API_BASE_URL || "",
    })};
window.SENTRY_CONFIG = ${JSON.stringify({
      browserDsn: process.env.SENTRY_BROWSER_DSN || "",
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || "",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    })};
`,
  );
});

app.post("/api/generate", apiLimiter, requireSupabaseAuth({ supabaseUrl }), async (req, res, next) => {
  try {
    const parsed = aiSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid AI generation request.",
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const result = await generateAiCandidate(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/api/resume/extract",
  apiLimiter,
  requireSupabaseAuth({ supabaseUrl }),
  resumeUpload.single("resume"),
  async (req, res, next) => {
    try {
      const result = await extractResumeText(req.file);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

app.post("/api/linkedin/extract", apiLimiter, requireSupabaseAuth({ supabaseUrl }), async (req, res, next) => {
  try {
    const parsed = linkedInExtractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid LinkedIn extraction request.",
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const result = await extractLinkedInProfile(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/github/extract", apiLimiter, requireSupabaseAuth({ supabaseUrl }), async (req, res, next) => {
  try {
    const parsed = githubExtractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid GitHub extraction request.",
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const result = await extractGithubProjects(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/job/extract", apiLimiter, requireSupabaseAuth({ supabaseUrl }), async (req, res, next) => {
  try {
    const parsed = jobExtractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid job extraction request.",
        details: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const result = await extractJobPosting(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

app.use(express.static(".", {
  extensions: ["html"],
  index: "index.html",
  maxAge: isProduction ? "1h" : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html") || filePath.endsWith("config.local.js")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

Sentry.setupExpressErrorHandler(app);
app.use((err, req, res, _next) => {
  req.log?.error({ err }, "Unhandled request error");
  const status = Number(err.status || 500);
  const message =
    status >= 500 && isProduction ? "Internal server error." : err.message || "Internal server error.";
  res.status(status).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`Interview Prep Studio listening on ${publicOrigin}`);
});
