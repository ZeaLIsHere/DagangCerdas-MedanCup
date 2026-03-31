// DagangCerdas — Transaction Detail Screen

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatDate } from '../../src/utils/formatters';
import { getTransactionWithItems } from '../../src/services/database/repository';
import { useAuthStore } from '../../src/stores/authStore';
import type { Transaction, TransactionItem } from '../../src/types';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) {
      loadTransaction(id);
    }
  }, [id]);

  const loadTransaction = async (txId: string) => {
    const result = await getTransactionWithItems(txId);
    if (result) {
      setTransaction(result.transaction);
      setItems(result.items);
    }
  };

  const handleShareReceipt = async () => {
    if (!transaction) return;

    let receipt = `🧾 STRUK DIGITAL - ${user?.businessName || user?.name || 'Toko UMKM'}\n`;
    receipt += `${'─'.repeat(32)}\n`;
    receipt += `Tanggal: ${formatDate(transaction.createdAt, 'full')}\n`;
    receipt += `No. Transaksi: ${transaction.id.slice(0, 8).toUpperCase()}\n`;
    receipt += `${'─'.repeat(32)}\n\n`;

    items.forEach((item) => {
      receipt += `${item.productName}\n`;
      receipt += `  ${item.quantity}x ${formatRupiah(item.unitPrice)} = ${formatRupiah(item.subtotal)}\n`;
    });

    receipt += `\n${'─'.repeat(32)}\n`;
    receipt += `TOTAL: ${formatRupiah(transaction.totalAmount)}\n`;
    receipt += `Pembayaran: ${transaction.paymentMethod === 'tunai' ? 'Tunai' :
                             transaction.paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}\n`;
    receipt += `${'─'.repeat(32)}\n`;
    receipt += `Terima kasih! 🙏\n`;
    receipt += `Powered by DagangCerdas\n`;

    await Share.share({
      message: receipt,
      title: 'Struk Digital',
    });
  };

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Memuat transaksi...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <Ionicons name="storefront" size={24} color={colors.primary[600]} />
          <Text style={styles.receiptBusinessName}>{user?.businessName || user?.name || 'Toko UMKM'}</Text>
          <Text style={styles.receiptDate}>{formatDate(transaction.createdAt, 'full')}</Text>
          <Text style={styles.receiptId}>#{transaction.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        <View style={styles.receiptDivider} />

        {/* Items */}
        {items.map((item) => (
          <View key={item.id} style={styles.receiptItem}>
            <View style={styles.receiptItemLeft}>
              <Text style={styles.receiptItemName}>{item.productName}</Text>
              <Text style={styles.receiptItemQty}>
                {item.quantity}x {formatRupiah(item.unitPrice)}
              </Text>
            </View>
            <Text style={styles.receiptItemSubtotal}>{formatRupiah(item.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.receiptDivider} />

        {/* Total */}
        <View style={styles.receiptTotal}>
          <Text style={styles.receiptTotalLabel}>TOTAL</Text>
          <Text style={styles.receiptTotalValue}>{formatRupiah(transaction.totalAmount)}</Text>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentInfo}>
          <Ionicons
            name={transaction.paymentMethod === 'tunai' ? 'cash-outline' :
                  transaction.paymentMethod === 'qris' ? 'qr-code-outline' :
                  'phone-portrait-outline'} 
            size={18}
            color={colors.text.secondary}
          />
          <Text style={styles.paymentText}>
            {transaction.paymentMethod === 'tunai' ? 'Tunai' :
             transaction.paymentMethod === 'qris' ? 'QRIS' : 'Transfer Bank'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ Selesai</Text>
          </View>
        </View>
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShareReceipt}>
        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
        <Text style={styles.shareText}>Bagikan Struk Digital</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  loadingText: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing['5xl'] },

  receiptCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.xl, padding: spacing.xl,
    ...shadows.md,
  },
  receiptHeader: { alignItems: 'center', marginBottom: spacing.lg },
  receiptBusinessName: { ...typography.h4, color: colors.text.primary, marginTop: spacing.sm },
  receiptDate: { ...typography.bodySm, color: colors.text.secondary, marginTop: 4 },
  receiptId: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  receiptDivider: {
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    borderStyle: 'dashed', marginVertical: spacing.lg,
  },
  receiptItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  receiptItemLeft: { flex: 1 },
  receiptItemName: { ...typography.label, color: colors.text.primary },
  receiptItemQty: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  receiptItemSubtotal: { ...typography.label, color: colors.text.primary },
  receiptTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  receiptTotalLabel: { ...typography.h4, color: colors.text.primary },
  receiptTotalValue: { ...typography.h3, color: colors.primary[600] },
  paymentInfo: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.lg, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border.light,
  },
  paymentText: { ...typography.body, color: colors.text.secondary, flex: 1 },
  statusBadge: {
    backgroundColor: colors.successLight, paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  statusText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  shareButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primary[600], borderRadius: borderRadius.md,
    paddingVertical: spacing.lg, marginTop: spacing.xl, gap: spacing.sm, ...shadows.md,
  },
  shareText: { ...typography.button, color: '#FFFFFF' },
});
