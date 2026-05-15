export interface Project {
  icon: string;
  accentClass: string;
  tags: string[];
  title: string;
  description: string;
  tech: string;
  demoUrl: string;
  githubUrl: string;
}

export const projects: Project[] = [
  {
    icon: "\uD83E\uDD16",
    accentClass: "p1",
    tags: ["Python", "NLP", "AI"],
    title: "AI Chatbot",
    description:
      "A rule-based intelligent chatbot using Python and pattern-matching NLP. Answers FAQs with contextual responses and learns from conversation history.",
    tech: "Python \u00b7 NLTK \u00b7 JSON",
    demoUrl: "#",
    githubUrl: "#",
  },
  {
    icon: "\uD83D\uDCCA",
    accentClass: "p2",
    tags: ["JavaScript", "SVG", "API"],
    title: "Live Data Dashboard",
    description:
      "Interactive analytics dashboard built with vanilla JS. Features real-time SVG charts, filterable datasets, and a responsive dark-mode UI.",
    tech: "JS \u00b7 SVG \u00b7 REST API",
    demoUrl: "#",
    githubUrl: "#",
  },
  {
    icon: "\uD83C\uDFAE",
    accentClass: "p3",
    tags: ["C", "Terminal", "Algorithms"],
    title: "Terminal RPG Game",
    description:
      "A text-based adventure game written in pure C. Features dynamic story branching, inventory management, and procedural dungeon generation.",
    tech: "C \u00b7 GCC \u00b7 ncurses",
    demoUrl: "#",
    githubUrl: "#",
  },
  {
    icon: "\uD83E\uDDE0",
    accentClass: "p4",
    tags: ["Python", "ML", "TensorFlow"],
    title: "Digit Classifier",
    description:
      "Neural network trained on MNIST that classifies handwritten digits. Includes a canvas for real-time drawing and instant predictions.",
    tech: "Python \u00b7 TensorFlow \u00b7 Canvas",
    demoUrl: "#",
    githubUrl: "#",
  },
  {
    icon: "\uD83D\uDCDD",
    accentClass: "p5",
    tags: ["JavaScript", "LocalStorage", "CSS"],
    title: "Smart Task Manager",
    description:
      "Drag-and-drop task app with priority tagging, deadline tracking, and persistent local storage. Zero dependencies, pure web APIs.",
    tech: "JS \u00b7 CSS Grid \u00b7 Web APIs",
    demoUrl: "#",
    githubUrl: "#",
  },
  {
    icon: "\uD83C\uDF10",
    accentClass: "p6",
    tags: ["Three.js", "WebGL", "HTML"],
    title: "3D Portfolio Site",
    description:
      "This very website \u2014 built from scratch with Three.js particle systems, WebGL shaders, scroll animations, and a custom dark futuristic UI.",
    tech: "Three.js \u00b7 GLSL \u00b7 CSS",
    demoUrl: "#",
    githubUrl: "#",
  },
];
