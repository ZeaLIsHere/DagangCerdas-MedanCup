// DagangCerdas — Firestore Sync Service
// Sinkronisasi data antara SQLite lokal <-> Firebase Firestore cloud
// Hanya sync: products & transactions (chat & group buying tetap lokal)

import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db as firestoreDb } from './config';
import { getDatabase } from '../database/schema';

// ==========================================
// UPLOAD: SQLite → Firestore
// ==========================================

/**
 * Upload semua produk user ke Firestore
 */
export async function uploadProducts(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const products = await sqliteDb.getAllAsync<any>(
      'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (products.length === 0) return 0;

    const batch = writeBatch(firestoreDb);
    
    for (const product of products) {
      const docRef = doc(firestoreDb, `users/${userId}/products`, product.id);
      batch.set(docRef, {
        name: product.name,
        barcode: product.barcode || null,
        category: product.category || 'Lainnya',
        price: product.price,
        costPrice: product.cost_price || 0,
        stock: product.stock,
        minStock: product.min_stock || 5,
        unit: product.unit || 'pcs',
        imageUri: product.image_uri || null,
        isActive: product.is_active === 1,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        deletedAt: product.deleted_at || null,
      });
    }

    await batch.commit();
    console.log(`[Sync] Uploaded ${products.length} products to Firestore`);
    return products.length;
  } catch (error) {
    console.error('[Sync] Upload products error:', error);
    return 0;
  }
}

/**
 * Upload satu produk ke Firestore
 */
export async function uploadSingleProduct(userId: string, productId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const product = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!product) return;

    const docRef = doc(firestoreDb, `users/${userId}/products`, product.id);
    await setDoc(docRef, {
      name: product.name,
      barcode: product.barcode || null,
      category: product.category || 'Lainnya',
      price: product.price,
      costPrice: product.cost_price || 0,
      stock: product.stock,
      minStock: product.min_stock || 5,
      unit: product.unit || 'pcs',
      imageUri: product.image_uri || null,
      isActive: product.is_active === 1,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      deletedAt: product.deleted_at || null,
    });

    console.log(`[Sync] Uploaded product ${product.name} to Firestore`);
  } catch (error) {
    console.error('[Sync] Upload single product error:', error);
  }
}

/**
 * Upload satu transaksi + items ke Firestore
 */
export async function uploadTransaction(
  userId: string,
  transactionId: string
): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    
    const tx = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (!tx) return;

    const items = await sqliteDb.getAllAsync<any>(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      [transactionId]
    );

    // Upload transaction
    const txDocRef = doc(firestoreDb, `users/${userId}/transactions`, tx.id);
    await setDoc(txDocRef, {
      totalAmount: tx.total_amount,
      paymentMethod: tx.payment_method,
      paymentStatus: tx.payment_status,
      customerName: tx.customer_name || null,
      notes: tx.notes || null,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      deletedAt: tx.deleted_at || null,
    });

    // Upload transaction items
    const batch = writeBatch(firestoreDb);
    for (const item of items) {
      const itemDocRef = doc(
        firestoreDb,
        `users/${userId}/transactions/${tx.id}/items`,
        item.id
      );
      batch.set(itemDocRef, {
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      });
    }
    await batch.commit();

    console.log(`[Sync] Uploaded transaction ${tx.id} with ${items.length} items`);
  } catch (error) {
    console.error('[Sync] Upload transaction error:', error);
  }
}

// ==========================================
// DOWNLOAD: Firestore → SQLite
// ==========================================

/**
 * Download semua produk dari Firestore ke SQLite
 * Menggunakan strategi: cloud data menang (overwrite lokal)
 */
