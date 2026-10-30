import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RefreshDataButton({ refresh, fetching = false }: { refresh: () => Promise<unknown>; fetching?: boolean }) {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  async function update() {
    if (locked.current || fetching) return;
    locked.current = true; setPending(true);
    try { await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os dados."); }
    finally { locked.current = false; setPending(false); }
  }
  const busy = pending || fetching;
  return <Button variant="outline" disabled={busy} aria-busy={busy} onClick={() => void update()}><RefreshCw className={busy ? "animate-spin motion-reduce:animate-none" : ""} />{busy ? "Atualizando…" : "Atualizar"}</Button>;
}