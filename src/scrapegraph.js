import { readCache, writeCache } from "./cache.js";

export async function extractLinkedInProfile({ url }) {
  return extractWithScrapeGraph({
    url,
    prompt:
      "Extract public LinkedIn profile information for resume tailoring. Return name, headline, location, about, experiences with title/company/duration/description, education, skills, certifications, projects, and notable achievements. Only include information visible on the public page.",
    schema: linkedInProfileSchema(),
    formatter: formatLinkedInProfile,
    failureMessage: "LinkedIn extraction failed.",
  });
}

export async function extractJobPosting({ url }) {
  const normalizedUrl = normalizeJobPostingUrl(url);
  return extractWithScrapeGraph({
    url: normalizedUrl,
    prompt:
      "Extract public job posting information for resume tailoring and interview prep. Return title, company, location, employment type, seniority, summary, responsibilities, requirements, preferred qualifications, technologies, interview topics, compensation, and application notes. Only include information visible on the public page.",
    schema: jobPostingSchema(),
    formatter: formatJobPosting,
    failureMessage: "Job posting extraction failed.",
  });
}

async function extractWithScrapeGraph({ url, prompt, schema, formatter, failureMessage }) {
  const apiKey = process.env.SGAI_API_KEY || process.env.SCRAPEGRAPH_API_KEY || process.env.SCRAPEGRAPHAI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SGAI_API_KEY") {
    const error = new Error("SGAI_API_KEY is missing. Add it to .env and restart the server.");
    error.status = 500;
    throw error;
  }

  const endpoint = process.env.SGAI_EXTRACT_URL || "https://v2-api.scrapegraphai.com/api/extract";
  const cacheKey = `${endpoint}:${url}:${prompt}`;
  const cached = await readExtractionCache(cacheKey);
  if (cached) return cached;

  const timeoutMs = Number(process.env.SGAI_TIMEOUT_MS || 35_000);
  const wait = Number(process.env.SGAI_WAIT_MS || 1_000);
  const scrolls = Number(process.env.SGAI_SCROLLS || 1);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "SGAI-APIKEY": apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      url,
      prompt,
      schema,
      fetchConfig: {
        mode: "js",
        stealth: true,
        wait,
        scrolls,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.message || failureMessage);
    error.status = response.status;
    throw error;
  }

  const extracted = payload.json || payload.result || payload.data?.json_data || payload.data || payload;
  const result = {
    raw: extracted,
    text: formatter(extracted),
  };
  await writeExtractionCache(cacheKey, result);
  return result;
}

function readExtractionCache(key) {
  return readCache("scrapegraph", key);
}

function writeExtractionCache(key, value) {
  const ttlMs = Number(process.env.SGAI_CACHE_TTL_MS || 15 * 60_000);
  return writeCache("scrapegraph", key, value, ttlMs);
}

export function isLinkedInProfileUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) && parsed.pathname.startsWith("/in/");
  } catch {
    return false;
  }
}

export function isSupportedJobPostingUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
      return (
        parsed.pathname.startsWith("/jobs/") ||
        parsed.pathname.startsWith("/job/") ||
        Boolean(parsed.searchParams.get("currentJobId"))
      );
    }
    return /^https?:\/\/[^\s]+$/i.test(value);
  } catch {
    return false;
  }
}

function normalizeJobPostingUrl(value) {
  const parsed = new URL(value);
  const hostname = parsed.hostname.toLowerCase();
  const jobId = parsed.searchParams.get("currentJobId");

  if ((hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) && jobId) {
    return `https://www.linkedin.com/jobs/view/${encodeURIComponent(jobId)}/`;
  }

  return parsed.href;
}

function linkedInProfileSchema() {
  return {
    type: "object",
    properties: {
      name: { type: "string" },
      headline: { type: "string" },
      location: { type: "string" },
      about: { type: "string" },
      experiences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            duration: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: { type: "string" },
            degree: { type: "string" },
            duration: { type: "string" },
          },
        },
      },
      skills: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      projects: { type: "array", items: { type: "string" } },
      achievements: { type: "array", items: { type: "string" } },
    },
  };
}

function jobPostingSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      company: { type: "string" },
      location: { type: "string" },
      employmentType: { type: "string" },
      seniority: { type: "string" },
      summary: { type: "string" },
      responsibilities: { type: "array", items: { type: "string" } },
      requirements: { type: "array", items: { type: "string" } },
      preferredQualifications: { type: "array", items: { type: "string" } },
      technologies: { type: "array", items: { type: "string" } },
      interviewTopics: { type: "array", items: { type: "string" } },
      compensation: { type: "string" },
      applicationNotes: { type: "string" },
    },
  };
}

function formatLinkedInProfile(profile) {
  const lines = ["LinkedIn Extracted Profile"];
  addLine(lines, "Name", profile.name);
  addLine(lines, "Headline", profile.headline);
  addLine(lines, "Location", profile.location);
  addLine(lines, "About", profile.about);

  addSection(lines, "Experience", profile.experiences, (experience) => {
    if (typeof experience === "string") return experience;
    return [
      [experience.title, experience.company].filter(Boolean).join(" at "),
      experience.duration,
      experience.location,
      experience.description,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  addSection(lines, "Education", profile.education, (education) => {
    if (typeof education === "string") return education;
    return [education.school, education.degree, education.duration].filter(Boolean).join(" | ");
  });

  addSection(lines, "Skills", profile.skills);
  addSection(lines, "Certifications", profile.certifications);
  addSection(lines, "Projects", profile.projects);
  addSection(lines, "Achievements", profile.achievements);

  return lines.filter(Boolean).join("\n");
}

function formatJobPosting(job) {
  const lines = ["Extracted Job Posting"];
  addLine(lines, "Title", job.title);
  addLine(lines, "Company", job.company);
  addLine(lines, "Location", job.location);
  addLine(lines, "Employment type", job.employmentType);
  addLine(lines, "Seniority", job.seniority);
  addLine(lines, "Summary", job.summary);
  addSection(lines, "Responsibilities", job.responsibilities);
  addSection(lines, "Requirements", job.requirements);
  addSection(lines, "Preferred Qualifications", job.preferredQualifications);
  addSection(lines, "Technologies", job.technologies);
  addSection(lines, "Interview Topics", job.interviewTopics);
  addLine(lines, "Compensation", job.compensation);
  addLine(lines, "Application notes", job.applicationNotes);
  return lines.filter(Boolean).join("\n");
}

function addLine(lines, label, value) {
  if (typeof value === "string" && value.trim()) lines.push(`${label}: ${value.trim()}`);
}

function addSection(lines, label, items, formatter = (item) => item) {
  if (!Array.isArray(items) || items.length === 0) return;
  const formatted = items.map(formatter).map((item) => String(item || "").trim()).filter(Boolean);
  if (!formatted.length) return;
  lines.push("", label);
  lines.push(...formatted.map((item) => `- ${item}`));
}
