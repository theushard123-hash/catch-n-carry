export type CatalogSort = "featured" | "bestsellers" | "price-asc" | "price-desc";

type FilterProduct = { id: string; name: string; sku: string | null; category_id: string | null; price_atacado: number; price_varejo: number; sort_order: number };

export function filterCatalog<T extends FilterProduct>(products: T[], options: {
  search: string; category: string; minPrice: string; maxPrice: string;
  sort: CatalogSort; customerType: "atacado" | "varejo"; ranks: Map<string, number>;
}) {
  const term = options.search.trim().toLocaleLowerCase("pt-BR");
  const parsePrice = (value: string) => value.trim() === "" ? undefined : Number(value.replace(",", "."));
  const minimum = parsePrice(options.minPrice);
  const maximum = parsePrice(options.maxPrice);
  const price = (product: T) => Number(options.customerType === "atacado" ? product.price_atacado : product.price_varejo);
  return products.filter((product) =>
    (options.category === "all" || product.category_id === options.category) &&
    (!term || product.name.toLocaleLowerCase("pt-BR").includes(term) || product.sku?.toLocaleLowerCase("pt-BR").includes(term)) &&
    (minimum === undefined || price(product) >= minimum) &&
    (maximum === undefined || price(product) <= maximum)
  ).sort((a, b) => {
    const fallback = a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR");
    if (options.sort === "price-asc") return price(a) - price(b) || fallback;
    if (options.sort === "price-desc") return price(b) - price(a) || fallback;
    if (options.sort === "bestsellers") return (options.ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (options.ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER) || fallback;
    return fallback;
  });
}