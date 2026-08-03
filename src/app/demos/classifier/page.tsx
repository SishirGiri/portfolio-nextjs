import type { Metadata } from "next";
import DemoFrame from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "Digit Classifier — Live Demo",
  description: "Neural network trained on MNIST in your browser (TensorFlow.js). Draw a digit and get a real-time prediction.",
};

export default function ClassifierDemo() {
  return <DemoFrame src="/demos/classifier/index.html" title="Digit Classifier" />;
}
