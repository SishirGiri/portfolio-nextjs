# Contact Page Redesign v2 — Implementation Plan

Evolve the current Contact page into a premium split-layout page. Preserve the working Formspree form (4 fields). Theme/animations/other pages untouched.

## Decisions (confirmed)
- **Layout:** 35/65 split (left profile card, right form) → 50/50 tablet → 1-column mobile
- **Form:** keep 4 fields (Name, Email, Subject, Message) — proven working
- **Socials:** GitHub, LinkedIn, Email, YouTube, TikTok, Resume — **horizontal social cards** (replace the current square icon grid)
- **Availability:** re-add status badge + availability card
- **New sections:** "Why Work With Me?" (4 cards) + keep existing FAQ + restyled CTA

## File changes

### 1. REWRITE left panel → premium profile card (`ContactForm.tsx`)
Replace the current multi-block `.info-panel` with **one cohesive `.profile-card`**:
- **Header:** circular animated "SB" initials badge (no image) + online status pill ("🟢 Available for Opportunities")
- **Identity:** Name "Sishir Bharati", role stack ("Software Developer / Technical SEO Specialist / AI Learner"), short bio
- **Contact info:** Location, Email (+copy button), Time Zone, Response time — compact rows
- **Availability card:** "Open to" Internships, Freelance, Remote Work, Collaborations, Consulting — as small chips with an animated status indicator
- **Languages:** keep the modernized language chips (English/Nepali/Hindi/German/Korean)

**PRESERVE VERBATIM:** `handleSubmit`, validation, `fetch(SITE.formspreeUrl, ...)`, `FormData`, field `name`/`id` attributes, `disabled={sending}`, `form.reset()`, copy-email handler. The form JSX stays identical.

### 2. NEW `SocialCards` (inline in ContactForm) — horizontal social cards
Replace the current `.social-cards` grid (square icon buttons) with **`.social-card-h`** — full-width horizontal cards: icon + name + small description, hover lift + gradient glow + ripple. 6 cards (GitHub, LinkedIn, Email, YouTube, TikTok, Resume).

### 3. NEW `src/components/Contact/WhyWorkWithMe.tsx`
4 premium glass cards: ⚡ Fast Communication, 💻 Clean Code, 📈 SEO Focused, 🚀 Performance Optimized. Framer Motion stagger + hover lift.

### 4. UPDATE `ContactSection.tsx` — new section ordering
```
<ContactBackground />
§1 HERO (existing, keep)
§2 SPLIT LAYOUT (profile card | form)  ← ContactForm
§3 WHY WORK WITH ME  ← new
§4 FAQ (existing, keep)
§5 CTA — "Let's Create Something Amazing" (existing CTA, restyle headline)
```

### 5. CSS — append/adjust in `globals.css`
- Adjust `.contact-layout` to 35/65 (0.62fr 1.85fr-ish)
- New: `.profile-card`, `.profile-avatar`, `.profile-status`, `.profile-name`, `.profile-roles`, `.profile-bio`, `.profile-contact-row`, `.availability-card`, `.availability-chip`, `.availability-indicator`
- New: `.social-cards-h`, `.social-card-h`, `.social-card-h-icon`, `.social-card-h-info`, ripple layer
- New: `.why-grid`, `.why-card`
- Magnetic button effect on `.contact-form .btn` (subtle translate toward cursor via JS mousemove, GPU-friendly)
- Char counter under textarea (small new state in ContactForm)
- Responsive + reduced-motion

## Magnetic button & micro-interactions (lightweight)
- **Magnetic send button:** onMouseMove translates the button a few px toward the cursor, springs back on leave. Optional — small JS handler.
- **Ripple:** reuse the `.btn-ripple` pattern already in the hero.
- **Char counter:** `useState` tracking message length, max 500, shown under textarea.

## Preservation guarantees
- ✅ Formspree POST unchanged
- ✅ Field `name`/`id` attributes retained (`name`, `email`, `subject`, `message`)
- ✅ Validation reads `#name`/`#email`/`#message`
- ✅ `disabled={sending}`, `form.reset()`, feedback all retained
- ✅ No changes to Home/About/Projects/Skills/Navbar/Footer/theme

## Verification
1. `tsc --noEmit` + `npm run build`
2. Browser: form still validates + submits to Formspree, profile card renders, social cards horizontal, Why/FAQ/CTA sections present, responsive at 3 breakpoints, reduced-motion respected