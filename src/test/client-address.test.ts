import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyAddress, lookupCep, readAddress, serializeAddress } from "@/lib/client-address";

afterEach(() => vi.unstubAllGlobals());
describe("Endereço sem migração", () => {
 it("preserva CEP, número, complemento, bairro, cidade e estado no texto existente", () => {
  const address = { cep: "49010-000", street: 'Rua "A"\nBloco B', number: "12", complement: "Sala 3", district: "Centro", city: "Aracaju", state: "SE" };
  expect(readAddress({ address: serializeAddress(address), district: "Centro", city: "Aracaju" })).toEqual(address);
 });
 it("preserva endereço legado sem inventar CEP ou coordenadas", () => {
  expect(readAddress({ address: "Rua antiga, 50", city: "Aracaju", district: "Centro" })).toEqual({ ...emptyAddress, street: "Rua antiga, 50", city: "Aracaju", district: "Centro" });
 });
 it("consulta CEP e retorna apenas campos disponíveis", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "Aracaju", uf: "SE" }) }); vi.stubGlobal("fetch", fetch);
  expect(await lookupCep("49010-000")).toEqual({ street: "Rua A", district: "Centro", city: "Aracaju", state: "SE" }); expect(fetch.mock.calls[0]?.[0]).toBe("https://viacep.com.br/ws/49010000/json/");
 });
 it("CEP inválido não faz consulta", async () => { const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); await expect(lookupCep("123")).rejects.toThrow("8 dígitos"); expect(fetch).not.toHaveBeenCalled(); });
 it("CEP não encontrado mantém edição manual possível", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })); await expect(lookupCep("49010000")).rejects.toThrow("manualmente"); });
});
