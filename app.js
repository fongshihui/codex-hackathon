const supabaseConfig = window.SUPABASE_CONFIG || {};
const appConfig = window.APP_CONFIG || {};
const sentryConfig = window.SENTRY_CONFIG || {};
const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseConfig.url || "") &&
  Boolean(supabaseConfig.publishableKey) &&
  supabaseConfig.publishableKey !== "YOUR_SUPABASE_PUBLISHABLE_KEY";

let supabaseClient = null;
let sentryClient = null;
let currentSession = null;
let lastAiOutput = {};
let prepMemory = [];
let applications = [];
let questionBank = [];
let behavioralStories = [];
let editingApplicationId = null;
let isAppStateHydrating = false;
let appStateSaveTimer = null;

const authGate = document.querySelector("#authGate");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const signInButton = document.querySelector("#signInButton");
const signUpButton = document.querySelector("#signUpButton");
const demoButton = document.querySelector("#demoButton");
const signOutButton = document.querySelector("#signOutButton");
const accountEmail = document.querySelector("#accountEmail");
const saveToggle = document.querySelector("#saveToggle");
const saveStatus = document.querySelector("#saveStatus");
const clearSavedButton = document.querySelector("#clearSavedButton");
const pageTitle = document.querySelector("#pageTitle");
const pagePanels = [...document.querySelectorAll("[data-page]")];
const pageLinks = [...document.querySelectorAll("[data-page-link]")];
const resumeInput = document.querySelector("#resumeInput");
const notesInput = document.querySelector("#notesInput");
const linkedinUrlInput = document.querySelector("#linkedinUrlInput");
const linkedinTextInput = document.querySelector("#linkedinTextInput");
const githubUrlInput = document.querySelector("#githubUrlInput");
const githubTextInput = document.querySelector("#githubTextInput");
const jobUrlInput = document.querySelector("#jobUrlInput");
const jobTextInput = document.querySelector("#jobTextInput");
const openLinkedinButton = document.querySelector("#openLinkedinButton");
const fetchLinkedinButton = document.querySelector("#fetchLinkedinButton");
const fetchGithubButton = document.querySelector("#fetchGithubButton");
const openJobButton = document.querySelector("#openJobButton");
const fetchJobButton = document.querySelector("#fetchJobButton");
const resumeCount = document.querySelector("#resumeCount");
const notesCount = document.querySelector("#notesCount");
const linkedinCount = document.querySelector("#linkedinCount");
const githubCount = document.querySelector("#githubCount");
const jobCount = document.querySelector("#jobCount");
const readinessScore = document.querySelector("#readinessScore");
const readinessList = document.querySelector("#readinessList");
const resumeFile = document.querySelector("#resumeFile");
const notesFile = document.querySelector("#notesFile");
const analyzeButton = document.querySelector("#analyzeButton");
const sampleButton = document.querySelector("#sampleButton");
const clearResume = document.querySelector("#clearResume");
const clearNotes = document.querySelector("#clearNotes");
const clearLinkedin = document.querySelector("#clearLinkedin");
const clearGithub = document.querySelector("#clearGithub");
const clearJob = document.querySelector("#clearJob");
const copyButton = document.querySelector("#copyButton");
const copyTailoredButton = document.querySelector("#copyTailoredButton");
const copyPackButton = document.querySelector("#copyPackButton");
const downloadPackButton = document.querySelector("#downloadPackButton");
const fitScore = document.querySelector("#fitScore");
const fitMeter = document.querySelector("#fitMeter");
const fitSummary = document.querySelector("#fitSummary");
const strengthList = document.querySelector("#strengthList");
const gapList = document.querySelector("#gapList");
const actionList = document.querySelector("#actionList");
const resumeChangeList = document.querySelector("#resumeChangeList");
const lcList = document.querySelector("#lcList");
const systemList = document.querySelector("#systemList");
const prepMemoryList = document.querySelector("#prepMemoryList");
const saveGeneratedQuestionsButton = document.querySelector("#saveGeneratedQuestionsButton");
const manualQuestionInput = document.querySelector("#manualQuestionInput");
const manualQuestionType = document.querySelector("#manualQuestionType");
const addQuestionButton = document.querySelector("#addQuestionButton");
const questionStats = document.querySelector("#questionStats");
const questionBankList = document.querySelector("#questionBankList");
const buildStoriesButton = document.querySelector("#buildStoriesButton");
const storyList = document.querySelector("#storyList");
const seedApplicationButton = document.querySelector("#seedApplicationButton");
const saveApplicationButton = document.querySelector("#saveApplicationButton");
const resetApplicationFormButton = document.querySelector("#resetApplicationFormButton");
const applicationCompany = document.querySelector("#applicationCompany");
const applicationRole = document.querySelector("#applicationRole");
const applicationUrl = document.querySelector("#applicationUrl");
const applicationStatus = document.querySelector("#applicationStatus");
const applicationStage = document.querySelector("#applicationStage");
const applicationPriority = document.querySelector("#applicationPriority");
const applicationDeadline = document.querySelector("#applicationDeadline");
const applicationAppliedAt = document.querySelector("#applicationAppliedAt");
const applicationFollowUp = document.querySelector("#applicationFollowUp");
const applicationRecruiter = document.querySelector("#applicationRecruiter");
const applicationNotes = document.querySelector("#applicationNotes");
const applicationCount = document.querySelector("#applicationCount");
const applicationList = document.querySelector("#applicationList");
const keywordScore = document.querySelector("#keywordScore");
const keywordSummary = document.querySelector("#keywordSummary");
const matchedKeywords = document.querySelector("#matchedKeywords");
const missingKeywords = document.querySelector("#missingKeywords");
const briefOutput = document.querySelector("#briefOutput");
const tailoredResumeOutput = document.querySelector("#tailoredResumeOutput");
const qualityScore = document.querySelector("#qualityScore");
const qualityText = document.querySelector("#qualityText");
const toast = document.querySelector("#toast");
const prepMemoryPrefix = "interview-prep-studio:prep-memory:";
const autoSavePreferenceKey = "interview-prep-studio:autosave-enabled";
const maxPrepMemoryItems = 12;
const maxQuestionBankItems = 80;
const maxBehavioralStories = 12;
const appStateTable = "app_state";
const keywordStopWords = new Set([
  "about",
  "above",
  "across",
  "after",
  "also",
  "and",
  "are",
  "build",
  "building",
  "can",
  "company",
  "design",
  "engineer",
  "engineering",
  "experience",
  "for",
  "from",
  "has",
  "have",
  "including",
  "into",
  "looking",
  "more",
  "our",
  "own",
  "role",
  "should",
  "team",
  "that",
  "the",
  "their",
  "this",
  "through",
  "using",
  "want",
  "we",
  "who",
  "with",
  "work",
  "working",
  "you",
]);
const demoSession = {
  isDemo: true,
  user: {
    id: "demo",
    email: "sample workspace",
  },
};
let autoSaveEnabled = localStorage.getItem(autoSavePreferenceKey) !== "false";

const pageTitles = {
  resume: "Resume intake",
  context: "Role context",
  analysis: "Fit analysis",
  draft: "Editable drafts",
  prep: "Interview practice",
  applications: "Application tracker",
};

const sampleResume = `Maya Chen
Senior Software Engineer

Built backend services for a B2B analytics platform serving 140 enterprise customers. Designed event ingestion APIs, reduced dashboard latency by 38%, and coordinated product, support, and data teams.

Experience
Software Engineer, Northstar Labs
- Owned Node.js services for customer analytics, billing events, and admin reporting.
- Created SQL data models and observability dashboards for product usage.
- Partnered with frontend engineers to improve onboarding workflows and error handling.

Skills
JavaScript, TypeScript, React, Node.js, SQL, REST APIs, product analytics, dashboard reporting, stakeholder communication.`;

const sampleNotes = `Target role: Senior Full Stack Engineer at a SaaS company.
Hiring team cares about React, Node.js, API design, SQL, system design, scalability, debugging, and customer-facing product sense.

Interview notes:
- Strong communicator with crisp examples.
- Needs LeetCode practice around arrays, hash maps, graphs, and dynamic programming.
- System design round may focus on analytics dashboards, notifications, or rate-limited APIs.
- Resume should highlight architecture, measurable impact, and cross-functional execution.`;

const sampleLinkedinUrl = "https://www.linkedin.com/in/maya-chen";
const sampleLinkedinText = `About
Full stack engineer who enjoys building customer-facing analytics products. Experienced with React, TypeScript, Node.js, SQL, event-driven services, dashboards, and cross-functional product work.

Featured
Reduced dashboard latency by improving query patterns and API response handling.

Skills
React, TypeScript, Node.js, SQL, API design, observability, product analytics, stakeholder communication.`;

