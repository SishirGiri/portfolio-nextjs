import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Live Data Dashboard — Live Demo",
  description: "Real-time analytics dashboard with live SVG charts, KPI cards, and filterable datasets.",
};

export default function DashboardDemo() {
  return <DemoFrame src="/demos/dashboard/index.html" title="Live Data Dashboard" />;
}
