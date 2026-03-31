// DagangCerdas — Root Layout
// Inisialisasi database, auth, dan navigation

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from '../src/services/database/schema';
import { onAuthChanged } from '../src/services/firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuthStore } from '../src/stores/authStore';
import { upsertUser, getUserById } from '../src/services/database/repository';
import { pullFromServer, startAutoSync } from '../src/services/database/sync';
import { colors } from '../src/theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary[500],
    secondary: colors.accent[500],
    background: colors.background.primary,
    surface: colors.background.secondary,
    error: colors.error,
  },
};

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const { setUser, isAuthenticated, logout } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      try {
        await initializeDatabase();
        console.log('[App] Initialization complete');
      } catch (error) {
        console.error('[App] Initialization failed:', error);
      } finally {
        setIsDbReady(true);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChanged((firebaseUser) => {
      setFbUser(firebaseUser);
      if (firebaseUser) {
        const minimalUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Pengguna UMKM',
          email: firebaseUser.email || '',
        };
        setUser(minimalUser as any);
        upsertUser(minimalUser).catch(e => console.error('[SQLite] Failed to upsert user:', e));
      } else if (isAuthenticated) {
        // Clear ghost dummy state if firebase is logged out
        logout();
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isDbReady || !isAuthReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!fbUser && !inAuthGroup) {
      // Tunggu layout ter-mount sebelum navigasi
      setTimeout(() => router.replace('/(auth)/login'), 1);
    } else if (fbUser && inAuthGroup) {
      setTimeout(() => router.replace('/(tabs)'), 1);
    }
  }, [fbUser, segments, isDbReady, isAuthReady]);

  // Handle Sync (Push & Pull)
  const [isSyncingData, setIsSyncingData] = useState(false);
  useEffect(() => {
    if (!fbUser || !isDbReady) return;

    let syncInterval: any = null;

    async function handleInitialSync() {
      try {
        setIsSyncingData(true);
        // Pull data from server when logging in
        await pullFromServer(fbUser!.uid);
        console.log('[Sync] Initial pull complete');
        
        // Refresh authStore with full user data from SQLite
        const fullUser = await getUserById(fbUser!.uid);
        if (fullUser) {
          setUser(fullUser);
        }

        // Start recurring outbox sync
        syncInterval = startAutoSync(fbUser!.uid);
      } catch (error) {
        console.error('[Sync] Sync initialization failed:', error);
      } finally {
        setIsSyncingData(false);
      }
    }

    handleInitialSync();

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [fbUser?.uid, isDbReady]);

  if (!isDbReady || !isAuthReady || isSyncingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen 
          name="chat/index" 
          options={{ 
            headerShown: true,
            title: 'AI Asisten Cerdas',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="ai-mentor/index" 
          options={{ 
            headerShown: true,
            title: 'AI Mentor Bisnis',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="transaction/index" 
          options={{ 
            headerShown: true,
            title: 'Riwayat Transaksi',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="transaction/[id]" 
          options={{ 
            headerShown: true,
            title: 'Detail Transaksi',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
