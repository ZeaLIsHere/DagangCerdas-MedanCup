// DagangCerdas — Geolocation Utilities
// Haversine formula for distance calculation + group buying logic

import type { UMKMLocation, Vendor } from '../../types';

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Haversine formula — menghitung jarak antara 2 titik koordinat di permukaan bumi
 * @returns jarak dalam kilometer
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Cari UMKM terdekat dalam radius tertentu
 */
export function findNearbyUMKM(
  userLat: number,
  userLon: number,
  allUMKM: UMKMLocation[],
  radiusKm: number = 5
): (UMKMLocation & { distance: number })[] {
  return allUMKM
    .map(umkm => ({
      ...umkm,
      distance: haversineDistance(userLat, userLon, umkm.latitude, umkm.longitude),
    }))
    .filter(umkm => umkm.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Cari vendor/distributor terdekat dari hub point
 */
export function findNearbyVendors(
  hubLat: number,
  hubLon: number,
  vendors: Vendor[],
  radiusKm: number = 10
): (Vendor & { distance: number })[] {
  return vendors
    .map(vendor => ({
      ...vendor,
      distance: haversineDistance(hubLat, hubLon, vendor.latitude, vendor.longitude),
    }))
    .filter(vendor => vendor.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Hitung titik tengah (centroid) dari kumpulan UMKM
 * Digunakan untuk menentukan hub/titik kumpul optimal
 */
export function calculateCentroid(locations: { latitude: number; longitude: number }[]): {
  latitude: number;
  longitude: number;
} {
  if (locations.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  const sumLat = locations.reduce((sum, loc) => sum + loc.latitude, 0);
  const sumLon = locations.reduce((sum, loc) => sum + loc.longitude, 0);

  return {
    latitude: sumLat / locations.length,
    longitude: sumLon / locations.length,
  };
}

/**
 * Hitung penghematan dari belanja kolektif
 */
export function calculateGroupSavings(
  wholesalePrice: number,
  retailPrice: number,
  quantity: number
): {
  totalRetail: number;
  totalWholesale: number;
  savingsAmount: number;
  savingsPercent: number;
} {
  const totalRetail = retailPrice * quantity;
  const totalWholesale = wholesalePrice * quantity;
  const savingsAmount = totalRetail - totalWholesale;
  const savingsPercent = retailPrice > 0 ? (savingsAmount / totalRetail) * 100 : 0;

  return {
    totalRetail,
    totalWholesale,
    savingsAmount,
    savingsPercent,
  };
}

/**
 * Format jarak untuk display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