const sampleGithubUrl = "https://github.com/maya-chen/analytics-workbench";
const sampleGithubText = `GitHub Public Projects
analytics-workbench - TypeScript project for customer analytics dashboards, event ingestion, and SQL-backed reporting. Topics: react, node, analytics, dashboards.
api-rate-limiter - Node.js service demonstrating token bucket rate limiting, API middleware, observability, and load testing.
data-quality-cli - Command-line tool for validating CSV exports, profiling SQL result sets, and producing quality reports.`;

const sampleJobUrl = "https://example.com/jobs/senior-full-stack-engineer";
const sampleJobText = `Senior Full Stack Engineer
We are looking for an engineer who can own end-to-end product features across React, TypeScript, Node.js, SQL, API design, and scalable systems. The role includes building analytics workflows, improving performance, writing reliable services, collaborating with product managers, and explaining technical tradeoffs in system design interviews.`;

async function initializeSentry() {
  if (!sentryConfig.browserDsn) return;

  try {
    sentryClient = await import("https://cdn.jsdelivr.net/npm/@sentry/browser/+esm");
    sentryClient.init({
      dsn: sentryConfig.browserDsn,
      environment: sentryConfig.environment || "development",
      release: sentryConfig.release,
      tracesSampleRate: Number(sentryConfig.tracesSampleRate || 0),
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        delete event.user;
        return event;
      },
    });
    sentryClient.setTag("app", "interview-prep-studio");
  } catch {
    sentryClient = null;
  }
}

function reportError(error, context = {}) {
  if (sentryClient) sentryClient.captureException(error, { extra: context });
}

function words(text) {
  return String(text || "")
    .replace(/[^a-z0-9+\s-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function wordCount(text) {
  return words(text).length;
}

function getContext() {
  return {
    resumeText: resumeInput.value.trim(),
    notesText: notesInput.value.trim(),
    linkedinText: linkedinTextInput.value.trim(),
    githubText: githubTextInput.value.trim(),
    jobText: jobTextInput.value.trim(),
    linkedinUrl: normalizeUrl(linkedinUrlInput.value),
    githubUrl: normalizeUrl(githubUrlInput.value),
    jobUrl: normalizeUrl(jobUrlInput.value),
  };
}

function hasInput(context) {
  return Boolean(
    context.resumeText ||
      context.notesText ||
      context.linkedinText ||
      context.githubText ||
      context.jobText ||
      context.linkedinUrl ||
      context.githubUrl ||
      context.jobUrl,
  );
}

function hasGenerationTextInput(context) {
  return Boolean(
    context.resumeText || context.notesText || context.linkedinText || context.githubText || context.jobText,
  );
}

async function analyze() {
  const context = getContext();
  if (!hasGenerationTextInput(context)) {
    showToast("Paste or import source text before generating. URL-only input is not enough.");
    return;
  }

  if (window.location.protocol === "file:") {
    showToast("Start the Node server to use the AI API.");
    return;
  }

  if (currentSession?.isDemo) {
    applyAiOutput(buildDemoAiOutput(context));
    showToast("Sample AI output generated locally. Sign in for live AI.");
    return;
  }

  if (!currentSession?.access_token) {
    showToast("Sign in before generating AI output.");
    return;
  }

  clearGeneratedOutput();
  setGenerateLoading(true);

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeaders(),
      },
      body: JSON.stringify({ context }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "AI generation failed.");
    }

    applyAiOutput(payload);
    showToast("AI output generated.");
  } catch (error) {
    reportError(error, { feature: "ai-generation" });
    showToast(error.message || "AI generation failed.");
  } finally {
    setGenerateLoading(false);
  }
}

function applyAiOutput(payload) {
  renderAiOutput(payload);
  rememberPrepRun(getContext(), payload);
  renderPrepMemory();
  queueSaveAppState(0);
  setActivePage("analysis", true);
}

function renderAiOutput(payload) {
  const score = Number(payload.fitScore ?? payload.score ?? 0);
  setScore(Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0);

  lastAiOutput = {
    fitScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
    fitSummary: cleanString(payload.fitSummary),
    strengths: cleanStringArray(payload.strengths),
    gaps: cleanStringArray(payload.gaps),
    actions: cleanStringArray(payload.actions),
    resumeChangeSuggestions: cleanStringArray(payload.resumeChangeSuggestions),
    leetcodeQuestions: cleanStringArray(payload.leetcodeQuestions),
    systemDesignPrompts: cleanStringArray(payload.systemDesignPrompts),
    candidateBrief: cleanString(payload.candidateBrief),
    tailoredResume: cleanString(payload.tailoredResume),
  };

  fitSummary.textContent = cleanString(payload.fitSummary) || "AI generated the output below.";
  renderList(strengthList, cleanStringArray(payload.strengths), "No strengths returned by AI.");
  renderList(gapList, cleanStringArray(payload.gaps), "No gaps returned by AI.");
  renderList(actionList, cleanStringArray(payload.actions), "No actions returned by AI.");
  renderResumeChangeList(cleanStringArray(payload.resumeChangeSuggestions));
  renderLeetcodeList(lcList, cleanStringArray(payload.leetcodeQuestions), "No LeetCode plan returned by AI.");
  renderPracticeList(systemList, cleanStringArray(payload.systemDesignPrompts), "System design prompts will appear after generation.");
  briefOutput.value = cleanString(payload.candidateBrief);
  tailoredResumeOutput.value = cleanString(payload.tailoredResume);
  updateReadiness();
  renderKeywordCoverage();
}

function clearGeneratedOutput() {
  lastAiOutput = {};
  setScore(0);
  fitSummary.textContent = "Generating with AI...";
  renderList(strengthList, [], "Generating strengths...");
  renderList(gapList, [], "Generating gaps...");
  renderList(actionList, [], "Generating actions...");
  renderResumeChangeList([], "Finding resume edits...");
  renderLeetcodeList(lcList, [], "Generating LeetCode plan...");
  renderPracticeList(systemList, [], "Generating system design prompts...");
  briefOutput.value = "";
  tailoredResumeOutput.value = "";
  updateReadiness();
  renderKeywordCoverage();
}

function resetAiOutputDisplay() {
  lastAiOutput = {};
  setScore(0);
  fitSummary.textContent = "Generate with AI to see the candidate fit summary.";
  renderList(strengthList, [], "No strengths generated yet.");
  renderList(gapList, [], "No gaps generated yet.");
  renderList(actionList, [], "Actions will be generated from the resume and notes.");
  renderResumeChangeList([]);
  renderLeetcodeList(lcList, [], "Generate to see drills.");
  renderPracticeList(systemList, [], "Generate to see prompts.");
  briefOutput.value = "";
  tailoredResumeOutput.value = "";
  updateReadiness();
  renderKeywordCoverage();
}

function setScore(score) {
  fitScore.textContent = score;
  fitMeter.style.width = `${score}%`;
  qualityScore.textContent = `${score}%`;
  if (score >= 75) {
    qualityText.textContent = "Strong AI-assessed match.";
  } else if (score >= 45) {
    qualityText.textContent = "Partial match. Review AI gaps and missing proof.";
  } else if (score > 0) {
    qualityText.textContent = "Weak match or insufficient evidence.";
  } else {
    qualityText.textContent = "Generate with AI to score the candidate.";
  }
}

function renderList(target, items, fallback) {
  target.classList.toggle("empty-list", items.length === 0);
  target.innerHTML = "";
  const output = items.length ? items : [fallback];
  for (const item of output) {
    const li = document.createElement("li");
    li.textContent = item;
    target.append(li);
  }
}

function renderLeetcodeList(target, items, fallback) {
  target.classList.toggle("practice-list", items.length > 0);
  target.classList.toggle("empty-list", items.length === 0);
  target.innerHTML = "";
  const output = items.length ? items : [fallback];
  for (const item of output) {
    const li = document.createElement("li");
    if (!items.length) {
      li.textContent = item;
    } else {
      const parsed = parsePracticeItem(item);
      const text = document.createElement("span");
      text.className = "practice-title";
      text.textContent = parsed.title;
      if (parsed.meta) {
        const meta = document.createElement("small");
        meta.textContent = parsed.meta;
        li.append(text, meta);
      } else {
        li.append(text);
      }
      const link = document.createElement("a");
      link.href = leetcodeProblemUrl(parsed.title);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "inline-link";
      link.textContent = "Practice";
      li.append(link);
    }
    target.append(li);
  }
}

