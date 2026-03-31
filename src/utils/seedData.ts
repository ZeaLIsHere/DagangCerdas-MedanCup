import { getDatabase } from '../services/database/schema';
import { DEMO_USER } from './constants';

// Use a safe Math.random fallback for UUID to avoid crypto.getRandomValues crash in Expo Go
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ==========================================
// PRODUK DEMO — Warung Nasi khas Medan
// ==========================================

const DEMO_PRODUCTS = [
  // Makanan
  { name: 'Nasi Putih', category: 'Makanan', price: 5000, costPrice: 2500, stock: 100, unit: 'pcs', barcode: '8991234560001' },
  { name: 'Ayam Goreng', category: 'Makanan', price: 15000, costPrice: 8000, stock: 30, unit: 'pcs', barcode: '8991234560002' },
  { name: 'Rendang Daging', category: 'Makanan', price: 18000, costPrice: 10000, stock: 20, unit: 'pcs', barcode: '8991234560003' },
  { name: 'Ikan Arsik (Khas Batak)', category: 'Makanan', price: 22000, costPrice: 12000, stock: 15, unit: 'pcs', barcode: '8991234560004' },
  { name: 'Sayur Daun Ubi Tumbuk', category: 'Makanan', price: 8000, costPrice: 3500, stock: 25, unit: 'pcs', barcode: '8991234560005' },
  { name: 'Telur Dadar', category: 'Makanan', price: 7000, costPrice: 3000, stock: 40, unit: 'pcs', barcode: '8991234560006' },
  { name: 'Sambal Terasi', category: 'Makanan', price: 3000, costPrice: 1000, stock: 50, unit: 'pcs', barcode: '8991234560007' },
  { name: 'Tempe Goreng', category: 'Makanan', price: 5000, costPrice: 2000, stock: 35, unit: 'pcs', barcode: '8991234560008' },
  { name: 'Bika Ambon', category: 'Snack', price: 25000, costPrice: 15000, stock: 10, unit: 'kotak', barcode: '8991234560009' },
  { name: 'Lontong Sayur Medan', category: 'Makanan', price: 12000, costPrice: 5500, stock: 20, unit: 'pcs', barcode: '8991234560010' },
  
  // Minuman
  { name: 'Teh Manis', category: 'Minuman', price: 5000, costPrice: 1500, stock: 60, unit: 'pcs', barcode: '8991234560011' },
  { name: 'Es Teh Manis', category: 'Minuman', price: 6000, costPrice: 2000, stock: 60, unit: 'pcs', barcode: '8991234560012' },
  { name: 'Kopi Tubruk', category: 'Minuman', price: 7000, costPrice: 2500, stock: 50, unit: 'pcs', barcode: '8991234560013' },
  { name: 'Jus Alpukat', category: 'Minuman', price: 12000, costPrice: 5000, stock: 20, unit: 'pcs', barcode: '8991234560014' },
  { name: 'Air Mineral Botol', category: 'Minuman', price: 4000, costPrice: 2000, stock: 80, unit: 'botol', barcode: '8991234560015' },
  { name: 'Es Markisa Medan', category: 'Minuman', price: 10000, costPrice: 4000, stock: 30, unit: 'pcs', barcode: '8991234560016' },
  
  // Sembako
  { name: 'Beras (per kg)', category: 'Sembako', price: 14000, costPrice: 11000, stock: 50, unit: 'kg', barcode: '8991234560017' },
  { name: 'Minyak Goreng 1L', category: 'Sembako', price: 18000, costPrice: 15000, stock: 3, unit: 'botol', barcode: '8991234560018' },
  { name: 'Gula Pasir (per kg)', category: 'Sembako', price: 16000, costPrice: 13000, stock: 4, unit: 'kg', barcode: '8991234560019' },
  { name: 'Telur Ayam (per butir)', category: 'Sembako', price: 2500, costPrice: 2000, stock: 100, unit: 'pcs', barcode: '8991234560020' },
];

// ==========================================
// TRANSAKSI DEMO — 7 hari terakhir
// ==========================================

