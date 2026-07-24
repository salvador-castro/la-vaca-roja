export type Zone = "pickup" | "zone_1_3" | "zone_3_5" | "zone_5_10";

/* Gascón 801, CABA (Almagro) */
export const STORE_ORIGIN = { lat: -34.6014881, lng: -58.4238165 };

type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(h));
}

type NominatimResult = {
  lat: string;
  lon: string;
  address?: { "ISO3166-2-lvl4"?: string };
};

type ZoneResult = { zone: "zone_1_3" | "zone_3_5" | "zone_5_10"; distance_km: number };
type ZoneError = { error: string };

export async function resolveZoneFromAddress(
  address: string
): Promise<ZoneResult | ZoneError> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "LaVacaRoja-Ecommerce/1.0" },
  });

  if (!res.ok) return { error: "No pudimos calcular el envío en este momento, probá de nuevo" };

  const results = (await res.json()) as NominatimResult[];
  const match = results[0];
  if (!match) return { error: "No pudimos ubicar tu dirección, revisala en tu perfil" };

  if (match.address?.["ISO3166-2-lvl4"] !== "AR-C") {
    return { error: "Por ahora solo hacemos envíos dentro de CABA" };
  }

  const distanceKm = haversineKm(STORE_ORIGIN, {
    lat: Number(match.lat),
    lng: Number(match.lon),
  });

  if (distanceKm > 10) {
    return { error: "Estás a más de 10km del local, todavía no llegamos a esa zona" };
  }

  const zone = distanceKm <= 3 ? "zone_1_3" : distanceKm <= 5 ? "zone_3_5" : "zone_5_10";
  return { zone, distance_km: Math.round(distanceKm * 10) / 10 };
}