function renderPracticeList(target, items, fallback) {
  target.classList.toggle("practice-list", items.length > 0);
  target.classList.toggle("empty-list", items.length === 0);
  target.innerHTML = "";
  const output = items.length ? items : [fallback];
  for (const item of output) {
    const li = document.createElement("li");
    if (!items.length) {
      li.textContent = item;
    } else {
      const parsed = parsePracticeItem(item);
      const title = document.createElement("span");
      title.className = "practice-title";
      title.textContent = parsed.title;
      li.append(title);
      if (parsed.meta) {
        const meta = document.createElement("small");
        meta.textContent = parsed.meta;
        li.append(meta);
      }
    }
    target.append(li);
  }
}

function renderResumeChangeList(items, fallback = "Resume changes will appear after generation.") {
  if (!resumeChangeList) return;
  resumeChangeList.classList.toggle("change-list", items.length > 0);
  resumeChangeList.classList.toggle("empty-list", items.length === 0);
  resumeChangeList.innerHTML = "";
  const output = items.length ? items : [fallback];
  for (const item of output) {
    const li = document.createElement("li");
    if (!items.length) {
      li.textContent = item;
    } else {
      const parsed = parseResumeChange(item);
      const label = document.createElement("strong");
      label.textContent = parsed.section;
      const detail = document.createElement("span");
      detail.textContent = parsed.detail;
      li.append(label, detail);
    }
    resumeChangeList.append(li);
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(items) {
  return Array.isArray(items)
    ? items.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : [];
}

function buildDemoAiOutput(context) {
  const title = inferJobTitle(context);
  const company = inferCompany(context);
  const target = company ? `${title} at ${company}` : title;
  const language = inferPrepLanguage(context);
  return {
    fitScore: context.jobText ? 82 : 68,
    fitSummary: `Sample review for ${target}. The candidate shows strong React, Node.js, SQL, and analytics evidence. Add more role-specific metrics and architecture details before using this as a final draft.`,
    strengths: [
      "Backend and product analytics work map well to full-stack SaaS roles.",
      "Resume includes measurable impact, including dashboard latency improvement.",
      "GitHub evidence reinforces API, dashboard, and data quality experience.",
    ],
    gaps: [
      "Add sharper senior-level architecture examples.",
      "Show ownership of frontend delivery, not only backend services.",
      "Include concrete scale, reliability, and debugging examples for interview depth.",
    ],
    actions: [
      "Rewrite the summary around end-to-end product ownership.",
      "Add two bullets with scale, latency, or customer impact metrics.",
      "Prepare one system design story about analytics dashboards or rate-limited APIs.",
    ],
    resumeChangeSuggestions: [
      "Summary: Lead with SaaS analytics, React, Node.js, SQL, and product ownership.",
      "Experience: Add scale for event ingestion, customer count, or data volume.",
      "Experience: Turn collaboration bullets into ownership and outcome bullets.",
      "Skills: Group stack by frontend, backend, data, and observability.",
      "Projects: Add the rate limiter project as API reliability evidence.",
      "Missing proof: Add one architecture tradeoff and one debugging story.",
    ],
    leetcodeQuestions: [
      `Two Sum - Hash maps - Easy - Language: ${language}`,
      `Top K Frequent Elements - Heaps/hash maps - Medium - Language: ${language}`,
      `LRU Cache - Maps/lists - Medium - Language: ${language}`,
      `Number of Islands - Graph traversal - Medium - Language: ${language}`,
    ],
    systemDesignPrompts: [
      "Customer analytics dashboard - Event ingestion and low-latency reads",
      "Rate-limited public API - Per-customer quotas and observability",
      "Delayed job notifications - Retry and failure reporting",
    ],
    candidateBrief: `Candidate brief for ${target}\n\nMaya Chen is a full-stack engineer with strong Node.js, React, SQL, and analytics-product experience. Her strongest proof points are event ingestion ownership, dashboard latency reduction, and cross-functional delivery with product and support teams.\n\nInterview emphasis: API design, SQL data modeling, dashboard performance, debugging, and product tradeoffs.`,
    tailoredResume: `Rewrite snippets\n\nSummary: Full-stack engineer focused on SaaS analytics workflows, Node.js services, React interfaces, and SQL-backed reporting.\n\nBullet: Reduced dashboard latency by 38% through query tuning and API response improvements.\n\nBullet: Owned analytics, billing event, and admin reporting services for enterprise customer workflows.`,
  };
}

function parsePracticeItem(item) {
  const text = cleanString(item).replace(/\s+/g, " ");
  const [first, ...rest] = text.split(/\s+-\s+|\s+:\s+/).filter(Boolean);
  return {
    title: compactPracticeLabel(first || text, 46) || "Practice item",
    meta: rest.join(" - ").replace(/^why it matters\s*/i, "").slice(0, 52),
  };
}

function inferPrepLanguage(context) {
  const targetLanguage = detectLanguage(`${context.notesText || ""}\n${context.jobText || ""}`);
  const evidenceLanguage = detectLanguage(`${context.resumeText || ""}\n${context.githubText || ""}\n${context.linkedinText || ""}`);
  return targetLanguage || evidenceLanguage || "JavaScript";
}

function detectLanguage(text) {
  const normalized = ` ${String(text || "").toLowerCase()} `;
  const languages = [
    ["TypeScript", /\btypescript\b|\bts\b|\.tsx?\b/],
    ["JavaScript", /\bjavascript\b|\bnode\.?js\b|\breact\b|\bnext\.?js\b|\bjs\b|\.jsx?\b/],
    ["Python", /\bpython\b|\bdjango\b|\bflask\b|\bfastapi\b|\bpytest\b/],
    ["Java", /\bjava\b|\bspring\b|\bspring boot\b/],
    ["C++", /\bc\+\+\b|\bcpp\b/],
    ["C#", /\bc#\b|\bcsharp\b|\.net\b|\bdotnet\b/],
    ["Go", /\bgolang\b|\bgo\b/],
    ["Ruby", /\bruby\b|\brails\b/],
    ["Swift", /\bswift\b|\bios\b/],
    ["Kotlin", /\bkotlin\b|\bandroid\b/],
    ["Rust", /\brust\b/],
    ["PHP", /\bphp\b|\blaravel\b/],
    ["Scala", /\bscala\b|\bspark\b/],
  ];
  const match = languages.find(([, pattern]) => pattern.test(normalized));
  return match ? match[0] : "";
}

function parseResumeChange(item) {
  const text = cleanString(item).replace(/\s+/g, " ");
  const match = text.match(/^([^:.-]{2,42})[:.-]\s*(.+)$/);
  if (!match) {
    return {
      section: "Edit",
      detail: text,
    };
  }
  return {
    section: match[1].trim(),
    detail: match[2].trim(),
  };
}

function prepMemoryKey() {
  const userKey = currentSession?.user?.email || currentSession?.user?.id || "local";
  return `${prepMemoryPrefix}${userKey}`;
}

function readPrepMemory() {
  return prepMemory;
}

function readLocalPrepMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(prepMemoryKey()) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

function writePrepMemory(items) {
  prepMemory = items.slice(0, maxPrepMemoryItems);
  localStorage.setItem(prepMemoryKey(), JSON.stringify(prepMemory));
  queueSaveAppState();
}

function rememberPrepRun(context, payload) {
  const leetcodeQuestions = cleanStringArray(payload.leetcodeQuestions);
  const systemDesignPrompts = cleanStringArray(payload.systemDesignPrompts);
  if (!leetcodeQuestions.length && !systemDesignPrompts.length) return;

  const memory = readPrepMemory();
  const entry = {
    id: jobSignature(context),
    title: inferJobTitle(context),
    company: inferCompany(context),
    jobUrl: context.jobUrl,
    savedAt: new Date().toISOString(),
    fitScore: Number(payload.fitScore ?? 0) || 0,
    fitSummary: cleanString(payload.fitSummary),
    leetcodeQuestions,
    systemDesignPrompts,
  };
  const next = [entry, ...memory.filter((item) => item.id !== entry.id)];
  writePrepMemory(next);
}

function renderPrepMemory() {
  if (!prepMemoryList) return;
  const memory = readPrepMemory();
  prepMemoryList.classList.toggle("empty-list", memory.length === 0);
  prepMemoryList.innerHTML = "";

  if (!memory.length) {
    const empty = document.createElement("p");
    empty.textContent = "Generated prep from previous jobs will appear here.";
    prepMemoryList.append(empty);
    return;
  }

  for (const item of memory) {
    const card = document.createElement("section");
    card.className = "memory-job";

    const header = document.createElement("div");
    header.className = "memory-job-header";
    const title = document.createElement("h4");
    title.textContent = item.company ? `${item.title} at ${item.company}` : item.title;
    const meta = document.createElement("span");
    meta.textContent = formatSavedAt(item.savedAt);
    header.append(title, meta);

    const summary = document.createElement("p");
    summary.textContent = item.fitSummary || `Fit score: ${Math.round(Number(item.fitScore) || 0)}%`;

    const lcLinks = document.createElement("div");
    lcLinks.className = "memory-links";
    for (const question of cleanStringArray(item.leetcodeQuestions).slice(0, 4)) {
      const link = document.createElement("a");
      const parsed = parsePracticeItem(question);
      link.href = leetcodeProblemUrl(parsed.title);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = parsed.title;
      lcLinks.append(link);
    }

    card.append(header, summary, lcLinks);
    if (item.jobUrl) {
      const jobLink = document.createElement("a");
      jobLink.href = item.jobUrl;
      jobLink.target = "_blank";
      jobLink.rel = "noopener noreferrer";
      jobLink.className = "inline-link";
      jobLink.textContent = "Job posting";
      card.append(jobLink);
    }
    prepMemoryList.append(card);
  }
}

function sanitizeApplications(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id)
        .map((item) => ({
          id: cleanString(item.id),
          company: cleanString(item.company),
          role: cleanString(item.role),
          jobUrl: cleanString(item.jobUrl),
          status: cleanString(item.status) || "saved",
          stage: cleanString(item.stage),
          priority: cleanString(item.priority) || "medium",
          deadline: cleanString(item.deadline),
          appliedAt: cleanString(item.appliedAt),
          followUp: cleanString(item.followUp),
          recruiter: cleanString(item.recruiter),
          notes: cleanString(item.notes),
          fitScore: Number(item.fitScore) || 0,
          updatedAt: cleanString(item.updatedAt) || new Date().toISOString(),
        }))
        .slice(0, 60)
    : [];
}

function sanitizeQuestionBank(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id && item.question)
        .map((item) => ({
          id: cleanString(item.id),
          company: cleanString(item.company),
          role: cleanString(item.role),
          type: cleanString(item.type) || "behavioral",
          question: cleanString(item.question),
          practiced: Boolean(item.practiced),
          createdAt: cleanString(item.createdAt) || new Date().toISOString(),
        }))
        .slice(0, maxQuestionBankItems)
    : [];
}

function sanitizeBehavioralStories(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.id)
        .map((item) => ({
          id: cleanString(item.id),
          title: cleanString(item.title),
          company: cleanString(item.company),
          role: cleanString(item.role),
          situation: cleanString(item.situation),
          task: cleanString(item.task),
          action: cleanString(item.action),
          result: cleanString(item.result),
          createdAt: cleanString(item.createdAt) || new Date().toISOString(),
        }))
        .slice(0, maxBehavioralStories)
    : [];
}

