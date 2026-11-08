import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

// Validación de los JWT que emite Neon Auth (plugin JWT de Better Auth), para la app mobile:
// la app inicia sesión contra Neon Auth, pide el token (GET {NEON_AUTH_BASE_URL}/token) y lo manda
// como `Authorization: Bearer <jwt>`. Acá se verifica la firma con el JWKS público de la rama.
// Sin "server-only" para poder testearlo con un JWKS local.

export type TokenVerifier = (token: string) => Promise<string | null>;

export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

// Devuelve el id del usuario (`sub`) si el token es válido, o null.
// La firma ya ata el token a esta instancia de Neon Auth (cada rama tiene sus claves); además se
// exige que el emisor, si viene, sea el mismo host que NEON_AUTH_BASE_URL.
export function createTokenVerifier({ jwks, issuerOrigin }: { jwks: JWTVerifyGetKey; issuerOrigin: string }): TokenVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, jwks, { requiredClaims: ["sub", "exp"], clockTolerance: 30 });
      if (payload.iss && originOf(payload.iss) !== issuerOrigin) return null;
      return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
    } catch {
      return null;
    }
  };
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

let neonVerifier: TokenVerifier | undefined;

// Verificador contra el JWKS de NEON_AUTH_BASE_URL (jose cachea las claves y las refresca si rotan).
export function neonTokenVerifier(): TokenVerifier {
  if (!neonVerifier) {
    const base = process.env.NEON_AUTH_BASE_URL;
    if (!base) throw new Error("Falta NEON_AUTH_BASE_URL en .env.local");
    const root = base.endsWith("/") ? base : `${base}/`;
    neonVerifier = createTokenVerifier({
      jwks: createRemoteJWKSet(new URL(".well-known/jwks.json", root)),
      issuerOrigin: new URL(root).origin,
    });
  }
  return neonVerifier;
}
