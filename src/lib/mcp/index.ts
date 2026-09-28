import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import listPaymentConditions from "./tools/list-payment-conditions";
import listOrders from "./tools/list-orders";
import getOrder from "./tools/get-order";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "trapiche-loja-virtual",
  title: "Trapiche Loja Virtual",
  version: "0.1.0",
  instructions:
    "Portal de pedidos da Trapiche Pescados. Consulte produtos, condições de pagamento e pedidos do usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, listPaymentConditions, listOrders, getOrder],
});
