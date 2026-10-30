import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { canEditReserve, clampReserve, clientsQuery, devicesQuery, establishmentsQuery, plansQuery, saveClient, saveDevice, saveEstablishment, type ClientRow, type RecordStatus } from "@/lib/api";
import { hasStructureChanges, makeEstablishmentDrafts, persistClientForm, type EstablishmentDraft, type ClientFormInput } from "@/lib/client-form";
import { ClientStructureFields } from "@/components/app/ClientGuide";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Field, inputCls, selectCls } from "@/components/app/ui";

type Props = { client: ClientRow | null; isAdmin: boolean; onClose: () => void; children?: ReactNode };

export function ClientForm({ client, isAdmin, onClose, children }: Props) {
  const qc = useQueryClient();
  const plans = useQuery(plansQuery);
  const ests = useQuery({ ...establishmentsQuery, enabled: !!client, refetchOnMount: "always" });
  const devices = useQuery({ ...devicesQuery, enabled: !!client, refetchOnMount: "always" });
  const [reserve, setReserve] = useState(client?.plannet_reserved_percent ?? 20);
  const [name, setName] = useState(client?.name ?? "");
  const [planId, setPlanId] = useState(client?.plan_id ?? "");
  const [drafts, setDrafts] = useState<EstablishmentDraft[]>([]);
  const [ready, setReady] = useState(!client);
  const [partial, setPartial] = useState(false);
  const [confirmation, setConfirmation] = useState<ClientFormInput | null>(null);
  const original = useRef<EstablishmentDraft[]>([]);
  const creationId = useRef<string | null>(client?.id ?? null);
  const submitting = useRef(false);
  const attemptedWrite = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const structureError = !!client && (ests.isError || devices.isError);
  const structureAvailable = ready && !structureError;
  useEffect(() => {
    if (!client || ready || ests.isFetching || devices.isFetching || !ests.data || !devices.data || structureError) return;
    const loaded = makeEstablishmentDrafts(client.id, ests.data, devices.data);
    original.current = loaded;
    setDrafts(loaded);
    setReady(true);
  }, [client, ready, ests.data, devices.data, ests.isFetching, devices.isFetching, structureError]);
  const refresh = () => {
    for (const key of ["clients", "establishments", "devices"]) void qc.invalidateQueries({ queryKey: [key] });
  };
  const save = useMutation({
    retry: false,
    mutationFn: (input: ClientFormInput) => persistClientForm(input, {
      load: async () => {
        const [clients, establishments, devices, plans] = await Promise.all([
          qc.fetchQuery({ ...clientsQuery, staleTime: 0 }), qc.fetchQuery({ ...establishmentsQuery, staleTime: 0 }),
          qc.fetchQuery({ ...devicesQuery, staleTime: 0 }), qc.fetchQuery({ ...plansQuery, staleTime: 0 }),
        ]);
        return { clients, establishments, devices, plans };
      },
      saveClient: (...args) => { attemptedWrite.current = true; return saveClient(...args); },
      saveEstablishment: async (...args) => {
        const row = await saveEstablishment(...args);
        setDrafts((current) => current.map((est) => est.id === row.id ? { ...est, saved: true } : est));
        return row;
      },
      saveDevice: async (...args) => {
        const row = await saveDevice(...args);
        setDrafts((current) => current.map((est) => ({ ...est, tvs: est.tvs.map((tv) => tv.id === row.id ? { ...tv, saved: true } : tv) })));
        return row;
      },
    }),
    onSuccess: (_, input) => { refresh(); toast.success(input.mode === "all" ? "Cliente, estabelecimentos e TVs salvos." : "Dados do cliente salvos. Complemente o cadastro pela lista de Clientes."); onClose(); },
    onError: (error) => {
      refresh();
      if (attemptedWrite.current) setPartial(true);
      toast.error(`${error.message}${attemptedWrite.current ? " O salvamento pode estar parcial. Tente salvar novamente para retomar sem duplicar, ou feche e confira a lista. Nenhum registro foi excluído." : " Nenhum dado foi gravado nesta tentativa."}`, { duration: 12000 });
    },
    onSettled: () => { submitting.current = false; },
  });
  const execute = (input: ClientFormInput) => {
    if (submitting.current) return;
    submitting.current = true;
    attemptedWrite.current = false;
    save.mutate(input);
  };
  const submit = (mode: "client" | "all") => {
    if (submitting.current || !formRef.current) return;
    if (!name.trim()) { toast.error("Informe o nome do cliente."); return; }
    const clientFields = formRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]");
    for (const field of clientFields) if (!field.reportValidity()) return;
    if (mode === "all" && !structureAvailable) { toast.error("Aguarde ou tente novamente a consulta dos vínculos antes de salvar tudo."); return; }
    const data = new FormData(formRef.current);
    const s = (key: string) => String(data.get(key) ?? "").trim() || null;
    if (!creationId.current) creationId.current = crypto.randomUUID();
    const input: ClientFormInput = {
      id: creationId.current, existing: !!client, mode, establishments: drafts,
      values: { name: name.trim(), document: s("document"), contact_name: s("contact_name"), contact_email: s("contact_email"), phone: s("phone"), city: s("city"), region: s("region"),
        ...(isAdmin ? { status: String(data.get("status")) as RecordStatus, plan_id: planId || null, plannet_reserved_percent: clampReserve(reserve) } : {}),
      },
    };
    if (mode === "client" && hasStructureChanges(drafts, original.current)) setConfirmation(input);
    else execute(input);
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl gap-0 overflow-y-auto rounded-xl p-0" onEscapeKeyDown={(e) => { if (submitting.current) e.preventDefault(); }} onPointerDownOutside={(e) => e.preventDefault()}>
      <DialogHeader className="border-b bg-card p-4 pr-10 text-left sm:p-6 sm:pr-12">
        <DialogTitle className="break-words">{client ? client.name : "Novo Cliente"}</DialogTitle>
        <DialogDescription>Um único formulário para cliente, estabelecimentos e TVs. Salve somente o cliente ou o cadastro completo e complemente depois em Editar cadastro.</DialogDescription>
      </DialogHeader>
      <form ref={formRef} noValidate className="min-w-0 space-y-6 p-4 sm:p-6 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full" onSubmit={(e) => { e.preventDefault(); submit("all"); }}>
        <fieldset disabled={save.isPending || !!confirmation} className="min-w-0 space-y-6 disabled:opacity-60">
          <section aria-labelledby="client-data-title" className="space-y-4">
            <h2 id="client-data-title" className="text-base font-semibold">Dados do cliente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do cliente"><input aria-label="Nome do cliente" required name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
              <Field label="CNPJ / CPF"><input name="document" defaultValue={client?.document ?? ""} className={inputCls} /></Field>
              <Field label="Responsável"><input name="contact_name" defaultValue={client?.contact_name ?? ""} className={inputCls} /></Field>
              <Field label="E-mail de contato"><input type="email" name="contact_email" defaultValue={client?.contact_email ?? ""} className={inputCls} /></Field>
              <Field label="Telefone"><input name="phone" defaultValue={client?.phone ?? ""} className={inputCls} /></Field>
              <Field label="Cidade"><input name="city" defaultValue={client?.city ?? ""} className={inputCls} /></Field>
              <Field label="Região"><input name="region" defaultValue={client?.region ?? ""} className={inputCls} /></Field>
            </div>
            <fieldset className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <legend className="px-2 text-sm font-semibold">Plano e espaço publicitário</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status"><select name="status" disabled={!isAdmin} defaultValue={client?.status ?? "ativo"} className={selectCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
                <Field label="Plano contratado"><select aria-label="Plano contratado" name="plan_id" disabled={!isAdmin} value={planId} onChange={(e) => setPlanId(e.target.value)} className={selectCls}><option value="">Sem plano</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}{!p.active ? " (inativo)" : ""}</option>)}</select></Field>
                <div className="sm:col-span-2"><Field label="Espaço Publicitário Plannet (%)"><input type="number" min={0} max={100} value={reserve} disabled={!canEditReserve(isAdmin)} onChange={(e) => setReserve(clampReserve(Number(e.target.value)))} className={inputCls} /></Field></div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{100 - reserve}% da programação para o cliente · {reserve}% reservado à Plannet{!isAdmin && " · plano, status e reserva definidos pela Plannet"}</p>
              {plans.isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando planos…</p>}
              {plans.isError && <p role="alert" className="mt-2 text-xs text-destructive">Não foi possível consultar os planos. <button type="button" className="underline" onClick={() => plans.refetch()}>Tentar novamente</button></p>}
            </fieldset>
          </section>
          {!structureAvailable && <div role={structureError ? "alert" : "status"} className="rounded-xl border p-4 text-sm">
            {structureError ? <>Não foi possível consultar estabelecimentos ou TVs. Nenhum vínculo foi descartado. <Button type="button" variant="outline" size="sm" onClick={() => { void ests.refetch(); void devices.refetch(); }}>Tentar novamente</Button></> : "Carregando estabelecimentos e TVs já salvos…"}
          </div>}
          <ClientStructureFields drafts={drafts} onChange={setDrafts} disabled={!structureAvailable} plan={plans.data?.find((p) => p.id === planId)} />
        </fieldset>
        {partial && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">O salvamento pode estar parcial. As gravações são feitas em sequência, sem desfazer o que já foi salvo. Use Salvar tudo novamente para retomar com os mesmos IDs ou confira a lista antes de iniciar outro cadastro.</p>}
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="ghost" disabled={save.isPending || !!confirmation} onClick={onClose}>Fechar sem salvar</Button>
            <Button type="button" variant="outline" disabled={save.isPending || !!confirmation} onClick={() => submit("client")}>Salvar somente cliente</Button>
            <Button type="submit" className="sm:ml-auto" disabled={save.isPending || !!confirmation || !structureAvailable}>{save.isPending ? "Salvando…" : "Salvar tudo"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Salvar somente cliente não grava alterações de estabelecimentos e TVs. Ao fechar, alterações não salvas serão descartadas. Você pode reabrir em Editar cadastro para complementar.</p>
        </div>
      </form>
      <fieldset disabled={save.isPending || !!confirmation} className="min-w-0">{children}</fieldset>
      <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Salvar apenas os dados do cliente?</AlertDialogTitle><AlertDialogDescription>Há dados novos ou alterados de estabelecimentos ou TVs. Esses dados não serão salvos e serão descartados ao concluir. Os registros já salvos permanecerão intactos. Para salvar as alterações, volte e escolha Salvar tudo.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar ao formulário</AlertDialogCancel><AlertDialogAction onClick={() => { if (confirmation) execute(confirmation); setConfirmation(null); }}>Confirmar: salvar somente cliente</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>;
}
