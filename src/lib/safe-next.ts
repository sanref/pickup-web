// Solo rutas internas: evita redirecciones abiertas con ?next=https://… o //otro-dominio.
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export function withNext(path: string, next: string | null | undefined): string {
  if (!next || next === "/") return path;
  const url = new URL(path, "http://x");
  url.searchParams.set("next", next);
  return `${url.pathname}${url.search}`;
}
