const supabaseConfig = window.SUPABASE_CONFIG || {};
const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseConfig.url || "") &&
  Boolean(supabaseConfig.publishableKey) &&
  supabaseConfig.publishableKey !== "YOUR_SUPABASE_PUBLISHABLE_KEY";
let supabaseClient = null;

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
const resumeInput = document.querySelector("#resumeInput");
const notesInput = document.querySelector("#notesInput");
const linkedinUrlInput = document.querySelector("#linkedinUrlInput");
const linkedinTextInput = document.querySelector("#linkedinTextInput");
const jobUrlInput = document.querySelector("#jobUrlInput");
const jobTextInput = document.querySelector("#jobTextInput");
const openLinkedinButton = document.querySelector("#openLinkedinButton");
const openJobButton = document.querySelector("#openJobButton");
const resumeCount = document.querySelector("#resumeCount");
const notesCount = document.querySelector("#notesCount");
const linkedinCount = document.querySelector("#linkedinCount");
const jobCount = document.querySelector("#jobCount");
const resumeFile = document.querySelector("#resumeFile");
const notesFile = document.querySelector("#notesFile");
const analyzeButton = document.querySelector("#analyzeButton");
const sampleButton = document.querySelector("#sampleButton");
const clearResume = document.querySelector("#clearResume");
const clearNotes = document.querySelector("#clearNotes");
const clearLinkedin = document.querySelector("#clearLinkedin");
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

let currentSession = null;

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "you",
  "your",
  "their",
  "have",
  "has",
  "will",
  "can",
  "our",
  "they",
  "into",
  "using",
  "use",
  "work",
  "role",
  "team",
  "resume",
  "notes",
]);

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

const sampleJobUrl = "https://example.com/jobs/senior-full-stack-engineer";
const sampleJobText = `Senior Full Stack Engineer
We are looking for an engineer who can own end-to-end product features across React, TypeScript, Node.js, SQL, API design, and scalable systems. The role includes building analytics workflows, improving performance, writing reliable services, collaborating with product managers, and explaining technical tradeoffs in system design interviews.`;

const roleSignals = {
  frontend: ["frontend", "front-end", "react", "vue", "angular", "ui", "css", "typescript", "javascript"],
  backend: ["backend", "back-end", "api", "node", "java", "python", "golang", "service", "microservice"],
  data: ["data", "analytics", "sql", "pipeline", "warehouse", "spark", "etl", "dashboard"],
  mobile: ["mobile", "ios", "android", "swift", "kotlin", "react native"],
  infra: ["infra", "infrastructure", "cloud", "aws", "kubernetes", "devops", "distributed", "scalability"],
  product: ["product", "customer", "stakeholder", "launch", "onboarding", "roadmap"],
};

const lcQuestionBank = {
  arrays: [
    "Best Time to Buy and Sell Stock - one-pass array scanning",
    "Product of Array Except Self - prefix and suffix reasoning",
  ],
  hashmaps: [
    "Two Sum - hash map lookup fundamentals",
    "Longest Consecutive Sequence - set-based sequence detection",
  ],
  graphs: [
    "Number of Islands - DFS/BFS traversal",
    "Course Schedule - dependency graph and cycle detection",
  ],
  dp: [
    "Climbing Stairs - base-case dynamic programming",
    "Coin Change - bottom-up DP and state transitions",
    "Longest Increasing Subsequence - sequence DP tradeoffs",
  ],
  strings: [
    "Longest Substring Without Repeating Characters - sliding window",
    "Minimum Window Substring - constrained matching",
  ],
  trees: [
    "Binary Tree Level Order Traversal - BFS traversal",
    "Lowest Common Ancestor of a Binary Tree - recursive tree reasoning",
  ],
  frontend: [
    "Valid Parentheses - stack discipline for UI state parsing",
    "Merge Intervals - calendar, timeline, and layout conflict handling",
    "LRU Cache - browser cache and client data-store fundamentals",
  ],
  backend: [
    "Two Sum - hash map lookup fundamentals",
    "Top K Frequent Elements - API ranking and aggregation patterns",
    "Design Add and Search Words Data Structure - trie-backed search",
    "Course Schedule - dependency graph and cycle detection",
  ],
  data: [
    "Group Anagrams - grouping and normalization",
    "Kth Largest Element in an Array - selection and heap practice",
    "Subarray Sum Equals K - prefix sums for event streams",
  ],
  mobile: [
    "Binary Tree Level Order Traversal - stateful screen rendering",
    "Clone Graph - object graph copying and offline state",
    "Number of Islands - grid traversal for map-like interfaces",
  ],
  infra: [
    "Number of Connected Components - cluster membership reasoning",
    "Network Delay Time - graph latency and shortest path practice",
    "Insert Delete GetRandom O(1) - storage and indexing tradeoffs",
  ],
  product: [
    "Meeting Rooms II - scheduling capacity and resource planning",
    "Minimum Window Substring - requirement matching under constraints",
  ],
  default: [
    "Two Sum - hash maps and input scanning",
    "Valid Parentheses - stacks",
    "Merge Intervals - sorting and interval reasoning",
    "Top K Frequent Elements - heaps and frequency maps",
    "Course Schedule - graph cycle detection",
    "Longest Substring Without Repeating Characters - sliding window",
  ],
};

