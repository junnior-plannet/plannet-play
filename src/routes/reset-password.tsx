import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form className="grid w-full max-w-sm gap-4 rounded-xl border bg-card p-6" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password"));
        if (password !== String(f.get("confirm"))) { toast.error("As senhas não coincidem"); return; }
        setBusy(true);
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Senha atualizada");
        navigate({ to: "/", replace: true });
      }}>
        <h1 className="text-lg font-semibold">Nova senha</h1>
        <Field label="Nova senha"><input name="password" type="password" minLength={8} required className={inputCls} /></Field>
        <Field label="Confirmar senha"><input name="confirm" type="password" minLength={8} required className={inputCls} /></Field>
        <Button type="submit" disabled={busy}>Salvar nova senha</Button>
      </form>
    </div>
  );
}
