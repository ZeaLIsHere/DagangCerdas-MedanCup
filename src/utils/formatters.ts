// DagangCerdas — Formatting Utilities

/**
 * Format angka ke format Rupiah Indonesia
 * formatRupiah(50000) => "Rp 50.000"
 * formatRupiah(1500000) => "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  
  const formatted = Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return amount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Format angka ke format singkat
 * formatShortNumber(1500000) => "1,5jt"
 * formatShortNumber(50000) => "50rb"
 */
export function formatShortNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace('.0', '')}rb`;
  }
  return num.toString();
}

/**
 * Format tanggal ke format Indonesia
 */
export function formatDate(timestamp: number, format: 'short' | 'long' | 'time' | 'full' = 'short'): string {
  const date = new Date(timestamp);
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  switch (format) {
    case 'short':
      return `${day}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    case 'long':
      return `${day} ${months[month]} ${year}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'full':
      return `${day} ${months[month]} ${year}, ${hours}:${minutes}`;
    default:
      return `${day} ${monthsShort[month]} ${year}`;
  }
}

/**
 * Format relative time ("2 jam lalu", "baru saja")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  
  return formatDate(timestamp, 'short');
}

/**
 * Format persentase
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`;
}

/**
 * Capitalize first letter of every word
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, maxLength: number = 30): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}
