const requiredKeys = [
  "fitScore",
  "fitSummary",
  "strengths",
  "gaps",
  "actions",
  "resumeChangeSuggestions",
  "leetcodeQuestions",
  "systemDesignPrompts",
  "candidateBrief",
  "tailoredResume",
];

export async function generateAiCandidate({ context }) {
  return normalizeOutput(parseJsonOutput(await requestGemini(buildPrompt(context), 0.35)));
}

export async function generatePracticeQuestions({ context, mode, language, topic, difficulty }) {
  const payload = parseJsonOutput(await requestGemini(buildPracticePrompt({ context, mode, language, topic, difficulty }), 0.45));
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  return {
    questions: questions
      .map((item, index) => normalizePracticeQuestion(item, { mode, language, topic, difficulty, index }))
      .filter((item) => item.question || item.title || item.prompt)
      .slice(0, 6),
  };
}

async function requestGemini(prompt, temperature) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    const error = new Error("GEMINI_API_KEY is missing. Add it to .env and restart the server.");
    error.status = 500;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Gemini request failed.");
    error.status = response.status;
    throw error;
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "{}";
  return text;
}

function buildPrompt(context) {
  return `
You are an interview prep and resume tailoring assistant.
Return only valid JSON with these exact keys:
${requiredKeys.map((key) => `- ${key}`).join("\n")}

JSON value rules:
- fitScore is an integer from 0 to 100 representing job fit based only on supplied evidence.
- fitSummary, candidateBrief, and tailoredResume are strings.
- strengths, gaps, actions, resumeChangeSuggestions, leetcodeQuestions, and systemDesignPrompts are arrays of strings.

Content rules:
- Tailor the output to the target job description and notes.
- Use the resume and LinkedIn profile text as candidate evidence. The LinkedIn text may come from ScrapeGraphAI extraction, so treat it as public profile evidence rather than a source for unsupported claims.
- Do not invent companies, degrees, metrics, titles, or claims not supported by the input.
- If proof is missing, say what proof to add instead of fabricating it.
- Use plain text only. Do not use Markdown, bold markers, headings, bullets inside strings, asterisks, or numbered prefixes.
- Keep fitSummary under 28 words.
- Keep candidateBrief under 90 words.
- Keep tailoredResume to 6 short lines or fewer.
- Keep every array item under 16 words unless the problem title requires more.
- For strengths, gaps, actions, and resumeChangeSuggestions, prefer "Label: detail" phrasing so the UI can emphasize the label.
- Infer the target coding language from the job description and notes first. If they explicitly mention a language such as Python, Java, JavaScript, TypeScript, C++, Go, Ruby, Swift, Kotlin, C#, PHP, Scala, or Rust, tailor coding prep to that language. If no target language is explicit, use the strongest language signal from the resume or GitHub text.
- Generate 5 concise practice items using real LeetCode problem titles, not invented LeetCode-style titles. Format each as "Problem name - Topic - Difficulty - Language: X".
- Generate 3 concise system design prompts based on the target role. If a target implementation language is explicit, include it where relevant. Format each as "System to design - Focus area".
- Generate 6 concise resumeChangeSuggestions as specific edits to the existing resume. Each should name the section or bullet to change and what evidence to add/remove.
- Do not use tailoredResume for a full replacement resume. Make tailoredResume a short "rewrite snippets" section with only the exact summary/bullet snippets worth copying into the existing resume.
- Keep every list item short enough to scan in one UI card.
- Include GitHub project evidence when it is relevant.

Candidate context:
LinkedIn URL: ${context.linkedinUrl || "Not provided"}
GitHub URL: ${context.githubUrl || "Not provided"}
Resume:
${limitText(context.resumeText)}

LinkedIn profile text:
${limitText(context.linkedinText)}

GitHub project text:
${limitText(context.githubText)}

Target context:
Job URL: ${context.jobUrl || "Not provided"}
Notes:
${limitText(context.notesText)}

Job description:
${limitText(context.jobText)}
`.trim();
}

function buildPracticePrompt({ context, mode, language, topic, difficulty }) {
  const isInternals = mode === "internals";
  return `
You are a senior technical interviewer.
Return only valid JSON shaped like:
{
  "questions": [
    {
      "title": "short title",
      "question": "single-line interview question",
      "prompt": "candidate-facing prompt",
      "hints": ["hint 1", "hint 2"],
      "starter": "starter code or answer framework",
      "complexity": "target complexity or evaluation focus"
    }
  ]
}

Rules:
- Generate exactly 4 questions.
- Language must be ${language}.
- Mode is ${mode}.
- Topic is ${topic}.
- Difficulty is ${difficulty}.
- Do not use Markdown fences.
- Do not invent job or resume facts.
- Keep titles short.
- Keep hints concise.
- Include practical follow-up depth expected in real interviews.
${
  isInternals
    ? `- Generate common ${language} internals/concepts questions, not DSA.
- Cover runtime/compiler behavior, memory/concurrency where relevant, common bugs, and tradeoffs.
- starter must be an answer framework with 4-5 numbered plain-text points, not code.`
    : `- Generate DSA/coding questions tailored to ${language}.
- Include a language-specific starter code template in starter.
- complexity must state target time and space complexity.`
}

Candidate/job context for tailoring only:
Resume:
${limitText(context?.resumeText, 3000)}

GitHub:
${limitText(context?.githubText, 2500)}

Notes:
${limitText(context?.notesText, 2500)}

Job:
${limitText(context?.jobText, 3000)}
`.trim();
}

function limitText(value, maxLength = 12000) {
  const configuredLimit = Number(process.env.GEMINI_INPUT_MAX_CHARS || maxLength);
  const effectiveLimit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : maxLength;
  const text = String(value || "").trim();
  return text.length > effectiveLimit ? `${text.slice(0, effectiveLimit)}\n[Truncated]` : text || "Not provided";
}

function parseJsonOutput(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      const error = new Error("Gemini did not return JSON.");
      error.status = 502;
      throw error;
    }
    return JSON.parse(match[0]);
  }
}

function normalizeOutput(payload) {
  return {
    fitScore: cleanScore(payload.fitScore),
    fitSummary: cleanString(payload.fitSummary),
    strengths: cleanArray(payload.strengths),
    gaps: cleanArray(payload.gaps),
    actions: cleanArray(payload.actions),
    resumeChangeSuggestions: cleanArray(payload.resumeChangeSuggestions),
    leetcodeQuestions: cleanArray(payload.leetcodeQuestions),
    systemDesignPrompts: cleanArray(payload.systemDesignPrompts),
    candidateBrief: cleanString(payload.candidateBrief),
    tailoredResume: cleanString(payload.tailoredResume),
  };
}

function normalizePracticeQuestion(item, defaults) {
  return {
    id: `practice-${Date.now()}-${defaults.index}`,
    type: defaults.mode === "internals" ? "language" : "coding",
    mode: defaults.mode,
    language: cleanString(item.language) || defaults.language,
    topic: cleanString(item.topic) || defaults.topic,
    difficulty: cleanString(item.difficulty) || defaults.difficulty,
    title: cleanString(item.title),
    question: cleanString(item.question),
    prompt: cleanString(item.prompt),
    hints: cleanArray(item.hints).slice(0, 4),
    starter: cleanString(item.starter),
    complexity: cleanString(item.complexity),
  };
}

function cleanScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

function cleanString(value) {
  return typeof value === "string" ? stripMarkdown(value).trim() : "";
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : [];
}
