// DagangCerdas — Database Repository (CRUD Operations)

import { getDatabase, initializeDatabase } from './schema';
import type { Product, Transaction, TransactionItem, CartItem, DailySales, SalesSummary, User } from '../../types';

// Use a safe Math.random fallback for UUID to avoid crypto.getRandomValues crash in Expo Go
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ==========================================
// USERS
// ==========================================

export async function upsertUser(user: Partial<User> & { id: string }): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();
  const now = Date.now();
  
  const existing = await getUserById(user.id);
  const finalUser = {
    ...existing,
    ...user,
    updatedAt: now,
    createdAt: existing?.createdAt || user.createdAt || now
  };

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
    [
      finalUser.id, 
      finalUser.name || null, 
      finalUser.email || null, 
      finalUser.businessName || null, 
      finalUser.businessType || null, 
      finalUser.phone || null, 
      finalUser.latitude || null, 
      finalUser.longitude || null, 
      finalUser.createdAt, 
      finalUser.updatedAt
    ]
  );
  
  // Perbarui profil di server (Push outbox)
  await addToOutbox('users', user.id, 'update', finalUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    businessName: row.business_name,
    businessType: row.business_type,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

// ==========================================
// PRODUCTS
// ==========================================

export async function getAllProducts(userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC',
    [userId]
  );
  return rows.map(mapRowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return row ? mapRowToProduct(row) : null;
}


export async function searchProducts(query: string, userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL AND (name LIKE ? OR category LIKE ?) ORDER BY name ASC',
    [userId, `%${query}%`, `%${query}%`]
  );
  return rows.map(mapRowToProduct);
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Product> {
  const db = await getDatabase();
  const now = Date.now();
  const id = uuidv4();

  await db.runAsync(
    `INSERT INTO products (id, user_id, name, category, price, cost_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.userId, data.name, data.category, data.price, data.costPrice, data.stock, data.minStock, data.unit, data.imageUri, data.isActive ? 1 : 0, now, now]
  );

  // Add to sync outbox
  await addToOutbox('products', id, 'create', { ...data, id, createdAt: now, updatedAt: now });

  return { ...data, id, createdAt: now, updatedAt: now, deletedAt: null };
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  const setClause: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
  if (updates.category !== undefined) { setClause.push('category = ?'); values.push(updates.category); }
  if (updates.price !== undefined) { setClause.push('price = ?'); values.push(updates.price); }
  if (updates.costPrice !== undefined) { setClause.push('cost_price = ?'); values.push(updates.costPrice); }
  if (updates.stock !== undefined) { setClause.push('stock = ?'); values.push(updates.stock); }
  if (updates.minStock !== undefined) { setClause.push('min_stock = ?'); values.push(updates.minStock); }
  if (updates.unit !== undefined) { setClause.push('unit = ?'); values.push(updates.unit); }
  if (updates.imageUri !== undefined) { setClause.push('image_uri = ?'); values.push(updates.imageUri); }
  if (updates.isActive !== undefined) { setClause.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  setClause.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`,
    values
  );

  await addToOutbox('products', id, 'update', { ...updates, updatedAt: now });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  // Soft delete
  await db.runAsync(
    'UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );

  await addToOutbox('products', id, 'delete', { deletedAt: now });
}

export async function getLowStockProducts(userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL AND stock <= min_stock AND is_active = 1 ORDER BY stock ASC',
    [userId]
  );
  return rows.map(mapRowToProduct);
}

// ==========================================
// TRANSACTIONS
// ==========================================

export async function createTransaction(
  userId: string,
  cartItems: CartItem[],
  paymentMethod: string,
  customerName?: string,
  notes?: string
): Promise<Transaction> {
  const db = await getDatabase();
  const now = Date.now();
  const transactionId = uuidv4();
  const totalAmount = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  await db.withTransactionAsync(async () => {
    // Insert transaction
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, customer_name, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'selesai', ?, ?, ?, ?)`,
      [transactionId, userId, totalAmount, paymentMethod, customerName || null, notes || null, now, now]
    );

    // Insert transaction items & update stock
    for (const item of cartItems) {
      const itemId = uuidv4();
      const subtotal = item.product.price * item.quantity;

      await db.runAsync(
        `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, transactionId, item.product.id, item.product.name, item.quantity, item.product.price, subtotal]
      );

      // Reduce stock
      await db.runAsync(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
        [item.quantity, now, item.product.id]
      );
    }
  });

  const transaction: Transaction = {
    id: transactionId,
    userId,
    totalAmount,
    paymentMethod: paymentMethod as any,
    paymentStatus: 'selesai',
    customerName: customerName || null,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await addToOutbox('transactions', transactionId, 'create', { 
    ...transaction, 
    items: cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity
    }))
  });

  return transaction;
}

