// DagangCerdas — Smart POS (Kasir)
// Pencatatan transaksi cepat dengan barcode scan & QRIS mock

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ScalePressable } from '../../src/components/animations';
import { createTransaction, getAllProducts } from '../../src/services/database/repository';
import { useAuthStore } from '../../src/stores/authStore';
import { useCartStore } from '../../src/stores/cartStore';
import { borderRadius, colors, shadows, spacing, typography } from '../../src/theme';
import type { PaymentMethod, Product } from '../../src/types';
import { PRODUCT_CATEGORIES } from '../../src/types/product';
import { formatRupiah } from '../../src/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function POSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const cart = useCartStore();
  const { user } = useAuthStore();

  const loadProducts = useCallback(async () => {
    try {
      const userId = user?.id || '';
      if (!userId) return;
      const allProducts = await getAllProducts(userId);
      setProducts(allProducts.filter(p => p.isActive && p.stock > 0));
    } catch (error) {
      console.error('[POS] Load products error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts, user?.id])
  );

  useEffect(() => {
    let filtered = products;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    try {
      const tx = await createTransaction(
        user?.id || '',
        cart.items,
        paymentMethod
      );
      setLastTransaction(tx);
      cart.clearCart();
      setShowPayment(false);
      setShowCart(false);
      setShowSuccess(true);
      // Reload products to update stock
      await loadProducts();
    } catch (error) {
      console.error('[POS] Checkout error:', error);
      Alert.alert('Error', 'Gagal memproses transaksi. Silakan coba lagi.');
    }
  };


  const categories = ['Semua', ...PRODUCT_CATEGORIES];

  const renderProductItem = ({ item }: { item: Product }) => {
    const cartQty = cart.getItemCount(item.id);
    return (
      <ScalePressable
        onPress={() => cart.addItem(item)}
        scaleValue={0.93}
      >
        <View style={[styles.productCard, cartQty > 0 && styles.productCardSelected]}>
          <View style={styles.productIconContainer}>
            <Ionicons
              name={getCategoryIcon(item.category) as any}
              size={24}
              color={colors.primary[500]}
            />
          </View>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
          <Text style={styles.productStock}>Stok: {item.stock} {item.unit}</Text>
          {cartQty > 0 && (
            <View style={styles.productBadge}>
              <Text style={styles.productBadgeText}>{cartQty}</Text>
            </View>
          )}
        </View>
      </ScalePressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Kasir</Text>
        <Text style={styles.headerSubtitle}>{user?.businessName || user?.name || 'Toko UMKM'}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryList}
>
  {categories.map((cat) => (
    <TouchableOpacity
      key={cat}
      style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
      onPress={() => setSelectedCategory(cat)}
    >
      <Text 
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}
      >
        {cat}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>Produk tidak ditemukan</Text>
          </View>
        }
      />

      {/* Cart FAB */}
      {cart.items.length > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => setShowCart(true)}
          activeOpacity={0.85}
        >
          <View style={styles.cartFabContent}>
            <View style={styles.cartFabLeft}>
              <Ionicons name="cart" size={22} color="#FFFFFF" />
              <View style={styles.cartFabBadge}>
                <Text style={styles.cartFabBadgeText}>{cart.getTotalItems()}</Text>
              </View>
            </View>
            <Text style={styles.cartFabText}>Lihat Keranjang</Text>
            <Text style={styles.cartFabPrice}>{formatRupiah(cart.getTotal())}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModal}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItems}>
              {cart.items.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>{formatRupiah(item.product.price)}</Text>
                  </View>
                  <View style={styles.cartItemControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => cart.decrementQuantity(item.product.id)}
                    >
                      <Ionicons name="remove" size={18} color={colors.primary[600]} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => cart.incrementQuantity(item.product.id)}
                    >
                      <Ionicons name="add" size={18} color={colors.primary[600]} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemSubtotal}>
                    {formatRupiah(item.product.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartSummary}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Total Item</Text>
                <Text style={styles.cartSummaryValue}>{cart.getTotalItems()} item</Text>
              </View>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Estimasi Profit</Text>
                <Text style={[styles.cartSummaryValue, { color: colors.success }]}>
                  {formatRupiah(cart.getTotalProfit())}
                </Text>
              </View>
              <View style={[styles.cartSummaryRow, styles.cartTotalRow]}>
                <Text style={styles.cartTotalLabel}>TOTAL</Text>
                <Text style={styles.cartTotalValue}>{formatRupiah(cart.getTotal())}</Text>
              </View>
            </View>

            <View style={styles.cartActions}>
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={() => {
                  cart.clearCart();
                  setShowCart(false);
                }}
              >
                <Text style={styles.clearCartText}>Hapus Semua</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => {
                  setShowCart(false);
                  setShowPayment(true);
                }}
              >
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutText}>Bayar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <Text style={styles.paymentTitle}>Pilih Metode Pembayaran</Text>
            <Text style={styles.paymentAmount}>{formatRupiah(cart.getTotal())}</Text>

            {[
              { method: 'tunai' as PaymentMethod, icon: 'cash-outline', label: 'Tunai', desc: 'Pembayaran cash' },
              { method: 'qris' as PaymentMethod, icon: 'qr-code-outline', label: 'QRIS', desc: 'Scan kode QR' },
              { method: 'transfer' as PaymentMethod, icon: 'phone-portrait-outline', label: 'Transfer', desc: 'Transfer bank' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.method}
                style={styles.paymentOption}
                onPress={() => handleCheckout(opt.method)}
                activeOpacity={0.7}
              >
                <View style={styles.paymentOptionIcon}>
                  <Ionicons name={opt.icon as any} size={24} color={colors.primary[600]} />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionLabel}>{opt.label}</Text>
                  <Text style={styles.paymentOptionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.paymentCancelButton}
              onPress={() => setShowPayment(false)}
            >
              <Text style={styles.paymentCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={72} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Transaksi Berhasil! 🎉</Text>
            <Text style={styles.successAmount}>
              {lastTransaction ? formatRupiah(lastTransaction.totalAmount) : ''}
            </Text>
            <Text style={styles.successMethod}>
              Metode: {lastTransaction?.paymentMethod === 'tunai' ? 'Tunai' :
                       lastTransaction?.paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successButtonText}>Transaksi Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Makanan': 'restaurant-outline',
    'Minuman': 'cafe-outline',
    'Sembako': 'basket-outline',
    'Bumbu & Rempah': 'leaf-outline',
    'Snack': 'pizza-outline',
    'Rokok': 'flame-outline',
    'Obat & Kesehatan': 'medkit-outline',
    'Peralatan Rumah': 'home-outline',
    'Elektronik': 'phone-portrait-outline',
    'Lainnya': 'cube-outline',
  };
  return icons[category] || 'cube-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Header
  header: {
    backgroundColor: colors.primary[500],
    paddingTop: 52,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },

  // Categories

  categoryList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary[500],
  },
  categoryChipText: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // Product Grid
  productGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  productRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productCard: {
    width: (SCREEN_WIDTH - 48 - 16) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  productName: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    height: 30,
  },
  productPrice: {
    ...typography.labelSm,
    color: colors.primary[600],
    marginBottom: 2,
  },
  productStock: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  productBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },

  // Cart FAB
  cartFab: {
    position: 'absolute',
    bottom: 16,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  cartFabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cartFabLeft: {
    position: 'relative',
    marginRight: spacing.md,
  },
  cartFabBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartFabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cartFabText: {
    ...typography.button,
    color: '#FFFFFF',
    flex: 1,
  },
  cartFabPrice: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  // Cart Modal
  cartModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing['3xl'],
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cartModalTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  cartItems: {
    maxHeight: 300,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    ...typography.label,
    color: colors.text.primary,
  },
  cartItemPrice: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    ...typography.label,
    color: colors.text.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemSubtotal: {
    ...typography.label,
    color: colors.primary[600],
    minWidth: 80,
    textAlign: 'right',
  },

  // Cart Summary
  cartSummary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cartSummaryLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  cartSummaryValue: {
    ...typography.label,
    color: colors.text.primary,
  },
  cartTotalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  cartTotalLabel: {
    ...typography.h4,
    color: colors.text.primary,
  },
  cartTotalValue: {
    ...typography.h4,
    color: colors.primary[600],
  },

  // Cart Actions
  cartActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  clearCartButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  clearCartText: {
    ...typography.button,
    color: colors.error,
  },
  checkoutButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  checkoutText: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Payment Modal
  paymentModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing['3xl'],
  },
  paymentTitle: {
    ...typography.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  paymentAmount: {
    ...typography.h2,
    color: colors.primary[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    marginBottom: spacing.md,
  },
  paymentOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionLabel: {
    ...typography.label,
    color: colors.text.primary,
  },
  paymentOptionDesc: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  paymentCancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  paymentCancelText: {
    ...typography.button,
    color: colors.text.tertiary,
  },

  // Success Modal
  successModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing['3xl'],
    paddingBottom: Platform.OS === 'android' ? spacing['3xl'] : spacing['5xl'],
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  successAmount: {
    ...typography.h2,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successMethod: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  successButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    ...shadows.md,
  },
  successButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
