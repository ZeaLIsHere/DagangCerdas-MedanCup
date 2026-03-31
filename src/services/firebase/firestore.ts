// DagangCerdas — Firestore Service
// Abstraksi untuk operasi baca/tulis ke Firebase Firestore
// Setiap data disimpan di bawah path users/{userId}/...

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import type { Product, Transaction } from '../../types';

/**
 * Simpan atau perbarui dokumen ke Firestore
 */
export async function saveToFirestore(
  userId: string,
  tableName: string,
  recordId: string,
  data: any
): Promise<void> {
  const collectionPath = `users/${userId}/${tableName}`;
  const docRef = doc(db, collectionPath, recordId);
  
  // Konversi data agar kompatibel dengan Firestore (misal: penanganan Date)
  const firestoreData = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  await setDoc(docRef, firestoreData, { merge: true });
}

/**
 * Hapus dokumen dari Firestore
 */
export async function removeFromFirestore(
  userId: string,
  tableName: string,
  recordId: string
): Promise<void> {
  const collectionPath = `users/${userId}/${tableName}`;
  const docRef = doc(db, collectionPath, recordId);
  await deleteDoc(docRef);
}

/**
 * Ambil semua data user dari koleksi tertentu (untuk Initial Pull)
 */
export async function fetchCollection(
  userId: string,
  tableName: string
): Promise<any[]> {
  const collectionPath = `users/${userId}/${tableName}`;
  const q = query(collection(db, collectionPath));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  }));
}

/**
 * Sinkronisasi seluruh profil user (Initial Setup)
 */
export async function fetchAllUserData(userId: string): Promise<{
  products: any[],
  transactions: any[]
}> {
  console.log(`[Firestore] Fetching all data for user ${userId}...`);
  
  const [products, transactions] = await Promise.all([
    fetchCollection(userId, 'products'),
    fetchCollection(userId, 'transactions'),
  ]);

  return { products, transactions };
}

/**
 * Simpan profil user tingkat-atas
 */
export async function saveUserProfile(user: any): Promise<void> {
  const docRef = doc(db, 'users', user.id);
  await setDoc(docRef, {
    ...user,
    updatedAt: Timestamp.now()
  }, { merge: true });
}

/**
 * Tarik profil user tingkat-atas
 */
export async function fetchUserProfile(userId: string): Promise<any | null> {
  const docRef = doc(db, 'users', userId);
  const snapshot = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
  
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}