function generateDemoTransactions() {
  const transactions: any[] = [];
  const now = Date.now();
  
  // Generate 7 hari data transaksi
  for (let day = 6; day >= 0; day--) {
    const baseTime = now - (day * 24 * 60 * 60 * 1000);
    // 3-8 transaksi per hari
    const numTx = Math.floor(Math.random() * 6) + 3;
    
    for (let t = 0; t < numTx; t++) {
      const txTime = baseTime + (Math.floor(Math.random() * 10) + 7) * 60 * 60 * 1000; // 7am - 5pm
      const numItems = Math.floor(Math.random() * 4) + 1;
      const items: any[] = [];
      let totalAmount = 0;
      
      // Pick random products
      const shuffled = [...DEMO_PRODUCTS].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(numItems, shuffled.length); i++) {
        const product = shuffled[i];
        const qty = Math.floor(Math.random() * 3) + 1;
        const subtotal = product.price * qty;
        totalAmount += subtotal;
        
        items.push({
          id: uuidv4(),
          productName: product.name,
          productIndex: DEMO_PRODUCTS.indexOf(product),
          quantity: qty,
          unitPrice: product.price,
          subtotal,
        });
      }
      
      const paymentMethods: ('tunai' | 'qris' | 'transfer')[] = ['tunai', 'tunai', 'tunai', 'qris', 'qris', 'transfer'];
      
      transactions.push({
        id: uuidv4(),
        totalAmount,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        createdAt: txTime,
        items,
      });
    }
  }
  
  return transactions;
}

// ==========================================
// UMKM TERDEKAT DEMO — Lokasi di Medan
// ==========================================

export const DEMO_NEARBY_UMKM = [
  {
    id: 'umkm-001', userId: 'user-001', businessName: 'Warung Bu Tuti',
    businessType: 'warung', latitude: 3.5872, longitude: 98.6690,
    address: 'Jl. Gatot Subroto No. 45, Medan',
  },
  {
    id: 'umkm-002', userId: 'user-002', businessName: 'Toko Sembako Jaya',
    businessType: 'toko_kelontong', latitude: 3.6012, longitude: 98.6755,
    address: 'Jl. SM Raja No. 102, Medan',
  },
  {
    id: 'umkm-003', userId: 'user-003', businessName: 'Kedai Kopi Bang Roni',
    businessType: 'cafe', latitude: 3.5890, longitude: 98.6800,
    address: 'Jl. Pemuda No. 28, Medan',
  },
  {
    id: 'umkm-004', userId: 'user-004', businessName: 'Restoran Garuda',
    businessType: 'restoran', latitude: 3.5935, longitude: 98.6660,
    address: 'Jl. Iskandar Muda No. 67, Medan',
  },
  {
    id: 'umkm-005', userId: 'user-005', businessName: 'Toko Bangunan Mandiri',
    businessType: 'lainnya', latitude: 3.6080, longitude: 98.6820,
    address: 'Jl. Krakatau No. 155, Medan',
  },
  {
    id: 'umkm-006', userId: 'user-006', businessName: 'Apotek Sehat Farma',
    businessType: 'apotek', latitude: 3.5820, longitude: 98.6750,
    address: 'Jl. Diponegoro No. 33, Medan',
  },
];

// ==========================================
// VENDOR DEMO — Kawasan Industri Medan (KIM)
// ==========================================

export const DEMO_VENDORS = [
  {
    id: 'vendor-001', name: 'PT. Sumber Makmur Distribusi',
    address: 'Kawasan Industri Medan (KIM) I, Jl. Medan-Belawan Km 10',
    latitude: 3.6580, longitude: 98.6890, phone: '061-6855xxx',
    category: 'Sembako', products: ['Beras', 'Gula', 'Minyak Goreng', 'Tepung'],
    minOrderValue: 500000,
  },
  {
    id: 'vendor-002', name: 'CV. Andalas Food Supply',
    address: 'Kawasan Industri Medan (KIM) II, Jl. Perniagaan No. 58',
    latitude: 3.6620, longitude: 98.6950, phone: '061-4527xxx',
    category: 'Makanan & Minuman', products: ['Bumbu Masak', 'Santan', 'Kecap', 'Saos'],
    minOrderValue: 300000,
  },
  {
    id: 'vendor-003', name: 'UD. Berkat Tani Medan',
    address: 'Pasar Induk Lau Cih, Jl. Jamin Ginting Km 14, Medan',
    latitude: 3.5200, longitude: 98.6350, phone: '0812-6xxx-xxxx',
    category: 'Sayuran & Buah', products: ['Sayur Mayur', 'Buah Segar', 'Cabai', 'Bawang'],
    minOrderValue: 200000,
  },
  {
    id: 'vendor-004', name: 'PT. Tirta Sibayak Aqua',
    address: 'Jl. Binjai Km 12, Deli Serdang',
    latitude: 3.6300, longitude: 98.5800, phone: '061-8452xxx',
    category: 'Minuman', products: ['Air Mineral', 'Teh Botol', 'Sirup', 'Jus Kemasan'],
    minOrderValue: 400000,
  },
];

