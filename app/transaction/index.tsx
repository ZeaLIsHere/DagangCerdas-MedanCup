import { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatDate, formatRelativeTime } from '../../src/utils/formatters';
import { useAuthStore } from '../../src/stores/authStore';
import { getTransactions, getTransactionSummary } from '../../src/services/database/repository';
import type { Transaction } from '../../src/types';

type FilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ gross: 0, net: 0, count: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());
  const { user } = useAuthStore();

  const getFilterRange = (type: FilterType, date: Date) => {
    const start = new Date(date);
    const end = new Date(date);
    
    if (type === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    
    if (type === 'week') {
      // Monday start
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }
    
    if (type === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }

    if (type === 'custom') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    }

    return { start: undefined, end: undefined };
  };

  const loadTransactions = useCallback(async () => {
    const userId = user?.id || '';
    if (!userId) return;
    
    const range = getFilterRange(filter, customDate);
    
    const [txs, stats] = await Promise.all([
      getTransactions(userId, 100, range.start, range.end),
      getTransactionSummary(userId, range.start, range.end)
    ]);
    
    setTransactions(txs);
    setSummary(stats);
  }, [user?.id, filter, customDate]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCustomDate(selectedDate);
      setFilter('custom');
    }
  };

  const getPaymentIcon = (method: string) => {
    if (method === 'tunai') return 'cash-outline';
    if (method === 'qris') return 'qr-code-outline';
    return 'phone-portrait-outline';
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'tunai') return 'Tunai';
    if (method === 'qris') return 'QRIS';
    return 'Transfer';
  };

  const renderFilterChips = () => (
    <View style={styles.filterWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        {[
          { id: 'all', label: 'Semua' },
          { id: 'today', label: 'Hari Ini' },
          { id: 'week', label: 'Minggu Ini' },
          { id: 'month', label: 'Bulan Ini' },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.id}
            style={[styles.chip, filter === btn.id && styles.chipActive]}
            onPress={() => setFilter(btn.id as any)}
          >
            <Text style={[styles.chipText, filter === btn.id && styles.chipTextActive]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[styles.chip, filter === 'custom' && styles.chipActive]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons 
            name="calendar-outline" 
            size={16} 
            color={filter === 'custom' ? '#FFFFFF' : colors.text.secondary} 
          />
          <Text style={[styles.chipText, filter === 'custom' && styles.chipTextActive, { marginLeft: 4 }]}>
            {filter === 'custom' ? formatDate(customDate.getTime(), 'short') : 'Pilih Tanggal'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: colors.border.light }]}>
        <Text style={styles.summaryLabel}>Total Kotor</Text>
        <Text style={[styles.summaryValue, { color: colors.text.secondary }]}>{formatRupiah(summary.gross)}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Bersih (Laba)</Text>
        <Text style={[styles.summaryValue, { color: colors.primary[600] }]}>{formatRupiah(summary.net)}</Text>
      </View>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.txCard}
      onPress={() => router.push(`/transaction/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.txLeft}>
        <View style={styles.txIcon}>
          <Ionicons name={getPaymentIcon(item.paymentMethod) as any} size={20} color={colors.primary[600]} />
        </View>
        <View>
          <Text style={styles.txAmount}>{formatRupiah(item.totalAmount)}</Text>
          <Text style={styles.txMeta}>
            {getPaymentLabel(item.paymentMethod)} • {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txTime}>{formatDate(item.createdAt, 'time')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  // Group by date
  const groupedByDate = transactions.reduce((groups: Record<string, Transaction[]>, tx) => {
    const dateKey = formatDate(tx.createdAt, 'long');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {});

  const sections = Object.entries(groupedByDate);

  return (
    <View style={styles.container}>
      {renderFilterChips()}
      {renderSummary()}
      
      <FlatList
        data={sections}
        keyExtractor={([date]) => date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />}
        renderItem={({ item: [date, txs] }) => (
          <View style={styles.dateSection}>
            <Text style={styles.dateHeader}>{date}</Text>
            {txs.map((tx) => (
              <View key={tx.id}>
                {renderTransaction({ item: tx })}
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>Tidak ada transaksi di periode ini</Text>
          </View>
        }
      />

      {showDatePicker && (
        <DateTimePicker
          value={customDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  filterWrapper: { backgroundColor: '#FFFFFF', paddingVertical: spacing.md },
  filterContainer: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  chipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[600] },
  chipText: { ...typography.buttonSm, color: colors.text.secondary },
  chipTextActive: { color: '#FFFFFF' },

  summaryCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', margin: spacing.lg,
    borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { ...typography.caption, color: colors.text.tertiary },
  summaryValue: { ...typography.label, fontWeight: '700' },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  dateSection: { marginBottom: spacing.xl },
  dateHeader: {
    ...typography.labelSm, color: colors.text.tertiary,
    marginBottom: spacing.sm, paddingLeft: spacing.xs,
  },
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  txAmount: { ...typography.label, color: colors.text.primary },
  txMeta: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  txTime: { ...typography.caption, color: colors.text.tertiary },
  emptyState: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyText: { ...typography.body, color: colors.text.tertiary, marginTop: spacing.md },
});