function seedApplicationFromCurrentJob() {
  const context = getContext();
  applicationCompany.value = inferCompany(context);
  applicationRole.value = inferJobTitle(context);
  applicationUrl.value = context.jobUrl;
  applicationStatus.value = hasAiOutput(lastAiOutput) ? "tailoring" : "saved";
  applicationStage.value = "";
  applicationPriority.value = Number(lastAiOutput.fitScore || 0) >= 75 ? "high" : "medium";
  applicationDeadline.value = "";
  applicationAppliedAt.value = "";
  applicationFollowUp.value = suggestFollowUpDate(5);
  applicationRecruiter.value = "";
  applicationNotes.value = buildApplicationNote(context);
  editingApplicationId = null;
  saveApplicationButton.textContent = "Save application";
  showToast("Current job loaded into tracker form.");
}

function buildApplicationNote(context) {
  const pieces = [];
  if (lastAiOutput.fitScore) pieces.push(`Fit score: ${lastAiOutput.fitScore}/100`);
  if (lastAiOutput.fitSummary) pieces.push(lastAiOutput.fitSummary);
  if (cleanStringArray(lastAiOutput.actions).length) {
    pieces.push(`Next action: ${cleanStringArray(lastAiOutput.actions)[0]}`);
  }
  if (!pieces.length && context.jobText) pieces.push("Review role context and generate prep before applying.");
  return pieces.join("\n\n");
}

function suggestFollowUpDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function saveApplicationFromForm() {
  const company = cleanString(applicationCompany.value);
  const role = cleanString(applicationRole.value);
  if (!company && !role) {
    showToast("Add a company or role before saving.");
    return;
  }
  const now = new Date().toISOString();
  const item = {
    id: editingApplicationId || `app-${Date.now()}`,
    company,
    role,
    jobUrl: normalizeUrl(applicationUrl.value),
    status: applicationStatus.value,
    stage: cleanString(applicationStage.value),
    priority: applicationPriority.value,
    deadline: applicationDeadline.value,
    appliedAt: applicationAppliedAt.value,
    followUp: applicationFollowUp.value,
    recruiter: cleanString(applicationRecruiter.value),
    notes: cleanString(applicationNotes.value),
    fitScore: Number(lastAiOutput.fitScore || 0),
    updatedAt: now,
  };
  applications = [item, ...applications.filter((existing) => existing.id !== item.id)];
  renderApplications();
  resetApplicationForm();
  queueSaveAppState(0);
  showToast("Application saved.");
}

function resetApplicationForm() {
  editingApplicationId = null;
  applicationCompany.value = "";
  applicationRole.value = "";
  applicationUrl.value = "";
  applicationStatus.value = "saved";
  applicationStage.value = "";
  applicationPriority.value = "medium";
  applicationDeadline.value = "";
  applicationAppliedAt.value = "";
  applicationFollowUp.value = "";
  applicationRecruiter.value = "";
  applicationNotes.value = "";
  saveApplicationButton.textContent = "Save application";
}

function renderApplications() {
  if (!applicationList || !applicationCount) return;
  const sorted = [...applications].sort((a, b) => applicationSortScore(b) - applicationSortScore(a));
  applicationCount.textContent = `${applications.length} ${applications.length === 1 ? "role" : "roles"}`;
  applicationList.innerHTML = "";
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "No applications tracked yet. Use the current job or add one manually.";
    applicationList.append(empty);
    return;
  }

  for (const item of sorted) {
    const card = document.createElement("article");
    card.className = `application-card priority-${item.priority}`;

    const header = document.createElement("div");
    header.className = "application-card-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = item.company && item.role ? `${item.role} at ${item.company}` : item.role || item.company;
    const meta = document.createElement("p");
    meta.textContent = [statusLabel(item.status), item.stage, item.priority].filter(Boolean).join(" / ");
    titleWrap.append(title, meta);
    const score = document.createElement("span");
    score.className = "fit-badge";
    score.textContent = item.fitScore ? `${Math.round(item.fitScore)}%` : "No score";
    header.append(titleWrap, score);

    const details = document.createElement("div");
    details.className = "application-details";
    details.append(
      detailPill("Deadline", formatDateValue(item.deadline)),
      detailPill("Applied", formatDateValue(item.appliedAt)),
      detailPill("Follow-up", formatDateValue(item.followUp)),
      detailPill("Recruiter", item.recruiter || "Not set"),
    );

    const notes = document.createElement("p");
    notes.className = "application-notes";
    notes.textContent = item.notes || "No notes yet.";

    const actions = document.createElement("div");
    actions.className = "button-row application-actions";
    if (item.jobUrl) {
      const open = document.createElement("a");
      open.className = "secondary-button";
      open.href = item.jobUrl;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "Open job";
      actions.append(open);
    }
    const load = document.createElement("button");
    load.className = "secondary-button";
    load.type = "button";
    load.textContent = "Edit";
    load.addEventListener("click", () => loadApplicationIntoForm(item.id));
    const remove = document.createElement("button");
    remove.className = "text-button danger-button";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteApplication(item.id));
    actions.append(load, remove);

    card.append(header, details, notes, actions);
    applicationList.append(card);
  }
}

function applicationSortScore(item) {
  const priority = { high: 3000, medium: 2000, low: 1000 }[item.priority] || 0;
  const followUp = item.followUp ? 999 - daysFromToday(item.followUp) : 0;
  return priority + followUp + (new Date(item.updatedAt).getTime() || 0) / 1_000_000_000_000;
}

function daysFromToday(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86_400_000);
}

function detailPill(label, value) {
  const pill = document.createElement("span");
  pill.innerHTML = `<strong>${label}</strong>${escapeHtml(value || "Not set")}`;
  return pill;
}

