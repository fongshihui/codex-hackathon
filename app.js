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

const authGate = document.querySelector("#authGate");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const signInButton = document.querySelector("#signInButton");
const signUpButton = document.querySelector("#signUpButton");
const signOutButton = document.querySelector("#signOutButton");
const accountEmail = document.querySelector("#accountEmail");
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
const fitScore = document.querySelector("#fitScore");
const fitMeter = document.querySelector("#fitMeter");
const fitSummary = document.querySelector("#fitSummary");
const strengthList = document.querySelector("#strengthList");
const gapList = document.querySelector("#gapList");
const actionList = document.querySelector("#actionList");
const lcList = document.querySelector("#lcList");
const systemList = document.querySelector("#systemList");
const briefOutput = document.querySelector("#briefOutput");
const tailoredResumeOutput = document.querySelector("#tailoredResumeOutput");
const qualityScore = document.querySelector("#qualityScore");
const qualityText = document.querySelector("#qualityText");
const toast = document.querySelector("#toast");

const pageTitles = {
  resume: "Resume intake",
  context: "Role context",
  analysis: "Fit analysis",
  draft: "Editable drafts",
  prep: "Interview practice",
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

async function analyze() {
  const context = getContext();
  if (!hasInput(context)) {
    showToast("Add resume, profile, GitHub, notes, or job details first.");
    return;
  }

  if (window.location.protocol === "file:") {
    showToast("Start the Node server to use the AI API.");
    return;
  }

  if (!currentSession?.access_token) {
    showToast("Sign in before generating AI output.");
    return;
  }

  clearGeneratedOutput();
  setGenerateLoading(true);

  try {
    const apiBaseUrl = (appConfig.apiBaseUrl || window.location.origin).replace(/\/$/, "");
    const response = await fetch(`${apiBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
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
  const score = Number(payload.fitScore ?? payload.score ?? 0);
  setScore(Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0);

  fitSummary.textContent = cleanString(payload.fitSummary) || "AI generated the output below.";
  renderList(strengthList, cleanStringArray(payload.strengths), "No strengths returned by AI.");
  renderList(gapList, cleanStringArray(payload.gaps), "No gaps returned by AI.");
  renderList(actionList, cleanStringArray(payload.actions), "No actions returned by AI.");
  renderList(lcList, cleanStringArray(payload.leetcodeQuestions), "No LeetCode plan returned by AI.");
  renderList(systemList, cleanStringArray(payload.systemDesignPrompts), "No system design prompts returned by AI.");
  briefOutput.value = cleanString(payload.candidateBrief);
  tailoredResumeOutput.value = cleanString(payload.tailoredResume);
  setActivePage("analysis", true);
}

function clearGeneratedOutput() {
  setScore(0);
  fitSummary.textContent = "Generating with AI...";
  renderList(strengthList, [], "Generating strengths...");
  renderList(gapList, [], "Generating gaps...");
  renderList(actionList, [], "Generating actions...");
  renderList(lcList, [], "Generating LeetCode plan...");
  renderList(systemList, [], "Generating system design prompts...");
  briefOutput.value = "";
  tailoredResumeOutput.value = "";
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

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(items) {
  return Array.isArray(items)
    ? items.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : [];
}

function setGenerateLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeButton.dataset.label ||= analyzeButton.textContent.trim();
  analyzeButton.lastChild.textContent = isLoading ? "Generating..." : analyzeButton.dataset.label;
}

function updateCounts() {
  resumeCount.textContent = `${wordCount(resumeInput.value)} words`;
  notesCount.textContent = `${wordCount(notesInput.value)} words`;
  linkedinCount.textContent = `${wordCount(linkedinTextInput.value)} words`;
  githubCount.textContent = `${wordCount(githubTextInput.value)} words`;
  jobCount.textContent = `${wordCount(jobTextInput.value)} words`;
}

function readFileInto(input, target) {
  const [file] = input.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    target.value = String(reader.result || "");
    updateCounts();
    showToast(`${file.name} imported.`);
  };
  reader.onerror = () => showToast("Could not read that file.");
  reader.readAsText(file);
}

function normalizeUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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

function parseGithubUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner) return null;
    return {
      owner,
      repo: repo && !["stars", "repositories", "projects"].includes(repo.toLowerCase()) ? repo : "",
      href: `https://github.com/${owner}${repo ? `/${repo}` : ""}`,
    };
  } catch {
    return null;
  }
}

function repoSummary(repo, readmeText = "") {
  const topics = Array.isArray(repo.topics) && repo.topics.length ? ` Topics: ${repo.topics.slice(0, 8).join(", ")}.` : "";
  const language = repo.language ? ` Language: ${repo.language}.` : "";
  const stars = Number.isFinite(repo.stargazers_count) ? ` Stars: ${repo.stargazers_count}.` : "";
  const description = repo.description || "No public description provided.";
  const readme = readmeText ? `\nREADME excerpt: ${readmeText}` : "";
  return `${repo.name} - ${description}${language}${topics}${stars}${readme}`;
}

function decodeGithubContent(content) {
  if (!content) return "";
  try {
    return atob(content.replace(/\s/g, ""));
  } catch {
    return "";
  }
}

function trimGithubReadme(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.slice(1).split("]")[0])
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

async function githubApi(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "GitHub import failed.");
  return payload;
}

async function fetchGithubReadme(owner, repo) {
  try {
    const readme = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
    return trimGithubReadme(decodeGithubContent(readme.content));
  } catch {
    return "";
  }
}

