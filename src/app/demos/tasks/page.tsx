import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Smart Task Manager — Live Demo",
  description: "Drag-and-drop Kanban task manager with priorities, deadline tracking, and persistent local storage.",
};

export default function TasksDemo() {
  return <DemoFrame src="/demos/tasks/index.html" title="Smart Task Manager" />;
}