function statusLabel(value) {
  const labels = {
    saved: "Saved",
    tailoring: "Tailoring",
    applied: "Applied",
    screen: "Recruiter screen",
    interview: "Interviewing",
    offer: "Offer",
    rejected: "Rejected",
  };
  return labels[value] || value;
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function loadApplicationIntoForm(id) {
  const item = applications.find((candidate) => candidate.id === id);
  if (!item) return;
  editingApplicationId = id;
  applicationCompany.value = item.company;
  applicationRole.value = item.role;
  applicationUrl.value = item.jobUrl;
  applicationStatus.value = item.status || "saved";
  applicationStage.value = item.stage;
  applicationPriority.value = item.priority || "medium";
  applicationDeadline.value = item.deadline;
  applicationAppliedAt.value = item.appliedAt;
  applicationFollowUp.value = item.followUp;
  applicationRecruiter.value = item.recruiter;
  applicationNotes.value = item.notes;
  saveApplicationButton.textContent = "Update application";
  setActivePage("applications", true);
}

function deleteApplication(id) {
  const item = applications.find((candidate) => candidate.id === id);
  const label = item?.company || item?.role || "this application";
  if (!window.confirm(`Delete ${label} from the tracker?`)) return;
  applications = applications.filter((candidate) => candidate.id !== id);
  if (editingApplicationId === id) resetApplicationForm();
  renderApplications();
  queueSaveAppState(0);
  showToast("Application deleted.");
}

function saveGeneratedQuestions() {
  if (!hasAiOutput(lastAiOutput)) {
    showToast("Generate practice questions first.");
    return;
  }
  const context = getContext();
  const generated = [
    ...cleanStringArray(lastAiOutput.leetcodeQuestions).map((question) => ({ type: "coding", question })),
    ...cleanStringArray(lastAiOutput.systemDesignPrompts).map((question) => ({ type: "system", question })),
    ...cleanStringArray(lastAiOutput.gaps).slice(0, 3).map((gap) => ({
      type: "behavioral",
      question: `Tell me about a time you addressed this gap: ${gap}`,
    })),
  ];
  addQuestionsToBank(generated, context);
  showToast("Generated questions saved.");
}

function addManualQuestion() {
  const question = cleanString(manualQuestionInput.value);
  if (!question) {
    showToast("Type a question first.");
    return;
  }
  addQuestionsToBank([{ type: manualQuestionType.value, question }], getContext());
  manualQuestionInput.value = "";
  showToast("Question saved.");
}

function addQuestionsToBank(items, context) {
  const company = inferCompany(context);
  const role = inferJobTitle(context);
  const next = items
    .filter((item) => cleanString(item.question))
    .map((item) => ({
      id: `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      company,
      role,
      type: cleanString(item.type) || "behavioral",
      question: cleanString(item.question),
      practiced: false,
      createdAt: new Date().toISOString(),
    }));
  const seen = new Set();
  questionBank = [...next, ...questionBank]
    .filter((item) => {
      const key = `${item.company}|${item.role}|${item.type}|${item.question}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxQuestionBankItems);
  renderQuestionBank();
  queueSaveAppState(0);
}

function renderQuestionBank() {
  if (!questionBankList || !questionStats) return;
  const practiced = questionBank.filter((item) => item.practiced).length;
  questionStats.textContent = `${questionBank.length} saved questions / ${practiced} practiced`;
  questionBankList.innerHTML = "";
  if (!questionBank.length) {
    const empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "No questions saved yet. Save generated drills or add your own.";
    questionBankList.append(empty);
    return;
  }

  for (const item of questionBank) {
    const row = document.createElement("label");
    row.className = item.practiced ? "question-row is-practiced" : "question-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.practiced;
    checkbox.addEventListener("change", () => toggleQuestionPracticed(item.id, checkbox.checked));
    const copy = document.createElement("span");
    const meta = document.createElement("small");
    meta.textContent = `${item.type} / ${item.company || "Current company"} / ${item.role || "Current role"}`;
    const question = document.createElement("strong");
    question.textContent = item.question;
    copy.append(meta, question);
    row.append(checkbox, copy);
    questionBankList.append(row);
  }
}

function toggleQuestionPracticed(id, practiced) {
  questionBank = questionBank.map((item) => (item.id === id ? { ...item, practiced } : item));
  renderQuestionBank();
  queueSaveAppState(0);
}

function buildBehavioralStories() {
  const context = getContext();
  if (!context.resumeText && !hasAiOutput(lastAiOutput)) {
    showToast("Add resume evidence or generate output first.");
    return;
  }
  const evidence = [
    ...cleanStringArray(lastAiOutput.strengths),
    ...cleanStringArray(lastAiOutput.actions),
    ...resumeBulletEvidence(context.resumeText),
  ].slice(0, 6);
  const company = inferCompany(context);
  const role = inferJobTitle(context);
  const stories = evidence.slice(0, 3).map((item, index) => storyFromEvidence(item, index, company, role));
  behavioralStories = [...stories, ...behavioralStories]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.title === item.title) === index)
    .slice(0, maxBehavioralStories);
  renderBehavioralStories();
  queueSaveAppState(0);
  showToast("STAR stories built.");
}

function resumeBulletEvidence(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 35)
    .slice(0, 6);
}

function storyFromEvidence(evidence, index, company, role) {
  const title = compactPracticeLabel(evidence, 58) || `Story ${index + 1}`;
  return {
    id: `story-${Date.now()}-${index}`,
    title,
    company,
    role,
    situation: `A role or project required proof around ${title.toLowerCase()}.`,
    task: "Clarify the business goal, technical constraint, and expected outcome before describing the work.",
    action: evidence,
    result: "Close with the measurable result, customer impact, reliability improvement, or lesson learned.",
    createdAt: new Date().toISOString(),
  };
}

function renderBehavioralStories() {
  if (!storyList) return;
  storyList.innerHTML = "";
  if (!behavioralStories.length) {
    const empty = document.createElement("p");
    empty.className = "empty-copy";
    empty.textContent = "No STAR stories yet. Build from resume evidence after adding context.";
    storyList.append(empty);
    return;
  }

  for (const story of behavioralStories) {
    const card = document.createElement("article");
    card.className = "story-card";
    const title = document.createElement("h4");
    title.textContent = story.title;
    card.append(title);
    card.append(
      storyLine("Situation", story.situation),
      storyLine("Task", story.task),
      storyLine("Action", story.action),
      storyLine("Result", story.result),
    );
    storyList.append(card);
  }
}

function storyLine(label, value) {
  const line = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  const text = document.createElement("span");
  text.textContent = value;
  line.append(strong, text);
  return line;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jobSignature(context) {
  const source = context.jobUrl || `${inferJobTitle(context)}|${inferCompany(context)}|${context.jobText.slice(0, 500)}`;
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
  return slug || `prep-${Date.now()}`;
}

function inferJobTitle(context) {
  const lines = context.jobText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => /engineer|developer|designer|manager|analyst|scientist|architect|intern/i.test(line));
  return cleanHeading(titleLine || lines[0]) || hostLabel(context.jobUrl) || "Saved job";
}

function inferCompany(context) {
  const companyMatch = context.jobText.match(/\b(?:Company|Employer|Organization):\s*([^\n]+)/i);
  if (companyMatch) return cleanHeading(companyMatch[1]);
  return hostLabel(context.jobUrl);
}

