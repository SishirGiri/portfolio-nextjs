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
    demoUrl: "#",
    githubUrl: "#",
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
  },
  {
    slug: "live-data-dashboard",
    icon: "\uD83D\uDCCA",
    accentClass: "p2",
    accentColor: "#f472b6",
    tags: ["JavaScript", "SVG", "API"],
    title: "Live Data Dashboard",
    description:
      "Interactive analytics dashboard built with vanilla JS. Features real-time SVG charts, filterable datasets, and a responsive dark-mode UI.",
    tech: "JS \u00b7 SVG \u00b7 REST API",
    demoUrl: "#",
    githubUrl: "#",
    heroSubtitle: "Real-Time Analytics Visualization",
    overview:
      "A powerful, zero-dependency analytics dashboard built with vanilla JavaScript and dynamic SVG rendering. The dashboard fetches live data from REST APIs and renders interactive charts, graphs, and KPI cards in real-time. Designed with a dark-mode-first approach, it features smooth transitions between data states, responsive grid layouts, and an intuitive filtering system that updates all visualizations simultaneously.",
    features: [
      { title: "Live SVG Charts", desc: "Dynamically generated bar, line, and pie charts using pure SVG with smooth animated transitions between data states.", icon: "\uD83D\uDCC8" },
      { title: "API Integration", desc: "Real-time data fetching from multiple REST endpoints with automatic polling, caching, and error recovery.", icon: "\uD83C\uDF10" },
      { title: "Advanced Filtering", desc: "Multi-criteria dataset filtering with date ranges, categories, and custom queries that update all widgets instantly.", icon: "\uD83D\uDD0D" },
      { title: "KPI Cards", desc: "Animated key performance indicators with trend arrows, sparklines, and color-coded threshold alerts.", icon: "\uD83D\uDCCA" },
      { title: "Dark Mode UI", desc: "Cyberpunk-inspired dark interface with neon accent colors, glassmorphism panels, and reduced eye strain design.", icon: "\uD83C\uDF19" },
      { title: "Responsive Grid", desc: "CSS Grid-based layout that adapts from 4-column desktop to single-column mobile with draggable widget reordering.", icon: "\uD83D\uDDA5\uFE0F" },
    ],
    techStack: [
      { name: "JavaScript", icon: "\u26A1" },
      { name: "SVG", icon: "\uD83C\uDFA8" },
      { name: "REST API", icon: "\uD83C\uDF10" },
      { name: "CSS Grid", icon: "\uD83D\uDDC2\uFE0F" },
      { name: "LocalStorage", icon: "\uD83D\uDDC3\uFE0F" },
      { name: "Fetch API", icon: "\uD83D\uDCE1" },
    ],
    previewDescription:
      "The dashboard presents a command-center style layout with live-updating charts, sortable data tables, and customizable widget panels. Each chart features hover tooltips, zoom controls, and export-to-PNG functionality.",
  },
  {
    slug: "terminal-rpg-game",
    icon: "\uD83C\uDFAE",
    accentClass: "p3",
    accentColor: "#7c3aed",
    tags: ["C", "Terminal", "Algorithms"],
    title: "Terminal RPG Game",
    description:
      "A text-based adventure game written in pure C. Features dynamic story branching, inventory management, and procedural dungeon generation.",
    tech: "C \u00b7 GCC \u00b7 ncurses",
    demoUrl: "#",
    githubUrl: "#",
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
    demoUrl: "#",
    githubUrl: "#",
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
    demoUrl: "#",
    githubUrl: "#",
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
  },
  {
    slug: "3d-portfolio-site",
    icon: "\uD83C\uDF10",
    accentClass: "p6",
    accentColor: "#00d4ff",
    tags: ["Three.js", "WebGL", "HTML"],
    title: "3D Portfolio Site",
    description:
      "This very website \u2014 built from scratch with Three.js particle systems, WebGL shaders, scroll animations, and a custom dark futuristic UI.",
    tech: "Three.js \u00b7 GLSL \u00b7 CSS",
    demoUrl: "#",
    githubUrl: "#",
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
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
