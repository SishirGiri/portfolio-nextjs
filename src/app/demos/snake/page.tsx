import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Snake Neon — Live Demo",
  description: "A polished neon-arcade Snake game with power-ups, combos, levels, mobile controls, and a light/dark theme.",
};

export default function SnakeDemo() {
  return <DemoFrame src="/demos/snake/index.html" title="Snake Neon" />;
}
