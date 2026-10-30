import { createFileRoute, redirect } from "@tanstack/react-router";

/** Establishments are managed internally through the client form; the old page now points to Devices. */
export const Route = createFileRoute("/_authenticated/estabelecimentos")({
  beforeLoad: () => { throw redirect({ to: "/telas" }); },
});
