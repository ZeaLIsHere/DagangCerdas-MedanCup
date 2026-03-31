// DagangCerdas — AI Chatbot Service
// Asisten AI berbasis Groq API untuk menjawab pertanyaan manajerial
// Fallback ke respons lokal jika tidak ada API key

import Groq from 'groq-sdk';
import type { User } from '../../types';
import { AI_CONFIG, DEMO_USER } from '../../utils/constants';
import { formatRupiah } from '../../utils/formatters';
import { getAllProducts, getLowStockProducts, getSalesSummary } from '../database/repository';
import { getApiKey } from './apiKeyStore';

const groq = new Groq({ apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY });

function generateSystemPrompt(user: User | null): string {
  const userName = user?.name || DEMO_USER.name;
  const businessName = user?.businessName || DEMO_USER.businessName;
  const businessType = user?.businessType || DEMO_USER.businessType;
  
  return `Kamu adalah "Cerdas", asisten AI bisnis untuk pelaku UMKM di Kota Medan, Indonesia.
PENTING: DILARANG KERAS menggunakan tanda baca formatting markdown (seperti bintang ganda ** untuk bold) ataupun emoji/simbol apapun di dalam jawabanmu. Balaslah dengan kalimat teks biasa yang rapi dan bersih.

Profil User:
- Nama: ${userName}
- Bisnis: ${businessName}
- Tipe: ${businessType}
- Lokasi: Medan, Sumatera Utara

Tugasmu:
1. Menjawab pertanyaan manajerial tentang bisnis user secara spesifik
2. Merangkum laporan penjualan mingguan dalam format yang mudah dipahami
3. Memberikan saran praktis dan actionable untuk meningkatkan penjualan
4. Membantu menghitung margin keuntungan dan analisis keuangan sederhana
5. Memberikan insight tentang pasar UMKM di Medan

Aturan:
- Wajib berbicara dalam Bahasa Indonesia yang ramah, hangat, dan mudah dipahami
- Berikan jawaban yang spesifik dan actionable, bukan generik
- Jika diberi data penjualan, analisis dengan detail
- Jangan pernah menyarankan hal yang ilegal atau tidak etis
- Saat diminta rangkuman, gunakan format yang rapi (bullet points, tabel jika perlu)
- Referensikan lokasi dan konteks Medan jika relevan (KIM, Pasar Petisah, dll)
- Jawab dengan ringkas tapi informatif (maksimal 300 kata)
- TIDAK BOLEH menunjukkan alur pikir atau proses berpikirmu
- Langsung berikan jawaban final tanpa penjelasan cara mendapatkannya
- Jangan gunakan frasa seperti "Berdasarkan analisis saya", "Setelah mempertimbangkan", dll
- WAJIB jawab langsung tanpa kalimat pembuka atau penutup panjang
- Jika diminta insight, WAJIB gunakan format [TIPE], [JUDUL], [ISI]`;
}

// ==========================================
// LOCAL FALLBACK RESPONSES
// ==========================================

