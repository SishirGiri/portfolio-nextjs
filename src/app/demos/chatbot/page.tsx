import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "AI Chatbot — Live Demo",
  description: "Interactive rule-based chatbot demo with pattern-matching NLP and conversation memory.",
};

export default function ChatbotDemo() {
  return <DemoFrame src="/demos/chatbot/index.html" title="AI Chatbot" />;
}