export async function getTransactions(
  userId: string, 
  limit: number = 50, 
  startTime?: number, 
  endTime?: number
): Promise<Transaction[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL';
  const params: any[] = [userId];

  if (startTime) {
    query += ' AND created_at >= ?';
    params.push(startTime);
  }
  if (endTime) {
    query += ' AND created_at <= ?';
    params.push(endTime);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = await db.getAllAsync<any>(query, params);
  return rows.map(mapRowToTransaction);
}

export async function getTransactionSummary(
  userId: string,
  startTime?: number,
  endTime?: number
): Promise<{ gross: number; net: number; count: number }> {
  const db = await getDatabase();
  
  // 1. Hitung Pendapatan Kotor (Gross)
  let grossQuery = 'SELECT COALESCE(SUM(total_amount), 0) as gross, COUNT(*) as count FROM transactions WHERE user_id = ? AND deleted_at IS NULL';
  const params: any[] = [userId];
  if (startTime) { grossQuery += ' AND created_at >= ?'; params.push(startTime); }
  if (endTime) { grossQuery += ' AND created_at <= ?'; params.push(endTime); }
  
  const grossResult = await db.getFirstAsync<any>(grossQuery, params);
  const gross = grossResult?.gross || 0;
  const count = grossResult?.count || 0;

  // 2. Hitung Pendapatan Bersih (Net)
  // Kita JOIN ke products untuk mendapatkan cost_price produk tersebut saat ini
  // (Paling akurat jika kita simpan cost_price saat transaksi, tapi untuk skema lama kita gunakan ini)
  let netQuery = `
    SELECT SUM(ti.quantity * (ti.unit_price - COALESCE(p.cost_price, 0))) as net
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    LEFT JOIN products p ON ti.product_id = p.id
    WHERE t.user_id = ? AND t.deleted_at IS NULL
  `;
  const netParams: any[] = [userId];
  if (startTime) { netQuery += ' AND t.created_at >= ?'; netParams.push(startTime); }
  if (endTime) { netQuery += ' AND t.created_at <= ?'; netParams.push(endTime); }

  const netResult = await db.getFirstAsync<any>(netQuery, netParams);
  const net = netResult?.net || 0;

  return { gross, net, count };
}

export async function getTransactionWithItems(transactionId: string): Promise<{ transaction: Transaction; items: TransactionItem[] } | null> {
  const db = await getDatabase();
  
  const txRow = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  );
  
  if (!txRow) return null;

  const itemRows = await db.getAllAsync<any>(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [transactionId]
  );

  return {
    transaction: mapRowToTransaction(txRow),
    items: itemRows.map(mapRowToTransactionItem),
  };
}

// ==========================================
// SALES ANALYTICS
// ==========================================

export async function getDailySales(userId: string, days: number = 7): Promise<DailySales[]> {
  const db = await getDatabase();
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const rows = await db.getAllAsync<any>(
    `SELECT 
       date(created_at / 1000, 'unixepoch', 'localtime') as date,
       SUM(total_amount) as total_amount,
       COUNT(*) as transaction_count
     FROM transactions 
     WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?
     GROUP BY date(created_at / 1000, 'unixepoch', 'localtime')
     ORDER BY date ASC`,
    [userId, startDate]
  );

  return rows.map((row: any) => ({
    date: row.date,
    totalAmount: row.total_amount || 0,
    totalProfit: (row.total_amount || 0) * 0.3, // Estimasi margin 30%
    transactionCount: row.transaction_count || 0,
    itemsSold: 0,
  }));
}

