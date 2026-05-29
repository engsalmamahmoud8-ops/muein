import { supabase } from "@/integrations/supabase/client";
import { getCookie, setCookie } from "@/lib/cookies";

export const EMPLOYEE_LOCATION_COOKIE = "ymnak_emp_location";
const FRESH_MS = 1000 * 60 * 30;

export type Coords = { lat: number; lng: number };

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export function readCachedEmployeeLocation(): Coords | null {
  const raw = getCookie(EMPLOYEE_LOCATION_COOKIE);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { lat: number; lng: number; at: number };
    if (!obj || typeof obj.lat !== "number" || typeof obj.lng !== "number") return null;
    return { lat: obj.lat, lng: obj.lng };
  } catch {
    return null;
  }
}

function cacheIsFresh(): boolean {
  const raw = getCookie(EMPLOYEE_LOCATION_COOKIE);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw) as { at: number };
    return Number.isFinite(obj.at) && Date.now() - obj.at < FRESH_MS;
  } catch {
    return false;
  }
}

export function writeCachedEmployeeLocation(coords: Coords): void {
  setCookie(EMPLOYEE_LOCATION_COOKIE, JSON.stringify({ ...coords, at: Date.now() }));
}

export async function refreshEmployeeLocation(employeeId: string, force = false): Promise<Coords | null> {
  if (!force && cacheIsFresh()) return readCachedEmployeeLocation();
  try {
    const coords = await getCurrentPosition();
    writeCachedEmployeeLocation(coords);
    await supabase.from("employees").update({ lat: coords.lat, lng: coords.lng }).eq("id", employeeId);
    return coords;
  } catch {
    return readCachedEmployeeLocation();
  }
}
