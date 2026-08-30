# SEO Audit

## What exists

| Item | Location | Content |
|---|---|---|
| Root title | `src/app/layout.tsx` → `metadata.title` | "Sishir Bharati — SEO-Optimized Developer & AI Developer" |
| Root description | same file | "Personal portfolio of Sishir Bharati – SEO-Optimized Developer & AI Developer from Nepal." |
| Open Graph | same file | title/description/type=website (no OG image, no URL) |
| Per-page titles/descriptions | `src/app/{about,contact,projects,skills}/layout.tsx` | e.g. projects layout lists all project names incl. "Neon Drive" |
| Dynamic per-project metadata | `src/app/projects/[slug]/page.tsx` → `generateMetadata()` | project title/description per slug |
| Demo-page metadata | each `src/app/demos/*/page.tsx` | e.g. "Neon Drive NYC — Open-World Driving Game" |
| Favicon | `src/app/favicon.ico` | present |
| Headings | components | one `<h1>`-level hero per page + section `<h2>`s (sound hierarchy) |
| Performance hints | `next.config.ts` | `compress`, `generateEtags`, `poweredByHeader:false`, package-import optimization |

## What is missing (actionable gaps)

| Gap | Impact | Fix |
|---|---|---|
| **No `sitemap.ts` / `robots.txt`** | Crawlers not guided; indexation slower | add `src/app/sitemap.ts` + `src/app/robots.ts` |
| **No canonical URLs** | potential duplicate-content issues | add `metadataBase` + `alternates.canonical` |
| **No Twitter/X card metadata** | weak social previews | add `twitter` field to metadata |
| **No OG image** | link previews lack a visual | add 1200×630 `opengraph-image` |
| **No JSON-LD / structured data** | no rich results (Person, WebSite, BreadcrumbList) | add `Person` schema in root layout |
| **Résumé gate returns 401 JSON** | fine for SEO (not a public page) | — |
| **Demos embedded in iframes** | demo content itself isn't indexable | acceptable; parent pages carry the metadata |
| Alt text | icons mostly decorative/aria-hidden; SVG thumbnails need `alt` on `<img>` usage | verify `ProjectCard`/`ProjectPreview` img alt |

## Verdict

Solid metadata foundation (root + per-page + dynamic), but **search infrastructure (sitemap/robots/canonical/JSON-LD/social images) is entirely absent** — the highest-ROI quick wins for this site.