const LOCAL_RESPONSES: Record<string, string> = {
  'default': 'Halo! Saya Cerdas, asisten AI bisnis Anda. Saya bisa membantu:\n\n• Analisis penjualan\n• Saran restok produk\n• Tips meningkatkan omzet\n• Rangkuman laporan\n\nAda yang bisa saya bantu hari ini?',
  'laporan': ' Rangkuman Penjualan Minggu Ini\n\nBerdasarkan data toko Anda:\n\n• Total omzet: Rp 3.250.000\n• Estimasi profit: Rp 975.000 (margin 30%)\n• Total transaksi: 32 kali\n• Rata-rata per transaksi: Rp 101.562\n\nProduk Terlaris:\n1.  Ayam Goreng — 45 terjual\n2.  Nasi Putih — 60 porsi\n3.  Kopi Tubruk — 28 gelas\n\nSaran: Pertimbangkan menambah variasi menu ayam (ayam bakar, ayam penyet) karena permintaan tinggi. Potensi peningkatan omzet 15-20%',
  'stok': ' Analisis Stok Produk\n\n Produk perlu segera di-restok:\n• Minyak Goreng 1L — sisa 3 botol\n• Gula Pasir — sisa 4 kg\n\n Stok aman:\n• Nasi Putih — 100 porsi\n• Telur Ayam — 100 butir\n• Air Mineral — 80 botol\n\n Saran: Gunakan fitur Belanja Kolektif untuk restok Minyak Goreng dan Gula Pasir. Bergabung dengan 3 UMKM lain bisa menghemat hingga 21% dibanding beli eceran di pasar!',
  'tips': ' 5 Tips Meningkatkan Omzet Warung Anda:\n\n1. Jam Puncak Optimal — Data menunjukkan penjualan tertinggi pukul 11:00-13:00. Pastikan stok menu utama siap di jam tersebut.\n\n2. Bundling Menu — Buat paket hemat (Nasi + Ayam + Teh = Rp 23.000 dari Rp 25.000). Ini meningkatkan Average Order Value.\n\n3. QRIS Aktif — 30% pelanggan Anda bayar non-tunai. Tampilkan QR Code di tempat yang mudah terlihat.\n\n4. Promosi di Jam Sepi — Beri diskon 10% untuk pembelian pukul 14:00-16:00 untuk meratakan penjualan.\n\n5. Catat Semua — Gunakan Smart Kasir untuk setiap transaksi agar AI bisa memberikan insight yang lebih akurat.',
  'prediksi': ' Prediksi Kebutuhan Stok 7 Hari Ke Depan\n\nBerdasarkan tren penjualan sebelumnya:\n\n| Produk | Prediksi Kebutuhan | Confidence |\n|--------|-------------------|-------------|\n| Nasi Putih | 85 porsi | 92% |\n| Ayam Goreng | 50 potong | 87% |\n| Teh Manis | 40 gelas | 91% |\n| Kopi Tubruk | 30 gelas | 85% |\n| Telur Dadar | 25 porsi | 78% |\n\n Aksi Disarankan:\n- Siapkan minimal 10kg beras untuk 85 porsi nasi\n- Order 50 potong ayam dari supplier (hemat Rp 50.000 via Belanja Kolektif)\n- Stok teh dan kopi cukup untuk minggu ini',
  'medan': ' Insight Pasar UMKM Medan\n\nMedan adalah kota terbesar ke-3 di Indonesia dengan populasi 2,5 juta jiwa. Peluang bisnis makanan sangat tinggi!\n\nTren UMKM Medan 2026:\n• Makanan khas Batak (Arsik, Saksang) semakin demand\n• Kopi Sidikalang dan Markisa Medan jadi primadona\n• Digitalisasi QRIS meningkat 45% YoY\n• Belanja online meningkat, tapi warung tetap jadi pilihan utama\n\n Warung Anda dekat dengan Kawasan Industri Medan (KIM). Manfaatkan pekerja pabrik sebagai pelanggan potensial di jam makan siang!',
};

function getLocalResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('laporan') || lower.includes('rangkum') || lower.includes('penjualan') || lower.includes('omzet')) {
    return LOCAL_RESPONSES['laporan'];
  }
  if (lower.includes('stok') || lower.includes('restok') || lower.includes('habis') || lower.includes('persediaan')) {
    return LOCAL_RESPONSES['stok'];
  }
  if (lower.includes('tips') || lower.includes('saran') || lower.includes('meningkat') || lower.includes('naikin')) {
    return LOCAL_RESPONSES['tips'];
  }
  if (lower.includes('prediksi') || lower.includes('ramalan') || lower.includes('minggu depan') || lower.includes('perkiraan')) {
    return LOCAL_RESPONSES['prediksi'];
  }
  if (lower.includes('medan') || lower.includes('pasar') || lower.includes('kompetitor') || lower.includes('tren')) {
    return LOCAL_RESPONSES['medan'];
  }
  return LOCAL_RESPONSES['default'];
}

// ==========================================
// BUSINESS CONTEXT BUILDER
// ==========================================

export async function buildBusinessContext(userId?: string): Promise<string> {
  try {
    const finalUserId = userId || DEMO_USER.id;
    const [summary, lowStock, products] = await Promise.all([
      getSalesSummary(finalUserId, 7),
      getLowStockProducts(finalUserId),
      getAllProducts(finalUserId),
    ]);

    let context = '\n\n--- DATA BISNIS TERKINI ---\n';
    context += `Total Produk Terdaftar: ${products.length}\n`;
    context += `Produk Aktif: ${products.filter(p => p.isActive).length}\n`;
    context += `Omzet 7 Hari Terakhir: ${formatRupiah(summary.totalRevenue)}\n`;
    context += `Total Profit Estimasi: ${formatRupiah(summary.totalProfit)}\n`;
    context += `Total Transaksi: ${summary.totalTransactions}\n`;
    context += `Rata-rata per Transaksi: ${formatRupiah(summary.averagePerTransaction)}\n`;

    if (summary.topProducts.length > 0) {
      context += `\nProduk Terlaris:\n`;
      summary.topProducts.forEach((p, i) => {
        context += `${i + 1}. ${p.name} — ${p.quantity} terjual (${formatRupiah(p.revenue)})\n`;
      });
    }

    if (lowStock.length > 0) {
      context += `\nProduk Stok Rendah (PERLU RESTOK):\n`;
      lowStock.forEach(p => {
        context += `- ${p.name}: sisa ${p.stock} ${p.unit} (minimum: ${p.minStock})\n`;
      });
    }

    const activeProducts = products.filter(p => p.isActive).slice(0, 10);
    if (activeProducts.length > 0) {
      context += `\nDaftar Produk (stok saat ini):\n`;
      activeProducts.forEach(p => {
        context += `- ${p.name}: ${p.stock} ${p.unit}, harga ${formatRupiah(p.price)}, modal ${formatRupiah(p.costPrice)}\n`;
      });
    }

    context += '--- END DATA ---\n';
    return context;
  } catch (error) {
    console.error('[AI] Build context error:', error);
    return '';
  }
}

