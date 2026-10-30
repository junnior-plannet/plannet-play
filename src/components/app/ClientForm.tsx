import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { canEditReserve, clampReserve, clientsQuery, devicesQuery, establishmentsQuery, plansQuery, saveClient, saveDevice, saveEstablishment, type ClientRow, type RecordStatus } from "@/lib/api";
import { defaultEstablishment, makeEstablishmentDrafts, persistClientForm, type EstablishmentDraft, type ClientFormInput } from "@/lib/client-form";
import { ClientStructureFields } from "@/components/app/ClientGuide";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { emptyAddress, lookupCep, readAddress, type ClientAddress } from "@/lib/client-address";
import { Field, inputCls, selectCls } from "@/components/app/ui";

type Props = { client: ClientRow | null; isAdmin: boolean; onClose: () => void; children?: ReactNode };

export function ClientForm({ client, isAdmin, onClose, children }: Props) {
  const qc = useQueryClient();
  const plans = useQuery(plansQuery);
  const ests = useQuery({ ...establishmentsQuery, enabled: !!client, refetchOnMount: "always" });
  const devices = useQuery({ ...devicesQuery, enabled: !!client, refetchOnMount: "always" });
  const [reserve, setReserve] = useState(client?.plannet_reserved_percent ?? 0);
  const [name, setName] = useState(client?.name ?? "");
  const [planId, setPlanId] = useState(client?.plan_id ?? "");
  const [drafts, setDrafts] = useState<EstablishmentDraft[]>([]);
  const [ready, setReady] = useState(false);
  const [otherTvCount, setOtherTvCount] = useState(0);
  const [address, setAddress] = useState<ClientAddress>({ ...emptyAddress, city: client?.city ?? "" });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const cepRequest = useRef<AbortController | null>(null);
  const [partial, setPartial] = useState(false);
  const creationId = useRef<string | null>(client?.id ?? null);
  const submitting = useRef(false);
  const attemptedWrite = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const structureError = !!client && (ests.isError || devices.isError);
  const structureAvailable = ready && !structureError;
  useEffect(() => {
    if (ready || structureError) return;
    if (client && (ests.isFetching || devices.isFetching || !ests.data || !devices.data)) return;
    if (!creationId.current) creationId.current = crypto.randomUUID();
    const selected = client ? defaultEstablishment(client.id, client.name, ests.data ?? []) : undefined;
    setAddress(readAddress(selected, client?.city ?? ""));
    const loaded = client ? makeEstablishmentDrafts(client.id, ests.data ?? [], devices.data ?? []) : [];
    const defaultDraft = loaded.find((e) => e.id === selected?.id);
    setDrafts([defaultDraft ?? { id: crypto.randomUUID(), name: client?.name ?? "", saved: false, tvs: [] }]);
    setOtherTvCount(loaded.filter((e) => e.id !== selected?.id).reduce((n, e) => n + e.tvs.length, 0));
    setReady(true);
  }, [client, ready, ests.data, devices.data, ests.isFetching, devices.isFetching, structureError]);
  useEffect(() => () => cepRequest.current?.abort(), []);
  const searchCep = async () => {
    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    const initial = { ...address };
    if (!initial.cep.trim()) { setCepError(""); return; }
    setCepLoading(true); setCepError("");
    try {
      const found = await lookupCep(initial.cep, controller.signal);
      if (controller.signal.aborted) return;
      setAddress((current) => {
        if (current.cep !== initial.cep) return current;
        const next = { ...current };
        for (const key of ["street", "district", "city", "state"] as const) if (found[key] && current[key] === initial[key]) next[key] = found[key];
        return next;
      });
    } catch (error) { if (!controller.signal.aborted) setCepError(error instanceof Error ? error.message : "Consulta indisponível. Preencha manualmente."); }
    finally { if (!controller.signal.aborted) setCepLoading(false); }
  };
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
    onSuccess: () => { refresh(); toast.success("Cadastro salvo."); onClose(); },
    onError: (error) => {
      refresh();
      if (attemptedWrite.current) setPartial(true);
      toast.error(`${error.message}${attemptedWrite.current ? " O salvamento pode estar parcial. Tente novamente para retomar sem duplicar os mesmos registros. Nenhum registro foi excluído." : " Nenhum dado foi gravado nesta tentativa."}`, { duration: 12000 });
    },
    onSettled: () => { submitting.current = false; },
  });
  const submit = () => {
    if (submitting.current || !formRef.current || !creationId.current) return;
    if (!formRef.current.reportValidity()) return;
    if (!structureAvailable) { toast.error("Aguarde a consulta dos vínculos antes de salvar."); return; }
    const data = new FormData(formRef.current);
    const s = (key: string) => String(data.get(key) ?? "").trim() || null;
    const input: ClientFormInput = {
      id: creationId.current, existing: !!client,
      address,
      establishments: drafts.map((est) => ({ ...est, name: est.saved ? est.name : name.trim() })),
      values: { name: name.trim(), contact_name: s("contact_name"), contact_email: s("contact_email"), phone: s("phone"), city: address.city.trim() || null,
        ...(isAdmin ? { status: String(data.get("status")) as RecordStatus, plan_id: planId || null, plannet_reserved_percent: clampReserve(reserve) } : {}),
      },
    };
    submitting.current = true;
    attemptedWrite.current = false;
    save.mutate(input);
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl gap-0 overflow-y-auto rounded-lg p-0" onEscapeKeyDown={(e) => { if (submitting.current) e.preventDefault(); }} onPointerDownOutside={(e) => e.preventDefault()}>
      <DialogHeader className="border-b bg-card p-4 pr-10 text-left sm:p-6 sm:pr-12">
        <DialogTitle className="break-words">{client ? "Editar cliente" : "Novo Cliente"}</DialogTitle>
        <DialogDescription>Dados de contato e plano contratado</DialogDescription>
      </DialogHeader>
      <form ref={formRef} className="min-w-0 space-y-4 p-4 sm:p-6 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <fieldset disabled={save.isPending} className="min-w-0 space-y-4 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do cliente"><input aria-label="Nome do cliente" required name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
            <Field label="Responsável"><input name="contact_name" defaultValue={client?.contact_name ?? ""} className={inputCls} /></Field>
            <Field label="E-mail"><input type="email" name="contact_email" defaultValue={client?.contact_email ?? ""} className={inputCls} /></Field>
            <Field label="Telefone/WhatsApp"><input name="phone" defaultValue={client?.phone ?? ""} className={inputCls} /></Field>
            <Field label="CEP"><input aria-label="CEP" autoComplete="postal-code" inputMode="numeric" maxLength={9} value={address.cep} onBlur={() => void searchCep()} onChange={(e) => { cepRequest.current?.abort(); setCepLoading(false); setCepError(""); setAddress({ ...address, cep: e.target.value }); }} className={inputCls} /></Field>
            <Field label="Logradouro"><input aria-label="Logradouro" autoComplete="address-line1" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className={inputCls} /></Field>
            <Field label="Número"><input aria-label="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} className={inputCls} /></Field>
            <Field label="Complemento (opcional)"><input aria-label="Complemento (opcional)" autoComplete="address-line2" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} className={inputCls} /></Field>
            <Field label="Bairro"><input aria-label="Bairro" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} className={inputCls} /></Field>
            <Field label="Cidade"><input aria-label="Cidade" autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={inputCls} /></Field>
            <Field label="Estado"><input aria-label="Estado" autoComplete="address-level1" maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} className={inputCls} /></Field>
            <Field label="Status"><select name="status" disabled={!isAdmin} defaultValue={client?.status ?? "ativo"} className={selectCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
            <Field label="Plano contratado"><select aria-label="Plano contratado" name="plan_id" disabled={!isAdmin} value={planId} onChange={(e) => { const id = e.target.value; setPlanId(id); const p = plans.data?.find((p) => p.id === id); if (p) setReserve(p.default_reserved_percent); }} className={selectCls}><option value="">Sem plano</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}{!p.active ? " (inativo)" : ""}</option>)}</select></Field>
            <Field label="Espaço Publicitário Plannet (%)"><input aria-label="Espaço Publicitário Plannet (%)" type="number" min={0} max={100} value={reserve} disabled={!canEditReserve(isAdmin)} onChange={(e) => setReserve(clampReserve(Number(e.target.value)))} className={inputCls} /></Field>
          </div>
          {cepLoading && <p role="status" className="text-xs text-muted-foreground">Consultando CEP…</p>}
          {cepError && <p role="alert" className="text-xs text-destructive">{cepError}</p>}
          {plans.isLoading && <p className="text-xs text-muted-foreground">Carregando planos…</p>}
          {plans.isError && <p role="alert" className="text-xs text-destructive">Não foi possível consultar os planos. <Button type="button" variant="outline" size="sm" onClick={() => plans.refetch()}>Tentar novamente</Button></p>}
          {!structureAvailable && <div role={structureError ? "alert" : "status"} className="text-sm">
            {structureError ? <>Não foi possível consultar os vínculos das TVs. <Button type="button" variant="outline" size="sm" onClick={() => { void ests.refetch(); void devices.refetch(); }}>Tentar novamente</Button></> : "Carregando TVs…"}
          </div>}
          <ClientStructureFields drafts={drafts} onChange={setDrafts} disabled={!structureAvailable} plan={plans.data?.find((p) => p.id === planId)} otherTvCount={otherTvCount} />
        </fieldset>
        {partial && <p role="alert" className="text-sm text-destructive">Parte do cadastro pode ter sido salva. Tente novamente ou confira a listagem antes de iniciar outro cadastro.</p>}
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending || !structureAvailable || plans.isLoading || plans.isError}>{save.isPending ? "Salvando…" : "Salvar cadastro"}</Button>
        </div>
      </form>
      <fieldset disabled={save.isPending} className="min-w-0">{children}</fieldset>
    </DialogContent>
  </Dialog>;
}
