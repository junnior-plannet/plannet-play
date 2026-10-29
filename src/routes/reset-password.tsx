import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/app/ui";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => seo("Redefinir senha", "Defina uma nova senha para sua conta Plannet Control."),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<"checking" | "valid" | "invalid">("checking");
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecovery = hash.get("type") === "recovery";
    if (!isRecovery) { setRecovery("invalid"); return; }
    let alive = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (alive) setRecovery(data.user && !error ? "valid" : "invalid");
    });
    return () => { alive = false; };
  }, []);
  if (recovery !== "valid") return <div className="flex min-h-screen items-center justify-center bg-background p-4"><div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6"><h1 className="text-lg font-semibold">Redefinir senha</h1><p className="text-sm text-muted-foreground">{recovery === "checking" ? "Verificando link…" : "Link de recuperação inválido ou expirado. Solicite um novo link."}</p>{recovery === "invalid" && <Button onClick={() => navigate({ to: "/auth", replace: true })}>Voltar ao login</Button>}</div></div>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form className="grid w-full max-w-sm gap-4 rounded-xl border bg-card p-6" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password"));
        if (password !== String(f.get("confirm"))) { toast.error("As senhas não coincidem"); return; }
        setBusy(true);
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          toast.success("Senha atualizada");
          navigate({ to: "/", replace: true });
        } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha"); }
        finally { setBusy(false); }
      }}>
        <h1 className="text-lg font-semibold">Nova senha</h1>
        <Field label="Nova senha"><input name="password" type="password" minLength={8} required className={inputCls} /></Field>
        <Field label="Confirmar senha"><input name="confirm" type="password" minLength={8} required className={inputCls} /></Field>
        <Button type="submit" disabled={busy}>Salvar nova senha</Button>
      </form>
    </div>
  );
}
