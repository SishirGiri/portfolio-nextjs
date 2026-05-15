export interface Skill {
  name: string;
  pct: number;
}

export interface HexBadge {
  icon: string;
  label: string;
  className: string;
}

export const skills: Skill[] = [
  { name: "HTML & CSS", pct: 60 },
  { name: "JavaScript", pct: 50 },
  { name: "C Programming", pct: 40 },
  { name: "Python", pct: 40 },
  { name: "AI / Machine Learning", pct: 30 },
  { name: "Linux (Advanced)", pct: 60 },
  { name: "Windows (Advanced)", pct: 50 },
  { name: "Video Editing (CapCut)", pct: 65 },
];

export const hexBadges: HexBadge[] = [
  { icon: "C", label: "C Lang", className: "hb-c" },
  { icon: "JS", label: "JavaScript", className: "hb-js" },
  { icon: "</>", label: "HTML", className: "hb-html" },
  { icon: "#", label: "CSS", className: "hb-css" },
  { icon: "Py", label: "Python", className: "hb-py" },
  { icon: "\uD83E\uDD16", label: "AI / ML", className: "hb-ai" },
  { icon: "\uD83D\uDC27", label: "Linux", className: "hb-linux" },
  { icon: "\uD83D\uDD27", label: "Windows", className: "hb-win" },
  { icon: "\uD83C\uDFAC", label: "CapCut", className: "hb-capcut" },
];
