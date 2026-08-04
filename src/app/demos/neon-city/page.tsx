import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Neon City — Open World",
  description:
    "An original open-world browser action game combining driving, exploration, missions, racing, fictional weapons, enemy AI, and a dynamic neon city.",
};

export default function NeonCityDemo() {
  return <DemoFrame src="/demos/neon-city/index.html" title="Neon City" />;
}
