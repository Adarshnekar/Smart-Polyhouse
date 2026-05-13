import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Greenhouse Control · Smart Light & Climate Dashboard" },
      { name: "description", content: "Live greenhouse dashboard with intelligent LED, mist, DLI, and climate control decisions." },
    ],
  }),
});

function Index() {
  return (
    <>
      <Dashboard />
      <Toaster position="top-right" theme="dark" />
    </>
  );
}
