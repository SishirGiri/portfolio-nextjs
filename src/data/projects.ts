export type ProjectCategory =
  | 'Web Development'
  | 'SEO'
  | 'AI / Machine Learning';

export type ProjectLanguage = 'JavaScript' | 'Python';

export interface Project {
  slug: string;
  icon: string;
  accentClass: string;
  accentColor: string;
  tags: string[];
  title: string;
  description: string;
  tech: string;
  demoUrl: string;
  githubUrl: string;
  heroSubtitle: string;
  overview: string;
  features: { title: string; desc: string; icon: string }[];
  techStack: { name: string; icon: string }[];
  previewDescription: string;
  featured?: boolean;
  thumbnailUrl?: string;
  websiteUrl?: string;
  techBadges?: string[];
  /* ── Card / filter metadata (added in the premium redesign) ── */
  category: ProjectCategory;
  language?: ProjectLanguage;
  status: 'Completed' | 'In Progress';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  date: string;
  highlights?: string[];
  isPrivate?: boolean;
}

export const projects: Project[] = [
  {
    slug: "ai-chatbot",
    icon: "\uD83E\uDD16",
    accentClass: "p1",
    accentColor: "#00d4ff",
    tags: ["Python", "NLP", "AI"],
    title: "AI Chatbot",
    description:
      "A rule-based intelligent chatbot using Python and pattern-matching NLP. Answers FAQs with contextual responses and learns from conversation history.",
    tech: "Python \u00b7 NLTK \u00b7 JSON",
    demoUrl: "/demos/chatbot",
    githubUrl: "https://github.com/YOUR_USERNAME/ai-chatbot",
    heroSubtitle: "Intelligent Conversational AI",
    overview:
      "This AI-powered chatbot leverages natural language processing techniques to understand user queries and deliver contextual, meaningful responses. Built entirely in Python, it uses NLTK for tokenization, stemming, and pattern matching against a rich knowledge base stored in JSON format. The chatbot maintains conversation history to provide contextually aware replies and continuously improves its response accuracy through interaction patterns.",
    features: [
      { title: "Contextual Understanding", desc: "NLP-powered intent recognition with pattern matching and keyword extraction for accurate response selection.", icon: "\uD83E\uDD16" },
      { title: "Conversation Memory", desc: "Maintains session history to reference previous messages and deliver contextually relevant follow-up responses.", icon: "\uD83E\uDDE0" },
      { title: "Knowledge Base", desc: "JSON-structured FAQ database with categorized topics, enabling rapid lookup and extensible content management.", icon: "\uD83D\uDCDA" },
      { title: "Learning Mode", desc: "Adaptive response ranking based on user feedback, improving answer quality over time without manual tuning.", icon: "\uD83D\uDCC8" },
      { title: "Multi-Topic Support", desc: "Handles queries across technology, general knowledge, weather, math, and custom configurable domains.", icon: "\uD83C\uDF10" },
      { title: "CLI & Web Interface", desc: "Dual interface supporting terminal-based interaction and a browser-accessible web frontend via Flask.", icon: "\uD83D\uDDA5\uFE0F" },
    ],
    techStack: [
      { name: "Python", icon: "\uD83D\uDC0D" },
      { name: "NLTK", icon: "\uD83D\uDCDD" },
      { name: "Flask", icon: "\u2699\uFE0F" },
      { name: "JSON", icon: "\uD83D\uDCC4" },
      { name: "Regex", icon: "\uD83D\uDD04" },
      { name: "HTML/CSS", icon: "\uD83C\uDFA8" },
    ],
    previewDescription:
      "The chatbot interface features a clean terminal-style design with real-time message streaming, typing indicators, and syntax-highlighted code responses. The web version includes a modern chat UI with message bubbles, timestamps, and quick-action buttons.",
    category: "AI / Machine Learning",
    language: "Python",
    status: "Completed",
    difficulty: "Intermediate",
    date: "2024",
    highlights: [
      "Pattern-matching NLP with NLTK for intent recognition",
      "JSON knowledge base with multi-topic support",
      "Conversation memory for contextual follow-ups",
    ],
  },
  {
    slug: "snake-game",
    icon: "\uD83D\uDC0D",
    accentClass: "p4",
    accentColor: "#10b981",
    tags: ["JavaScript", "Canvas", "Game"],
    title: "Snake Neon",
    description:
      "A polished neon-arcade take on classic Snake \u2014 built with pure HTML5 Canvas and vanilla JS. Features glowing visuals, power-ups, combo scoring, level progression, obstacles, full mobile controls, Web Audio sound effects, and a real light/dark theme.",
    tech: "JS \u00b7 Canvas API \u00b7 Web Audio",
    demoUrl: "/demos/snake",
    githubUrl: "https://github.com/YOUR_USERNAME/snake-game",
    heroSubtitle: "Neon Arcade Snake",
    overview:
      "Snake Neon is a portfolio-quality mini-game built entirely with HTML5 Canvas, CSS3, and vanilla JavaScript \u2014 no frameworks, no build step, no external assets. The game engine runs on a requestAnimationFrame render loop with a tick-based grid simulation, supporting smooth continuous movement, directional queueing, and a 180\u00b0 reversal lock. Every visual is crafted for a premium neon-arcade feel: the snake glows with a cyan-green gradient and shadowBlur, food pulses, particles burst on every bite, and the board shakes on game over. Sounds are synthesized at runtime via the Web Audio API, so the whole game works fully offline.",
    features: [
      { title: "Classic Gameplay", desc: "Grid-based snake on Canvas with continuous movement, wall/self/obstacle collision, and a reversal lock so you can't double back into yourself.", icon: "\uD83D\uDC0D" },
      { title: "Power-Ups", desc: "Golden food (+50 bonus, time-limited), speed-boost food, and a temporary slow-motion power-up add strategic depth beyond the basic loop.", icon: "\u26A1" },
      { title: "Combo Scoring", desc: "Eat food quickly in succession to build a combo multiplier (up to \u00d78) with a decay bar \u2014 rewards aggressive, skilled play.", icon: "\uD83D\uDD25" },
      { title: "Level Progression", desc: "Every 50 points raises the level, increasing speed and (from level 3) spawning obstacles. Level-up is announced with a toast and sound.", icon: "\uD83D\uDE80" },
      { title: "Full Mobile Support", desc: "Large touch D-pad, swipe gestures on the board, and touch-action locking so the page never scrolls mid-game.", icon: "\uD83D\uDCF1" },
      { title: "Settings & Themes", desc: "Difficulty (Easy/Medium/Hard), grid size (15/20/25), sound toggle, a real light theme, and a high-score reset \u2014 all persisted in localStorage.", icon: "\u2699\uFE0F" },
      { title: "Game States", desc: "Polished overlay screens for Welcome, Playing, Paused, Game Over (with score breakdown), and a New High Score celebration.", icon: "\uD83C\uDFAE" },
      { title: "Web Audio Sound", desc: "Eat, gold, boost, slow-mo, level-up, game-over, new-high, and click effects \u2014 all synthesized with oscillators, zero audio files.", icon: "\uD83D\uDD0A" },
    ],
    techStack: [
      { name: "JavaScript", icon: "\u26A1" },
      { name: "Canvas API", icon: "\uD83C\uDFA8" },
      { name: "Web Audio", icon: "\uD83D\uDD0A" },
      { name: "CSS3", icon: "\uD83C\uDF1F" },
      { name: "localStorage", icon: "\uD83D\uDDC3\uFE0F" },
      { name: "Touch API", icon: "\uD83D\uDCF1" },
    ],
    previewDescription:
      "A neon-arcade Snake game rendered on HTML5 Canvas. The board shows a glowing gradient snake chasing pulsing food, with a side panel tracking score, high score, level, speed, and difficulty. Power-ups, combo multipliers, and obstacles appear as you progress, all framed in a dark glassmorphic UI with a subtle animated grid.",
    category: "Web Development",
    language: "JavaScript",
    status: "Completed",
    difficulty: "Intermediate",
    date: "2025",
    highlights: [
      "Pure Canvas + vanilla JS, zero dependencies",
      "Power-ups, combo scoring, and level progression",
      "Full mobile controls and synthesized Web Audio",
    ],
    featured: true,
  },
  {
    slug: "car-game",
    icon: "\uD83D\uDE97",
    accentClass: "p3",
    accentColor: "#f59e0b",
    tags: ["JavaScript", "Three.js", "Game"],
    title: "Neon Drive",
    description:
      "A large-scale New York-inspired open-world driving game built with Three.js and vanilla JavaScript. Drive a Lamborghini-style AWD supercar through Manhattan, Times Square, Central Park, and Brooklyn — with suspension bridges, docks, tunnels, living traffic, police pursuits with roadblocks, 14 missions plus free-roam street events, turn-by-turn GPS, deep customization, and dynamic weather — saved to localStorage.",
    tech: "JS \u00b7 Three.js \u00b7 WebGL \u00b7 Web Audio",
    demoUrl: "/demos/car-game",
    githubUrl: "https://github.com/SishirGiri/portfolio-nextjs",
    heroSubtitle: "NYC Open-World Driving Game",
    overview:
      "Neon Drive NYC is a large-scale open-world driving game built entirely with Three.js and vanilla JavaScript \u2014 no game engine, no external assets. The map recreates the feel of New York: Midtown skyscraper canyons with setback towers and rooftop water towers, a Times Square district with animated neon billboards, a four-block Central Park with ponds and a fountain plaza, a Financial District of glass towers, wide avenues with three lanes each way, an animated East River crossed by two suspension bridges with catenary cables, Brooklyn brownstones with stoops, DUMBO docks with container stacks, a road tunnel, subway entrances, street-name signs, and manhole steam. The hero car is a Lamborghini-inspired AWD supercar with a torque curve, 6-speed gearbox, traction control, ABS, launch wheelspin, weight transfer, handbrake drifts, nitro, and a cockpit view with a live digital cluster and warning indicators. The city runs as real systems: ten AI vehicle types follow lanes, obey signals, brake for pedestrians, change lanes, and break down into jams; density shifts by district and time of day; patrol police notice speeding and red-light running, and 1–5 star pursuits add coordinated chase AI and roadblocks. Fourteen career missions plus free-roam street events (races, taxi fares, time trials, courier drops) feed an economy with six cars and a garage covering six upgrade lines, paints, wheels, calipers, body kits, and exhausts. GPS navigation offers a rotating minimap, a district-labeled map, click-to-route A* paths, turn-by-turn arrows, and automatic recalculation. A full day/night cycle and six weather states wet the roads and change the grip. Everything streams by chunks with spatial-hash collisions and instanced geometry to stay smooth on mid-range PCs, and saves migrate automatically from both earlier versions of the game.",
    features: [
      { title: "NYC-Inspired Open World", desc: "Midtown towers, Times Square billboards, Central Park, the Financial District, Brooklyn brownstones, DUMBO docks, avenues, suspension bridges, and a road tunnel — streamed by chunks.", icon: "\uD83C\uDFD9\uFE0F" },
      { title: "Toro SV Supercar", desc: "A Lamborghini-style AWD wedge with sharp LEDs, diffuser, and sport wheels — plus traction control, ABS, launch wheelspin, weight transfer, and drifts.", icon: "\uD83D\uDE97" },
      { title: "Living City", desc: "Ten AI vehicle types follow lanes, obey signals, brake for pedestrians, and jam up; density shifts by district and hour; ambulances and fire trucks run with flashing lights.", icon: "\uD83D\uDEA6" },
      { title: "Police & Pursuits", desc: "Patrols catch speeding and red-light running; 1–5 wanted stars bring coordinated chases, sirens, and roadblocks — escape or pay the fine.", icon: "\uD83D\uDE93" },
      { title: "Missions & Street Events", desc: "14 career missions from VIP transport to a city-wide marathon, plus free-roam race, taxi, trial, and courier markers that respawn around the map.", icon: "\uD83C\uDFAF" },
      { title: "Deep Customization", desc: "Six cars, six upgrade lines, ten paints, wheels, brake calipers, body kits, and exhausts — with live stat bars and visible damage you can repair.", icon: "\uD83D\uDD27" },
      { title: "Turn-by-Turn GPS", desc: "Rotating minimap and district map with click-to-route A* pathfinding, live turn arrows, distance readouts, and automatic recalculation off-route.", icon: "\uD83D\uDDFA\uFE0F" },
      { title: "Dynamic World", desc: "A full day cycle with lit windows and streetlights, plus clear, cloudy, rain, heavy rain, fog, and storm weather that wets the roads and loosens the grip.", icon: "\uD83C\uDF19" },
    ],
    techStack: [
      { name: "Three.js", icon: "\uD83C\uDFAF" },
      { name: "WebGL", icon: "\uD83D\uDDA5\uFE0F" },
      { name: "Vanilla JS", icon: "\u26A1" },
      { name: "Web Audio", icon: "\uD83D\uDD0A" },
      { name: "Canvas 2D", icon: "\uD83C\uDFA8" },
      { name: "localStorage", icon: "\uD83D\uDDC3\uFE0F" },
    ],
    previewDescription:
      "A 3D open-world driving game in a New York-inspired city. The view shows a gold Lamborghini-style supercar on a wide avenue with lane markings and crosswalks, skyscrapers behind, a glass HUD with speedometer, gauges, rotating minimap, and GPS turn chip.",
    category: "Web Development",
    language: "JavaScript",
    status: "Completed",
    difficulty: "Advanced",
    date: "2026",
    highlights: [
      "True 3D with Three.js — the first 3D demo on the portfolio",
      "NYC-inspired streaming open world with chunked visibility and spatial-hash collisions",
      "Lamborghini-style supercar with TC/ABS physics, pursuits, roadblocks, and turn-by-turn GPS",
    ],
    featured: true,
  },
  {
    slug: "share-master",
    icon: "\uD83D\uDCB9",
    accentClass: "p8",
    accentColor: "#10b981",
    tags: ["FinTech", "Stock Market", "Analytics"],
    title: "Share Master",
    description:
      "Smart NEPSE stock market intelligence platform for Nepalese investors \u2014 real-time market data, advanced candlestick charts, technical pattern detection, IPO/SEBON tracking, and AI-powered market insights in an institutional-grade trading dashboard.",
    tech: "React \u00b7 TypeScript \u00b7 TradingView \u00b7 REST API",
    demoUrl: "https://master-roan-tau.vercel.app/",
    websiteUrl: "https://master-roan-tau.vercel.app/",
    thumbnailUrl: "/images/share-master-dashboard.svg",
    techBadges: [
      "React",
      "TypeScript",
      "TradingView Charts",
      "REST API",
      "Tailwind CSS",
      "Node.js",
      "PostgreSQL",
      "Real-time Market Data",
    ],
    githubUrl: "#",
    heroSubtitle: "Smart NEPSE Stock Market Intelligence Platform",
    overview:
      "Share Master is a modern fintech platform built for Nepalese investors and traders. It provides real-time NEPSE market data, advanced candlestick charting, sector analysis, stock screening, IPO and SEBON tracking, technical pattern detection, and AI-powered market insights. The platform helps users monitor market trends, analyze stocks, and make data-driven investment decisions through an institutional-grade trading dashboard with a responsive dark-mode user interface.",
    features: [
      { title: "Real-Time NEPSE Dashboard", desc: "Live market overview with up-to-the-minute index values, top gainers/losers, and overall market status.", icon: "\uD83D\uDCC8" },
      { title: "Live Stock Prices & Turnover", desc: "Track live stock prices and daily market turnover with auto-refreshing data feeds.", icon: "\uD83D\uDCB9" },
      { title: "Advanced Candlestick Charts", desc: "TradingView-powered candlestick charting with multiple timeframes, indicators, and drawing tools.", icon: "\uD83D\uDCC9" },
      { title: "Sector Performance Analysis", desc: "Sector-wise breakdowns showing which industries are driving or dragging the market.", icon: "\uD83C\uDFD9\uFE0F" },
      { title: "Technical Pattern Detection", desc: "Automatic detection of bullish and bearish chart patterns to surface potential trade setups.", icon: "\uD83D\uDD0D" },
      { title: "IPO & SEBON Dashboard", desc: "Track upcoming initial public offerings and SEBON public issues in one centralized view.", icon: "\uD83D\uDCB2" },
      { title: "Live Market Feed & News", desc: "Real-time market feed and news updates to stay informed on the latest movements.", icon: "\uD83D\uDCF0" },
      { title: "Stock Screener & Watchlist", desc: "Powerful screening filters and customizable watchlists to monitor your preferred stocks.", icon: "\uD83D\uDCD6" },
      { title: "Historical Data Visualization", desc: "Visualize historical market and stock data to identify long-term trends and patterns.", icon: "\uD83D\uDCCA" },
      { title: "Responsive Dark UI", desc: "A polished, responsive dark-mode interface optimized for desktop and mobile trading.", icon: "\uD83C\uDF19" },
    ],
    techStack: [
      { name: "React", icon: "\u269B\uFE0F" },
      { name: "TypeScript", icon: "\uD83D\uDDC2\uFE0F" },
      { name: "TradingView Charts", icon: "\uD83D\uDCC8" },
      { name: "REST API", icon: "\uD83C\uDF10" },
      { name: "Tailwind CSS", icon: "\uD83C\uDFA8" },
      { name: "Node.js", icon: "\uD83C\uDF95" },
      { name: "PostgreSQL", icon: "\uD83D\uDDC4\uFE0F" },
      { name: "Real-time Market Data", icon: "\u26A1" },
      { name: "Vercel", icon: "\u25B2" },
    ],
    previewDescription:
      "The dashboard delivers an institutional-grade trading experience: a live NEPSE overview, interactive candlestick charts, sector heatmaps, an IPO/SEBON tracker, and AI-assisted market insights \u2014 all within a fast, responsive dark interface.",
    category: "Web Development",
    language: "JavaScript",
    status: "In Progress",
    difficulty: "Advanced",
    date: "2025",
    highlights: [
      "Real-time NEPSE data with TradingView charts",
      "Technical pattern detection and AI insights",
      "IPO/SEBON tracker and stock screener",
    ],
    isPrivate: true,
    featured: true,
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/* ── Derived, honest statistics for the Projects page ── */
export const projectStats = {
  completed: projects.filter((p) => p.status === 'Completed').length,
  total: projects.length,
  featured: projects.filter((p) => p.featured).length,
  technologies: new Set(projects.flatMap((p) => p.techStack.map((t) => t.name))).size,
  categories: new Set(projects.map((p) => p.category)).size,
} as const;

/* The primary featured project shown in the showcase banner. */
export const featuredProject =
  projects.find((p) => p.featured) ?? projects[0];