export async function downloadProducts(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const productsRef = collection(firestoreDb, `users/${userId}/products`);
    const snapshot = await getDocs(productsRef);

    if (snapshot.empty) {
      console.log('[Sync] No products in Firestore to download');
      return 0;
    }

    let count = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const id = docSnap.id;

      await sqliteDb.runAsync(
        `INSERT INTO products (id, user_id, name, barcode, category, price, cost_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         barcode = excluded.barcode,
         category = excluded.category,
         price = excluded.price,
         cost_price = excluded.cost_price,
         stock = excluded.stock,
         min_stock = excluded.min_stock,
         unit = excluded.unit,
         image_uri = excluded.image_uri,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
        [
          id,
          userId,
          data.name,
          data.barcode || null,
          data.category || 'Lainnya',
          data.price,
          data.costPrice || 0,
          data.stock,
          data.minStock || 5,
          data.unit || 'pcs',
          data.imageUri || null,
          data.isActive ? 1 : 0,
          data.createdAt,
          data.updatedAt,
          data.deletedAt || null,
        ]
      );
      count++;
    }

    console.log(`[Sync] Downloaded ${count} products from Firestore`);
    return count;
  } catch (error) {
    console.error('[Sync] Download products error:', error);
    return 0;
  }
}

/**
 * Download semua transaksi dari Firestore ke SQLite
 */
export async function downloadTransactions(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const txRef = collection(firestoreDb, `users/${userId}/transactions`);
    const txQuery = query(txRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(txQuery);

    if (snapshot.empty) {
      console.log('[Sync] No transactions in Firestore to download');
      return 0;
    }

    let count = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const txId = docSnap.id;

      // Insert/update transaction
      await sqliteDb.runAsync(
        `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, customer_name, notes, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         total_amount = excluded.total_amount,
         payment_method = excluded.payment_method,
         payment_status = excluded.payment_status,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
        [
          txId,
          userId,
          data.totalAmount,
          data.paymentMethod,
          data.paymentStatus || 'selesai',
          data.customerName || null,
          data.notes || null,
          data.createdAt,
          data.updatedAt,
          data.deletedAt || null,
        ]
      );

      // Download transaction items
      const itemsRef = collection(firestoreDb, `users/${userId}/transactions/${txId}/items`);
      const itemsSnapshot = await getDocs(itemsRef);

      for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data();
        
        // Pastikan produk ada di database lokal agar tidak kena error FOREIGN KEY
        try {
          await sqliteDb.runAsync(
            `INSERT INTO products (id, user_id, name, category, price, stock, is_active, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, 'Lainnya', ?, 0, 0, ?, ?, ?)
             ON CONFLICT(id) DO NOTHING`,
            [
              itemData.productId,
              userId,
              itemData.productName || 'Produk Dihapus',
              itemData.unitPrice || 0,
              Date.now(),
              Date.now(),
              Date.now() // Langsung set deleted_at agar tidak muncul di daftar produk aktif
            ]
          );
        } catch (e) {
          console.warn('[Sync] Info: Placeholder product step failed:', e);
        }

        await sqliteDb.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
          [
            itemDoc.id,
            txId,
            itemData.productId,
            itemData.productName,
            itemData.quantity,
            itemData.unitPrice,
            itemData.subtotal,
          ]
        );
      }

      count++;
    }

    console.log(`[Sync] Downloaded ${count} transactions from Firestore`);
    return count;
  } catch (error: any) {
    if (error?.message?.includes('Missing or insufficient permissions')) {
      console.log('[Sync] Download transactions aborted (User logged out)');
    } else {
      console.error('[Sync] Download transactions error:', error);
    }
    return 0;
  }
}

/**
 * Upload user profile data ke Firestore
 */
export async function uploadUserProfile(userId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const user = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) return;

    // PREVENT OVERWRITING CLOUD DATA WITH EMPTY LOCAL DATA
    // When a user logs in on a new device, a minimal user is created with no business info.
    // We should not upload this minimal user to Firestore, otherwise it deletes their cloud profile.
    if (!user.business_name && !user.phone && !user.business_type) {
      console.log('[Sync] Skipping profile upload: Local profile is minimal/empty');
      return;
    }

    const docRef = doc(firestoreDb, 'users', userId);
    await setDoc(docRef, {
      name: user.name,
      email: user.email,
      businessName: user.business_name || null,
      businessType: user.business_type || null,
      phone: user.phone || null,
      latitude: user.latitude || null,
      longitude: user.longitude || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }, { merge: true });

    console.log('[Sync] Uploaded user profile to Firestore');
  } catch (error) {
    console.error('[Sync] Upload user profile error:', error);
  }
}

