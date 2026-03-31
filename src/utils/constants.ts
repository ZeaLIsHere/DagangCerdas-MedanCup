// DagangCerdas — Constants & App Config

export const APP_NAME = 'DagangCerdas';
export const APP_VERSION = '1.0.0';
export const APP_TAGLINE = 'Solusi Cerdas UMKM Naik Kelas';

// Default location: Medan, Sumatera Utara
export const DEFAULT_LOCATION = {
  latitude: 3.5952,
  longitude: 98.6722,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Group buying radius options (km)
export const RADIUS_OPTIONS = [1, 2, 3, 5, 10] as const;
export const DEFAULT_RADIUS_KM = 5;

// Dummy user for demo
export const DEMO_USER = {
  id: 'demo-user-001',
  name: 'Ahmad Fadli',
  email: 'ahmad.fadli@gmail.com',
  businessName: 'Warung Nasi Pak Fadli',
  businessType: 'warung' as const,
  phone: '081234567890',
  latitude: 3.5952,
  longitude: 98.6722,
};

// AI Chatbot config (Google Gemini)
// API Key now loaded from .env file via environment variables
export const AI_CONFIG = {
  model: 'gemini-flash-latest',
  maxOutputTokens: 1024,
  temperature: 0.7,
};

// Date/time formatting
export const DATE_FORMAT = {
  short: 'DD/MM/YYYY',
  long: 'DD MMMM YYYY',
  time: 'HH:mm',
  full: 'DD MMMM YYYY, HH:mm',
};

// Currency
export const CURRENCY = {
  code: 'IDR',
  symbol: 'Rp',
  locale: 'id-ID',
};

// Tab icons mapping
export const TAB_ICONS = {
  dashboard: 'home',
  pos: 'cart',
  inventory: 'cube',
  groupBuying: 'people',
  profile: 'person',
} as const;

// Low stock threshold
export const DEFAULT_MIN_STOCK = 5;
