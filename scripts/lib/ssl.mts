/**
 * pg trata sslmode=require como verify-full y avisa que en su próxima versión mayor
 * pasará a la semántica de libpq (más débil). Dejamos verify-full explícito:
 * Neon usa certificados públicos, así que la verificación completa funciona.
 */
export function withVerifyFullSsl(connectionString: string): string {
  const url = new URL(connectionString);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return connectionString;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
