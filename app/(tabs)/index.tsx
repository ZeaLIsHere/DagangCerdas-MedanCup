// DagangCerdas — Dashboard (Beranda)
// Visualisasi KPI, grafik tren, AI suggestion, quick actions

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatShortNumber, formatDate } from '../../src/utils/formatters';
import { useAuthStore } from '../../src/stores/authStore';
import { getTodaySales, getSalesSummary, getLowStockProducts } from '../../src/services/database/repository';
import { useCountAnimation, FadeInView, ScalePressable, usePulse } from '../../src/components/animations';
import type { SalesSummary, Product } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [todaySales, setTodaySales] = useState({ revenue: 0, profit: 0, count: 0 });
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [greeting, setGreeting] = useState('');
  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    try {
      const userId = user?.id || '';
      if (!userId) return;
      const [today, salesSummary, lowStock] = await Promise.all([
        getTodaySales(userId),
        getSalesSummary(userId, 7),
        getLowStockProducts(userId),
      ]);
      setTodaySales(today);
      setSummary(salesSummary);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('[Dashboard] Load error:', error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Selamat Pagi');
      else if (hour < 15) setGreeting('Selamat Siang');
      else if (hour < 18) setGreeting('Selamat Sore');
      else setGreeting('Selamat Malam');
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const chartData = {
    labels: summary?.dailyTrend.map(d => {
      const parts = d.date?.split('-');
      return parts ? `${parts[2]}/${parts[1]}` : '';
    }) || ['', '', '', '', '', '', ''],
    datasets: [{
      data: summary?.dailyTrend.map(d => d.totalAmount) || [0, 0, 0, 0, 0, 0, 0],
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  if (!summary || chartData.datasets[0].data.length === 0) {
    chartData.labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    chartData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
  }

  const aiSuggestion = lowStockProducts.length > 0
    ? `⚠️ ${lowStockProducts.length} produk stok rendah! "${lowStockProducts[0]?.name}" hanya tersisa ${lowStockProducts[0]?.stock} ${lowStockProducts[0]?.unit}. Pertimbangkan untuk restok via Belanja Kolektif.`
    : todaySales.count > 0
      ? `📊 Hari ini sudah ${todaySales.count} transaksi dengan omzet ${formatRupiah(todaySales.revenue)}. Pertahankan momentum ini!`
      : '💡 Belum ada transaksi hari ini. Mulai catat penjualan di menu Kasir untuk mendapatkan insight bisnis dari AI.';

  const animatedRevenue = useCountAnimation(todaySales.revenue, 1500, 300);
  const animatedProfit = useCountAnimation(todaySales.profit, 1500, 500);
  const animatedCount = useCountAnimation(todaySales.count, 800, 700);
  const pulseAnim = usePulse(0.97, 1.03);

  const renderSummaryCard = (
    label: string, 
    value: number, 
    growth: number | undefined, 
    icon: any, 
    color: string, 
    filter: string
  ) => {
    const isPositive = (growth || 0) >= 0;
    
    return (
      <ScalePressable 
        onPress={() => router.push({ pathname: '/transaction', params: { filter } } as any)}
        style={[styles.summaryCard, { borderLeftColor: color }]}
      >
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.summaryValue}>{label === 'Transaksi' ? value : formatRupiah(value)}</Text>
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryLabel}>{label}</Text>
          {growth !== undefined && (
            <View style={[styles.growthBadge, { backgroundColor: isPositive ? colors.success + '15' : colors.error + '15' }]}>
              <Ionicons 
                name={isPositive ? 'arrow-up' : 'arrow-down'} 
                size={10} 
                color={isPositive ? colors.success : colors.error} 
              />
              <Text style={[styles.growthText, { color: isPositive ? colors.success : colors.error }]}>
                {Math.abs(Math.round(growth))}%
              </Text>
            </View>
          )}
        </View>
      </ScalePressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[800]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.businessName}>{user?.businessName || user?.name || 'Toko UMKM'}</Text>
            <Text style={styles.dateText}>{formatDate(Date.now(), 'long')}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => router.push('/chat')}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>AI</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today KPI Summary */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{formatRupiah(animatedRevenue)}</Text>
            <Text style={styles.kpiLabel}>Omzet Hari Ini</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{formatRupiah(animatedProfit)}</Text>
            <Text style={styles.kpiLabel}>Estimasi Profit</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{animatedCount}</Text>
            <Text style={styles.kpiLabel}>Transaksi</Text>
          </View>
        </View>
      </LinearGradient>

      {/* AI Suggestion Bar */}
      <FadeInView delay={200}>
        <ScalePressable onPress={() => router.push('/ai-mentor')} style={styles.aiSuggestionBar}>
          <View style={styles.aiIconContainer}>
            <Animated.View style={pulseAnim}>
              <Ionicons name="sparkles" size={18} color={colors.primary[600]} />
            </Animated.View>
          </View>
          <View style={styles.aiSuggestionContent}>
            <Text style={styles.aiSuggestionTitle}>Saran AI Cerdas</Text>
            <Text style={styles.aiSuggestionText} numberOfLines={2}>{aiSuggestion}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        </ScalePressable>
      </FadeInView>

      {/* Quick Actions */}
      <FadeInView delay={400} style={styles.section}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.quickActions}>
          {[
            { icon: 'cart', label: 'Kasir', color: colors.primary[500], route: '/(tabs)/pos' },
            { icon: 'cube', label: 'Stok', color: colors.accent[500], route: '/(tabs)/inventory' },
            { icon: 'chatbubble-ellipses', label: 'AI Chat', color: '#9C27B0', route: '/chat' },
            { icon: 'people', label: 'Kolektif', color: colors.warning, route: '/(tabs)/group-buying' },
          ].map((action, index) => (
            <ScalePressable
              key={index}
              onPress={() => router.push(action.route as any)}
              scaleValue={0.9}
            >
              <View style={styles.quickActionItem}>
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </View>
            </ScalePressable>
          ))}
        </View>
      </FadeInView>

      {/* Sales Chart */}
      <FadeInView delay={600} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tren Penjualan 7 Hari</Text>
          <Text style={styles.sectionSubtitle}>
            Total: {formatRupiah(summary?.totalRevenue || 0)}
          </Text>
        </View>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 48}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(86, 94, 108, ${opacity})`,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: colors.primary[500],
              },
              propsForBackgroundLines: {
                strokeDasharray: '5,5',
                stroke: colors.neutral[200],
              },
              formatYLabel: (value) => formatShortNumber(Number(value)),
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero
          />
        </View>
      </FadeInView>

      {/* Pie Chart: Product Shares */}
      {summary?.itemShares && summary.itemShares.length > 0 && (
        <FadeInView delay={700} style={styles.section}>
          <Text style={styles.sectionTitle}>Dominasi Produk Minggu Ini</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={summary.itemShares.map(s => ({
                name: s.name,
                population: s.quantity,
                color: s.color,
                legendFontColor: colors.text.secondary,
                legendFontSize: 12,
              }))}
              width={SCREEN_WIDTH - 48}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </FadeInView>
      )}

      {/* Weekly Summary Grid */}
      <FadeInView delay={850} style={styles.section}>
        <Text style={styles.sectionTitle}>Performa Minggu Ini</Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard('Total Omzet', summary?.totalRevenue || 0, summary?.revenueGrowth, 'wallet-outline', colors.primary[500], 'week')}
          {renderSummaryCard('Total Profit', summary?.totalProfit || 0, summary?.profitGrowth, 'trending-up-outline', colors.success, 'week')}
          {renderSummaryCard('Transaksi', summary?.totalTransactions || 0, summary?.transactionGrowth, 'receipt-outline', colors.accent[500], 'week')}
          {renderSummaryCard('Rata-rata/Trx', summary?.averagePerTransaction || 0, undefined, 'calculator-outline', colors.warning, 'week')}
        </View>
      </FadeInView>

      {/* Top Products */}
      {summary?.topProducts && summary.topProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produk Terlaris</Text>
          {summary.topProducts.map((product, index) => (
            <View key={index} style={styles.topProductItem}>
              <View style={styles.topProductRank}>
                <Text style={styles.topProductRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{product.name}</Text>
                <Text style={styles.topProductQty}>{product.quantity} terjual</Text>
              </View>
              <Text style={styles.topProductRevenue}>{formatRupiah(product.revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.error }]}>⚠️ Stok Rendah</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          {lowStockProducts.slice(0, 3).map((product, index) => (
            <View key={index} style={styles.lowStockItem}>
              <View style={styles.lowStockIcon}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
              </View>
              <View style={styles.lowStockInfo}>
                <Text style={styles.lowStockName}>{product.name}</Text>
                <Text style={styles.lowStockQty}>
                  Sisa: {product.stock} {product.unit} (min: {product.minStock})
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingBottom: 100,
  },

  // Header
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  businessName: {
    ...typography.h3,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dateText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 2,
  },
  kpiLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  kpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },

  // AI Suggestion
  aiSuggestionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  aiSuggestionContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  aiSuggestionTitle: {
    ...typography.labelSm,
    color: colors.primary[600],
    marginBottom: 2,
  },
  aiSuggestionText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
  },

  // Section
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  seeAllText: {
    ...typography.labelSm,
    color: colors.primary[500],
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 48) / 4 - 8,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Chart
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  chart: {
    borderRadius: borderRadius.md,
    marginLeft: -spacing.md,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  summaryValue: {
    ...typography.label,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  growthText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 2,
  },

  // Top Products
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  topProductRank: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  topProductRankText: {
    ...typography.labelSm,
    color: colors.primary[600],
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    ...typography.label,
    color: colors.text.primary,
  },
  topProductQty: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  topProductRevenue: {
    ...typography.label,
    color: colors.success,
  },

  // Low Stock
  lowStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lowStockIcon: {
    marginRight: spacing.md,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    ...typography.label,
    color: colors.text.primary,
  },
  lowStockQty: {
    ...typography.caption,
    color: colors.error,
  },
});
