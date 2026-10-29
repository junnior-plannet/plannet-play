import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logoAsset from "@/assets/plannet-play-logo.png.asset.json";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/app/ui";
import { seo } from "@/lib/seo";
import { Checkbox } from "@/components/ui/checkbox";
import { readRememberedEmail, rememberEmail } from "@/lib/remembered-email";

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
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = readRememberedEmail(window.localStorage);
    setEmail(saved);
    setRemember(Boolean(saved));
  }, []);

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
        rememberEmail(window.localStorage, email, remember);
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
    <div className="flex min-h-screen min-h-svh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 sm:p-8">
        <div className="mb-8 flex justify-center">
          <img src={logoAsset.url} alt="Plannet Play — Mídia Inteligente" width={1920} height={640} className="h-auto w-full max-w-72 object-contain" />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight">{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}</h1>
        {sent ? (
          <div className="mt-6 space-y-6">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">{sent}</p>
            <Button variant="outline" className="h-11 w-full" onClick={() => { setSent(""); setMode("login"); }}>Voltar ao login</Button>
          </div>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Nome">
                <input name="name" required className={`${inputCls} min-h-11`} autoComplete="name" />
              </Field>
            )}
            <Field label="E-mail">
              <input name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={`${inputCls} min-h-11`} autoComplete="email" />
            </Field>
            {mode !== "forgot" && (
              <Field label="Senha">
                <div className="relative">
                  <input name="password" type={showPassword ? "text" : "password"} required minLength={8} className={`${inputCls} min-h-11 pr-12`} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                  <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
                </div>
              </Field>
            )}
            {mode === "login" && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs">
                  <Checkbox checked={remember} onCheckedChange={v => { const enabled = v === true; setRemember(enabled); if (!enabled) rememberEmail(window.localStorage, "", false); }} />
                  Lembrar meu usuário
                </label>
                <Button type="button" variant="link" className="h-auto min-h-9 px-0 py-1 text-xs text-muted-foreground" onClick={() => { setMode("forgot"); setShowPassword(false); }}>Esqueci minha senha</Button>
              </div>
            )}
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}</Button>
          </form>
        )}
        {!sent && (
          <div className="mt-6 flex justify-center border-t pt-5 text-center">
            <Button variant="link" className="h-auto min-h-9 max-w-full whitespace-normal px-0 py-1 text-xs leading-relaxed" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setShowPassword(false); }}>{mode !== "login" ? "Já tenho conta" : "Ainda não tem uma conta? Cadastre-se."}</Button>
          </div>
        )}
        {mode === "signup" && !sent && <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">Novas contas entram como cliente. O acesso a clientes e TVs é liberado por um administrador Plannet.</p>}
      </div>
    </div>
  );
}
