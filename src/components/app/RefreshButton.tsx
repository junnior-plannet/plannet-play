import { useRef, useState } from "react";
import { onlineManager, useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Refetch existing page queries, including cached related lists, without a reload. */
export function RefreshButton({ queryKeys }: { queryKeys: readonly string[] }) {
  const qc = useQueryClient();
  const fetching = useIsFetching({ predicate: (query) => queryKeys.includes(String(query.queryKey[0])) });
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = pending || fetching > 0;
  const refresh = async () => {
    if (locked.current || fetching > 0) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      if (!onlineManager.isOnline()) {
        const message = "Sem conexão. Conecte-se à internet e tente atualizar novamente.";
        setError(message);
        toast.error(message);
        return;
      }
      // Wait for every request, even if one fails; never unlock midway through a refresh.
      const results = await Promise.allSettled(queryKeys.map((key) => qc.refetchQueries(
        { queryKey: [key], exact: true, type: "all" },
        { cancelRefetch: false, throwOnError: true },
      )));
      if (results.some((result) => result.status === "rejected")) {
        const message = "Não foi possível atualizar todos os dados. Confira sua conexão e tente novamente.";
        setError(message);
        toast.error(message);
      }
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return <div className="flex flex-col items-start gap-2">
    <Button type="button" variant="outline" disabled={busy} aria-busy={busy} onClick={() => void refresh()}>
      <RefreshCw aria-hidden="true" className={busy ? "animate-spin" : ""} />{busy ? "Atualizando…" : "Atualizar"}
    </Button>
    {error && <p role="alert" className="max-w-sm text-xs text-destructive">{error}</p>}
  </div>;
}
