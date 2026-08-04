import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  Braces,
  FileCode,
  Boxes,
  Brain,
  Cpu,
  Sparkles,
  Bot,
  Wand2,
  Terminal,
  MonitorSmartphone,
  GitBranch,
  GitMerge,
  SquareCode,
  Clapperboard,
  PenTool,
  Search,
  FileSearch,
  KeyRound,
  LineChart,
  BarChart3,
  LayoutTemplate,
  Gauge,
  PenLine,
  Link2,
  ClipboardCheck,
  Network,
  Cloud,
  Atom,
  Layers,
  Rocket,
} from 'lucide-react';

export type Accent =
  | 'cyan'
  | 'violet'
  | 'pink'
  | 'green'
  | 'amber'
  | 'blue'
  | 'orange';

/** A skill shown as a premium card with an animated progress bar. */
export interface Skill {
  name: string;
  desc: string;
  pct: number;
  level: string;
  icon: LucideIcon;
  accent: Accent;
}

/** A tool/platform shown as an icon card (no progress bar). */
export interface Tool {
  name: string;
  desc: string;
  icon: LucideIcon;
  accent: Accent;
}

/* ══════════════════════════════════════
   §2 — Programming
══════════════════════════════════════ */
export const programming: Skill[] = [
  {
    name: 'HTML5',
    desc: 'Semantic markup and accessible page structure.',
    pct: 60,
    level: 'Intermediate',
    icon: Code2,
    accent: 'orange',
  },
  {
    name: 'CSS3',
    desc: 'Responsive layouts, flex/grid, and animations.',
    pct: 60,
    level: 'Intermediate',
    icon: Braces,
    accent: 'blue',
  },
  {
    name: 'JavaScript',
    desc: 'Interactive UIs and dynamic web applications.',
    pct: 50,
    level: 'Intermediate',
    icon: SquareCode,
    accent: 'amber',
  },
  {
    name: 'C Programming',
    desc: 'Algorithms, memory, and problem-solving fundamentals.',
    pct: 40,
    level: 'Learning',
    icon: FileCode,
    accent: 'blue',
  },
  {
    name: 'Python',
    desc: 'Scripting, automation, and backend development.',
    pct: 40,
    level: 'Learning',
    icon: Boxes,
    accent: 'green',
  },
];

/* ══════════════════════════════════════
   §3 — SEO
══════════════════════════════════════ */
export const seo: Skill[] = [
  {
    name: 'Technical SEO',
    desc: 'Crawlability, indexing, and site architecture.',
    pct: 55,
    level: 'Learning',
    icon: Search,
    accent: 'cyan',
  },
  {
    name: 'On-Page SEO',
    desc: 'Metadata, headings, and keyword optimization.',
    pct: 60,
    level: 'Learning',
    icon: FileSearch,
    accent: 'green',
  },
  {
    name: 'Keyword Research',
    desc: 'Search intent and opportunity discovery.',
    pct: 50,
    level: 'Learning',
    icon: KeyRound,
    accent: 'cyan',
  },
  {
    name: 'Google Search Console',
    desc: 'Indexing status and search performance.',
    pct: 55,
    level: 'Learning',
    icon: LineChart,
    accent: 'amber',
  },
  {
    name: 'Google Analytics',
    desc: 'Traffic sources and user behavior analysis.',
    pct: 45,
    level: 'Learning',
    icon: BarChart3,
    accent: 'amber',
  },
  {
    name: 'Schema Markup',
    desc: 'Structured data for rich search results.',
    pct: 40,
    level: 'Learning',
    icon: LayoutTemplate,
    accent: 'violet',
  },
  {
    name: 'Core Web Vitals',
    desc: 'Loading, interactivity, and visual stability.',
    pct: 50,
    level: 'Learning',
    icon: Gauge,
    accent: 'cyan',
  },
  {
    name: 'Content Optimization',
    desc: 'SEO-friendly, readable, targeted content.',
    pct: 50,
    level: 'Learning',
    icon: PenLine,
    accent: 'pink',
  },
  {
    name: 'Internal Linking',
    desc: 'Site structure and link equity flow.',
    pct: 50,
    level: 'Learning',
    icon: Link2,
    accent: 'blue',
  },
  {
    name: 'Website Audit',
    desc: 'Technical and content gap analysis.',
    pct: 45,
    level: 'Learning',
    icon: ClipboardCheck,
    accent: 'violet',
  },
];

/* ══════════════════════════════════════
   §4 — AI & Machine Learning
══════════════════════════════════════ */
export const ai: Skill[] = [
  {
    name: 'AI',
    desc: 'Exploring AI concepts and applications.',
    pct: 30,
    level: 'Exploring',
    icon: Brain,
    accent: 'pink',
  },
  {
    name: 'Machine Learning',
    desc: 'Learning ML models and fundamentals.',
    pct: 30,
    level: 'Exploring',
    icon: Cpu,
    accent: 'violet',
  },
  {
    name: 'Prompt Engineering',
    desc: 'Crafting effective prompts for AI tools.',
    pct: 45,
    level: 'Learning',
    icon: Wand2,
    accent: 'green',
  },
  {
    name: 'Automation',
    desc: 'Scripting and AI-assisted workflows.',
    pct: 40,
    level: 'Learning',
    icon: Bot,
    accent: 'amber',
  },
];

/* ══════════════════════════════════════
   §5 — Tools & Platforms
══════════════════════════════════════ */
export const tools: Tool[] = [
  { name: 'Linux', desc: 'Terminal & server environment', icon: Terminal, accent: 'cyan' },
  { name: 'Windows', desc: 'Daily development OS', icon: MonitorSmartphone, accent: 'blue' },
  { name: 'Git', desc: 'Version control', icon: GitBranch, accent: 'orange' },
  { name: 'GitHub', desc: 'Collaboration & hosting', icon: GitMerge, accent: 'violet' },
  { name: 'VS Code', desc: 'Primary code editor', icon: SquareCode, accent: 'blue' },
  { name: 'CapCut', desc: 'Short-form video editing', icon: Clapperboard, accent: 'pink' },
  { name: 'Figma', desc: 'UI design & prototyping', icon: PenTool, accent: 'violet' },
];

/* ══════════════════════════════════════
   §6 — Currently Learning (progress circles)
══════════════════════════════════════ */
export interface Learning {
  name: string;
  pct: number;
  icon: LucideIcon;
  accent: Accent;
}

export const learning: Learning[] = [
  { name: 'React', pct: 55, icon: Atom, accent: 'cyan' },
  { name: 'Next.js', pct: 40, icon: Layers, accent: 'violet' },
  { name: 'Node.js', pct: 35, icon: Network, accent: 'green' },
  { name: 'Advanced Python', pct: 35, icon: Boxes, accent: 'amber' },
  { name: 'Machine Learning', pct: 25, icon: Brain, accent: 'pink' },
  { name: 'Cloud Computing', pct: 20, icon: Cloud, accent: 'cyan' },
  { name: 'Advanced Technical SEO', pct: 40, icon: Search, accent: 'green' },
];

/* ══════════════════════════════════════
   §7 — Workflow
══════════════════════════════════════ */
export interface WorkflowStep {
  label: string;
  icon: LucideIcon;
}

export const workflow: WorkflowStep[] = [
  { label: 'Research', icon: Search },
  { label: 'Planning', icon: PenTool },
  { label: 'Development', icon: Code2 },
  { label: 'SEO Optimization', icon: Gauge },
  { label: 'Testing', icon: ClipboardCheck },
  { label: 'Deployment', icon: Rocket },
  { label: 'Maintenance', icon: Sparkles },
];

