import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { ClientStructureFields } from "@/components/app/ClientGuide";
import type { EstablishmentDraft } from "@/lib/client-form";
vi.mock("@/lib/api", () => ({ saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
afterEach(cleanup);
function mount(otherTvCount = 0) {
 function Form() { const [drafts, onChange] = useState<EstablishmentDraft[]>([{ id: "e", name: "Cliente", saved: false, tvs: [] }]); return <ClientStructureFields drafts={drafts} onChange={onChange} disabled={false} plan={{ name: "Plano", active: true, max_tvs: 3 }} otherTvCount={otherTvCount} />; }
 render(<Form />);
}
describe("Quantidade e nomes individuais", () => {
 it("inicia horizontal e permite selecionar vertical individualmente", () => { mount(); fireEvent.change(screen.getByLabelText("Quantidade de TVs"), { target: { value: "2" } }); expect(screen.getByLabelText("Orientação da TV 1")).toHaveProperty("value", "horizontal"); fireEvent.change(screen.getByLabelText("Orientação da TV 2"), { target: { value: "vertical" } }); expect(screen.getByLabelText("Orientação da TV 2")).toHaveProperty("value", "vertical"); expect(screen.getByLabelText("Orientação da TV 1")).toHaveProperty("value", "horizontal"); });
 it("selecionar 3 permite informar 3 nomes e zero remove todos os rascunhos", () => { mount(); const count = screen.getByLabelText("Quantidade de TVs"); fireEvent.change(count, { target: { value: "3" } }); fireEvent.change(screen.getByLabelText("Nome da TV 3"), { target: { value: "Caixa" } }); expect(screen.getByLabelText("Nome da TV 3")).toHaveProperty("value", "Caixa"); fireEvent.change(count, { target: { value: "0" } }); expect(screen.queryByLabelText("Nome da TV 1")).toBeNull(); });
 it("não adiciona TVs acima de 3 incluindo outros estabelecimentos", () => { mount(2); const count = screen.getByLabelText("Quantidade de TVs"); fireEvent.change(count, { target: { value: "2" } }); expect(count).toHaveProperty("value", "0"); fireEvent.change(count, { target: { value: "1" } }); expect(count).toHaveProperty("value", "1"); });
});
