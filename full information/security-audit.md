# Security Audit

Analysis of source only — nothing was exploited or executed against live services.
**No secrets, keys, or tokens are exposed in this report.**

## Overall posture: GOOD for a static-content portfolio with one gated feature

✅ `.env*` git-ignored; secrets never committed (verified: no key-looking strings in tracked files)
✅ Résumé protected by **two independent auth checks** (middleware + route handler) and stored outside `/public`
✅ No passwords collected — identity fully delegated to Google OAuth; JWT session strategy
✅ Graceful degradation: missing OAuth env vars disable the provider instead of crashing
✅ `poweredByHeader: false`, `compress`, ETags (small hardening wins in `next.config.ts`)
✅ Contact form does client-side validation + posts to Formspree (no self-hosted mail relay to abuse)
✅ Demos run in sandboxed iframes (`DemoFrame`) — demo JS can't touch the parent page
✅ No SQL anywhere → no injection surface; no dangerouslySetInnerHTML usage found in `src/`

## Findings (informational → medium)

### S1 — MEDIUM: Formspree endpoint is public and uncaptcha'd
- **Where:** `src/lib/constants.ts` (`formspreeUrl`), `ContactForm.tsx`
- **Risk:** bots can spam the form (cost: owner's inbox quota). Formspree has server-side spam filtering, but no CAPTCHA/honeypot field is present in the form markup.
- **Mitigation idea:** add Formspree's bot-field/honeypot or Google reCAPTCHA.

### S2 — LOW/INFO: Client-side-only form validation
- **Where:** `ContactForm.tsx` — name/email/message checked in the browser before POST.
- **Risk:** a crafted direct POST bypasses it. Formspree tolerates this; no site-side data is written.

### S3 — LOW: No security headers / CSP
- **Where:** `next.config.ts` (absent) — no Content-Security-Policy, X-Frame-Options, HSTS configuration.
- **Note:** the site legitimately embeds iframes of its own demos and loads CDN scripts, so a CSP must be crafted accordingly.

### S4 — LOW: Demo iframe keyboard focus
- **Where:** `DemoFrame.tsx` auto-focuses the iframe so games receive keys; the car game attaches key listeners to the parent window when same-origin. Sandboxed same-origin demos could dispatch events into the parent. Low impact (all demos are first-party), but `sandbox` attribute restrictions would harden it.

### S5 — INFO: Legacy files served from the web root
- **Where:** `/index.html`, `/script.js`, `/style.css`, `/demos/*` (root) — the old static site remains deployable content.
- **Risk:** none functional; mildly enlarges the attack/attention surface and can confuse SEO. Consider removing on the next cleanup.

### S6 — INFO: `next-auth` beta channel
- **Where:** `next-auth@5.0.0-beta.32` — Auth.js v5 is pre-stable; keep an eye on security advisories between betas.

## Checked and clean

- No hardcoded credentials/keys in `src/**`, configs, or demo files
- No client-side secrets (no `NEXT_PUBLIC_*` env usage at all)
- No CORS configuration needed (no cross-origin self-hosted APIs)
- No unsafe HTML injection (`dangerouslySetInnerHTML` absent)
- No file-upload endpoints; the only file read (`/api/resume`) is path-fixed (`join(cwd,'private', fixedName)`) — no user-controlled path
- Dependency advisories: not scanned at runtime here; run `npm audit` for CVE freshness
