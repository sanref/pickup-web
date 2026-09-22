import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { parseEwkbPoint } from "@/server/db/custom-types";
import { venues } from "@/server/db/generated/schema";

describe("parseEwkbPoint", () => {
  it("decodifica un POINT EWKB little-endian con SRID", () => {
    const buf = Buffer.alloc(25);
    buf.writeUInt8(1, 0);
    buf.writeUInt32LE(0x20000001, 1);
    buf.writeUInt32LE(4326, 5);
    buf.writeDoubleLE(-60.656, 9);
    buf.writeDoubleLE(-32.9383, 17);
    expect(parseEwkbPoint(buf.toString("hex"))).toEqual({ lng: -60.656, lat: -32.9383 });
  });

  it("decodifica un POINT WKB big-endian sin SRID", () => {
    const buf = Buffer.alloc(21);
    buf.writeUInt8(0, 0);
    buf.writeUInt32BE(1, 1);
    buf.writeDoubleBE(1.5, 5);
    buf.writeDoubleBE(-2.25, 13);
    expect(parseEwkbPoint(buf.toString("hex"))).toEqual({ lng: 1.5, lat: -2.25 });
  });

  it("rechaza geometrías que no son puntos", () => {
    const buf = Buffer.alloc(9);
    buf.writeUInt8(1, 0);
    buf.writeUInt32LE(2, 1);
    expect(() => parseEwkbPoint(buf.toString("hex"))).toThrow();
  });
});

// Ida y vuelta real contra Postgres. Corre solo si hay TEST_DATABASE_URL
// (una base creada con `npm run db:rebuild -- --confirm --dev`).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("geographyPoint contra Postgres", () => {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle({ client: pool });
  afterAll(() => pool.end());

  it("lee la ubicación de una sede como { lng, lat }", async () => {
    const [row] = await db
      .select({ location: venues.location })
      .from(venues)
      .where(eq(venues.id, "00000000-0000-4000-a000-000000000001"));
    expect(row.location.lng).toBeCloseTo(-60.656, 6);
    expect(row.location.lat).toBeCloseTo(-32.9383, 6);
  });

  it("escribe { lng, lat } y PostGIS lo interpreta bien", async () => {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(venues)
        .values({
          name: "Sede de prueba",
          address: "Test",
          city: "Rosario",
          location: { lng: -60.6393, lat: -32.9468 },
        })
        .returning({ id: venues.id, location: venues.location });
      expect(inserted.location).toEqual({ lng: -60.6393, lat: -32.9468 });

      const [check] = await tx.execute<{ x: number; y: number }>(
        sql`select st_x(location::geometry) as x, st_y(location::geometry) as y from venues where id = ${inserted.id}`,
      ).then((r) => r.rows);
      expect(check).toEqual({ x: -60.6393, y: -32.9468 });

      tx.rollback();
    }).catch((err: unknown) => {
      // tx.rollback() corta la transacción con un error esperado.
      if (!(err instanceof Error) || !/rollback/i.test(err.message)) throw err;
    });
  });
});