const algorithmSignals = {
  arrays: ["array", "arrays", "list", "lists"],
  hashmaps: ["hash map", "hashmap", "map", "dictionary", "set"],
  graphs: ["graph", "graphs", "bfs", "dfs", "dependency"],
  dp: ["dynamic programming", "dp", "recursion", "memoization"],
  strings: ["string", "substring", "text", "parsing"],
  trees: ["tree", "binary tree", "heap", "trie"],
};

const systemDesignBank = {
  frontend: [
    "Design a collaborative document editor with autosave, conflict handling, and offline recovery.",
    "Design a component analytics dashboard that stays fast with large tables and live filters.",
  ],
  backend: [
    "Design a rate-limited REST API for a SaaS analytics product.",
    "Design an event ingestion pipeline that supports retries, deduplication, and replay.",
  ],
  data: [
    "Design a product analytics dashboard from event collection to query serving.",
    "Design a customer health scoring pipeline with batch and near-real-time updates.",
  ],
  mobile: [
    "Design an offline-first mobile notes app with sync conflict resolution.",
    "Design push notifications for a mobile product with preference controls and delivery tracking.",
  ],
  infra: [
    "Design a multi-region file upload service with durability, virus scanning, and access control.",
    "Design observability for microservices with logs, metrics, traces, and alert routing.",
  ],
  product: [
    "Design an onboarding workflow platform with experiments, analytics, and admin configuration.",
    "Design a feedback intake system that turns customer notes into product insights.",
  ],
  default: [
    "Design a URL shortener with analytics and abuse prevention.",
    "Design a notification system with email, push, retries, and user preferences.",
    "Design a real-time chat service with presence, message history, and moderation.",
  ],
};

