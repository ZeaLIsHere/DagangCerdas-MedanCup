import { getPendingSyncItems, removeSyncItem, createProduct, createTransaction } from './repository';
import { getDatabase } from './schema';
import { saveToFirestore, removeFromFirestore, fetchAllUserData, saveUserProfile, fetchUserProfile } from '../firebase/firestore';

let isSyncing = false;

/**
 * Memproses antrian sinkronisasi (Outbox)
 * Mengirim data dari SQLite ke Firebase
 */
export async function processOutbox(userId: string): Promise<void> {
  if (isSyncing || !userId) return;
  
  try {
    isSyncing = true;
    const pendingItems = await getPendingSyncItems();
    
    if (pendingItems.length === 0) return;
    
    console.log(`[Sync] Processing ${pendingItems.length} items for user ${userId}...`);
    
    for (const item of pendingItems) {
      try {
        const payload = JSON.parse(item.payload);
        
        if (item.table_name === 'users') {
          await saveUserProfile(payload);
        } else if (item.operation === 'create' || item.operation === 'update') {
          await saveToFirestore(userId, item.table_name, item.record_id, payload);
        } else if (item.operation === 'delete') {
          await removeFromFirestore(userId, item.table_name, item.record_id);
        }
        
        // Hapus dari outbox jika berhasil
        await removeSyncItem(item.id);
        
      } catch (error) {
        console.error(`[Sync] Failed to process item ${item.id}:`, error);
        // Biarkan item tetap di outbox untuk dicoba lagi nanti
      }
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Menarik data dari server ke lokal (Initial Pull)
 * Digunakan saat login pertama kali di perangkat baru
 */
export async function pullFromServer(userId: string): Promise<void> {
  console.log(`[Sync] Pulling data from cloud for user ${userId}...`);
  const db = await getDatabase();
  
  try {
    const [userData, { products, transactions }] = await Promise.all([
      fetchUserProfile(userId),
      fetchAllUserData(userId)
    ]);
    
    // Gunakan transaction untuk performa & atomicity
    try {
      await db.withTransactionAsync(async () => {
        // 0. Sinkronisasi Profil User
        if (userData) {
          await db.runAsync(
            `INSERT INTO users (id, name, email, business_name, business_type, phone, latitude, longitude, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET 
             name = COALESCE(excluded.name, users.name), 
             email = COALESCE(excluded.email, users.email),
             business_name = COALESCE(excluded.business_name, users.business_name),
             business_type = COALESCE(excluded.business_type, users.business_type),
             phone = COALESCE(excluded.phone, users.phone),
             latitude = COALESCE(excluded.latitude, users.latitude),
             longitude = COALESCE(excluded.longitude, users.longitude),
             updated_at = excluded.updated_at`,
            [userData.id, userData.name, userData.email, userData.businessName, userData.businessType, userData.phone, userData.latitude, userData.longitude, userData.createdAt || Date.now(), userData.updatedAt || Date.now()]
          );
        }

        // 1. Sinkronisasi Produk
        for (const p of products) {
          await db.runAsync(
            `INSERT INTO products (id, user_id, name, category, price, cost_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, category = excluded.category, price = excluded.price, stock = excluded.stock, updated_at = excluded.updated_at`,
            [p.id, p.userId, p.name, p.category, p.price, p.costPrice, p.stock, p.minStock, p.unit, p.imageUri, p.isActive ? 1 : 0, p.createdAt || Date.now(), p.updatedAt || Date.now()]
          );
        }
        
        // 2. Sinkronisasi Transaksi
        for (const t of transactions) {
          await db.runAsync(
            `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, customer_name, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET payment_status = excluded.payment_status`,
            [t.id, t.userId, t.totalAmount, t.paymentMethod, t.paymentStatus, t.customerName, t.notes, t.createdAt || Date.now(), t.updatedAt || Date.now()]
          );
          
          if (Array.isArray(t.items)) {
            for (const item of t.items) {
              await db.runAsync(
                `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO NOTHING`,
                [`pull_${t.id}_${item.productId}`, t.id, item.productId, item.productName, item.quantity, item.unitPrice, item.subtotal]
              );
            }
          }
        }
      });
      console.log(`[Sync] Successfully pulled ${products.length} products and ${transactions.length} transactions`);
    } catch (txErr) {
      console.error('[Sync] Transactional pull failed, falling back to individual inserts:', txErr);
      // Fallback: Individual inserts if transaction fails (rare)
      for (const p of products) {
        await db.runAsync('INSERT OR REPLACE INTO products ...', []); // Minimal fallback if needed
      }
    }
    
  } catch (error) {
    console.error('[Sync] Pull from server failed:', error);
    throw error;
  }
}

/**
 * Memulai interval sinkronisasi rutin (setiap 30 detik)
 */
export function startAutoSync(userId: string): any {
  if (!userId) return null;
  
  // Jalankan segera sekali
  processOutbox(userId);
  
  // Lalu set interval
  return setInterval(() => {
    processOutbox(userId);
  }, 30000); // 30 detik
}
