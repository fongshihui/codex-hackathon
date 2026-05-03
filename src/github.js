import { readCache, writeCache } from "./cache.js";

export function isGithubUrl(value) {
  return Boolean(parseGithubUrl(value));
}

export async function extractGithubProjects({ url }) {
  const parsed = parseGithubUrl(url);
  if (!parsed) {
    const error = new Error("Enter a public GitHub profile or repository URL.");
    error.status = 400;
    throw error;
  }

  const cacheKey = parsed.href;
  const cached = await readGithubCache(cacheKey);
  if (cached) return cached;

  const result = parsed.repo ? await extractRepository(parsed) : await extractProfile(parsed);
  await writeGithubCache(cacheKey, result);
  return result;
}

function parseGithubUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner) return null;

    const ignoredRepoPaths = new Set(["stars", "repositories", "projects"]);
    const cleanRepo = repo && !ignoredRepoPaths.has(repo.toLowerCase()) ? repo : "";
    return {
      owner,
      repo: cleanRepo,
      href: `https://github.com/${owner}${cleanRepo ? `/${cleanRepo}` : ""}`,
    };
  } catch {
    return null;
  }
}

async function extractRepository({ owner, repo, href }) {
  const repository = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const readme = await fetchGithubReadme(owner, repo);
  const text = ["GitHub Public Project", `URL: ${href}`, repoSummary(repository, readme)].join("\n");
  return { text, raw: { repository, readmeExcerpt: readme } };
}

async function extractProfile({ owner, href }) {
  const repos = await githubApi(`/users/${encodeURIComponent(owner)}/repos?sort=updated&direction=desc&per_page=8`);
  const publicRepos = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  const text = [
    "GitHub Public Projects",
    `Profile: ${href}`,
    ...publicRepos.map((repo) => repoSummary(repo)),
  ].join("\n");
  return { text, raw: { repositories: publicRepos } };
}

function repoSummary(repo, readmeText = "") {
  const topics = Array.isArray(repo.topics) && repo.topics.length ? ` Topics: ${repo.topics.slice(0, 8).join(", ")}.` : "";
  const language = repo.language ? ` Language: ${repo.language}.` : "";
  const stars = Number.isFinite(repo.stargazers_count) ? ` Stars: ${repo.stargazers_count}.` : "";
  const description = repo.description || "No public description provided.";
  const readme = readmeText ? `\nREADME excerpt: ${readmeText}` : "";
  return `${repo.name} - ${description}${language}${topics}${stars}${readme}`;
}

async function fetchGithubReadme(owner, repo) {
  try {
    const readme = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
    return trimGithubReadme(decodeGithubContent(readme.content));
  } catch {
    return "";
  }
}

async function githubApi(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "interview-prep-studio",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(Number(process.env.GITHUB_TIMEOUT_MS || 12_000)),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "GitHub import failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function decodeGithubContent(content) {
  if (!content) return "";
  try {
    return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
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

function readGithubCache(key) {
  return readCache("github", key);
}

function writeGithubCache(key, value) {
  const ttlMs = Number(process.env.GITHUB_CACHE_TTL_MS || 15 * 60_000);
  return writeCache("github", key, value, ttlMs);
}
