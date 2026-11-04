import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/authority")({
  beforeLoad: () => {
    throw redirect({ to: "/portal", search: { tab: "command" } });
  },
});