// ==========================================
// GROUP ORDER DEMO
// ==========================================

export const DEMO_GROUP_ORDERS = [
  {
    id: 'go-001',
    initiatorName: 'Warung Bu Tuti',
    productName: 'Beras Cap Bunga (50kg)',
    description: 'Beras kualitas premium untuk kebutuhan warung nasi. Harga grosir dari KIM jauh lebih murah daripada beli eceran di pasar.',
    targetQuantity: 500,
    currentQuantity: 350,
    wholesalePrice: 11000,
    retailPrice: 14000,
    vendorName: 'PT. Sumber Makmur Distribusi',
    hubAddress: 'Jl. Gatot Subroto No. 45, Medan',
    hubLatitude: 3.5872,
    hubLongitude: 98.6690,
    radiusKm: 5,
    status: 'terbuka' as const,
    deadline: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 hari lagi
    participants: 4,
  },
  {
    id: 'go-002',
    initiatorName: 'Kedai Kopi Bang Roni',
    productName: 'Minyak Goreng Filma 2L (1 dus = 6)',
    description: 'Stok minyak goreng untuk 2 minggu. Beli kolektif bisa hemat sampai 15%.',
    targetQuantity: 50,
    currentQuantity: 30,
    wholesalePrice: 96000,
    retailPrice: 112000,
    vendorName: 'CV. Andalas Food Supply',
    hubAddress: 'Jl. Pemuda No. 28, Medan',
    hubLatitude: 3.5890,
    hubLongitude: 98.6800,
    radiusKm: 3,
    status: 'terbuka' as const,
    deadline: Date.now() + 5 * 24 * 60 * 60 * 1000,
    participants: 3,
  },
];

// ==========================================
// SEED FUNCTION
// ==========================================

export async function seedDemoData(): Promise<void> {
  const db = await getDatabase();
  const userId = DEMO_USER.id;
  const now = Date.now();

  // Check if data already seeded
  const existing = await db.getFirstAsync<any>(
    'SELECT COUNT(*) as count FROM products WHERE user_id = ?',
    [userId]
  );
  
  if (existing && existing.count > 0) {
    console.log('[Seed] Demo data already exists, skipping');
    return;
  }

  console.log('[Seed] Inserting demo data...');

  await db.withTransactionAsync(async () => {
    // Insert demo user
    await db.runAsync(
      `INSERT OR REPLACE INTO users (id, name, email, business_name, business_type, phone, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, DEMO_USER.name, DEMO_USER.email, DEMO_USER.businessName, DEMO_USER.businessType, DEMO_USER.phone, DEMO_USER.latitude, DEMO_USER.longitude, now, now]
    );

    // Insert products
    const productIds: string[] = [];
    for (const p of DEMO_PRODUCTS) {
      const pid = uuidv4();
      productIds.push(pid);
      await db.runAsync(
        `INSERT INTO products (id, user_id, name, barcode, category, price, cost_price, stock, min_stock, unit, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [pid, userId, p.name, p.barcode, p.category, p.price, p.costPrice, p.stock, 5, p.unit, now, now]
      );
    }

    // Insert demo transactions
    const demoTx = generateDemoTransactions();
    for (const tx of demoTx) {
      const txId = tx.id;
      await db.runAsync(
        `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'selesai', ?, ?)`,
        [txId, userId, tx.totalAmount, tx.paymentMethod, tx.createdAt, tx.createdAt]
      );

      for (const item of tx.items) {
        const productId = productIds[item.productIndex] || productIds[0];
        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.id, txId, productId, item.productName, item.quantity, item.unitPrice, item.subtotal]
        );
      }
    }
  });

  console.log('[Seed] Demo data inserted successfully');
}
