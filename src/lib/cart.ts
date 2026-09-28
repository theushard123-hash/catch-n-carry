import type { ItemSpec } from "@/components/WeightPickerDialog";

export type CartItem = { productId: string; qty: number };

export const CART_KEY = "trapiche-cart";
export const CART_SPECS_KEY = "trapiche-cart-specs";

export function readCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readCartSpecs(): Record<string, ItemSpec> {
  try {
    const value = JSON.parse(localStorage.getItem(CART_SPECS_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function writeCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("trapiche-cart-change", { detail: cart }));
}

export function writeCartSpecs(specs: Record<string, ItemSpec>) {
  localStorage.setItem(CART_SPECS_KEY, JSON.stringify(specs));
}