function words(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function wordCount(text) {
  return words(text).length;
}

function topTerms(text, limit = 10) {
  const counts = new Map();
  for (const token of words(text)) {
    if (token.length < 3 || stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function sentenceCandidates(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 24);
}

function keywordOverlap(resumeTerms, noteTerms) {
  const resumeSet = new Set(resumeTerms);
  return noteTerms.filter((term) => resumeSet.has(term));
}

function getContext() {
  const resumeText = resumeInput.value.trim();
  const notesText = notesInput.value.trim();
  const linkedinText = linkedinTextInput.value.trim();
  const jobText = jobTextInput.value.trim();
  const candidateText = `${resumeText}\n${linkedinText}`.trim();
  const targetText = `${notesText}\n${jobText}`.trim();
  const allText = `${candidateText}\n${targetText}`.trim();
  return {
    resumeText,
    notesText,
    linkedinText,
    jobText,
    candidateText,
    targetText,
    allText,
    linkedinUrl: linkedinUrlInput.value.trim(),
    jobUrl: jobUrlInput.value.trim(),
  };
}

function detectTracks(text) {
  const normalized = text.toLowerCase();
  const matches = Object.entries(roleSignals)
    .map(([track, terms]) => ({
      track,
      score: terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.track);
  return matches.length ? matches.slice(0, 3) : ["default"];
}

function detectAlgorithmTopics(text) {
  const normalized = text.toLowerCase();
  return Object.entries(algorithmSignals)
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([topic]) => topic);
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

function uniqueItems(items, limit) {
  return [...new Set(items)].slice(0, limit);
}

function setScore(score) {
  fitScore.textContent = score;
  fitMeter.style.width = `${score}%`;
  qualityScore.textContent = `${score}%`;
  if (score >= 75) {
    qualityText.textContent = "Strong intake quality. The brief has enough signal to refine.";
  } else if (score >= 45) {
    qualityText.textContent = "Usable start. Add more measurable details for a sharper output.";
  } else {
    qualityText.textContent = "Add a resume and notes to begin.";
  }
}

function analyze() {
  const context = getContext();
  const resumeTerms = topTerms(context.candidateText, 16);
  const noteTerms = topTerms(context.targetText, 16);
  const overlap = keywordOverlap(resumeTerms, noteTerms);
  const missing = noteTerms.filter((term) => !resumeTerms.includes(term)).slice(0, 8);
  const notesWordCount = wordCount(context.targetText);
  const candidateWordCount = wordCount(context.candidateText);
  const tracks = detectTracks(context.allText);

  if (!context.candidateText && !context.targetText) {
    showToast("Add resume, LinkedIn text, notes, or a job description first.");
    return;
  }

  const baseScore = Math.min(45, Math.round(candidateWordCount / 10)) + Math.min(25, Math.round(notesWordCount / 8));
  const overlapScore = Math.min(30, overlap.length * 5);
  const score = Math.min(100, baseScore + overlapScore);

  const notableSentences = sentenceCandidates(context.candidateText)
    .filter((sentence) => /\d|led|built|owned|created|improved|reduced|launched|managed/i.test(sentence))
    .slice(0, 3);

  const strengths = [
    ...notableSentences,
    ...overlap.slice(0, 3).map((term) => `Resume and notes both emphasize ${term}.`),
  ].slice(0, 5);

  const gaps = missing.map((term) => `Notes mention ${term}, but the resume does not surface it clearly.`);
  if (candidateWordCount > 0 && candidateWordCount < 120) {
    gaps.unshift("Candidate profile text is short, so the analysis may miss scope, seniority, and impact.");
  }
  if (notesWordCount > 0 && notesWordCount < 35) {
    gaps.unshift("Target context is brief. Add a job description for stronger recommendations.");
  }
  if (context.linkedinUrl && !context.linkedinText) {
    gaps.unshift("LinkedIn URL is present, but pasted LinkedIn text is needed for local analysis.");
  }
  if (context.jobUrl && !context.jobText) {
    gaps.unshift("Job URL is present, but pasted job description text is needed for local analysis.");
  }

  const actions = [
    missing[0] ? `Add one resume bullet that proves experience with ${missing[0]}.` : "Add one quantified result to the strongest resume bullet.",
    "Rewrite the opening summary around the target role, not only past responsibilities.",
    "Pull 2-3 measurable outcomes into the top half of the resume.",
    overlap[0] ? `Prepare an interview story around ${overlap[0]}.` : "Add target-role keywords to the notes field for a better fit read.",
  ];

  setScore(score);
  fitSummary.textContent =
    score >= 75
      ? "The resume and notes have strong alignment. Focus on sharpening measurable impact and making the top summary more role-specific."
      : score >= 45
        ? "There is enough signal to create a useful brief, but the resume should better mirror the target notes and include more proof."
        : "The intake is thin. Add the target role, job requirements, feedback, and more resume detail to improve the analysis.";

  renderList(strengthList, strengths, "No clear strengths found yet.");
  renderList(gapList, gaps.slice(0, 5), "No obvious gaps found from the current input.");
  renderList(actionList, actions, "Actions will be generated from the resume and notes.");
  renderPrep(tracks, detectAlgorithmTopics(context.allText), overlap, missing);
  briefOutput.value = buildBrief(context, score, resumeTerms, noteTerms, strengths, gaps, actions);
  tailoredResumeOutput.value = buildTailoredResume(context, resumeTerms, noteTerms, overlap, missing, strengths, tracks);
}

function renderPrep(tracks, algorithmTopics, overlap, missing) {
  const lcQuestions = uniqueItems(
    [
      ...algorithmTopics.flatMap((topic) => lcQuestionBank[topic] || []),
      ...tracks.flatMap((track) => lcQuestionBank[track] || []),
      ...lcQuestionBank.default,
    ],
    8,
  ).map((question, index) => {
    const focus = index < 3 && overlap[index] ? ` Focus: connect it to ${overlap[index]}.` : "";
    return `${question}.${focus}`;
  });

  const designPrompts = uniqueItems(
    [
      ...tracks.flatMap((track) => systemDesignBank[track] || []),
      ...systemDesignBank.default,
    ],
    6,
  ).map((prompt, index) => {
    const gap = missing[index];
    return gap ? `${prompt} Explicitly discuss ${gap}.` : prompt;
  });

  renderList(lcList, lcQuestions, "Practice questions will be generated from the target role and resume.");
  renderList(systemList, designPrompts, "System design prompts will appear after generation.");
}

function buildBrief(context, score, resumeTerms, noteTerms, strengths, gaps, actions) {
  const shared = keywordOverlap(resumeTerms, noteTerms);
  return [
    "Candidate Brief",
    "",
    `Fit signal: ${score}/100`,
    `LinkedIn: ${context.linkedinUrl || "Not provided"}`,
    `Job posting: ${context.jobUrl || "Not provided"}`,
    `Shared keywords: ${shared.length ? shared.join(", ") : "Not enough overlap yet."}`,
    `Candidate themes: ${resumeTerms.slice(0, 8).join(", ") || "Add resume or LinkedIn text."}`,
    `Target themes: ${noteTerms.slice(0, 8).join(", ") || "Add notes or job description."}`,
    "",
    "Positioning Summary",
    strengths.length
      ? `This candidate should be positioned around ${shared.slice(0, 3).join(", ") || "the strongest resume evidence"} with emphasis on measurable outcomes and direct relevance to the target role.`
      : "Add more resume detail to generate a stronger positioning summary.",
    "",
    "Top Strengths",
    ...(strengths.length ? strengths.map((item) => `- ${item}`) : ["- Add resume achievements to identify strengths."]),
    "",
    "Gaps To Address",
    ...(gaps.length ? gaps.slice(0, 5).map((item) => `- ${item}`) : ["- No obvious gaps found from the current input."]),
    "",
    "Recommended Next Actions",
    ...actions.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

function extractName(resumeText) {
  const firstLine = resumeText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine && firstLine.length < 60 ? firstLine : "Candidate Name";
}

function buildTailoredResume(context, resumeTerms, noteTerms, overlap, missing, strengths, tracks) {
  const name = extractName(context.resumeText || context.linkedinText);
  const roleFocus = noteTerms.slice(0, 5).join(", ") || "target role requirements";
  const matched = overlap.slice(0, 6);
  const mustAdd = missing.slice(0, 5);
  const achievementLines = sentenceCandidates(context.candidateText)
    .filter((sentence) => /\d|led|built|owned|created|improved|reduced|launched|managed|designed/i.test(sentence))
    .slice(0, 5);

  return [
    name,
    `${titleCase(tracks[0] === "default" ? "Role-Aligned Candidate" : `${tracks[0]} candidate`)} | ${roleFocus}`,
    context.linkedinUrl ? `LinkedIn: ${context.linkedinUrl}` : "",
    "",
    "Summary",
    `Candidate positioned for roles requiring ${roleFocus}. Emphasize ${matched.slice(0, 3).join(", ") || resumeTerms.slice(0, 3).join(", ") || "relevant experience"} with concrete ownership, measurable impact, and interview-ready examples.`,
    "",
    "Selected Experience Bullets",
    ...(achievementLines.length
      ? achievementLines.map((line) => `- ${tightenBullet(line, matched, mustAdd)}`)
      : ["- Add 3-5 measurable bullets from the original resume, each tied to the target role notes."]),
    "",
    "Keyword Alignment",
    `Use prominently: ${uniqueItems([...matched, ...noteTerms], 10).join(", ") || "Add job description keywords to notes."}`,
    "",
    "Missing Proof To Add",
    ...(mustAdd.length
      ? mustAdd.map((term) => `- Add a specific bullet, project, or metric proving ${term}.`)
      : ["- Add one stronger metric for scope, scale, latency, revenue, adoption, or quality."]),
    "",
    "Skills To Surface",
    uniqueItems([...resumeTerms, ...noteTerms], 14).join(", ") || "Add resume and notes to generate skills.",
    "",
    "Interview Story Bank",
    ...(strengths.length
      ? strengths.slice(0, 4).map((item) => `- Prepare a STAR story for: ${item}`)
      : ["- Prepare stories for ownership, conflict, technical tradeoffs, and measurable impact."]),
  ].join("\n");
}

function titleCase(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function tightenBullet(line, matched, missing) {
  const clean = line.replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim();
  const keyword = matched[0] || missing[0];
  return keyword && !clean.toLowerCase().includes(keyword)
    ? `${clean} Tie this bullet more explicitly to ${keyword}.`
    : clean;
}

function updateCounts() {
  resumeCount.textContent = `${wordCount(resumeInput.value)} words`;
  notesCount.textContent = `${wordCount(notesInput.value)} words`;
  linkedinCount.textContent = `${wordCount(linkedinTextInput.value)} words`;
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", isError);
}

function setAuthLoading(isLoading) {
  signInButton.disabled = isLoading || !supabaseClient;
  signUpButton.disabled = isLoading || !supabaseClient;
  signInButton.textContent = isLoading ? "Working..." : "Sign in";
}

function renderAuthState(session) {
  currentSession = session;
  const isSignedIn = Boolean(session?.user);
  authGate.classList.toggle("is-hidden", isSignedIn);
  appShell.classList.toggle("is-hidden", !isSignedIn);
  accountEmail.textContent = session?.user?.email || "";

  if (isSignedIn) {
    if (!window.location.hash || window.location.hash === "#auth") {
      window.location.hash = "#inputs";
    }
    return;
  }

  window.location.hash = "#auth";
}

async function initializeAuth() {
  if (!supabaseClient) {
    if (!isSupabaseConfigured) {
      setAuthMessage("Add your Supabase project URL and publishable key in index.html.", true);
      setAuthLoading(false);
      return;
    }

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
      supabaseClient = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
    } catch {
      setAuthMessage("Could not load the Supabase browser client.", true);
      setAuthLoading(false);
      return;
    }
  }

  setAuthMessage("Checking session...");
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthMessage(error.message, true);
    renderAuthState(null);
    return;
  }

  renderAuthState(data.session);
  setAuthMessage("Sign in or create an account to continue.");

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    renderAuthState(session);
  });
}

async function signIn() {
  if (!authForm.reportValidity()) return;
  if (!supabaseClient) return;
  setAuthLoading(true);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });
  setAuthLoading(false);
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  setAuthMessage("Signed in.");
}

async function signUp() {
  if (!authForm.reportValidity()) return;
  if (!supabaseClient) return;
  setAuthLoading(true);
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  setAuthLoading(false);
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  if (!data.session) {
    setAuthMessage("Account created. Check your email to confirm before signing in.");
    return;
  }
  setAuthMessage("Account created.");
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
    showToast(`Opened ${label}. Copy text back into the paste box.`);
  } catch {
    showToast(`Enter a valid ${label} URL.`);
  }
}

resumeInput.addEventListener("input", updateCounts);
notesInput.addEventListener("input", updateCounts);
linkedinTextInput.addEventListener("input", updateCounts);
jobTextInput.addEventListener("input", updateCounts);
resumeFile.addEventListener("change", () => readFileInto(resumeFile, resumeInput));
notesFile.addEventListener("change", () => readFileInto(notesFile, notesInput));
openLinkedinButton.addEventListener("click", () => openUrlFrom(linkedinUrlInput, "LinkedIn"));
openJobButton.addEventListener("click", () => openUrlFrom(jobUrlInput, "job posting"));
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
  if (!currentSession && window.location.hash !== "#auth") {
    window.location.hash = "#auth";
  }
});

sampleButton.addEventListener("click", () => {
  resumeInput.value = sampleResume;
  notesInput.value = sampleNotes;
  linkedinUrlInput.value = sampleLinkedinUrl;
  linkedinTextInput.value = sampleLinkedinText;
  jobUrlInput.value = sampleJobUrl;
  jobTextInput.value = sampleJobText;
  updateCounts();
  analyze();
  showToast("Sample loaded.");
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
initializeAuth();

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
