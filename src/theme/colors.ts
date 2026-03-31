// DagangCerdas Design System — Color Palette
// Dominan: Biru Muda (kepercayaan & profesionalisme)
// Aksen: Teal (pertumbuhan & inovasi)

export const colors = {
  // Primary — Biru Muda (Trust & Reliability)
  primary: {
    50:  '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Main primary
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Accent — Teal (Growth & Innovation)
  accent: {
    50:  '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#26A69A',
    500: '#009688',
    600: '#00897B',
    700: '#00796B',
  },

  // Semantic colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // Neutral
  neutral: {
    0:   '#FFFFFF',
    50:  '#FAFBFD',
    100: '#F5F7FA',
    200: '#EEF1F5',
    300: '#E0E4EA',
    400: '#BDC3CE',
    500: '#9EA5B1',
    600: '#757D8A',
    700: '#565E6C',
    800: '#3A4150',
    900: '#1E2533',
  },

  // Backgrounds
  background: {
    primary: '#F5F9FF',     // Subtle blue tint
    secondary: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },

  // Text
  text: {
    primary: '#1E2533',
    secondary: '#565E6C',
    tertiary: '#9EA5B1',
    inverse: '#FFFFFF',
    link: '#1976D2',
  },

  // Borders
  border: {
    light: '#EEF1F5',
    default: '#E0E4EA',
    focus: '#2196F3',
  },

  // Gradient presets
  gradient: {
    primary: ['#2196F3', '#1565C0'] as const,
    accent: ['#26A69A', '#00796B'] as const,
    hero: ['#1976D2', '#0D47A1'] as const,
    card: ['#42A5F5', '#1E88E5'] as const,
    warm: ['#FF9800', '#F44336'] as const,
  },
};
