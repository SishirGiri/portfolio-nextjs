import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Terminal RPG — Live Demo",
  description: "Text-based adventure game with branching story, turn-based combat, inventory, and procedural dungeons.",
};

export default function RpgDemo() {
  return <DemoFrame src="/demos/rpg/index.html" title="Terminal RPG" />;
}
