// DagangCerdas — Firebase Configuration
// Konfigurasi Firebase project untuk Auth & Firestore

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
// @ts-ignore - getReactNativePersistence exists in react-native environment
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config — ISI DENGAN DATA DARI FIREBASE CONSOLE
// Langkah: https://console.firebase.google.com → Buat project → Project Settings → Web App
const firebaseConfig = {
  apiKey: 'AIzaSyDmGr_P8JPDwI2Cs7wJGK50Z9qFf4voqf8',
  authDomain: 'mobile-apps-10a61.firebaseapp.com',
  projectId: 'mobile-apps-10a61',
  storageBucket: 'mobile-apps-10a61.firebasestorage.app',
  messagingSenderId: '421514159709',
  appId: '1:421514159709:web:c442d57b99670f33088fb4',
  measurementId: 'G-BGBN5RYVQR',
};

// Initialize Firebase (singleton pattern)
let app: ReturnType<typeof initializeApp>;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with AsyncStorage persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: (getReactNativePersistence as any)(AsyncStorage),
  });
} catch {
  // Auth already initialized
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
