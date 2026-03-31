// DagangCerdas — Database Schema & Initialization
// Offline-first architecture using expo-sqlite

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'dagangcerdas.db';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let isDbReady = false;

/**
 * Get or create the SQLite database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Enable WAL mode for better concurrent read/write performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  return db;
}

/**
 * Initialize all database tables
 */
export async function initializeDatabase(): Promise<void> {
  if (isDbReady) return;
  if (isInitializing) {
    // Wait for the other call to finish
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (isDbReady) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  isInitializing = true;
  try {
    const database = await getDatabase();
    
    // 1. Transactional schema create
    await database.execAsync(`
      PRAGMA foreign_keys = ON;
      -- Users 
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        business_name TEXT,
        business_type TEXT,
        phone TEXT,
        latitude REAL,
        longitude REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER
      );
      -- Products
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Lainnya',
        price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        unit TEXT DEFAULT 'pcs',
        image_uri TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      -- Transactions
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'tunai',
        payment_status TEXT DEFAULT 'selesai',
        customer_name TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      -- Transaction Items
      CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      -- Group Orders
      CREATE TABLE IF NOT EXISTS group_orders (
        id TEXT PRIMARY KEY,
        initiator_id TEXT NOT NULL,
        initiator_name TEXT,
        product_name TEXT NOT NULL,
        description TEXT,
        target_quantity INTEGER NOT NULL,
        current_quantity INTEGER DEFAULT 0,
        wholesale_price REAL,
        retail_price REAL,
        vendor_name TEXT,
        vendor_id TEXT,
        hub_latitude REAL,
        hub_longitude REAL,
        hub_address TEXT,
        radius_km REAL DEFAULT 5.0,
        status TEXT DEFAULT 'terbuka',
        deadline INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      -- Participants
      CREATE TABLE IF NOT EXISTS group_order_participants (
        id TEXT PRIMARY KEY,
        group_order_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        business_name TEXT,
        quantity INTEGER NOT NULL,
        status TEXT DEFAULT 'bergabung',
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (group_order_id) REFERENCES group_orders(id)
      );
      -- AI Chat
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
      -- Outbox
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );
      -- Indices
      CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    `);

    // Migration logic
    try {
      const msgTableInfo = await database.getAllAsync('PRAGMA table_info(chat_messages);') as any[];
      if (!msgTableInfo.some((col: any) => col.name === 'session_id')) {
        await database.runAsync(`ALTER TABLE chat_messages ADD COLUMN session_id TEXT;`);
      }

      const prodTableInfo = await database.getAllAsync('PRAGMA table_info(products);') as any[];
      if (prodTableInfo.some((col: any) => col.name === 'barcode')) {
        await database.execAsync(`ALTER TABLE products DROP COLUMN barcode;`).catch(e => {
          console.warn('[DB] Skip drop column (not supported):', e.message);
        });
      }
    } catch (mErr) {
      console.warn('[DB] Migration skip warning:', mErr);
    }
    
    isDbReady = true;
    console.log('[DB] Database initialized successfully');
  } catch (error) {
    console.error('[DB] Database initialization CRITICAL error:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Reset database (for development/testing)
 */
export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  
  await database.execAsync(`
    DROP TABLE IF EXISTS sync_outbox;
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS group_order_participants;
    DROP TABLE IF EXISTS group_orders;
    DROP TABLE IF EXISTS transaction_items;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS users;
  `);

  isDbReady = false;
  await initializeDatabase();
  console.log('[DB] Database reset complete');
}

export { db };
