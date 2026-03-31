// DagangCerdas — Firebase Auth Service
// Email/Password auth dengan fallback ke demo mode

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}

/**
 * Login dengan email & password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isFirebaseConfigured) {
    console.log('[Auth] Firebase not configured, using demo mode');
    return { success: false, error: 'DEMO_MODE' };
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    let errorMessage = 'Terjadi kesalahan saat login.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Email belum terdaftar. Silakan daftar terlebih dahulu.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Kata sandi salah. Silakan coba lagi.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Format email tidak valid.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Terlalu banyak percobaan. Coba lagi nanti.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Tidak ada koneksi internet.';
        break;
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Register akun baru
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  if (!isFirebaseConfigured) {
    return { success: false, error: 'DEMO_MODE' };
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name
    await updateProfile(result.user, { displayName });

    return { success: true, user: result.user };
  } catch (error: any) {
    let errorMessage = 'Terjadi kesalahan saat mendaftar.';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email sudah terdaftar. Silakan login.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Format email tidak valid.';
        break;
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    await signOut(auth);
  } catch (error) {
    console.error('[Auth] Logout error:', error);
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChanged(callback: (user: FirebaseUser | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  if (!isFirebaseConfigured) return null;
  return auth.currentUser;
}
