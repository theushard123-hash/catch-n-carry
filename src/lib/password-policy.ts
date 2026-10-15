export const MIN_PASSWORD_LENGTH = 8;

export function authErrorMessage(message: string, code?: string): string {
  const normalized = `${code ?? ""} ${message}`.toLowerCase();
  if (/weak_password|known to be weak|easy to guess|leaked|compromised/.test(normalized)) {
    return "Esta senha é conhecida por ser fraca e fácil de adivinhar. Por favor, escolha outra senha.";
  }
  if (normalized.includes("password should be at least")) {
    return "A senha não atende ao tamanho mínimo exigido. Use pelo menos 8 caracteres.";
  }
  if (normalized.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (normalized.includes("already registered")) return "Este e-mail já possui cadastro. Faça login.";
  return message;
}