export async function getSalesSummary(userId: string, days: number = 7): Promise<SalesSummary> {
  const db = await getDatabase();
  const now = Date.now();
  const currentStart = now - (days * 24 * 60 * 60 * 1000);
  const previousStart = now - (days * 2 * 24 * 60 * 60 * 1000);

  // 1. Current Period Stats (Real Profit)
  const currentSummary = await getTransactionSummary(userId, currentStart, now);
  
  // 2. Previous Period Stats (for Growth)
  const previousSummary = await getTransactionSummary(userId, previousStart, currentStart);

  // 3. Top Products & Shares
  const topProductsRaw = await db.getAllAsync<any>(
    `SELECT 
       ti.product_name as name,
       SUM(ti.quantity) as total_qty,
       SUM(ti.subtotal) as total_revenue
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.created_at >= ?
     GROUP BY ti.product_id
     ORDER BY total_qty DESC`,
    [userId, currentStart]
  );

  const totalQty = topProductsRaw.reduce((sum, p) => sum + p.total_qty, 0);
  const top5 = topProductsRaw.slice(0, 5);
  const othersQty = topProductsRaw.slice(5).reduce((sum, p) => sum + p.total_qty, 0);

  const PIE_COLORS = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#607D8B'];
  
  const itemShares = top5.map((p, i) => ({
    name: p.name,
    quantity: p.total_qty,
    percentage: totalQty > 0 ? (p.total_qty / totalQty) * 100 : 0,
    color: PIE_COLORS[i]
  }));

  if (othersQty > 0) {
    itemShares.push({
      name: 'Lainnya',
      quantity: othersQty,
      percentage: (othersQty / totalQty) * 100,
      color: PIE_COLORS[5]
    });
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const dailyTrend = await getDailySales(userId, days);

  return {
    totalRevenue: currentSummary.gross,
    totalProfit: currentSummary.net,
    totalTransactions: currentSummary.count,
    averagePerTransaction: currentSummary.count > 0 ? currentSummary.gross / currentSummary.count : 0,
    revenueGrowth: calculateGrowth(currentSummary.gross, previousSummary.gross),
    profitGrowth: calculateGrowth(currentSummary.net, previousSummary.net),
    transactionGrowth: calculateGrowth(currentSummary.count, previousSummary.count),
    topProducts: top5.map(p => ({
      name: p.name,
      quantity: p.total_qty,
      revenue: p.total_revenue,
    })),
    dailyTrend,
    itemShares,
  };
}

export async function getLiveMarketplaceOrders(userId: string): Promise<any[]> {
  const lowStock = await getLowStockProducts(userId);
  const allProducts = await getAllProducts(userId);
  
  // Use low stock as priority, fallback to general products
  const pool = lowStock.length > 0 ? lowStock : allProducts.slice(0, 5);
  const { DEMO_VENDORS } = require('../../utils/seedData');

  return pool.map((p, i) => {
    const vendor = DEMO_VENDORS.find((v: any) => 
      v.category.toLowerCase().includes(p.category.toLowerCase()) || 
      p.category.toLowerCase().includes(v.category.toLowerCase())
    ) || DEMO_VENDORS[0];

    return {
      id: `live-order-${p.id}`,
      productId: p.id,
      initiatorName: 'UMKM Sekitar',
      productName: `${p.name} (Grosir Part)`,
      description: `Beli bersama untuk ${p.name} agar mendapatkan harga distributor dari ${vendor.name}.`,
      targetQuantity: 100,
      currentQuantity: 45 + (i * 10),
      wholesalePrice: p.costPrice > 0 ? p.costPrice * 0.95 : p.price * 0.7,
      retailPrice: p.price,
      vendorName: vendor.name,
      deadline: Date.now() + (2 + i) * 24 * 60 * 60 * 1000,
      participants: 5 + i,
      isRecommended: lowStock.some(ls => ls.id === p.id),
      category: p.category,
      restockQty: 10 // Simulated restock quantity
    };
  });
}

export async function updateProductStock(id: string, delta: number): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?',
    [delta, now, id]
  );
  
  // Add to sync outbox
  await addToOutbox('products', id, 'update', { stockDelta: delta, updatedAt: now });
}

export async function getTodaySales(userId: string): Promise<{ revenue: number; profit: number; count: number }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const stats = await getTransactionSummary(userId, todayStart.getTime());

  return {
    revenue: stats.gross,
    profit: stats.net,
    count: stats.count,
  };
}

// ==========================================
// SYNC OUTBOX
// ==========================================

async function addToOutbox(tableName: string, recordId: string, operation: string, payload: any): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO sync_outbox (table_name, record_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    [tableName, recordId, operation, JSON.stringify(payload), Date.now()]
  );
}

export async function getPendingSyncItems(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 50');
}

export async function removeSyncItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [id]);
}

// ==========================================
// CHAT SESSIONS & MESSAGES 
// ==========================================

export async function createChatSession(userId: string, title: string): Promise<string> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, title, now, now]
  );
  return id;
}

export async function getUserChatSessions(userId: string): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  // Karena ON DELETE CASCADE aktif di schema, pesan di dalamnya akan otomatis terhapus
  await db.runAsync('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
}

export async function updateChatSessionTitle(sessionId: string, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), sessionId]);
}

export async function saveChatMessage(userId: string, sessionId: string, role: string, content: string): Promise<string> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO chat_messages (id, session_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sessionId, userId, role, content, now]
    );
    await db.runAsync(
      'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
      [now, sessionId]
    );
  });
  return id;
}

export async function getChatHistory(userId: string, sessionId: string, limit: number = 50): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT ?',
    [userId, sessionId, limit]
  );
}

export async function clearChatHistory(userId: string, sessionId?: string): Promise<void> {
  const db = await getDatabase();
  if (sessionId) {
    await db.runAsync('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?', [userId, sessionId]);
  } else {
    await db.runAsync('DELETE FROM chat_messages WHERE user_id = ?', [userId]);
  }
}

// ==========================================
// MAPPERS
// ==========================================

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    price: row.price,
    costPrice: row.cost_price,
    stock: row.stock,
    minStock: row.min_stock,
    unit: row.unit,
    imageUri: row.image_uri,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    customerName: row.customer_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapRowToTransactionItem(row: any): TransactionItem {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    subtotal: row.subtotal,
  };
}
