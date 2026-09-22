import { customType } from "drizzle-orm/pg-core";

export type LngLat = { lng: number; lat: number };

/**
 * Columna PostGIS geography(Point, 4326) expuesta como { lng, lat }.
 * - Escritura: EWKT ("SRID=4326;POINT(lng lat)"), que Postgres convierte a geography.
 * - Lectura: Postgres devuelve EWKB en hexadecimal; se decodifica acá.
 * drizzle-kit pull no reconoce el tipo: scripts/db-pull-postprocess.mts lo reemplaza por este.
 */
export const geographyPoint = customType<{ data: LngLat; driverData: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
  toDriver({ lng, lat }) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new Error("Coordenadas inválidas");
    }
    return `SRID=4326;POINT(${lng} ${lat})`;
  },
  fromDriver(value) {
    return parseEwkbPoint(value);
  },
});

const SRID_FLAG = 0x20000000;
const WKB_POINT = 1;

export function parseEwkbPoint(hex: string): LngLat {
  const buf = Buffer.from(hex, "hex");
  const littleEndian = buf.readUInt8(0) === 1;
  const readUInt32 = (offset: number) => (littleEndian ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset));
  const readDouble = (offset: number) => (littleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset));

  const type = readUInt32(1);
  if ((type & 0xff) !== WKB_POINT) throw new Error(`Se esperaba un POINT en EWKB (tipo ${type})`);
  const offset = type & SRID_FLAG ? 9 : 5;
  return { lng: readDouble(offset), lat: readDouble(offset + 8) };
}
