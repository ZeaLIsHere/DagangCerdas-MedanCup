// DagangCerdas — Manajemen Stok
// CRUD produk, notifikasi stok rendah, search & filter

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah } from '../../src/utils/formatters';
import { useAuthStore } from '../../src/stores/authStore';
import { getAllProducts, createProduct, updateProduct, deleteProduct, getLowStockProducts } from '../../src/services/database/repository';
import type { Product } from '../../src/types';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../src/types/product';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const { user } = useAuthStore();

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Lainnya');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('pcs');

  const loadProducts = useCallback(async () => {
    try {
      const userId = user?.id || '';
      if (!userId) return;
      const allProducts = await getAllProducts(userId);
      setProducts(allProducts);
      const low = await getLowStockProducts(userId);
      setLowStockCount(low.length);
    } catch (error) {
      console.error('[Inventory] Load error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts, user?.id])
  );

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLowStock = !filterLowStock || p.stock <= p.minStock;
    return matchSearch && matchLowStock;
  });

  const resetForm = () => {
    setFormName(''); setFormCategory('Lainnya'); setFormPrice('');
    setFormCostPrice(''); setFormStock(''); setFormMinStock('5');
    setFormUnit('pcs'); setEditingProduct(null);
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormCostPrice(product.costPrice.toString());
    setFormStock(product.stock.toString());
    setFormMinStock(product.minStock.toString());
    setFormUnit(product.unit);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { Alert.alert('Error', 'Nama produk harus diisi'); return; }
    if (!formPrice || isNaN(Number(formPrice))) { Alert.alert('Error', 'Harga jual harus berupa angka'); return; }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName, category: formCategory, price: Number(formPrice),
          costPrice: Number(formCostPrice) || 0, stock: Number(formStock) || 0,
          minStock: Number(formMinStock) || 5, unit: formUnit,
        });
      } else {
        await createProduct({
          userId: user?.id || '', name: formName,
          category: formCategory, price: Number(formPrice),
          costPrice: Number(formCostPrice) || 0, stock: Number(formStock) || 0,
          minStock: Number(formMinStock) || 5, unit: formUnit,
          imageUri: null, isActive: true,
        });
      }
      setShowForm(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('[Inventory] Save error:', error);
      Alert.alert('Error', 'Gagal menyimpan produk');
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('Hapus Produk', `Yakin ingin menghapus "${product.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await deleteProduct(product.id);
        await loadProducts();
      }},
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLowStock = item.stock <= item.minStock;
    return (
      <TouchableOpacity
        style={[styles.productCard, isLowStock && styles.productCardWarning]}
        onPress={() => openEditForm(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productCardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
              {item.category}
            </Text>
          </View>
          {isLowStock && (
            <Ionicons name="alert-circle" size={18} color={colors.error} />
          )}
        </View>
        <Text style={styles.productCardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productCardPrice}>{formatRupiah(item.price)}</Text>
        <View style={styles.productCardFooter}>
          <Text style={[styles.productCardStock, isLowStock && { color: colors.error }]}>
            Stok: {item.stock} {item.unit}
          </Text>
          <Text style={styles.productCardProfit}>
            Margin: {formatRupiah(item.price - item.costPrice)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manajemen Stok</Text>
          <Text style={styles.headerSubtitle}>{products.length} produk terdaftar</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, filterLowStock && styles.filterButtonActive]}
          onPress={() => setFilterLowStock(!filterLowStock)}
        >
          <Ionicons name="alert-circle-outline" size={18} color={filterLowStock ? '#FFFFFF' : colors.error} />
          {lowStockCount > 0 && (
            <View style={[styles.filterBadge, filterLowStock && { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles.filterBadgeText, filterLowStock && { color: colors.error }]}>
                {lowStockCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
        columnWrapperStyle={styles.productListRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>
              {filterLowStock ? 'Tidak ada produk stok rendah' : 'Belum ada produk'}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddForm}>
              <Text style={styles.emptyButtonText}>+ Tambah Produk</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Product Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.formModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Produk *</Text>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName}
                placeholder="Contoh: Ayam Goreng" placeholderTextColor={colors.neutral[400]} />

              <Text style={styles.inputLabel}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {[...PRODUCT_CATEGORIES].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, formCategory === cat && styles.chipActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.chipText, formCategory === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Harga Jual (Rp) *</Text>
                  <TextInput style={styles.input} value={formPrice} onChangeText={setFormPrice}
                    placeholder="15000" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Harga Modal (Rp)</Text>
                  <TextInput style={styles.input} value={formCostPrice} onChangeText={setFormCostPrice}
                    placeholder="8000" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Stok</Text>
                  <TextInput style={styles.input} value={formStock} onChangeText={setFormStock}
                    placeholder="30" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Min. Stok (Alert)</Text>
                  <TextInput style={styles.input} value={formMinStock} onChangeText={setFormMinStock}
                    placeholder="5" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Satuan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {[...PRODUCT_UNITS].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.chip, formUnit === unit && styles.chipActive]}
                    onPress={() => setFormUnit(unit)}
                  >
                    <Text style={[styles.chipText, formUnit === unit && styles.chipTextActive]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Makanan': '#FF5722', 'Minuman': '#2196F3', 'Sembako': '#4CAF50',
    'Bumbu & Rempah': '#795548', 'Snack': '#FF9800', 'Rokok': '#607D8B',
    'Obat & Kesehatan': '#F44336', 'Peralatan Rumah': '#9C27B0',
    'Elektronik': '#00BCD4', 'Lainnya': '#9E9E9E',
  };
  return colorMap[category] || '#9E9E9E';
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary[500], paddingTop: 52, paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { ...typography.h3, color: '#FFFFFF' },
  headerSubtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addButton: {
    width: 44, height: 44, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, height: 42, ...shadows.sm,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text.primary, marginLeft: spacing.sm },
  filterButton: {
    width: 42, height: 42, borderRadius: borderRadius.md, backgroundColor: colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: colors.error },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  productList: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  productListRow: { gap: spacing.md, marginBottom: spacing.md },
  productCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2, backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.sm,
    borderLeftWidth: 3, borderLeftColor: colors.primary[300],
  },
  productCardWarning: { borderLeftColor: colors.error, backgroundColor: '#FFF8F7' },
  productCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryBadge: { borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },
  productCardName: { ...typography.label, color: colors.text.primary, marginBottom: 4 },
  productCardPrice: { ...typography.bodyLg, color: colors.primary[600], fontWeight: '700', marginBottom: spacing.sm },
  productCardFooter: { gap: 2 },
  productCardStock: { ...typography.caption, color: colors.text.tertiary },
  productCardProfit: { ...typography.caption, color: colors.success },
  emptyState: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyText: { ...typography.body, color: colors.text.tertiary, marginTop: spacing.md },
  emptyButton: {
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, backgroundColor: colors.primary[500],
  },
  emptyButtonText: { ...typography.button, color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formModal: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'], maxHeight: '90%',
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing['3xl'],
  },
  formHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  formTitle: { ...typography.h4, color: colors.text.primary },
  formBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, maxHeight: 450 },
  inputLabel: { ...typography.labelSm, color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.neutral[50], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary, borderWidth: 1, borderColor: colors.border.light,
  },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputHalf: { flex: 1 },
  chipScroll: { marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100], marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary[500] },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  saveButton: {
    flexDirection: 'row', marginHorizontal: spacing.xl, marginTop: spacing.lg,
    paddingVertical: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.primary[600],
    justifyContent: 'center', alignItems: 'center', gap: spacing.sm, ...shadows.md,
  },
  saveButtonText: { ...typography.button, color: '#FFFFFF' },

});
