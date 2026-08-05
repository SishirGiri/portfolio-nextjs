import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Car Game — City Driving Simulator",
  description:
    "A 3D city driving simulator built with Three.js — arcade driving physics, traffic, parking challenges, missions, fuel and damage, day/night cycle, and full mobile controls.",
};

export default function CarGameDemo() {
  return <DemoFrame src="/demos/car-game/index.html" title="Car Game" />;
}
