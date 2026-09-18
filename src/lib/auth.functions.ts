import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { digits, isValidCep, isValidCnpj, isValidCpf } from "@/lib/br-validation";

export const MIN_PASSWORD_LENGTH = 12;

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(MIN_PASSWORD_LENGTH, `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`).max(128),
  redirectTo: z.string().max(500).optional(),
  data: z.object({
    full_name: z.string().trim().min(1).max(120),
    company_name: z.string().trim().max(160).default(""),
    document: z.string().trim().min(1).max(32),
    phone: z.string().trim().min(1).max(32),
    customer_type: z.enum(["atacado", "varejo"]),
    state_registration: z.string().trim().max(32).default(""),
    zip: z.string().trim().max(12),
    address_number: z.string().trim().min(1, "Informe o número do endereço.").max(20),
    complement: z.string().trim().max(120).default(""),
  }),
});

/**
 * Server-side signup: enforces the password policy (and field validation) on the
 * backend so the rule cannot be bypassed by calling the client SDK directly.
 */
export const signUpCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.data.customer_type === "atacado" && !data.data.state_registration) {
      throw new Error("Informe a inscrição estadual para cadastro de atacado.");
    }

    if (!isValidCep(data.data.zip)) {
      throw new Error("Informe um CEP válido com 8 dígitos.");
    }

    const doc = digits(data.data.document);
    if (data.data.customer_type === "atacado" ? !isValidCnpj(doc) : !isValidCpf(doc)) {
      throw new Error(
        data.data.customer_type === "atacado" ? "CNPJ inválido." : "CPF inválido.",
      );
    }


    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const endpoint = new URL("/auth/v1/signup", url);
    if (data.redirectTo) endpoint.searchParams.set("redirect_to", data.redirectTo);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key },
      body: JSON.stringify({ email: data.email, password: data.password, data: data.data }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      msg?: string;
      error_description?: string;
      message?: string;
      access_token?: string;
      user?: { id?: string } | null;
    };

    if (!res.ok) {
      const msg = body.msg ?? body.error_description ?? body.message ?? "Não foi possível criar a conta.";
      throw new Error(msg);
    }

    return { needsEmailConfirmation: !body.access_token };
  });
