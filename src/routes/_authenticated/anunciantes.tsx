import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, Field, PageHeader, StatusBadge, inputCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { advertisers } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/anunciantes')({
  head: () => seo("Anunciantes", "Cadastro de anunciantes e suas mídias associadas."),
  component: Page,
});

function Page() {
  const [list, setList] = useState(advertisers);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Anunciantes" description="Empresas que veiculam campanhas na rede."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus /> Novo anunciante</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo anunciante</DialogTitle></DialogHeader>
              <form className="grid gap-4" onSubmit={(e) => {
                e.preventDefault(); const f = new FormData(e.currentTarget);
                setList([{ name: String(f.get("name")), segment: String(f.get("segment")), contact: String(f.get("contact")), campaigns: 0, media: 0, status: "Ativo" }, ...list]);
                setOpen(false); toast.success("Anunciante cadastrado");
              }}>
                <Field label="Razão social / nome"><input name="name" required className={inputCls} /></Field>
                <Field label="Segmento"><input name="segment" className={inputCls} placeholder="Ex.: Varejo" /></Field>
                <Field label="Contato"><input name="contact" className={inputCls} /></Field>
                <Field label="E-mail"><input type="email" className={inputCls} /></Field>
                <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <DataTable head={["Anunciante", "Segmento", "Contato", "Campanhas", "Mídias", "Status"]}>
        {list.map((a) => (
          <tr key={a.name}><td className="font-medium">{a.name}</td><td>{a.segment}</td><td>{a.contact}</td><td>{a.campaigns}</td><td>{a.media}</td><td><StatusBadge status={a.status} /></td></tr>
        ))}
      </DataTable>
    </>
  );
}
