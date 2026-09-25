export type ShippingRate = { city: string; neighborhood: string; fee: number | string; active?: boolean };

export const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Retorna o frete do bairro/cidade, ou null quando deve ser consultado com o vendedor. */
export function findShippingFee(rates: ShippingRate[], city: string, neighborhood: string): number | null {
  const c = norm(city);
  const n = norm(neighborhood);
  if (!c) return null;
  const inCity = rates.filter((r) => r.active !== false && norm(r.city) === c);
  const exact = inCity.find((r) => r.neighborhood && norm(r.neighborhood) === n);
  if (exact) return Number(exact.fee);
  const def = inCity.find((r) => !r.neighborhood.trim());
  return def ? Number(def.fee) : null;
}
