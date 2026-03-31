// DagangCerdas — Belanja Kolektif (Group Buying B2B)
// Fitur berbasis geolokasi dengan model Hub-and-Spoke

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatPercent } from '../../src/utils/formatters';
import { haversineDistance, formatDistance, calculateGroupSavings } from '../../src/services/geo/haversine';
import { useAuthStore } from '../../src/stores/authStore';
import { getLowStockProducts, getLiveMarketplaceOrders, updateProductStock } from '../../src/services/database/repository';
import { DEMO_NEARBY_UMKM, DEMO_VENDORS } from '../../src/utils/seedData';
import { UMKMMap } from '../../src/components/map/UMKMMap';
import type { Product } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupBuyingScreen() {
  const [activeTab, setActiveTab] = useState<'orders' | 'peta' | 'vendors' | 'nearby'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [marketplaceOrders, setMarketplaceOrders] = useState<any[]>([]);
  const { user } = useAuthStore();

  const loadMarketData = useCallback(async () => {
    try {
      if (!user?.id) return;
      const orders = await getLiveMarketplaceOrders(user.id);
      setMarketplaceOrders(orders);
    } catch (error) {
      console.error('[GroupBuying] Error fetching market data:', error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMarketData();
    }, [loadMarketData])
  );

  const handleJoinOrder = async (order: any) => {
    try {
      if (!order.productId) return;
      
      const qty = order.restockQty || 10;
      await updateProductStock(order.productId, qty);
      
      Alert.alert(
        'Berhasil Bergabung! 🎉',
        `Anda berhasil bergabung dalam order kolektif untuk ${order.productName}.\n\nStok produk Anda di sistem telah otomatis bertambah +${qty} unit.`,
        [{ text: 'Mantap!', onPress: () => loadMarketData() }]
      );
    } catch (error) {
      console.error('[GroupBuying] Join error:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat mencoba bergabung.');
    }
  };

  const userLat = user?.latitude ?? 3.5952;
  const userLng = user?.longitude ?? 98.6722;

  const nearbyUMKM = DEMO_NEARBY_UMKM.map(u => ({
    ...u,
    distance: haversineDistance(userLat, userLng, u.latitude, u.longitude),
  })).sort((a, b) => a.distance - b.distance);

  const nearbyVendors = DEMO_VENDORS.map(v => ({
    ...v,
    distance: haversineDistance(userLat, userLng, v.latitude, v.longitude),
  })).sort((a, b) => a.distance - b.distance);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Belanja Kolektif</Text>
          <Text style={styles.headerSubtitle}>Hemat besar dengan beli bareng</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="location" size={16} color={colors.primary[600]} />
          <Text style={styles.headerBadgeText}>Medan</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {[
          { key: 'orders', label: 'Order', icon: 'cart-outline' },
          { key: 'peta', label: 'Peta', icon: 'map-outline' },
          { key: 'vendors', label: 'Vendor', icon: 'business-outline' },
          { key: 'nearby', label: 'UMKM', icon: 'people-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons name={tab.icon as any} size={16}
              color={activeTab === tab.key ? colors.primary[600] : colors.text.tertiary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>

        {/* GROUP ORDERS TAB */}
        {activeTab === 'orders' && (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="sparkles" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                Menampilkan order kolektif yang sesuai dengan kebutuhan restok (stok rendah) Anda saat ini.
              </Text>
            </View>

            {marketplaceOrders.length > 0 ? (
              marketplaceOrders.map((order) => {
                const savings = calculateGroupSavings(
                  order.wholesalePrice, order.retailPrice, order.targetQuantity
                );
                const progress = order.currentQuantity / order.targetQuantity;
                const daysLeft = Math.max(0, Math.ceil((order.deadline - Date.now()) / 86400000));

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() => setSelectedOrder(order)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.orderHeader}>
                      {order.isRecommended ? (
                        <View style={styles.recommendBadge}>
                          <Ionicons name="flash" size={10} color="#FFFFFF" />
                          <Text style={styles.recommendText}>REKOMENDASI RESTOK</Text>
                        </View>
                      ) : (
                        <View style={styles.orderStatusBadge}>
                          <Text style={styles.orderStatusText}>🟢 Terbuka</Text>
                        </View>
                      )}
                      <Text style={styles.orderDeadline}>{daysLeft} hari lagi</Text>
                    </View>

                    <Text style={styles.orderProductName}>{order.productName}</Text>
                    <Text style={styles.orderDescription} numberOfLines={2}>{order.description}</Text>

                    {/* Price Comparison */}
                    <View style={styles.priceComparison}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Eceran</Text>
                        <Text style={styles.priceRetail}>{formatRupiah(order.retailPrice)}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color={colors.neutral[400]} />
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Kolektif</Text>
                        <Text style={styles.priceWholesale}>{formatRupiah(order.wholesalePrice)}</Text>
                      </View>
                      <View style={[styles.savingsBadge]}>
                        <Text style={styles.savingsText}>
                          Hemat {savings.savingsPercent.toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {order.currentQuantity}/{order.targetQuantity} unit
                        </Text>
                        <Text style={styles.participantsText}>
                          <Ionicons name="people" size={12} color={colors.text.tertiary} /> {order.participants} peserta
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderFooter}>
                      <View style={styles.orderVendor}>
                        <Ionicons name="business-outline" size={14} color={colors.text.tertiary} />
                        <Text style={styles.orderVendorText}>{order.vendorName}</Text>
                      </View>
                      <View style={styles.restockBadge}>
                        <Text style={styles.restockText}>+{order.restockQty || 10} Stok</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.joinButton}
                        onPress={() => handleJoinOrder(order)}
                      >
                        <Text style={styles.joinButtonText}>+ Gabung</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>Tidak Ada Order yang Cocok</Text>
                <Text style={styles.emptySubtitle}>
                  Saat ini tidak ada order kolektif untuk produk stok rendah Anda. Anda bisa membuat order baru untuk mengajak tetangga UMKM!
                </Text>
              </View>
            )}

            {/* Create New Order CTA */}
            <TouchableOpacity style={styles.createOrderCard}
              onPress={() => Alert.alert('Buat Order', 'Fitur buat order kolektif baru akan segera hadir!')}>
              <Ionicons name="add-circle-outline" size={32} color={colors.primary[400]} />
              <Text style={styles.createOrderText}>Buat Order Kolektif Baru</Text>
              <Text style={styles.createOrderSubtext}>Ajak UMKM terdekat untuk membeli bareng</Text>
            </TouchableOpacity>
          </>
        )}

        {/* PETA TAB */}
        {activeTab === 'peta' && (
          <>
            <UMKMMap
              userLocation={{ latitude: userLat, longitude: userLng }}
              nearbyUMKM={nearbyUMKM.map(u => ({
                id: u.id,
                type: 'umkm' as const,
                title: u.businessName,
                description: u.address,
                latitude: u.latitude,
                longitude: u.longitude,
                distance: u.distance,
              }))}
              vendors={nearbyVendors.map(v => ({
                id: v.id,
                type: 'vendor' as const,
                title: v.name,
                description: v.address,
                latitude: v.latitude,
                longitude: v.longitude,
                distance: v.distance,
              }))}
              radiusKm={5}
            />

            {/* Stats below map */}
            <View style={styles.mapStats}>
              <View style={styles.mapStatItem}>
                <Text style={styles.mapStatValue}>{nearbyUMKM.length}</Text>
                <Text style={styles.mapStatLabel}>UMKM Sekitar</Text>
              </View>
              <View style={styles.mapStatDivider} />
              <View style={styles.mapStatItem}>
                <Text style={styles.mapStatValue}>{nearbyVendors.length}</Text>
                <Text style={styles.mapStatLabel}>Vendor</Text>
              </View>
              <View style={styles.mapStatDivider} />
              <View style={styles.mapStatItem}>
                <Text style={styles.mapStatValue}>5 km</Text>
                <Text style={styles.mapStatLabel}>Radius</Text>
              </View>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="map" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                Peta menampilkan UMKM (hijau) dan vendor/distributor (oranye) dalam radius 5 km.
                Tap marker untuk melihat detail.
              </Text>
            </View>
          </>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="business" size={20} color={colors.accent[500]} />
              <Text style={styles.infoBannerText}>
                Distributor & vendor terdekat dari Kawasan Industri Medan (KIM) dan sekitarnya.
              </Text>
            </View>

            {nearbyVendors.map((vendor) => (
              <View key={vendor.id} style={styles.vendorCard}>
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorIcon}>
                    <Ionicons name="business" size={20} color={colors.accent[600]} />
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    <Text style={styles.vendorAddress} numberOfLines={1}>{vendor.address}</Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{formatDistance(vendor.distance)}</Text>
                  </View>
                </View>
                <View style={styles.vendorDetails}>
                  <View style={styles.vendorDetail}>
                    <Ionicons name="pricetags-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.vendorDetailText}>{vendor.category}</Text>
                  </View>
                  <View style={styles.vendorDetail}>
                    <Ionicons name="cash-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.vendorDetailText}>Min. {formatRupiah(vendor.minOrderValue)}</Text>
                  </View>
                </View>
                <View style={styles.vendorProducts}>
                  {vendor.products.map((p, i) => (
                    <View key={i} style={styles.productTag}>
                      <Text style={styles.productTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* NEARBY UMKM TAB */}
        {activeTab === 'nearby' && (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="location" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                UMKM dalam radius 5 km dari lokasi Anda. Ajak bergabung order kolektif!
              </Text>
            </View>

            {nearbyUMKM.map((umkm) => (
              <View key={umkm.id} style={styles.umkmCard}>
                <View style={styles.umkmAvatar}>
                  <Text style={styles.umkmAvatarText}>{umkm.businessName[0]}</Text>
                </View>
                <View style={styles.umkmInfo}>
                  <Text style={styles.umkmName}>{umkm.businessName}</Text>
                  <Text style={styles.umkmAddress} numberOfLines={1}>{umkm.address}</Text>
                </View>
                <View style={styles.umkmRight}>
                  <Text style={styles.umkmDistance}>{formatDistance(umkm.distance)}</Text>
                  <TouchableOpacity style={styles.inviteButton}
                    onPress={() => Alert.alert('Undang', `Undangan dikirim ke ${umkm.businessName}!`)}>
                    <Text style={styles.inviteButtonText}>Undang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary[500], paddingTop: 52, paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { ...typography.h3, color: '#FFFFFF' },
  headerSubtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, gap: 4,
  },
  headerBadgeText: { ...typography.labelSm, color: colors.primary[600] },

  // Tabs
  tabRow: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.sm, backgroundColor: '#FFFFFF', ...shadows.sm,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: 4,
    backgroundColor: colors.neutral[50],
  },
  tabActive: { backgroundColor: colors.primary[50] },
  tabText: { ...typography.caption, color: colors.text.tertiary, fontWeight: '600' },
  tabTextActive: { color: colors.primary[600] },

  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Info Banner
  infoBanner: {
    flexDirection: 'row', backgroundColor: colors.infoLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm, alignItems: 'flex-start',
  },
  infoBannerText: { ...typography.bodySm, color: colors.primary[700], flex: 1, lineHeight: 18 },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.md, ...shadows.md,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderStatusBadge: {
    backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  orderStatusText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  orderDeadline: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  orderProductName: { ...typography.h4, color: colors.text.primary, marginBottom: 4 },
  orderDescription: { ...typography.bodySm, color: colors.text.secondary, marginBottom: spacing.md },

  // Price comparison
  priceComparison: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm,
  },
  priceItem: { alignItems: 'center' },
  priceLabel: { ...typography.caption, color: colors.text.tertiary },
  priceRetail: { ...typography.label, color: colors.text.secondary, textDecorationLine: 'line-through' },
  priceWholesale: { ...typography.label, color: colors.success, fontSize: 16 },
  savingsBadge: {
    backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, marginLeft: 'auto',
  },
  savingsText: { ...typography.caption, color: colors.success, fontWeight: '700', fontSize: 12 },

  // Progress
  progressSection: { marginBottom: spacing.md },
  progressBar: {
    height: 8, backgroundColor: colors.neutral[200], borderRadius: 4, marginBottom: spacing.xs,
  },
  progressFill: { height: 8, backgroundColor: colors.primary[500], borderRadius: 4 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },
  participantsText: { ...typography.caption, color: colors.text.tertiary },

  // Order footer
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderVendor: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderVendorText: { ...typography.caption, color: colors.text.tertiary },
  joinButton: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.primary[500],
  },
  joinButtonText: { ...typography.buttonSm, color: '#FFFFFF' },

  // Create order
  createOrderCard: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg,
    padding: spacing['2xl'], borderWidth: 2, borderColor: colors.primary[100],
    borderStyle: 'dashed', marginTop: spacing.sm,
  },
  createOrderText: { ...typography.label, color: colors.primary[500], marginTop: spacing.sm },
  createOrderSubtext: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },

  // Vendor Card
  vendorCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.md, ...shadows.sm,
  },
  vendorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  vendorIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.accent[50],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  vendorInfo: { flex: 1 },
  vendorName: { ...typography.label, color: colors.text.primary },
  vendorAddress: { ...typography.caption, color: colors.text.tertiary },
  distanceBadge: {
    backgroundColor: colors.primary[50], paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  distanceText: { ...typography.caption, color: colors.primary[600], fontWeight: '600' },
  vendorDetails: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  vendorDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vendorDetailText: { ...typography.caption, color: colors.text.secondary },
  vendorProducts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  productTag: {
    backgroundColor: colors.neutral[100], paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  productTagText: { ...typography.caption, color: colors.text.secondary },

  // UMKM Card
  umkmCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  umkmAvatar: {
    width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.primary[100],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  umkmAvatarText: { ...typography.h4, color: colors.primary[600] },
  umkmInfo: { flex: 1 },
  umkmName: { ...typography.label, color: colors.text.primary },
  umkmAddress: { ...typography.caption, color: colors.text.tertiary },
  umkmRight: { alignItems: 'flex-end', gap: spacing.xs },
  umkmDistance: { ...typography.caption, color: colors.primary[600], fontWeight: '600' },
  inviteButton: {
    paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.primary[400],
  },
  inviteButtonText: { ...typography.caption, color: colors.primary[600], fontWeight: '600' },

  // Map Stats
  mapStats: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: spacing.lg,
    marginTop: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  mapStatItem: { alignItems: 'center' },
  mapStatValue: { ...typography.h4, color: colors.primary[600] },
  mapStatLabel: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  mapStatDivider: { width: 1, height: 32, backgroundColor: colors.border.light },

  // Recommendation Badge
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800', // Orange for attention
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  recommendText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Restock Badge
  restockBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginRight: 8,
  },
  restockText: {
    color: '#1976D2',
    fontSize: 10,
    fontWeight: '700',
  },
});
