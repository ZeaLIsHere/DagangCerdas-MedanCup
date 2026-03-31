// DagangCerdas — Group Buying types

export interface GroupOrder {
  id: string;
  initiatorId: string;
  initiatorName: string;
  productName: string;
  description: string;
  targetQuantity: number;
  currentQuantity: number;
  wholesalePrice: number;     // Harga grosir per unit
  retailPrice: number;        // Harga eceran per unit (perbandingan)
  vendorName: string;
  vendorId: string;
  hubLatitude: number;
  hubLongitude: number;
  hubAddress: string;
  radiusKm: number;
  status: GroupOrderStatus;
  deadline: number;           // Unix timestamp
  createdAt: number;
  updatedAt: number;
  restockQty?: number;        // Simulated stock addition quantity
  productId?: string;         // Link to actual product in DB
}

export interface GroupOrderParticipant {
  id: string;
  groupOrderId: string;
  userId: string;
  userName: string;
  businessName: string;
  quantity: number;
  status: ParticipantStatus;
  joinedAt: number;
}

export interface UMKMLocation {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  latitude: number;
  longitude: number;
  address: string;
  distance?: number;          // Calculated from user location
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  category: string;
  products: string[];
  minOrderValue: number;
}

export type GroupOrderStatus = 'terbuka' | 'terkonfirmasi' | 'dikirim' | 'selesai' | 'dibatalkan';
export type ParticipantStatus = 'bergabung' | 'dibayar' | 'diterima';
