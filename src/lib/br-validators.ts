/** Utilitários de máscara e validação para documentos e CEP brasileiros. */

export function onlyDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Máscara de CPF até 11 dígitos; a partir de 12 dígitos passa a formatar como CNPJ. */
export function maskDocument(value: string) {
  const d = onlyDigits(value);
  return d.length > 11 ? maskCnpj(d) : maskCpf(d);
}

export function maskCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function isValidCpf(value: string) {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digits = d.split("").map(Number) as number[];
  for (const [length, position] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i]! * (position - i);
    const rest = (sum * 10) % 11;
    const check = rest === 10 ? 0 : rest;
    if (check !== digits[length]) return false;
  }
  return true;
}

export function isValidCnpj(value: string) {
  const d = onlyDigits(value);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const digits = d.split("").map(Number) as number[];
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const length of [12, 13]) {
    const slice = weights.slice(weights.length - length);
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i]! * slice[i]!;
    const rest = sum % 11;
    const check = rest < 2 ? 0 : 11 - rest;
    if (check !== digits[length]) return false;
  }
  return true;
}

export function isValidCep(value: string) {
  return onlyDigits(value).length === 8;
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) conforme o tamanho informado. */
export function isValidDocument(value: string) {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

export function documentError(value: string) {
  const d = onlyDigits(value);
  if (!d) return "Informe o CPF ou CNPJ.";
  if (d.length < 11) return "CPF incompleto — informe 11 dígitos.";
  if (d.length === 11) return isValidCpf(d) ? null : "CPF inválido. Confira os números digitados.";
  if (d.length < 14) return "CNPJ incompleto — informe 14 dígitos.";
  return isValidCnpj(d) ? null : "CNPJ inválido. Confira os números digitados.";
}

export function cepError(value: string) {
  const d = onlyDigits(value);
  if (!d) return "Informe o CEP.";
  if (d.length !== 8) return "CEP deve ter 8 dígitos.";
  return null;
}

export type CepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

/** Consulta o ViaCEP. Retorna null quando o CEP não existe. */
export async function lookupCep(value: string): Promise<CepAddress | null> {
  const d = onlyDigits(value);
  if (d.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!res.ok) throw new Error("Não foi possível consultar o CEP agora.");
  const data = (await res.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return null;
  return {
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  };
}
