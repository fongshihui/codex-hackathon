const requiredKeys = [
  "fitScore",
  "fitSummary",
  "strengths",
  "gaps",
  "actions",
  "leetcodeQuestions",
  "systemDesignPrompts",
  "candidateBrief",
  "tailoredResume",
];

export async function generateAiCandidate({ context }) {
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
      contents: [{ parts: [{ text: buildPrompt(context) }] }],
      generationConfig: {
        temperature: 0.35,
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
  return normalizeOutput(parseJsonOutput(text));
}

function buildPrompt(context) {
  return `
You are an interview prep and resume tailoring assistant.
Return only valid JSON with these exact keys:
${requiredKeys.map((key) => `- ${key}`).join("\n")}

JSON value rules:
- fitScore is an integer from 0 to 100 representing job fit based only on supplied evidence.
- fitSummary, candidateBrief, and tailoredResume are strings.
- strengths, gaps, actions, leetcodeQuestions, and systemDesignPrompts are arrays of strings.

Content rules:
- Tailor the output to the target job description and notes.
- Use the resume and LinkedIn profile text as candidate evidence. The LinkedIn text may come from ScrapeGraphAI extraction, so treat it as public profile evidence rather than a source for unsupported claims.
- Do not invent companies, degrees, metrics, titles, or claims not supported by the input.
- If proof is missing, say what proof to add instead of fabricating it.
- Generate 8 LeetCode-style practice questions based on the target role and interview notes. Include topic, difficulty, and why it matters.
- Generate 5 system design prompts based on the target role. Include what to discuss.
- The tailored resume should be editable plain text with summary, selected bullets, skills, and missing proof.
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

function limitText(value, maxLength = 12000) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[Truncated]` : text || "Not provided";
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
    leetcodeQuestions: cleanArray(payload.leetcodeQuestions),
    systemDesignPrompts: cleanArray(payload.systemDesignPrompts),
    candidateBrief: cleanString(payload.candidateBrief),
    tailoredResume: cleanString(payload.tailoredResume),
  };
}

function cleanScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : [];
}