function cleanHeading(value) {
  return String(value || "").replace(/[*#|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function hostLabel(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Saved";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function leetcodeProblemUrl(title) {
  const slug = slugifyLeetcodeTitle(title);
  return slug ? `https://leetcode.com/problems/${slug}/` : "https://leetcode.com/problemset/";
}

function slugifyLeetcodeTitle(title) {
  return cleanString(title)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactPracticeLabel(text, maxLength = 72) {
  return String(text || "")
    .replace(/^\s*(?:leetcode\s*)?#?\d+[).:\-\s]+/i, "")
    .replace(/\s*-\s*why it matters:.*$/i, "")
    .replace(/\s*why it matters:.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getAppStatePayload() {
  return {
    context: {
      ...getContext(),
      applications,
      questionBank,
      behavioralStories,
    },
    ai_output: lastAiOutput || {},
    prep_memory: prepMemory,
  };
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
}

function hasAiOutput(payload) {
  return Boolean(
    payload &&
      (payload.fitSummary ||
        payload.candidateBrief ||
        payload.tailoredResume ||
        cleanStringArray(payload.strengths).length ||
        cleanStringArray(payload.gaps).length ||
        cleanStringArray(payload.actions).length ||
        cleanStringArray(payload.resumeChangeSuggestions).length ||
        cleanStringArray(payload.leetcodeQuestions).length ||
        cleanStringArray(payload.systemDesignPrompts).length),
  );
}

function applySavedAppState(state = {}) {
  isAppStateHydrating = true;
  const context = state.context || {};
  resumeInput.value = cleanString(context.resumeText);
  notesInput.value = cleanString(context.notesText);
  linkedinTextInput.value = cleanString(context.linkedinText);
  githubTextInput.value = cleanString(context.githubText);
  jobTextInput.value = cleanString(context.jobText);
  linkedinUrlInput.value = cleanString(context.linkedinUrl);
  githubUrlInput.value = cleanString(context.githubUrl);
  jobUrlInput.value = cleanString(context.jobUrl);
  applications = sanitizeApplications(context.applications);
  questionBank = sanitizeQuestionBank(context.questionBank);
  behavioralStories = sanitizeBehavioralStories(context.behavioralStories);
  renderApplications();
  renderQuestionBank();
  renderBehavioralStories();

  prepMemory = Array.isArray(state.prep_memory)
    ? state.prep_memory.filter((item) => item && item.id).slice(0, maxPrepMemoryItems)
    : readLocalPrepMemory();
  renderPrepMemory();

  if (hasAiOutput(state.ai_output)) {
    renderAiOutput(state.ai_output);
  } else {
    resetAiOutputDisplay();
  }

  updateCounts();
  isAppStateHydrating = false;
}

async function loadAppState() {
  if (currentSession?.isDemo) {
    prepMemory = readLocalPrepMemory();
    applications = [];
    questionBank = [];
    behavioralStories = [];
    renderPrepMemory();
    renderApplications();
    renderQuestionBank();
    renderBehavioralStories();
    resetAiOutputDisplay();
    updateCounts();
    setSaveStatus("Demo only");
    return;
  }
  if (!supabaseClient || !currentSession?.user?.id) return;
  isAppStateHydrating = true;
  try {
    const { data, error } = await supabaseClient
      .from(appStateTable)
      .select("context, ai_output, prep_memory")
      .eq("user_id", currentSession.user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      applySavedAppState(data);
    } else {
      prepMemory = readLocalPrepMemory();
      applications = [];
      questionBank = [];
      behavioralStories = [];
      renderPrepMemory();
      renderApplications();
      renderQuestionBank();
      renderBehavioralStories();
      isAppStateHydrating = false;
      queueSaveAppState(0);
    }
  } catch (error) {
    reportError(error, { feature: "app-state-load" });
    showToast(`Could not load saved app data: ${error.message || "Supabase error"}`);
  } finally {
    isAppStateHydrating = false;
  }
}

function queueSaveAppState(delay = 500) {
  if (!autoSaveEnabled) {
    setSaveStatus("Autosave off");
    return;
  }
  if (currentSession?.isDemo) {
    setSaveStatus("Demo local");
    return;
  }
  if (isAppStateHydrating || !supabaseClient || !currentSession?.user?.id) return;
  setSaveStatus("Saving...");
  window.clearTimeout(appStateSaveTimer);
  appStateSaveTimer = window.setTimeout(() => {
    saveAppState();
  }, delay);
}

async function saveAppState() {
  if (!autoSaveEnabled || currentSession?.isDemo || isAppStateHydrating || !supabaseClient || !currentSession?.user?.id) return;
  const payload = getAppStatePayload();
  try {
    const { error } = await supabaseClient.from(appStateTable).upsert(
      {
        user_id: currentSession.user.id,
        context: payload.context,
        ai_output: payload.ai_output,
        prep_memory: payload.prep_memory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    setSaveStatus("Saved");
  } catch (error) {
    reportError(error, { feature: "app-state-save" });
    setSaveStatus("Save failed");
    showToast(`Could not save app data: ${error.message || "Supabase error"}`);
  }
}

async function clearSavedData() {
  const confirmed = window.confirm("Clear saved resume, notes, generated output, and prep memory for this workspace?");
  if (!confirmed) return;

  window.clearTimeout(appStateSaveTimer);
  resumeInput.value = "";
  notesInput.value = "";
  linkedinUrlInput.value = "";
  linkedinTextInput.value = "";
  githubUrlInput.value = "";
  githubTextInput.value = "";
  jobUrlInput.value = "";
  jobTextInput.value = "";
  prepMemory = [];
  applications = [];
  questionBank = [];
  behavioralStories = [];
  editingApplicationId = null;
  localStorage.removeItem(prepMemoryKey());
  resetAiOutputDisplay();
  renderPrepMemory();
  renderApplications();
  renderQuestionBank();
  renderBehavioralStories();
  resetApplicationForm();
  updateCounts();
  setSaveStatus("Cleared");

  if (!currentSession?.isDemo && supabaseClient && currentSession?.user?.id) {
    try {
      const { error } = await supabaseClient.from(appStateTable).delete().eq("user_id", currentSession.user.id);
      if (error) throw error;
    } catch (error) {
      reportError(error, { feature: "app-state-clear" });
      setSaveStatus("Clear failed");
      showToast(`Could not clear saved app data: ${error.message || "Supabase error"}`);
      return;
    }
  }

  showToast("Saved workspace data cleared.");
}

function setGenerateLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeButton.dataset.label ||= analyzeButton.textContent.trim();
  analyzeButton.lastChild.textContent = isLoading ? "Generating..." : analyzeButton.dataset.label;
}

function handleContextInput() {
  updateCounts();
  queueSaveAppState();
}

function handleOutputInput() {
  lastAiOutput = {
    ...lastAiOutput,
    candidateBrief: briefOutput.value,
    tailoredResume: tailoredResumeOutput.value,
  };
  queueSaveAppState();
}

function updateCounts() {
  resumeCount.textContent = `${wordCount(resumeInput.value)} words`;
  notesCount.textContent = `${wordCount(notesInput.value)} words`;
  linkedinCount.textContent = `${wordCount(linkedinTextInput.value)} words`;
  githubCount.textContent = `${wordCount(githubTextInput.value)} words`;
  jobCount.textContent = `${wordCount(jobTextInput.value)} words`;
  updateReadiness();
  renderKeywordCoverage();
}

function updateReadiness() {
  if (!readinessList || !readinessScore) return;
  const context = getContext();
  const items = [
    {
      label: "Resume source",
      detail: context.resumeText ? `${wordCount(context.resumeText)} words added` : "Paste or import the current resume.",
      done: wordCount(context.resumeText) >= 40,
    },
    {
      label: "Target role",
      detail: context.jobText || context.notesText ? "Role details are available." : "Add a job description or interview notes.",
      done: wordCount(`${context.jobText} ${context.notesText}`) >= 25,
    },
    {
      label: "Evidence",
      detail: context.linkedinText || context.githubText ? "Profile or project evidence added." : "Add LinkedIn or GitHub context when available.",
      done: wordCount(`${context.linkedinText} ${context.githubText}`) >= 20,
    },
    {
      label: "Generated prep",
      detail: hasAiOutput(lastAiOutput) ? "Brief, edits, and drills are ready." : "Generate once the inputs are in place.",
      done: hasAiOutput(lastAiOutput),
    },
  ];
  const completed = items.filter((item) => item.done).length;
  readinessScore.textContent = `${completed}/${items.length}`;
  readinessList.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = item.done ? "readiness-item is-complete" : "readiness-item";
    const status = document.createElement("span");
    status.textContent = item.done ? "OK" : "";
    status.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = item.label;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    copy.append(label, detail);
    row.append(status, copy);
    readinessList.append(row);
  }
}

function renderKeywordCoverage() {
  if (!keywordScore || !keywordSummary || !matchedKeywords || !missingKeywords) return;
  const context = getContext();
  const targetText = `${context.notesText} ${context.jobText}`;
  const evidenceText = `${context.resumeText} ${context.linkedinText} ${context.githubText}`;
  const keywords = extractRoleKeywords(targetText);
  const evidenceTokens = new Set(words(evidenceText).map((word) => word.toLowerCase()));
  const matched = keywords.filter((keyword) => evidenceTokens.has(keyword));
  const missing = keywords.filter((keyword) => !evidenceTokens.has(keyword));
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;

  keywordScore.textContent = `${score}%`;
  keywordSummary.textContent = keywords.length
    ? `${matched.length} of ${keywords.length} role signals appear in candidate evidence.`
    : "Add role context to compare evidence.";
  renderKeywordChips(matchedKeywords, matched, "No matched signals yet.");
  renderKeywordChips(missingKeywords, missing, "No missing signals found.");
}

function extractRoleKeywords(text) {
  const counts = new Map();
  for (const token of words(text).map((word) => word.toLowerCase())) {
    if (token.length < 3 || keywordStopWords.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword]) => keyword)
    .slice(0, 14);
}

function renderKeywordChips(target, items, fallback) {
  target.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "keyword-empty";
    empty.textContent = fallback;
    target.append(empty);
    return;
  }
  for (const item of items) {
    const chip = document.createElement("span");
    chip.textContent = item;
    target.append(chip);
  }
}

function readFileInto(input, target) {
  const [file] = input.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    target.value = String(reader.result || "");
    updateCounts();
    queueSaveAppState();
    showToast(`${file.name} imported.`);
  };
  reader.onerror = () => showToast("Could not read that file.");
  reader.readAsText(file);
}

async function importResumeFile() {
  const [file] = resumeFile.files;
  if (!file) return;

  if (!requireLiveSession("import a resume file")) {
    resumeFile.value = "";
    return;
  }

  const formData = new FormData();
  formData.append("resume", file);
  showToast("Importing resume...");

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/resume/extract`, {
      method: "POST",
      headers: {
        ...authorizationHeaders(),
      },
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Resume import failed.");
    }

    resumeInput.value = payload.text || "";
    updateCounts();
    queueSaveAppState(0);
    showToast(payload.truncated ? `${file.name} imported and truncated.` : `${file.name} imported.`);
  } catch (error) {
    reportError(error, { feature: "resume-import", filename: file.name, type: file.type });
    showToast(error.message || "Could not import that resume.");
  } finally {
    resumeFile.value = "";
  }
}

function normalizeUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function authorizationHeaders() {
  return currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {};
}

function requireLiveSession(action) {
  if (currentSession?.isDemo) {
    showToast(`Sign in to ${action}.`);
    return false;
  }
  if (!currentSession?.access_token) {
    showToast("Sign in first.");
    return false;
  }
  return true;
}

function openUrlFrom(input, label) {
  const url = normalizeUrl(input.value);
  if (!url) {
    showToast(`Add a ${label} URL first.`);
    return;
  }

  try {
    const parsed = new URL(url);
    window.open(parsed.href, "_blank", "noopener,noreferrer");
    showToast(`Opened ${label}. Copy useful text back into the app.`);
  } catch {
    showToast(`Enter a valid ${label} URL.`);
  }
}

async function importGithubProjects() {
  const url = normalizeUrl(githubUrlInput.value);
  if (!url) {
    showToast("Enter a public GitHub profile or repository URL.");
    return;
  }
  if (!requireLiveSession("import GitHub projects")) return;

  fetchGithubButton.disabled = true;
  fetchGithubButton.dataset.label ||= fetchGithubButton.textContent.trim();
  fetchGithubButton.lastChild.textContent = "Importing...";

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/github/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeaders(),
      },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details?.[0] || "GitHub import failed.");
    }
    githubTextInput.value = payload.text || JSON.stringify(payload.raw || payload, null, 2);
    updateCounts();
    queueSaveAppState(0);
    showToast("GitHub projects imported.");
  } catch (error) {
    reportError(error, { feature: "github-import" });
    showToast(`GitHub import failed: ${error.message || "network error"}`);
  } finally {
    fetchGithubButton.disabled = false;
    fetchGithubButton.lastChild.textContent = fetchGithubButton.dataset.label;
  }
}

async function importLinkedinProfile() {
  const url = normalizeUrl(linkedinUrlInput.value);
  if (!url) {
    showToast("Enter a public LinkedIn profile URL.");
    return;
  }

  if (!requireLiveSession("import LinkedIn")) return;

  fetchLinkedinButton.disabled = true;
  fetchLinkedinButton.dataset.label ||= fetchLinkedinButton.textContent.trim();
  fetchLinkedinButton.lastChild.textContent = "Importing...";

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/linkedin/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeaders(),
      },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details?.[0] || "LinkedIn import failed.");
    }

    linkedinTextInput.value = payload.text || JSON.stringify(payload.raw || payload, null, 2);
    updateCounts();
    queueSaveAppState(0);
    showToast("LinkedIn profile imported.");
  } catch (error) {
    reportError(error, { feature: "linkedin-import" });
    showToast(`LinkedIn import failed: ${error.message || "network error"}`);
  } finally {
    fetchLinkedinButton.disabled = false;
    fetchLinkedinButton.lastChild.textContent = fetchLinkedinButton.dataset.label;
  }
}

async function importJobPosting() {
  const url = normalizeUrl(jobUrlInput.value);
  if (!url) {
    showToast("Enter a public job posting URL.");
    return;
  }

  if (!requireLiveSession("import a job posting")) return;

  fetchJobButton.disabled = true;
  fetchJobButton.dataset.label ||= fetchJobButton.textContent.trim();
  fetchJobButton.lastChild.textContent = "Importing...";

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/job/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authorizationHeaders(),
      },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details?.[0] || "Job import failed.");
    }

    jobTextInput.value = payload.text || JSON.stringify(payload.raw || payload, null, 2);
    updateCounts();
    queueSaveAppState(0);
    showToast("Job posting imported.");
  } catch (error) {
    reportError(error, { feature: "job-import" });
    showToast(`Job import failed: ${error.message || "network error"}`);
  } finally {
    fetchJobButton.disabled = false;
    fetchJobButton.lastChild.textContent = fetchJobButton.dataset.label;
  }
}

function getApiBaseUrl() {
  const configured = String(appConfig.apiBaseUrl || "").trim();
  try {
    return new URL(configured || window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", isError);
}

function getRequestedPage() {
  const requested = window.location.hash.replace(/^#/, "");
  return pageTitles[requested] ? requested : "resume";
}

function setActivePage(page, updateHash = false) {
  const activePage = pageTitles[page] ? page : "resume";
  for (const panel of pagePanels) {
    panel.classList.toggle("is-active", panel.dataset.page === activePage);
  }
  for (const link of pageLinks) {
    link.classList.toggle("is-active", link.dataset.pageLink === activePage);
  }
  pageTitle.textContent = pageTitles[activePage];
  if (sentryClient) sentryClient.setTag("workspace_page", activePage);
  if (updateHash && window.location.hash !== `#${activePage}`) {
    window.location.hash = activePage;
  }
}

function setAuthLoading(isLoading) {
  signInButton.disabled = isLoading || !supabaseClient;
  signUpButton.disabled = isLoading || !supabaseClient;
  demoButton.disabled = isLoading;
}

function renderAuthState(session) {
  currentSession = session;
  const isSignedIn = Boolean(session);
  authGate.classList.toggle("is-hidden", isSignedIn);
  appShell.classList.toggle("is-hidden", !isSignedIn);
  accountEmail.textContent = session?.user?.email || "";
  signOutButton.textContent = session?.isDemo ? "Exit demo" : "Sign out";
  saveToggle.checked = session?.isDemo ? false : autoSaveEnabled;
  saveToggle.disabled = Boolean(session?.isDemo);
  clearSavedButton.disabled = false;
  if (sentryClient) sentryClient.setTag("auth_state", isSignedIn ? "signed_in" : "signed_out");

  if (isSignedIn) {
    if (!window.location.hash || window.location.hash === "#auth") window.location.hash = "#resume";
    setActivePage(getRequestedPage());
    loadAppState();
  } else {
    window.location.hash = "#auth";
  }
}

function startDemo() {
  renderAuthState(demoSession);
  loadSampleData({ silent: true });
  applyAiOutput(buildDemoAiOutput(getContext()));
  setActivePage("analysis", true);
  setAuthMessage("Sample workspace ready.");
  showToast("Sample workspace opened. Sign in for live AI and imports.");
}

async function initializeAuth() {
  if (!isSupabaseConfigured) {
    setAuthMessage("Configure Supabase in config.local.js to enable sign in.", true);
    setAuthLoading(false);
    return;
  }

  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
  } catch (error) {
    reportError(error, { feature: "supabase-import" });
    setAuthMessage("Could not load Supabase client.", true);
    return;
  }

  setAuthLoading(false);
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  renderAuthState(data.session);
  if (!data.session) setAuthMessage("Sign in or create an account to continue.");

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    renderAuthState(session);
    setAuthMessage(session ? "Signed in." : "Signed out.");
  });
}

