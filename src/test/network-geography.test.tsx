import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NetworkGeography } from "@/components/app/NetworkGeography";
import type { DeviceRow, EstablishmentRow } from "@/lib/api";
import { makePlaces, type Geometry, type Municipality } from "@/lib/network-map";
import { emptyAddress, serializeAddress } from "@/lib/client-address";

vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: undefined, isPending: false, isFetching: false, error: null, isError: false }) }));
const geometry: Geometry = { type: "Polygon", coordinates: [[[-38, -12], [-36, -12], [-36, -10], [-38, -10], [-38, -12]]] };
const municipality: Municipality = { id: "2800308", name: "Aracaju", geometry };
const mesh = { municipalities: [municipality], outline: [geometry] };
const place = makePlaces([{ id: "e1", client_id: "c1", name: "Local teste", city: "Aracaju", address: serializeAddress({ ...emptyAddress, city: "Aracaju", state: "SE" }) }] as EstablishmentRow[], [], [{ id: "tv1", name: "TV teste", establishment_id: "e1", activation_status: "ativa" }] as DeviceRow[])[0]!;

function setup(city = false, located = false) {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: true, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
  const onMunicipality = vi.fn(), onPlace = vi.fn();
  const view = render(<NetworkGeography mesh={mesh} {...(city ? { municipality } : {})} places={[place]} positions={located ? { e1: { position: [-37, -11], label: "Endereço teste", fingerprint: place.fingerprint } } : {}} selectedId={null} onMunicipality={onMunicipality} onPlace={onPlace} />);
  return { ...view, onMunicipality, onPlace };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Mapa vetorial — navegação fixa e pins", () => {
  it("abre o município sem controles manuais de zoom", () => {
    const { onMunicipality, container } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Explorar Aracaju" }));
    expect(onMunicipality).toHaveBeenCalledWith("2800308");
    expect(screen.queryByRole("button", { name: /ampliar|reduzir|zoom/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".network-outline")).toHaveLength(2);
    const outline = container.querySelector(".network-outline")?.getAttribute("d");
    expect(container.querySelector(".network-outline-halo")?.getAttribute("d")).toBe(outline);
    expect(screen.getByText(/0 locais verificados/)).toBeInTheDocument();
  });
  it("permite voltar do município e não inventa ruas", () => {
    const { onMunicipality, container } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Voltar para Sergipe" }));
    expect(onMunicipality).toHaveBeenCalledWith("");
    expect(container.querySelectorAll(".network-road")).toHaveLength(0);
    expect(screen.getByText(/Sem vias principais disponíveis/)).toBeInTheDocument();
  });
  it("exibe apenas pin confirmado e abre os detalhes do local", () => {
    const { onPlace } = setup(false, true);
    const pin = screen.getByRole("button", { name: /Local teste, 1 TVs/ });
    fireEvent.focus(pin);
    expect(screen.getByRole("status")).toHaveTextContent("1 TVs cadastradas");
    fireEvent.click(pin);
    expect(onPlace).toHaveBeenCalledWith("e1");
    expect(screen.getByText(/1 locais verificados/)).toBeInTheDocument();
  });
});