/**
 * Download user profile dari Firestore ke SQLite
 */
export async function downloadUserProfile(userId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const docRef = doc(firestoreDb, 'users', userId);
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('[Sync] No user profile in Firestore');
      return;
    }

    const data = docSnap.data();

    await sqliteDb.runAsync(
      `UPDATE users SET 
       business_name = COALESCE(?, business_name),
       business_type = COALESCE(?, business_type),
       phone = COALESCE(?, phone),
       latitude = COALESCE(?, latitude),
       longitude = COALESCE(?, longitude),
       updated_at = ?
       WHERE id = ?`,
      [
        data.businessName || null,
        data.businessType || null,
        data.phone || null,
        data.latitude || null,
        data.longitude || null,
        Date.now(),
        userId,
      ]
    );

    console.log('[Sync] Downloaded user profile from Firestore');
  } catch (error) {
    console.error('[Sync] Download user profile error:', error);
  }
}

// ==========================================
// FULL SYNC
// ==========================================

/**
 * Full sync: upload lokal → cloud, lalu download cloud → lokal
 * Dipanggil saat login atau app dibuka
 */
export async function syncAll(userId: string): Promise<{ uploaded: number; downloaded: number }> {
  console.log('[Sync] Starting full sync for user:', userId);

  try {
    // 1. Upload data lokal ke Firestore terlebih dahulu
    await uploadUserProfile(userId);
    const uploadedProducts = await uploadProducts(userId);

    // 2. Download data dari Firestore ke SQLite
    await downloadUserProfile(userId);
    const downloadedProducts = await downloadProducts(userId);
    const downloadedTransactions = await downloadTransactions(userId);

    const result = {
      uploaded: uploadedProducts,
      downloaded: downloadedProducts + downloadedTransactions,
    };

    console.log(`[Sync] Sync complete — Uploaded: ${result.uploaded}, Downloaded: ${result.downloaded}`);
    
    // 3. Trigger Group Buying sync (blocking, so participants can be downloaded after orders)
    await syncGroupBuying();

    // 4. Download user's own participation records (Riwayat tab)
    await downloadUserGroupParticipants(userId);
    console.log('[Sync] Group buying + participant sync complete');

    return result;
  } catch (error) {
    console.error('[Sync] Full sync error:', error);
    return { uploaded: 0, downloaded: 0 };
  }
}

// ==========================================
// GROUP BUYING SYNC (GLOBAL)
// ==========================================

/**
 * Upload a newly created group order to Firestore
 */
export async function uploadGroupOrder(orderId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const order = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM group_orders WHERE id = ?',
      [orderId]
    );

    if (!order) return;

    // We store group orders at the root collection /group_orders so everyone can see them
    const docRef = doc(firestoreDb, 'group_orders', orderId);
    await setDoc(docRef, {
      id: order.id,
      initiatorId: order.initiator_id,
      initiatorName: order.initiator_name,
      productName: order.product_name,
      description: order.description,
      targetQuantity: order.target_quantity,
      currentQuantity: order.current_quantity,
      wholesalePrice: order.wholesale_price,
      retailPrice: order.retail_price,
      vendorName: order.vendor_name,
      vendorId: order.vendor_id,
      hubLatitude: order.hub_latitude,
      hubLongitude: order.hub_longitude,
      hubAddress: order.hub_address,
      radiusKm: order.radius_km,
      status: order.status,
      deadline: order.deadline,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }, { merge: true });

    console.log(`[Sync] Uploaded group order ${orderId}`);
  } catch (error) {
    console.error('[Sync] Upload group order error:', error);
  }
}

/**
 * Upload a participant's entry to an existing group order
 */