async function signIn() {
  if (!authForm.reportValidity() || !supabaseClient) return;
  setAuthLoading(true);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });
  setAuthLoading(false);
  if (error) setAuthMessage(error.message, true);
}

async function signUp() {
  if (!authForm.reportValidity() || !supabaseClient) return;
  setAuthLoading(true);
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });
  setAuthLoading(false);
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  setAuthMessage(data.session ? "Account created." : "Account created. Check your email to confirm before signing in.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

async function copyTextArea(target, successMessage) {
  if (!target.value.trim()) {
    showToast("Generate output first.");
    return;
  }
  try {
    await navigator.clipboard.writeText(target.value);
    showToast(successMessage);
  } catch {
    target.focus();
    target.select();
    document.execCommand("copy");
    showToast("Text selected and copied.");
  }
}

async function copyPrepPack() {
  const pack = buildPrepPackMarkdown();
  if (!pack) {
    showToast("Generate output first.");
    return;
  }
  try {
    await navigator.clipboard.writeText(pack);
    showToast("Prep pack copied.");
  } catch {
    showToast("Could not copy prep pack.");
  }
}

function downloadPrepPack() {
  const pack = buildPrepPackMarkdown();
  if (!pack) {
    showToast("Generate output first.");
    return;
  }
  const blob = new Blob([pack], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(inferJobTitle(getContext())) || "interview-prep"}-prep-pack.md`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast("Prep pack markdown created.");
}

function buildPrepPackMarkdown() {
  if (!hasAiOutput(lastAiOutput)) return "";
  const context = getContext();
  const lines = [
    `# Interview Prep Pack: ${inferJobTitle(context)}`,
    "",
    context.jobUrl ? `Job posting: ${context.jobUrl}` : "",
    "",
    "## Fit Summary",
    lastAiOutput.fitSummary || fitSummary.textContent || "",
    "",
    `Fit score: ${lastAiOutput.fitScore || 0}/100`,
    "",
    "## Strengths",
    ...markdownList(lastAiOutput.strengths),
    "",
    "## Gaps",
    ...markdownList(lastAiOutput.gaps),
    "",
    "## Next Actions",
    ...markdownList(lastAiOutput.actions),
    "",
    "## Resume Change List",
    ...markdownList(lastAiOutput.resumeChangeSuggestions),
    "",
    "## Rewrite Snippets",
    briefBlock(tailoredResumeOutput.value || lastAiOutput.tailoredResume),
    "",
    "## Candidate Brief",
    briefBlock(briefOutput.value || lastAiOutput.candidateBrief),
    "",
    "## Coding Drills",
    ...markdownList(lastAiOutput.leetcodeQuestions),
    "",
    "## System Design Drills",
    ...markdownList(lastAiOutput.systemDesignPrompts),
    "",
    "## Saved Question Bank",
    ...markdownList(questionBank.slice(0, 20).map((item) => `${item.practiced ? "[x]" : "[ ]"} ${item.type}: ${item.question}`)),
    "",
    "## STAR Stories",
    ...behavioralStories.slice(0, 6).flatMap((story) => [
      `### ${story.title}`,
      `- Situation: ${story.situation}`,
      `- Task: ${story.task}`,
      `- Action: ${story.action}`,
      `- Result: ${story.result}`,
      "",
    ]),
  ].filter((line, index, all) => line || all[index - 1] !== "");
  return `${lines.join("\n").trim()}\n`;
}

