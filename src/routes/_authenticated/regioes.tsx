import { createFileRoute, Navigate } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

// Preserve existing links without maintaining a second, demonstrative management page.
export const Route = createFileRoute('/_authenticated/regioes')({
  head: () => seo("Mapa da Rede", "A gestão geográfica agora está no Mapa da Rede."),
  component: () => <Navigate to="/mapa" replace />,
});