export async function uploadGroupOrderParticipant(participantId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const participant = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM group_order_participants WHERE id = ?',
      [participantId]
    );

    if (!participant) return;

    // Participants are stored as a subcollection under the specific group order
    const docRef = doc(firestoreDb, `group_orders/${participant.group_order_id}/participants`, participantId);
    await setDoc(docRef, {
      id: participant.id,
      groupOrderId: participant.group_order_id,
      userId: participant.user_id,
      userName: participant.user_name,
      businessName: participant.business_name,
      quantity: participant.quantity,
      status: participant.status,
      joinedAt: participant.joined_at,
    }, { merge: true });

    // Also update the total quantity on the parent order document
    // (In a production app with high concurrency, use a Cloud Function or Firestore Transaction)
    // Here we'll just re-upload the parent order from local state which has been updated
    await uploadGroupOrder(participant.group_order_id);

    console.log(`[Sync] Uploaded group order participant ${participantId}`);
  } catch (error) {
    console.error('[Sync] Upload participant error:', error);
  }
}

/**
 * Download all active group orders from Firestore
 */
export async function downloadActiveGroupOrders(): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    
    // We only fetch 'terbuka' orders for the MVP
    const ordersRef = collection(firestoreDb, 'group_orders');
    const { where } = await import('firebase/firestore');
    const q = query(ordersRef, where('status', '==', 'terbuka'));
    const snapshot = await getDocs(q);

    // Collect IDs of orders that exist in Firestore
    const cloudOrderIds = new Set<string>();
    snapshot.docs.forEach(docSnap => cloudOrderIds.add(docSnap.id));

    let count = 0;
    await sqliteDb.withExclusiveTransactionAsync(async () => {
      // Remove local group orders that no longer exist in Firestore (stale data)
      const localOrders = await sqliteDb.getAllAsync<any>('SELECT id FROM group_orders WHERE status = ?', ['terbuka']);
      for (const localOrder of localOrders) {
        if (!cloudOrderIds.has(localOrder.id)) {
          // This order was deleted or closed in Firestore — clean up locally
          await sqliteDb.runAsync('DELETE FROM group_order_participants WHERE group_order_id = ?', [localOrder.id]);
          await sqliteDb.runAsync('DELETE FROM group_orders WHERE id = ?', [localOrder.id]);
          console.log(`[Sync] Removed stale local group order ${localOrder.id}`);
        }
      }

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        await sqliteDb.runAsync(
          `INSERT INTO group_orders (
            id, initiator_id, initiator_name, product_name, description, 
            target_quantity, current_quantity, wholesale_price, retail_price, 
            vendor_name, vendor_id, hub_latitude, hub_longitude, hub_address, 
            radius_km, status, deadline, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            current_quantity = excluded.current_quantity,
            status = excluded.status,
            updated_at = excluded.updated_at`,
          [
            data.id, data.initiatorId || data.vendorId || 'system', data.initiatorName || data.vendorName || 'Vendor', data.productName, data.description,
            data.targetQuantity, data.currentQuantity, data.wholesalePrice, data.retailPrice,
            data.vendorName, data.vendorId, data.hubLatitude, data.hubLongitude, data.hubAddress,
            data.radiusKm, data.status, data.deadline, data.createdAt, data.updatedAt
          ]
        );
        count++;
      }
    });

    console.log(`[Sync] Downloaded ${count} active group orders`);
    return count;
  } catch (error) {
    console.error('[Sync] Download group orders error:', error);
    return 0;
  }
}

/**
 * Trigger sync for group buying data (runs globally, not tied to a single user)
 */
export async function syncGroupBuying(): Promise<void> {
  console.log('[Sync] Starting Group Buying sync');
  try {
    await downloadActiveGroupOrders();
    console.log('[Sync] Group Buying sync complete');
  } catch (error) {
    console.error('[Sync] Group Buying sync error:', error);
  }
}

/**
 * Download semua data keikutsertaan (participants) user dari Firestore ke SQLite lokal.
 * Pendekatan: iterasi setiap group order yang sudah ada di SQLite lokal,
 * lalu query sub-koleksi participants-nya langsung (menghindari collectionGroup permission issue).
 * 
 * PENTING: Fungsi ini juga membersihkan partisipan lokal yang sudah tidak ada di Firestore
 * untuk mencegah "zombie orders" yang muncul kembali setelah dihapus.
 */
