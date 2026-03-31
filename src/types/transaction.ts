// DagangCerdas — Transaction types

export interface Transaction {
  id: string;
  userId: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;       // Snapshot saat transaksi
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    unit: string;
    imageUri: string | null;
    category: string;
  };
  quantity: number;
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer';
export type PaymentStatus = 'selesai' | 'pending' | 'dibatalkan';

export interface DailySales {
  date: string;         // YYYY-MM-DD
  totalAmount: number;
  totalProfit: number;
  transactionCount: number;
  itemsSold: number;
}

export interface SalesSummary {
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  averagePerTransaction: number;
  revenueGrowth?: number;       // % vs previous 7 days
  profitGrowth?: number;        // % vs previous 7 days
  transactionGrowth?: number;   // % vs previous 7 days
  topProducts: { name: string; quantity: number; revenue: number }[];
  dailyTrend: DailySales[];
  itemShares: { name: string; quantity: number; percentage: number; color: string }[];
}
