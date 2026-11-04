import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/depot")({
  beforeLoad: () => {
    throw redirect({ to: "/portal", search: { tab: "ops" } });
  },
});
