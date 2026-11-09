// Error con un mensaje apto para mostrarle al usuario. El resto de los errores se loguean y se muestra uno genérico.
export class UserError extends Error {}

/** SQLSTATE de un error de Postgres, aunque Drizzle lo haya envuelto (DrizzleQueryError.cause). */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_EXCLUSION_VIOLATION = "23P01";