async function importGithubProjects() {
  const parsed = parseGithubUrl(githubUrlInput.value);
  if (!parsed) {
    showToast("Enter a public GitHub profile or repository URL.");
    return;
  }

  fetchGithubButton.disabled = true;
  fetchGithubButton.dataset.label ||= fetchGithubButton.textContent.trim();
  fetchGithubButton.lastChild.textContent = "Importing...";

  try {
    if (parsed.repo) {
      const repo = await githubApi(`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`);
      const readme = await fetchGithubReadme(parsed.owner, parsed.repo);
      githubTextInput.value = ["GitHub Public Project", `URL: ${parsed.href}`, repoSummary(repo, readme)].join("\n");
    } else {
      const repos = await githubApi(
        `/users/${encodeURIComponent(parsed.owner)}/repos?sort=updated&direction=desc&per_page=8`,
      );
      const publicRepos = repos
        .filter((repo) => !repo.fork && !repo.archived)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 6);
      githubTextInput.value = [
        "GitHub Public Projects",
        `Profile: ${parsed.href}`,
        ...publicRepos.map((repo) => repoSummary(repo)),
      ].join("\n");
    }
    updateCounts();
    showToast("GitHub projects imported.");
  } catch (error) {
    showToast(error.message || "Could not import that GitHub URL.");
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

  if (!currentSession?.access_token) {
    showToast("Sign in before importing LinkedIn.");
    return;
  }

  fetchLinkedinButton.disabled = true;
  fetchLinkedinButton.dataset.label ||= fetchLinkedinButton.textContent.trim();
  fetchLinkedinButton.lastChild.textContent = "Importing...";

  try {
    const apiBaseUrl = (appConfig.apiBaseUrl || window.location.origin).replace(/\/$/, "");
    const response = await fetch(`${apiBaseUrl}/api/linkedin/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details?.[0] || "LinkedIn import failed.");
    }

    linkedinTextInput.value = payload.text || JSON.stringify(payload.raw || payload, null, 2);
    updateCounts();
    showToast("LinkedIn profile imported.");
  } catch (error) {
    reportError(error, { feature: "linkedin-import" });
    showToast(error.message || "Could not import that LinkedIn profile.");
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

  if (!currentSession?.access_token) {
    showToast("Sign in before importing a job posting.");
    return;
  }

  fetchJobButton.disabled = true;
  fetchJobButton.dataset.label ||= fetchJobButton.textContent.trim();
  fetchJobButton.lastChild.textContent = "Importing...";

  try {
    const apiBaseUrl = (appConfig.apiBaseUrl || window.location.origin).replace(/\/$/, "");
    const response = await fetch(`${apiBaseUrl}/api/job/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details?.[0] || "Job import failed.");
    }

    jobTextInput.value = payload.text || JSON.stringify(payload.raw || payload, null, 2);
    updateCounts();
    showToast("Job posting imported.");
  } catch (error) {
    reportError(error, { feature: "job-import" });
    showToast(error.message || "Could not import that job posting.");
  } finally {
    fetchJobButton.disabled = false;
    fetchJobButton.lastChild.textContent = fetchJobButton.dataset.label;
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
}

function renderAuthState(session) {
  currentSession = session;
  const isSignedIn = Boolean(session);
  authGate.classList.toggle("is-hidden", isSignedIn);
  appShell.classList.toggle("is-hidden", !isSignedIn);
  accountEmail.textContent = session?.user?.email || "";
  if (sentryClient) sentryClient.setTag("auth_state", isSignedIn ? "signed_in" : "signed_out");

  if (isSignedIn) {
    if (!window.location.hash || window.location.hash === "#auth") window.location.hash = "#resume";
    setActivePage(getRequestedPage());
  } else {
    window.location.hash = "#auth";
  }
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

resumeInput.addEventListener("input", updateCounts);
notesInput.addEventListener("input", updateCounts);
linkedinTextInput.addEventListener("input", updateCounts);
githubTextInput.addEventListener("input", updateCounts);
jobTextInput.addEventListener("input", updateCounts);
resumeFile.addEventListener("change", () => readFileInto(resumeFile, resumeInput));
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
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  showToast(error ? error.message : "Signed out.");
});
window.addEventListener("hashchange", () => {
  if (!currentSession && window.location.hash !== "#auth") window.location.hash = "#auth";
  if (currentSession) setActivePage(getRequestedPage());
});

sampleButton.addEventListener("click", () => {
  resumeInput.value = sampleResume;
  notesInput.value = sampleNotes;
  linkedinUrlInput.value = sampleLinkedinUrl;
  linkedinTextInput.value = sampleLinkedinText;
  githubUrlInput.value = sampleGithubUrl;
  githubTextInput.value = sampleGithubText;
  jobUrlInput.value = sampleJobUrl;
  jobTextInput.value = sampleJobText;
  updateCounts();
  setActivePage("context", true);
  showToast("Sample loaded. Click Generate to call the AI API.");
});

clearResume.addEventListener("click", () => {
  resumeInput.value = "";
  updateCounts();
});

clearNotes.addEventListener("click", () => {
  notesInput.value = "";
  updateCounts();
});

clearLinkedin.addEventListener("click", () => {
  linkedinUrlInput.value = "";
  linkedinTextInput.value = "";
  updateCounts();
});

clearGithub.addEventListener("click", () => {
  githubUrlInput.value = "";
  githubTextInput.value = "";
  updateCounts();
});

clearJob.addEventListener("click", () => {
  jobUrlInput.value = "";
  jobTextInput.value = "";
  updateCounts();
});

copyButton.addEventListener("click", async () => {
  await copyTextArea(briefOutput, "Brief copied.");
});

copyTailoredButton.addEventListener("click", async () => {
  await copyTextArea(tailoredResumeOutput, "Tailored resume copied.");
});

updateCounts();
setActivePage(getRequestedPage());
initializeSentry();
initializeAuth();
