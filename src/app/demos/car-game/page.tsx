import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Neon Drive NYC — Open-World Driving Game",
  description:
    "A New York-inspired open-world driving game built with Three.js — drive a Lamborghini-style supercar through Manhattan, Times Square, Central Park, and Brooklyn with living traffic, police pursuits, missions, GPS navigation, and dynamic weather.",
};

export default function CarGameDemo() {
  return <DemoFrame src="/demos/car-game/index.html" title="Neon Drive NYC" />;
}