export async function downloadUserGroupParticipants(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const { where: fsWhere } = await import('firebase/firestore');

    // Ambil semua group order IDs yang ada di SQLite lokal
    const localOrders = await sqliteDb.getAllAsync<any>('SELECT id FROM group_orders');

    if (localOrders.length === 0) {
      // If no local orders exist, also clean up any orphaned participants
      await sqliteDb.runAsync('DELETE FROM group_order_participants WHERE user_id = ?', [userId]);
      console.log('[Sync] No local group orders to check for participants');
      return 0;
    }

    let count = 0;
    
    // Track all valid participant IDs from Firestore so we can clean up stale local ones
    const validParticipantIds = new Set<string>();

    for (const order of localOrders) {
      try {
        // Query participants sub-collection dari order ini, filter by userId
        const participantsRef = collection(firestoreDb, `group_orders/${order.id}/participants`);
        const q = query(participantsRef, fsWhere('userId', '==', userId));
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const participantId = data.id || docSnap.id;
          validParticipantIds.add(participantId);

          await sqliteDb.runAsync(
            `INSERT INTO group_order_participants (id, group_order_id, user_id, user_name, business_name, quantity, status, joined_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               quantity = excluded.quantity,
               status = excluded.status`,
            [
              participantId,
              data.groupOrderId || order.id,
              data.userId,
              data.userName || '',
              data.businessName || '',
              data.quantity,
              data.status || 'bergabung',
              data.joinedAt || Date.now(),
            ]
          );
          count++;
        }
      } catch (orderError) {
        // Skip individual order errors silently
        console.log(`[Sync] Could not fetch participants for order ${order.id}`);
      }
    }

    // Clean up local participants that no longer exist in Firestore
    // This prevents "zombie" participations from reappearing after deletion
    const localParticipants = await sqliteDb.getAllAsync<any>(
      'SELECT id, group_order_id FROM group_order_participants WHERE user_id = ?',
      [userId]
    );
    
    for (const localP of localParticipants) {
      if (!validParticipantIds.has(localP.id)) {
        await sqliteDb.runAsync('DELETE FROM group_order_participants WHERE id = ?', [localP.id]);
        console.log(`[Sync] Cleaned up stale local participant ${localP.id}`);
      }
    }

    console.log(`[Sync] Downloaded ${count} group order participations for user`);
    return count;
  } catch (error) {
    console.error('[Sync] Download user group participants error:', error);
    return 0;
  }
}

/**
 * Delete a participant's entry from Firestore when they cancel their order.
 * This ensures the deletion is persisted to the cloud and won't be re-downloaded.
 */
export async function deleteGroupOrderParticipantFromCloud(
  groupOrderId: string,
  userId: string
): Promise<void> {
  try {
    const { where: fsWhere, deleteDoc } = await import('firebase/firestore');
    
    // Find all participant docs for this user in this order
    const participantsRef = collection(firestoreDb, `group_orders/${groupOrderId}/participants`);
    const q = query(participantsRef, fsWhere('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    
    // Also update the parent order's current_quantity in Firestore
    await uploadGroupOrder(groupOrderId);
    
    console.log(`[Sync] Deleted participant for user ${userId} from group order ${groupOrderId}`);
  } catch (error) {
    console.error('[Sync] Delete participant from cloud error:', error);
  }
}

/**
 * Update a participant's quantity in Firestore.
 * This ensures edits are synced to the cloud.
 */
export async function updateGroupOrderParticipantInCloud(
  groupOrderId: string,
  userId: string,
  newQuantity: number
): Promise<void> {
  try {
    const { where: fsWhere } = await import('firebase/firestore');
    
    const participantsRef = collection(firestoreDb, `group_orders/${groupOrderId}/participants`);
    const q = query(participantsRef, fsWhere('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update the first matching participant doc
      const docRef = snapshot.docs[0].ref;
      await setDoc(docRef, { quantity: newQuantity }, { merge: true });
      
      // Delete extra duplicate docs if any
      for (let i = 1; i < snapshot.docs.length; i++) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(snapshot.docs[i].ref);
      }
    }
    
    // Also update the parent order's current_quantity in Firestore
    await uploadGroupOrder(groupOrderId);
    
    console.log(`[Sync] Updated participant qty to ${newQuantity} for user ${userId} in order ${groupOrderId}`);
  } catch (error) {
    console.error('[Sync] Update participant in cloud error:', error);
  }
}

