import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/plannet-play-logo.png.asset.json";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/app/ui";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  head: () => seo("Entrar", "Acesse o Plannet Control com sua conta Plannet Play."),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") ?? "");
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: String(f.get("name")).trim() } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/", replace: true });
        else setSent("Enviamos um link de confirmação para " + email + ". Confirme para entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos" : msg);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src={logoAsset.url} alt="Plannet Play — Mídia Inteligente" width={1920} height={640} className="h-auto w-full max-w-80 object-contain" />
        </div>
        <h1 className="text-lg font-semibold">{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}</h1>
        {sent ? (
          <div className="mt-4 space-y-4"><p className="text-sm text-muted-foreground">{sent}</p><Button variant="outline" className="w-full" onClick={() => { setSent(""); setMode("login"); }}>Voltar ao login</Button></div>
        ) : (
          <form className="mt-4 grid gap-4" onSubmit={submit}>
            {mode === "signup" && <Field label="Nome"><input name="name" required className={inputCls} autoComplete="name" /></Field>}
            <Field label="E-mail"><input name="email" type="email" required className={inputCls} autoComplete="email" /></Field>
            {mode !== "forgot" && <Field label="Senha"><input name="password" type="password" required minLength={8} className={inputCls} autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>}
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}</Button>
          </form>
        )}
        {!sent && <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs">
          {mode !== "login" ? <button className="text-primary hover:underline" onClick={() => setMode("login")}>Já tenho conta</button> : <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Criar conta</button>}
          {mode === "login" && <button className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>Esqueci minha senha</button>}
        </div>}
        {mode === "signup" && !sent && <p className="mt-4 text-[11px] text-muted-foreground">Novas contas entram como cliente. O acesso a clientes e TVs é liberado por um administrador Plannet.</p>}
      </div>
    </div>
  );
}