function markdownList(items) {
  const cleaned = cleanStringArray(items);
  return cleaned.length ? cleaned.map((item) => `- ${item}`) : ["- Not generated."];
}

function briefBlock(text) {
  return cleanString(text) || "Not generated.";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

resumeInput.addEventListener("input", handleContextInput);
notesInput.addEventListener("input", handleContextInput);
linkedinUrlInput.addEventListener("input", handleContextInput);
linkedinTextInput.addEventListener("input", handleContextInput);
githubUrlInput.addEventListener("input", handleContextInput);
githubTextInput.addEventListener("input", handleContextInput);
jobUrlInput.addEventListener("input", handleContextInput);
jobTextInput.addEventListener("input", handleContextInput);
briefOutput.addEventListener("input", handleOutputInput);
tailoredResumeOutput.addEventListener("input", handleOutputInput);
resumeFile.addEventListener("change", importResumeFile);
notesFile.addEventListener("change", () => readFileInto(notesFile, notesInput));
openLinkedinButton.addEventListener("click", () => openUrlFrom(linkedinUrlInput, "LinkedIn"));
fetchLinkedinButton.addEventListener("click", importLinkedinProfile);
fetchGithubButton.addEventListener("click", importGithubProjects);
openJobButton.addEventListener("click", () => openUrlFrom(jobUrlInput, "job posting"));
fetchJobButton.addEventListener("click", importJobPosting);
analyzeButton.addEventListener("click", analyze);
authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn();
});
signUpButton.addEventListener("click", signUp);
signOutButton.addEventListener("click", async () => {
  if (currentSession?.isDemo) {
    currentSession = null;
    prepMemory = [];
    applications = [];
    questionBank = [];
    behavioralStories = [];
    renderAuthState(null);
    resetAiOutputDisplay();
    renderApplications();
    renderQuestionBank();
    renderBehavioralStories();
    resetApplicationForm();
    showToast("Exited sample workspace.");
    return;
  }
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  showToast(error ? error.message : "Signed out.");
});
window.addEventListener("hashchange", () => {
  if (!currentSession && window.location.hash !== "#auth") window.location.hash = "#auth";
  if (currentSession) setActivePage(getRequestedPage());
});

function loadSampleData({ silent = false } = {}) {
  resumeInput.value = sampleResume;
  notesInput.value = sampleNotes;
  linkedinUrlInput.value = sampleLinkedinUrl;
  linkedinTextInput.value = sampleLinkedinText;
  githubUrlInput.value = sampleGithubUrl;
  githubTextInput.value = sampleGithubText;
  jobUrlInput.value = sampleJobUrl;
  jobTextInput.value = sampleJobText;
  updateCounts();
  queueSaveAppState(0);
  setActivePage("context", true);
  if (!silent) {
    showToast(currentSession?.isDemo ? "Sample loaded. Click Generate for local sample output." : "Sample loaded. Click Generate to call the AI API.");
  }
}

sampleButton.addEventListener("click", () => {
  loadSampleData();
});

demoButton.addEventListener("click", startDemo);

saveToggle.addEventListener("change", () => {
  autoSaveEnabled = saveToggle.checked;
  localStorage.setItem(autoSavePreferenceKey, String(autoSaveEnabled));
  setSaveStatus(autoSaveEnabled ? "Autosave on" : "Autosave off");
  if (autoSaveEnabled) queueSaveAppState(0);
});

clearSavedButton.addEventListener("click", clearSavedData);

clearResume.addEventListener("click", () => {
  resumeInput.value = "";
  updateCounts();
  queueSaveAppState(0);
});

clearNotes.addEventListener("click", () => {
  notesInput.value = "";
  updateCounts();
  queueSaveAppState(0);
});

clearLinkedin.addEventListener("click", () => {
  linkedinUrlInput.value = "";
  linkedinTextInput.value = "";
  updateCounts();
  queueSaveAppState(0);
});

clearGithub.addEventListener("click", () => {
  githubUrlInput.value = "";
  githubTextInput.value = "";
  updateCounts();
  queueSaveAppState(0);
});

clearJob.addEventListener("click", () => {
  jobUrlInput.value = "";
  jobTextInput.value = "";
  updateCounts();
  queueSaveAppState(0);
});

copyButton.addEventListener("click", async () => {
  await copyTextArea(briefOutput, "Brief copied.");
});

copyTailoredButton.addEventListener("click", async () => {
  await copyTextArea(tailoredResumeOutput, "Tailored resume copied.");
});
copyPackButton.addEventListener("click", copyPrepPack);
downloadPackButton.addEventListener("click", downloadPrepPack);
saveGeneratedQuestionsButton.addEventListener("click", saveGeneratedQuestions);
addQuestionButton.addEventListener("click", addManualQuestion);
manualQuestionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addManualQuestion();
});
buildStoriesButton.addEventListener("click", buildBehavioralStories);
seedApplicationButton.addEventListener("click", seedApplicationFromCurrentJob);
saveApplicationButton.addEventListener("click", saveApplicationFromForm);
resetApplicationFormButton.addEventListener("click", resetApplicationForm);

updateCounts();
setSaveStatus(autoSaveEnabled ? "Autosave on" : "Autosave off");
setActivePage(getRequestedPage());
renderPrepMemory();
renderApplications();
renderQuestionBank();
renderBehavioralStories();
initializeSentry();
initializeAuth();
