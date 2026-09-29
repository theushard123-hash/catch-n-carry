// Server-only Cigam ERP client. Credentials come from backend secrets and never reach the browser.
export type CigamResponse<T = unknown> = {
  success?: boolean;
  hash?: string;
  messages?: string[] | string;
  data?: T;
};

const DEFAULT_BASE = "https://trapicheportais.cigam.cloud";
let cached: { token: string; expires: number } | null = null;

function baseUrl() {
  return (process.env["CIGAM_BASE_URL"] || DEFAULT_BASE).replace(/\/+$/, "");
}

export function cigamConfigured() {
  return Boolean(
    process.env["CIGAM_API_TOKEN"] ||
      (process.env["CIGAM_USERNAME"] && process.env["CIGAM_PASSWORD"] && process.env["CIGAM_PORTAL"]),
  );
}

export function cigamMessage(r: CigamResponse | null | undefined, fallback: string) {
  const m = r?.messages;
  const txt = Array.isArray(m) ? m.filter(Boolean).join(" ") : m;
  return (txt && String(txt).slice(0, 500)) || fallback;
}

async function getToken(force = false): Promise<string> {
  const staticToken = process.env["CIGAM_API_TOKEN"];
  if (staticToken) return staticToken;
  if (!force && cached && cached.expires > Date.now()) return cached.token;

  const user = process.env["CIGAM_USERNAME"];
  const pass = process.env["CIGAM_PASSWORD"];
  const portal = process.env["CIGAM_PORTAL"];
  if (!user || !pass || !portal) throw new Error("Integração Cigam não configurada (credenciais ausentes).");

  const res = await fetch(`${baseUrl()}/api/genericos/ge/Login/Autenticar`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ NomeUsuario: user, Senha: pass, Portal: portal }),
  });
  const json = (await res.json().catch(() => null)) as CigamResponse | null;
  if (!res.ok || !json?.success || !json.hash) {
    console.error("[cigam] login failed", res.status, json?.messages);
    throw new Error(cigamMessage(json, "Falha ao autenticar no Cigam."));
  }
  cached = { token: json.hash, expires: Date.now() + 20 * 60 * 1000 };
  return json.hash;
}

export async function cigamRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; json: CigamResponse<T> | null; raw: unknown }> {
  const url = new URL(`${baseUrl()}/${path.replace(/^\/+/, "")}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const send = async (token: string) =>
    fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
      signal: AbortSignal.timeout(25000),
    });

  let res = await send(await getToken());
  if (res.status === 401 && !process.env["CIGAM_API_TOKEN"]) res = await send(await getToken(true));
  const raw = await res.json().catch(() => null);
  const json = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as CigamResponse<T>) : null;
  if (!res.ok) console.error("[cigam]", method, path, res.status, json?.messages);
  return { ok: res.ok && json?.success !== false, status: res.status, json, raw };
}

export async function cigamPing() {
  await getToken(true);
  return true;
}