// ==========================================
// AI RESPONSE POST-PROCESSING
// ==========================================

/**
 * Removes <think>...</think> tags and their content from AI responses.
 * Also handles unclosed tags in case of token limit cuts.
 */
export function cleanResponse(text: string): string {
  if (!text) return '';
  
  // 1. Remove content between <think> and </think> (including the tags)
  // [\\s\\S]*? makes it non-greedy and includes newlines
  const withNoThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // 2. Handle case where <think> is present but </think> is missing (truncated response)
  const stillNoThink = withNoThink.replace(/<think>[\s\S]*$/gi, '');
  
  // 3. Remove markdown bold (**) and other common symbols as requested by user
  // Also remove __ (double underscore) just in case
  const cleaned = stillNoThink.replace(/\*\*/g, '').replace(/__/g, '');
  
  return cleaned.trim();
}

// ==========================================
// AI API CALL
// ==========================================

/**
 * Send message to AI API with business context
 * Returns AI response string, or empty string on failure (triggers fallback)
 */
export async function sendToAI(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  currentUser: User | null = null
): Promise<string> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return '';
  }

  try {
    const userId = currentUser?.id || DEMO_USER.id;
    const businessContext = await buildBusinessContext(userId);
    const systemPromptWithContext = generateSystemPrompt(currentUser) + businessContext;

    // Use dynamic API key for every request
    const groqClient = new Groq({ apiKey });
    
    // Prepare messages for Groq API
    const messages = [
      {
        role: 'system',
        content: systemPromptWithContext
      },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const chatCompletion = await groqClient.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })) as any,
      model: 'qwen/qwen3-32b',
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxOutputTokens,
    });

    const rawResponse = chatCompletion.choices[0]?.message?.content || '';
    return cleanResponse(rawResponse);
  } catch (error: any) {
    console.error('[AI] Request error:', error?.message || error);
    return '';
  }
}

// ==========================================
// HIGH-LEVEL CHAT FUNCTION
// ==========================================

/**
 * Main chat function — tries AI first, falls back to local responses
 */
export async function chat(
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = [],
  currentUser: User | null = null
): Promise<{ response: string; isAI: boolean }> {
  // Try AI first
  const aiResponse = await sendToAI(userMessage, conversationHistory, currentUser);

  if (aiResponse) {
    return { response: aiResponse, isAI: true };
  }

  // Fallback to local responses
  return { response: getLocalResponse(userMessage), isAI: false };
}

// ==========================================
// AI MENTOR — GENERATE INSIGHTS
// ==========================================

/**
 * Generate AI-powered business insights for the AI Mentor screen
 */
export async function generateAIInsights(currentUser: User | null = null): Promise<{ insights: string; isAI: boolean }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { insights: '', isAI: false };
  }

  try {
    const userId = currentUser?.id || DEMO_USER.id;
    const businessContext = await buildBusinessContext(userId);
    const userName = currentUser?.name || DEMO_USER.name;

    const prompt = `Berdasarkan data bisnis berikut, berikan 4-5 insight dan saran bisnis yang spesifik dan actionable untuk ${userName} sebagai pemilik warung di Medan.
${businessContext}

Format jawaban:
Untuk setiap insight, gunakan format berikut (pisahkan dengan "---"):
[TIPE: warning/success/info/tip]
[JUDUL]: Judul singkat insight
[ISI]: Penjelasan detail dan saran actionable (2-3 kalimat)
---

Contoh:
[TIPE: warning]
[JUDUL]: 2 Produk Perlu Restok Segera
[ISI]: Minyak Goreng dan Gula Pasir sudah di bawah minimum stok. Gunakan fitur Belanja Kolektif untuk hemat 15-21% dibanding beli eceran.
---

Berikan insight yang relevan dengan data di atas. Fokus pada hal yang bisa langsung dilakukan.`;

    const groqClient = new Groq({ apiKey });
    
    const messages = [
      {
        role: 'system',
        content: 'Kamu adalah AI mentor bisnis UMKM di Medan. DILARANG KERAS menggunakan tanda bintang ** untuk bold atau emoji apapun. Jawab langsung tanpa menunjukkan alur pikir atau proses analisis.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const chatCompletion = await groqClient.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })) as any,
      model: 'qwen/qwen3-32b',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = chatCompletion.choices[0]?.message?.content || '';
    return { insights: cleanResponse(reply), isAI: true };
  } catch (error: any) {
    console.warn('[AI Mentor] Generate insights error:', error?.message || error);
    return { insights: '', isAI: false };
  }
}
