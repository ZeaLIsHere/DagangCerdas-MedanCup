// DagangCerdas — User types

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessType: BusinessType;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

export type BusinessType =
  | 'warung'
  | 'toko_kelontong'
  | 'cafe'
  | 'restoran'
  | 'toko_pakaian'
  | 'toko_elektronik'
  | 'apotek'
  | 'bengkel'
  | 'salon'
  | 'lainnya';

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  warung: 'Warung Makan',
  toko_kelontong: 'Toko Kelontong',
  cafe: 'Kafe / Coffee Shop',
  restoran: 'Restoran',
  toko_pakaian: 'Toko Pakaian',
  toko_elektronik: 'Toko Elektronik',
  apotek: 'Apotek / Toko Obat',
  bengkel: 'Bengkel',
  salon: 'Salon / Barbershop',
  lainnya: 'Lainnya',
};
