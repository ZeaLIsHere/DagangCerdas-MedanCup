// DagangCerdas — Product types

export interface Product {
  id: string;
  userId: string;
  name: string;
  category: string;
  price: number;         // Harga jual
  costPrice: number;     // Harga modal
  stock: number;
  minStock: number;      // Alert threshold
  unit: string;          // 'pcs', 'kg', 'liter', etc.
  imageUri: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ProductFormData {
  name: string;
  category: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  unit: string;
  imageUri: string;
}

export const PRODUCT_CATEGORIES = [
  'Makanan',
  'Minuman',
  'Sembako',
  'Bumbu & Rempah',
  'Snack',
  'Rokok',
  'Obat & Kesehatan',
  'Peralatan Rumah',
  'Elektronik',
  'Lainnya',
] as const;

export const PRODUCT_UNITS = [
  'pcs',
  'kg',
  'gram',
  'liter',
  'ml',
  'bungkus',
  'botol',
  'kotak',
  'lusin',
  'karung',
] as const;
