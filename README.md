# Interview Prep Studio

A protected browser app for turning pasted resume text and user notes into a concise candidate brief, interview prep plan, and tailored resume draft.

## Supabase Auth setup

1. Create or open a Supabase project.
2. In Authentication > Sign In / Providers, enable Email.
3. In Authentication > URL Configuration, add your local and deployed app URLs to the redirect allow list. For local testing with the command below, add `http://127.0.0.1:8001`.
4. In Project Settings > API, copy the Project URL and publishable key.
5. Copy `.env.example` to `.env` and `config.local.example.js` to `config.local.js`.
6. Put your local Supabase values in `.env` and `config.local.js`.

Use the publishable key only. Do not place a service role or secret key in browser code.

## Use

Serve the folder locally and open the app:

```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8001`.

The app supports:

- Supabase email/password sign up and sign in
- Protected workspace routes that require an active session
- Sign out
- Resume and notes text areas
- LinkedIn profile URL field
- Open LinkedIn button for faster copy/paste workflow
- Pasted LinkedIn profile text for local analysis
- Job posting URL field
- Open job posting button for faster copy/paste workflow
- Pasted job description text for role targeting
- `.txt`, `.md`, `.csv`, and `.rtf` text imports
- Sample data for a quick demo
- Client-side keyword and fit analysis
- Strengths, gaps, and next action generation
- LeetCode-style practice question plan
- System design prompt generation
- Editable candidate brief with copy support
- Editable tailored resume draft with copy support

All analysis runs in the browser. Auth sessions are managed by Supabase.

LinkedIn and job URLs are stored as context in the generated output. For analysis, paste the profile or job description text because static browser pages cannot reliably fetch LinkedIn or most career pages directly.
