# Interview Prep Studio

A protected browser app for turning pasted resume text and user notes into a concise candidate brief, interview prep plan, and tailored resume draft. Generated outputs come from the Gemini API through the Node backend.

## Gemini AI setup

1. Open Google AI Studio.
2. Create an API key for the Gemini API.
3. Copy `.env.example` to `.env` if you have not already.
4. Put the key in `.env`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
SGAI_API_KEY=your_scrapegraphai_key_here
```

Do not put Gemini or ScrapeGraphAI keys in `app.js`, `index.html`, or `config.local.js`. API keys belong only in `.env`, which is ignored by git.

## Supabase Auth setup

1. Create or open a Supabase project.
2. In Authentication > Sign In / Providers, enable Email.
3. In Authentication > URL Configuration, add your local and deployed app URLs to the redirect allow list. For local testing with the command below, add `http://127.0.0.1:8001`.
4. In Project Settings > API, copy the Project URL and publishable key.
5. Copy `.env.example` to `.env` and `config.local.example.js` to `config.local.js`.
6. Put your local Supabase values in `.env` and `config.local.js`.

Use the publishable key only. Do not place a service role or secret key in browser code.

## Sentry setup

Sentry is optional. The backend uses `SENTRY_DSN` from `.env`, and the browser uses `window.SENTRY_CONFIG` from `config.local.js`.

1. Create a Sentry JavaScript project.
2. Copy the project DSN.
3. Add backend settings to `.env`:

```bash
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=interview-prep-studio@local
SENTRY_TRACES_SAMPLE_RATE=0
```

4. Add browser settings to `config.local.js`:

```js
window.SENTRY_CONFIG = {
  browserDsn: "your_sentry_dsn_here",
  environment: "development",
  release: "interview-prep-studio@local",
  tracesSampleRate: 0,
};
```

The app scrubs `authorization` and `cookie` headers before sending events and does not attach the signed-in user's email to browser Sentry events.
The backend preload file [instrument.mjs](/Users/reneefong/Desktop/codex-hackathon/instrument.mjs) must run before `server.js`; the `npm start` and `npm run dev` scripts already do this with Node's `--import` flag.

## Use

Start the Node server and open the app:

```bash
npm start
```

Then visit `http://127.0.0.1:8001`.

The app supports:

- Supabase email/password sign up and sign in
- Protected workspace routes that require an active session
- Sign out
- Resume and notes text areas
- LinkedIn profile URL field
- Open LinkedIn button for faster copy/paste workflow
- ScrapeGraphAI LinkedIn import for public profile data
- Pasted LinkedIn profile text as a fallback
- GitHub profile or repository URL import for public project metadata
- GitHub project text for tailored resume project highlights
- Job posting URL field, including LinkedIn job URLs
- Open job posting button for faster copy/paste workflow
- ScrapeGraphAI job posting import for public job pages
- Pasted job description text as a fallback
- `.txt`, `.md`, `.csv`, and `.rtf` text imports
- Sample data for a quick demo
- Gemini AI generation through `/api/generate`
- Strengths, gaps, and next action generation
- LeetCode-style practice question plan
- System design prompt generation
- Editable candidate brief with copy support
- Editable tailored resume draft with copy support

Gemini calls run through `server.js` so the API key is not exposed to browser JavaScript. Auth sessions are managed by Supabase.

LinkedIn profile and job URLs can be imported through backend ScrapeGraphAI routes when `SGAI_API_KEY` is configured. Only public data should be imported. Private or login-only profile/job data is not supported.

GitHub URLs can be imported when they point to public profiles or repositories. The browser uses GitHub's public API to pull repo descriptions, topics, languages, stars, and README excerpts for single repositories, then includes that project evidence in the tailored resume draft.
