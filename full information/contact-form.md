# Contact Form — Complete Flow

```
Contact Form (/contact)
↓ Frontend
src/components/Contact/ContactForm.tsx  ("use client")
↓ API / Server Action
NONE of its own — direct browser fetch to Formspree SaaS
POST https://formspree.io/f/mlgzyywb  (FormData: name, email, message; Accept: application/json)
↓ Email / Database / External Service
Formspree (form-backend SaaS) — stores/relays the submission
↓ Final destination
The email inbox Formspree is configured to deliver to (the site owner's
Formspree account email). No database, no site-side storage.
```

## Step-by-step

1. **Render** — `ContactForm.tsx` draws the form (name, email, message with 500-char counter), a profile card with email + location (from `SITE` in `src/lib/constants.ts`), a copy-email button, and a magnetic submit button.
2. **Client validation** — `handleSubmit()` trims values; requires a name, regex-validated email (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), and a non-empty message; inline error feedback otherwise.
3. **Submit** — `fetch(SITE.formspreeUrl, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })`. The Formspree endpoint ID is public by design (it lives in `src/lib/constants.ts`).
4. **Response** — `res.ok` → success message + form reset; failure/network error → error message. `sending` state disables the button while in flight.
5. **Destination** — Formspree forwards to the owner's configured email. Nothing is written to any site database or file.

## Files involved

| File | Role |
|---|---|
| `src/components/Contact/ContactForm.tsx` | Form UI, validation, fetch |
| `src/lib/constants.ts` | `SITE.formspreeUrl`, `SITE.email`, `SITE.location` |
| `src/app/contact/page.tsx` | Page composition (ContactSection → ContactForm) |

## Notes

- Spam protection relies on Formspree's built-in filtering (honeypot/robot checks on their side); the endpoint is public, which is normal for Formspree.
- No server action or API route proxies the submission, so the visitor's browser talks to Formspree directly.
