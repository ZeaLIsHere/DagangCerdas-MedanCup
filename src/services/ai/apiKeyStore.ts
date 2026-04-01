// DagangCerdas — API Key Store
// Menyimpan API key Groq AI secara aman menggunakan expo-secure-store
// Environment variables support for better configuration management

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE = 'dagangcerdas_groq_key';

let cachedKey: string | null = null;

/**
 * Get the hardcoded API key from environment variables
 */
function getHardcodedApiKey(): string | null {
  try {
    // Try process.env first (most reliable for .env files)
    const envKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    console.log('[APIKey] Process.env check:', envKey ? envKey.substring(0, 10) + '...' : 'null');
    
    if (envKey) return envKey;
    
    // Fallback to Constants.expoConfig (for production builds)
    const configKey = Constants.expoConfig?.extra?.groqApiKey;
    console.log('[APIKey] Constants.expoConfig check:', configKey ? configKey.substring(0, 10) + '...' : 'null');
    
    return configKey || null;
  } catch (error) {
    console.error('[APIKey] Error reading env vars:', error);
    return null;
  }
}

/**
 * Get the stored Groq API key
 */
export async function getApiKey(): Promise<string | null> {
  // 1. Cek dari environment variables
  const hardcodedKey = getHardcodedApiKey();
  console.log('[APIKey] Checking env key:', hardcodedKey ? hardcodedKey.substring(0, 10) + '...' : 'null');
  
  if (hardcodedKey && hardcodedKey.startsWith('gsk_')) {
    console.log('[APIKey] Using environment variable API key');
    return hardcodedKey;
  }

  // 2. Cek cache memori
  if (cachedKey) {
    console.log('[APIKey] Using cached key');
    return cachedKey;
  }

  try {
    console.log('[APIKey] Checking SecureStore...');
    const key = await SecureStore.getItemAsync(API_KEY_STORAGE);
    console.log('[APIKey] SecureStore result:', key ? key.substring(0, 10) + '...' : 'null');
    
    cachedKey = key;
    return key;
  } catch (error) {
    console.error('[APIKey] Get error:', error);
    return null;
  }
}

/**
 * Save/update the Groq API key
 */
export async function setApiKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_KEY_STORAGE, key);
    cachedKey = key;
    console.log('[APIKey] API key saved successfully');
  } catch (error) {
    console.error('[APIKey] Save error:', error);
    throw error;
  }
}

/**
 * Remove the stored API key
 */
export async function removeApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE);
    cachedKey = null;
    console.log('[APIKey] API key removed');
  } catch (error) {
    console.error('[APIKey] Remove error:', error);
  }
}

/**
 * Check if an API key is stored or hardcoded
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 0;
}
