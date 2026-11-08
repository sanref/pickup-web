import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { bearerToken, createTokenVerifier, type TokenVerifier } from "@/server/auth/bearer";

const ISSUER = "https://ep-test.neonauth.us-east-2.aws.neon.tech";
const USER_ID = "7d6a1c2e-4b1f-4a51-9a54-0c7c6d3c9b11";

describe("bearerToken", () => {
  it("extrae el token del header", () => {
    expect(bearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(bearerToken("bearer abc")).toBe("abc");
  });
  it("rechaza otros esquemas y headers vacíos", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
  });
});

describe("createTokenVerifier", () => {
  let verify: TokenVerifier;
  let sign: (claims: Record<string, unknown>, opts?: { exp?: string; iss?: string | null; key?: CryptoKey }) => Promise<string>;
  let otherKey: CryptoKey;

  beforeAll(async () => {
    // Mismo algoritmo que publica Neon Auth (EdDSA / Ed25519).
    const { publicKey, privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" });
    otherKey = (await generateKeyPair("EdDSA", { crv: "Ed25519" })).privateKey;
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "k1", alg: "EdDSA" };
    verify = createTokenVerifier({ jwks: createLocalJWKSet({ keys: [jwk] }), issuerOrigin: new URL(ISSUER).origin });
    sign = async (claims, { exp = "15m", iss = `${ISSUER}/neondb/auth`, key = privateKey } = {}) => {
      const jwt = new SignJWT(claims).setProtectedHeader({ alg: "EdDSA", kid: "k1" }).setIssuedAt().setExpirationTime(exp);
      if (iss) jwt.setIssuer(iss);
      return jwt.sign(key);
    };
  });

  it("acepta un token válido y devuelve el sub", async () => {
    expect(await verify(await sign({ sub: USER_ID, email: "a@b.c" }))).toBe(USER_ID);
  });

  it("acepta un token sin emisor", async () => {
    expect(await verify(await sign({ sub: USER_ID }, { iss: null }))).toBe(USER_ID);
  });

  it("rechaza un token vencido", async () => {
    expect(await verify(await sign({ sub: USER_ID }, { exp: "-5m" }))).toBeNull();
  });

  it("rechaza un token firmado con otra clave", async () => {
    expect(await verify(await sign({ sub: USER_ID }, { key: otherKey }))).toBeNull();
  });

  it("rechaza un emisor de otro host", async () => {
    expect(await verify(await sign({ sub: USER_ID }, { iss: "https://otro.example.com/auth" }))).toBeNull();
  });

  it("rechaza un token sin sub", async () => {
    expect(await verify(await sign({ email: "a@b.c" }))).toBeNull();
  });

  it("rechaza basura", async () => {
    expect(await verify("no.es.un-jwt")).toBeNull();
    expect(await verify("")).toBeNull();
  });
});
