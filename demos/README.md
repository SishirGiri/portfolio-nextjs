# Portfolio Demos

Five interactive demos embedded inside the portfolio as routes. Each demo is a
self-contained vanilla HTML/CSS/JS app served as a static file and mounted
full-screen via an iframe on its own Next.js route.

## Where the demos live

| Project           | Source (this repo)                  | Live route (internal) |
|-------------------|-------------------------------------|-----------------------|
| AI Chatbot        | `public/demos/chatbot/`             | `/demos/chatbot`        |
| Terminal RPG      | `public/demos/rpg/`                 | `/demos/rpg`            |
| Digit Classifier  | `public/demos/classifier/`          | `/demos/classifier`     |
| Smart Task Manager| `public/demos/tasks/`               | `/demos/tasks`          |

A second copy of each demo also exists under `demos/<original-name>/` — those
are the original standalone builds kept for reference. **The copies that
actually serve are the ones in `public/demos/`.**

## How it works

- Each `public/demos/<name>/index.html` is served verbatim by Next.js as a
  static file (alongside its `style.css` and `script.js`).
- The route `src/app/demos/<name>/page.tsx` renders a full-viewport
  `<DemoFrame>` (see `src/components/DemoFrame.tsx`) that loads
  `/demos/<name>/index.html` in a sandboxed iframe with a floating
  "Back to portfolio" pill.
- The iframe isolates each demo's CSS, JS, and globals (notably TensorFlow.js
  for the digit classifier) so they can't interfere with the portfolio or each
  other.

## How a project card links to its demo

In `src/data/projects.ts`, each project's `demoUrl` is set to its internal
route (e.g. `"/demos/chatbot"`). The project-detail page and project card both
detect URLs starting with `/` and render them as same-tab `<Link>` buttons
labeled "Live Demo" — no new tab, full app-router navigation.

## Deployment

There is **no separate deploy step** for the demos. They deploy together with
the portfolio. When you deploy the portfolio to Vercel (or any host), the
demos are instantly live at:

```
https://<your-portfolio-domain>/demos/chatbot
https://<your-portfolio-domain>/demos/rpg
https://<your-portfolio-domain>/demos/classifier
https://<your-portfolio-domain>/demos/tasks
```

## Notes

- **Digit Classifier** loads TensorFlow.js and MNIST data from CDNs at runtime.
  On first load it trains a small neural net in-browser (~30–60s, with a
  progress bar). If the CDN is unreachable it shows an honest error rather than
  faking predictions.
- The other four demos are fully self-contained (no runtime network calls
  except optional Google Fonts).
