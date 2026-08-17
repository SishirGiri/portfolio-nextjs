export type ProjectCategory =
  | 'Web Development'
  | 'SEO'
  | 'AI / Machine Learning';

export type ProjectLanguage = 'JavaScript' | 'Python' | 'C Programming';

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
    slug: "terminal-rpg",
    icon: "\uD83C\uDFAE",
    accentClass: "p3",
    accentColor: "#7c3aed",
    tags: ["C", "Terminal", "Algorithms"],
    title: "Terminal RPG Game",
    description:
      "A text-based adventure game written in pure C. Features dynamic story branching, inventory management, and procedural dungeon generation.",
    tech: "C \u00b7 GCC \u00b7 ncurses",
    demoUrl: "/demos/rpg",
    githubUrl: "https://github.com/YOUR_USERNAME/terminal-rpg",
    heroSubtitle: "Procedural Adventure Engine",
    overview:
      "A deeply immersive text-based RPG engine written entirely in C, leveraging the ncurses library for rich terminal UI rendering. The game features a procedurally generated dungeon system using cellular automata, a turn-based combat system with dice-roll mechanics, dynamic NPC dialogue trees, and a branching narrative that adapts to player choices. Every playthrough generates unique dungeon layouts, enemy placements, and loot tables.",
    features: [
      { title: "Procedural Dungeons", desc: "Cellular automata-based dungeon generation creating unique layouts, rooms, corridors, and secret passages every playthrough.", icon: "\uD83C\uDFF0" },
      { title: "Turn-Based Combat", desc: "Dice-roll combat system with attack, defend, magic, and flee options. Damage calculated from stats, equipment, and random variance.", icon: "\u2694\uFE0F" },
      { title: "Inventory System", desc: "Weight-based inventory with weapons, armor, potions, scrolls, and quest items. Equipment affects stats and combat outcomes.", icon: "\uD83C\uDF92" },
      { title: "Dynamic Story", desc: "Branching narrative with multiple endings based on player choices, NPC relationships, and completed quests.", icon: "\uD83D\uDCDC" },
      { title: "ncurses UI", desc: "Full terminal UI with color-coded text, status panels, minimap, combat log, and animated ASCII art monsters.", icon: "\uD83D\uDDA5\uFE0F" },
      { title: "Save/Load System", desc: "Binary save files preserving entire game state including dungeon layout, inventory, quest progress, and NPC disposition.", icon: "\uD83D\uDCBE" },
    ],
    techStack: [
      { name: "C", icon: "\u2699\uFE0F" },
      { name: "ncurses", icon: "\uD83D\uDDA5\uFE0F" },
      { name: "GCC", icon: "\uD83D\uDD27" },
      { name: "Makefile", icon: "\uD83D\uDD28" },
      { name: "Valgrind", icon: "\uD83D\uDD0D" },
      { name: "ASCII Art", icon: "\uD83C\uDFA8" },
    ],
    previewDescription:
      "The game renders in a multi-panel terminal layout: a central viewport shows the dungeon map with ASCII characters, a side panel displays character stats and inventory, and a bottom panel shows the combat log and narrative text with color-coded highlights.",
    category: "Web Development",
    language: "C Programming",
    status: "Completed",
    difficulty: "Advanced",
    date: "2024",
    highlights: [
      "Pure C with ncurses terminal UI",
      "Procedural dungeons via cellular automata",
      "Turn-based combat and branching narrative",
    ],
  },
  {
    slug: "digit-classifier",
    icon: "\uD83E\uDDE0",
    accentClass: "p4",
    accentColor: "#10b981",
    tags: ["Python", "ML", "TensorFlow"],
    title: "Digit Classifier",
    description:
      "Neural network trained on MNIST that classifies handwritten digits. Includes a canvas for real-time drawing and instant predictions.",
    tech: "Python \u00b7 TensorFlow \u00b7 Canvas",
    demoUrl: "/demos/classifier",
    githubUrl: "https://github.com/YOUR_USERNAME/digit-classifier",
    heroSubtitle: "Neural Network Digit Recognition",
    overview:
      "A complete machine learning pipeline for handwritten digit classification using a custom neural network built with TensorFlow and trained on the MNIST dataset. The project includes data preprocessing, model architecture design, training with validation, and an interactive web canvas where users can draw digits and receive real-time predictions. The model achieves 97.8% accuracy on the test set using a carefully tuned architecture.",
    features: [
      { title: "MNIST Training", desc: "Custom neural network architecture trained on 60,000 MNIST samples with data augmentation for robust generalization.", icon: "\uD83E\uDDE0" },
      { title: "Drawing Canvas", desc: "Interactive HTML5 canvas with pressure-sensitive drawing, stroke smoothing, and automatic 28x28 preprocessing for prediction.", icon: "\u270F\uFE0F" },
      { title: "Real-Time Prediction", desc: "Instant digit classification with confidence scores displayed as an animated probability bar chart for all 10 digits.", icon: "\u26A1" },
      { title: "Model Visualization", desc: "Interactive visualization of network layers, weight distributions, and activation heatmaps showing what the network learns.", icon: "\uD83D\uDD0D" },
      { title: "Batch Processing", desc: "Upload multiple handwritten digit images for bulk classification with CSV export of results and accuracy metrics.", icon: "\uD83D\uDCC4" },
      { title: "Model Export", desc: "Save and load trained models in HDF5 format with version tracking and training history logs.", icon: "\uD83D\uDCBE" },
    ],
    techStack: [
      { name: "Python", icon: "\uD83D\uDC0D" },
      { name: "TensorFlow", icon: "\uD83E\uDDE0" },
      { name: "NumPy", icon: "\uD83D\uDD22" },
      { name: "Matplotlib", icon: "\uD83D\uDCC8" },
      { name: "Flask", icon: "\u2699\uFE0F" },
      { name: "HTML5 Canvas", icon: "\uD83C\uDFA8" },
    ],
    previewDescription:
      "The web interface features a large drawing canvas on the left with real-time prediction results on the right. Confidence bars animate as the user draws, with the predicted digit displayed prominently. A gallery below shows recent predictions with actual vs. predicted labels.",
    category: "AI / Machine Learning",
    language: "Python",
    status: "Completed",
    difficulty: "Advanced",
    date: "2024",
    highlights: [
      "Custom neural network trained on MNIST",
      "Interactive drawing canvas with real-time prediction",
      "Layer and activation visualizations",
    ],
  },
  {
    slug: "smart-task-manager",
    icon: "\uD83D\uDCDD",
    accentClass: "p5",
    accentColor: "#fbbf24",
    tags: ["JavaScript", "LocalStorage", "CSS"],
    title: "Smart Task Manager",
    description:
      "Drag-and-drop task app with priority tagging, deadline tracking, and persistent local storage. Zero dependencies, pure web APIs.",
    tech: "JS \u00b7 CSS Grid \u00b7 Web APIs",
    demoUrl: "/demos/tasks",
    githubUrl: "https://github.com/YOUR_USERNAME/smart-task-manager",
    heroSubtitle: "Intelligent Task Management",
    overview:
      "A feature-rich task management application built with zero external dependencies using only vanilla JavaScript and native Web APIs. The app implements a Kanban-style board with drag-and-drop powered by the HTML5 Drag and Drop API. Tasks are persisted in LocalStorage with automatic save-on-change, and the entire application follows a responsive, mobile-first design philosophy with offline support.",
    features: [
      { title: "Drag & Drop", desc: "Native HTML5 drag-and-drop API implementation for moving tasks between columns with smooth animations and visual feedback.", icon: "\uD83D\uDC47" },
      { title: "Priority System", desc: "Color-coded priority levels (Critical, High, Medium, Low) with automatic sorting and filter-based views.", icon: "\uD83C\uDFC6" },
      { title: "Deadline Tracking", desc: "Date-aware tasks with countdown timers, overdue alerts, and calendar-style deadline visualization.", icon: "\u23F0" },
      { title: "Persistent Storage", desc: "Automatic LocalStorage serialization with JSON compression, version migration, and data export/import functionality.", icon: "\uD83D\uDCBE" },
      { title: "Smart Filters", desc: "Multi-criteria filtering by priority, status, deadline proximity, tags, and custom search with instant results.", icon: "\uD83D\uDD0D" },
      { title: "Dark/Light Mode", desc: "System-aware theme switching with manual override, smooth CSS transitions, and persistent preference storage.", icon: "\uD83C\uDF19" },
    ],
    techStack: [
      { name: "JavaScript", icon: "\u26A1" },
      { name: "CSS Grid", icon: "\uD83D\uDDC2\uFE0F" },
      { name: "LocalStorage", icon: "\uD83D\uDDC3\uFE0F" },
      { name: "Drag & Drop API", icon: "\uD83D\uDC47" },
      { name: "CSS Animations", icon: "\u2728" },
      { name: "Web Notifications", icon: "\uD83D\uDD14" },
    ],
    previewDescription:
      "The Kanban board displays four columns: Backlog, In Progress, Review, and Done. Each task card shows priority color, title, description preview, deadline countdown, and assigned tags. Dragging a card shows a ghost preview at the drop target with smooth reorder animation.",
    category: "Web Development",
    language: "JavaScript",
    status: "Completed",
    difficulty: "Intermediate",
    date: "2024",
    highlights: [
      "Zero-dependency vanilla JS Kanban board",
      "Native HTML5 drag-and-drop with animations",
      "Persistent LocalStorage with import/export",
    ],
  },
  {
    slug: "3d-portfolio",
    icon: "\uD83C\uDF10",
    accentClass: "p6",
    accentColor: "#00d4ff",
    tags: ["Three.js", "WebGL", "HTML"],
    title: "3D Portfolio Site",
    description:
      "This very website \u2014 built from scratch with Three.js particle systems, WebGL shaders, scroll animations, and a custom dark futuristic UI.",
    tech: "Three.js \u00b7 GLSL \u00b7 CSS",
    demoUrl: "/",
    githubUrl: "https://github.com/YOUR_USERNAME/portfolio",
    websiteUrl: "/",
    heroSubtitle: "Immersive Web Experience",
    overview:
      "A groundbreaking personal portfolio website that pushes the boundaries of web graphics using Three.js and custom WebGL shaders. The site features a real-time particle nebula system with thousands of animated points forming a cosmic backdrop, a DNA helix double-helix structure rendered with 3D geometry, and smooth scroll-driven animations that seamlessly transition between sections. Every visual element is crafted to create an immersive cyberpunk atmosphere.",
    features: [
      { title: "Particle Nebula", desc: "Real-time particle system rendering 1500+ animated points with custom shaders, additive blending, and depth-based opacity.", icon: "\u2728" },
      { title: "DNA Helix Animation", desc: "Parametric double-helix geometry with connected nodes, smooth rotation, and color-gradient materials.", icon: "\uD83E\uDDEC" },
      { title: "Custom Shaders", desc: "GLSL vertex and fragment shaders for post-processing effects including bloom, chromatic aberration, and film grain.", icon: "\uD83D\uDDA5\uFE0F" },
      { title: "Scroll Animations", desc: "IntersectionObserver-driven reveal animations with staggered delays, parallax effects, and smooth section transitions.", icon: "\uD83D\uDC40" },
      { title: "Cyberpunk Theme", desc: "Custom design system with neon cyan/violet color palette, glassmorphism, glow effects, and Orbitron typography.", icon: "\uD83C\uDFA8" },
      { title: "3D Project Backgrounds", desc: "Each section features its own animated Three.js background with floating particles and ambient motion.", icon: "\uD83C\uDF0C" },
    ],
    techStack: [
      { name: "Three.js", icon: "\uD83C\uDF0C" },
      { name: "WebGL", icon: "\uD83D\uDDA5\uFE0F" },
      { name: "GLSL", icon: "\u2699\uFE0F" },
      { name: "Next.js", icon: "\u26A1" },
      { name: "React Three Fiber", icon: "\u2697\uFE0F" },
      { name: "Framer Motion", icon: "\uD83C\uDFAC" },
    ],
    previewDescription:
      "The portfolio opens with a full-screen particle nebula that responds to scroll position. As users navigate, sections reveal with staggered animations while 3D backgrounds maintain ambient motion throughout. The custom cursor, glowing UI elements, and smooth transitions create a cohesive futuristic experience.",
    category: "Web Development",
    language: "JavaScript",
    status: "In Progress",
    difficulty: "Advanced",
    date: "2025",
    highlights: [
      "Three.js particle nebula with custom GLSL shaders",
      "Scroll-driven reveal and parallax animations",
      "Custom cyberpunk design system",
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

