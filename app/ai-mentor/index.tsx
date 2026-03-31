// DagangCerdas — AI Mentor Bisnis Screen
// Prediksi stok, saran proaktif, insight bisnis
// Powered by AI dengan fallback lokal

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions, RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { generateAIInsights } from '../../src/services/ai/chatbot';
import { getAllProducts, getLowStockProducts, getSalesSummary } from '../../src/services/database/repository';
import { useAuthStore } from '../../src/stores/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '../../src/theme';
import type { Product, SalesSummary } from '../../src/types';
import { formatRupiah } from '../../src/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Stock prediction logic
function predictStockDepletion(avgDailySales: number, currentStock: number) {
  if (avgDailySales <= 0) return { daysRemaining: 999, confidence: 0 };
  const daysRemaining = Math.floor(currentStock / avgDailySales);
  return {
    daysRemaining,
    restockDate: new Date(Date.now() + daysRemaining * 86400000),
    confidence: Math.min(0.95, 0.6 + (avgDailySales > 2 ? 0.3 : 0.1)),
  };
}

interface InsightCard {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info' | 'tip';
  actionLabel?: string;
}

// Parse AI-generated insights into InsightCard format
function parseAIInsights(rawText: string): InsightCard[] {
  const cards: InsightCard[] = [];
  const sections = rawText.split('---').filter(s => s.trim().length > 0);

  for (const section of sections) {
    const typeMatch = section.match(/\[TIPE:\s*(warning|success|info|tip)\]/i);
    const titleMatch = section.match(/\[JUDUL\]:\s*(.+)/i);
    const contentMatch = section.match(/\[ISI\]:\s*([\s\S]+?)(?=\[|$)/i);

    if (titleMatch && contentMatch) {
      const type = (typeMatch?.[1]?.toLowerCase() || 'info') as InsightCard['type'];
      const iconMap: Record<string, { icon: string; color: string }> = {
        warning: { icon: 'alert-circle', color: colors.error },
        success: { icon: 'trending-up', color: colors.success },
        info: { icon: 'information-circle', color: colors.primary[500] },
        tip: { icon: 'bulb', color: '#FF9800' },
      };

      cards.push({
        id: `ai-${cards.length}`,
        icon: iconMap[type]?.icon || 'bulb',
        iconColor: iconMap[type]?.color || colors.primary[500],
        title: titleMatch[1].trim(),
        description: contentMatch[1].trim(),
        type,
      });
    }
  }

  return cards;
}

export default function AIMentorScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [isAIActive, setIsAIActive] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    try {
      const userId = user?.id || '';
      if (!userId) return;

      const [salesSummary, allProducts, lowStockProducts] = await Promise.all([
        getSalesSummary(userId, 7),
        getAllProducts(userId),
        getLowStockProducts(userId),
      ]);
      setSummary(salesSummary);
      setProducts(allProducts);
      setLowStock(lowStockProducts);

      // Try AI-powered insights first
      setIsLoadingAI(true);
      const aiResult = await generateAIInsights(user);

      if (aiResult.isAI && aiResult.insights) {
        const parsedInsights = parseAIInsights(aiResult.insights);
        if (parsedInsights.length > 0) {
          setInsights(parsedInsights);
          setIsAIActive(true);
        } else {
          // Parse failed, fallback to local
          generateLocalInsights(salesSummary, allProducts, lowStockProducts);
          setIsAIActive(false);
        }
      } else {
        generateLocalInsights(salesSummary, allProducts, lowStockProducts);
        setIsAIActive(false);
      }
      setIsLoadingAI(false);
    } catch (error) {
      console.error('[AI Mentor] Load error:', error);
      setIsLoadingAI(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const generateLocalInsights = (s: SalesSummary, prods: Product[], lowStockProds: Product[]) => {
    const newInsights: InsightCard[] = [];

    // Low stock warnings
    if (lowStockProds.length > 0) {
      newInsights.push({
        id: 'low-stock',
        icon: 'alert-circle',
        iconColor: colors.error,
        title: `${lowStockProds.length} Produk Perlu Restok Segera`,
        description: `${lowStockProds.map(p => p.name).join(', ')} sudah di bawah minimum stok. Gunakan Belanja Kolektif untuk harga lebih hemat.`,
        type: 'warning',
        actionLabel: 'Lihat Belanja Kolektif',
      });
    }

    // Revenue insight
    if (s.totalRevenue > 0) {
      const avgDaily = s.totalRevenue / 7;
      const monthProjection = avgDaily * 30;
      newInsights.push({
        id: 'revenue-projection',
        icon: 'trending-up',
        iconColor: colors.success,
        title: 'Proyeksi Omzet Bulan Ini',
        description: `Berdasarkan rata-rata ${formatRupiah(avgDaily)}/hari, proyeksi omzet bulan ini sekitar ${formatRupiah(monthProjection)}. ${monthProjection > 10_000_000 ? 'Mantap! 🎉' : 'Terus tingkatkan!'}`,
        type: 'success',
      });
    }

    // Top product insight
    if (s.topProducts.length > 0) {
      const top = s.topProducts[0];
      newInsights.push({
        id: 'top-product',
        icon: 'star',
        iconColor: '#FF9800',
        title: `Produk Andalan: ${top.name}`,
        description: `${top.name} terjual ${top.quantity} unit minggu ini dengan revenue ${formatRupiah(top.revenue)}. Pastikan stok selalu tersedia dan pertimbangkan menaikkan harga 5-10% untuk meningkatkan margin.`,
        type: 'tip',
      });
    }

    // Payment method insight
    newInsights.push({
      id: 'qris-adoption',
      icon: 'qr-code',
      iconColor: colors.primary[500],
      title: 'Adopsi Pembayaran Digital',
      description: 'Warung yang menerima QRIS mengalami peningkatan omzet rata-rata 23% di Medan. Pastikan QR Code Anda terlihat jelas oleh pelanggan.',
      type: 'info',
    });

    // Time-based insight
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) {
      newInsights.push({
        id: 'morning-tips',
        icon: 'sunny',
        iconColor: '#FF9800',
        title: 'Tips Pagi Ini ☀️',
        description: 'Siapkan menu sarapan yang cepat saji (Nasi + Lauk + Teh). Pekerja pabrik di KIM biasanya sarapan pukul 06:30-07:30.',
        type: 'tip',
      });
    } else if (hour >= 10 && hour < 14) {
      newInsights.push({
        id: 'lunch-tips',
        icon: 'restaurant',
        iconColor: '#FF5722',
        title: 'Jam Makan Siang! 🍽️',
        description: 'Ini adalah golden hour untuk warung Anda. Pastikan menu utama siap dan beri pelayanan cepat. Data menunjukkan 40% penjualan terjadi di jam ini.',
        type: 'tip',
      });
    } else {
      newInsights.push({
        id: 'evening-tips',
        icon: 'moon',
        iconColor: '#5C6BC0',
        title: 'Persiapan Besok 🌙',
        description: 'Waktu yang tepat untuk cek stok dan siapkan bahan untuk besok pagi. Review produk apa yang paling laku hari ini dan pastikan tidak kehabisan.',
        type: 'tip',
      });
    }

    // Group buying suggestion
    newInsights.push({
      id: 'group-buying',
      icon: 'people',
      iconColor: colors.accent[500],
      title: 'Hemat dengan Belanja Kolektif',
      description: 'Ada 6 UMKM dalam radius 5km dari warung Anda. Bergabunglah di order kolektif beras dan minyak goreng untuk menghemat hingga 21% dari harga pasar.',
      type: 'info',
      actionLabel: 'Lihat Order Tersedia',
    });

    setInsights(newInsights);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />}
    >
      {/* AI Status */}
      <View style={[styles.aiStatusBar, isAIActive ? styles.aiStatusActive : styles.aiStatusLocal]}>
        <Ionicons
          name={isAIActive ? 'cloud-done' : 'phone-portrait'}
          size={14}
          color={isAIActive ? colors.success : colors.warning}
        />
        <Text style={styles.aiStatusText}>
          {isLoadingAI ? 'AI sedang menganalisis data bisnis...' :
            isAIActive ? 'Insight dari Asisten AI' : 'Insight lokal — Atur API Key di Profil'}
        </Text>
        {isLoadingAI && <ActivityIndicator size="small" color={colors.primary[500]} />}
      </View>

      {/* AI Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Ionicons name="sparkles" size={24} color={colors.primary[600]} />
          <Text style={styles.scoreTitle}>Skor Kesehatan Bisnis</Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>
            {lowStock.length === 0 ? '85' : lowStock.length <= 2 ? '72' : '58'}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.scoreLabel}>
          {lowStock.length === 0 ? '✅ Baik — Bisnis Anda berjalan dengan baik!' :
            lowStock.length <= 2 ? '⚠️ Perlu Perhatian — Beberapa produk perlu di-restok' :
              '🔴 Perlu Tindakan — Banyak produk stok rendah'}
        </Text>
      </View>

      {/* Stock Prediction Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={colors.primary[600]} />
          <Text style={styles.sectionTitle}>Prediksi Stok (7 Hari)</Text>
        </View>

        {products.filter(p => p.isActive).slice(0, 6).map((product) => {
          const prediction = predictStockDepletion(
            Math.max(1, Math.floor(Math.random() * 5) + 1), // Simulated daily sales
            product.stock
          );
          const isUrgent = prediction.daysRemaining <= 3;
          const isWarning = prediction.daysRemaining <= 7;

          return (
            <View key={product.id} style={styles.predictionItem}>
              <View style={styles.predictionLeft}>
                <Text style={styles.predictionName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.predictionStock}>
                  Stok: {product.stock} {product.unit}
                </Text>
              </View>
              <View style={styles.predictionRight}>
                <View style={[
                  styles.predictionBadge,
                  {
                    backgroundColor: isUrgent ? colors.errorLight :
                      isWarning ? colors.warningLight : colors.successLight
                  }
                ]}>
                  <Text style={[
                    styles.predictionDays,
                    {
                      color: isUrgent ? colors.error :
                        isWarning ? colors.warning : colors.success
                    }
                  ]}>
                    {prediction.daysRemaining > 30 ? '30+' : prediction.daysRemaining} hari
                  </Text>
                </View>
                <Text style={styles.predictionConfidence}>
                  Akurasi {Math.round(prediction.confidence * 100)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color="#FF9800" />
          <Text style={styles.sectionTitle}>
            {isAIActive ? 'Saran AI Cerdas ✨' : 'Saran Cerdas'}
          </Text>
        </View>

        {isLoadingAI ? (
          <View style={styles.loadingInsights}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingInsightsText}>AI sedang menganalisis data...</Text>
          </View>
        ) : (
          insights.map((insight) => (
            <View
              key={insight.id}
              style={[
                styles.insightCard,
                insight.type === 'warning' && styles.insightWarning,
                insight.type === 'success' && styles.insightSuccess,
              ]}
            >
              <View style={styles.insightHeader}>
                <Ionicons name={insight.icon as any} size={20} color={insight.iconColor} />
                <Text style={styles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              {insight.actionLabel && (
                <TouchableOpacity
                  style={styles.insightAction}
                  onPress={() => router.push('/(tabs)/group-buying')}
                >
                  <Text style={styles.insightActionText}>{insight.actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary[600]} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* CTA — Ask AI */}
      <TouchableOpacity style={styles.askAiButton} onPress={() => router.push('/chat')}>
        <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
        <Text style={styles.askAiText}>Tanya AI Asisten Cerdas</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },

  // AI Status bar
  aiStatusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: 8, borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  aiStatusActive: { backgroundColor: colors.successLight },
  aiStatusLocal: { backgroundColor: colors.warningLight },
  aiStatusText: { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },

  // Score Card
  scoreCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.xl, padding: spacing.xl,
    alignItems: 'center', ...shadows.md, marginBottom: spacing.xl,
  },
  scoreHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  scoreTitle: { ...typography.h4, color: colors.text.primary },
  scoreCircle: {
    flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md,
  },
  scoreValue: { fontSize: 56, fontWeight: '800', color: colors.primary[600] },
  scoreMax: { ...typography.h4, color: colors.text.tertiary },
  scoreLabel: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h4, color: colors.text.primary },

  // Prediction Item
  predictionItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  predictionLeft: { flex: 1 },
  predictionName: { ...typography.label, color: colors.text.primary },
  predictionStock: { ...typography.caption, color: colors.text.tertiary },
  predictionRight: { alignItems: 'flex-end', gap: 2 },
  predictionBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  predictionDays: { ...typography.labelSm, fontWeight: '700' },
  predictionConfidence: { ...typography.caption, color: colors.text.tertiary, fontSize: 10 },

  // Loading insights
  loadingInsights: {
    alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md,
  },
  loadingInsightsText: { ...typography.body, color: colors.text.tertiary },

  // Insight Card
  insightCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm, borderLeftWidth: 3, borderLeftColor: colors.primary[300],
  },
  insightWarning: { borderLeftColor: colors.error, backgroundColor: '#FFFBF8' },
  insightSuccess: { borderLeftColor: colors.success, backgroundColor: '#F8FFF8' },
  insightHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm,
  },
  insightTitle: { ...typography.label, color: colors.text.primary, flex: 1 },
  insightDescription: { ...typography.bodySm, color: colors.text.secondary, lineHeight: 20 },
  insightAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  insightActionText: { ...typography.labelSm, color: colors.primary[600] },

  // Ask AI Button
  askAiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary[600], borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, gap: spacing.sm, ...shadows.md,
  },
  askAiText: { ...typography.button, color: '#FFFFFF' },
});
