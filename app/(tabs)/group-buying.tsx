// DagangCerdas — Belanja Kolektif (Group Buying B2B)
// Fitur berbasis geolokasi dengan model Hub-and-Spoke

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, RefreshControl, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatPercent } from '../../src/utils/formatters';
import { haversineDistance, formatDistance, calculateGroupSavings } from '../../src/services/geo/haversine';
import { useAuthStore } from '../../src/stores/authStore';
import { DEMO_NEARBY_UMKM, DEMO_VENDORS } from '../../src/utils/seedData';
import { UMKMMap } from '../../src/components/map/UMKMMap';
import { useRouter } from 'expo-router';
import { getActiveGroupOrders, joinGroupOrder, getJoinedGroupOrders, updateGroupOrderParticipation } from '../../src/services/database/repository';
import { uploadGroupOrderParticipant, downloadActiveGroupOrders, deleteGroupOrderParticipantFromCloud, updateGroupOrderParticipantInCloud } from '../../src/services/firebase/firestore-sync';
import type { GroupOrder, GroupOrderParticipant, UMKMLocation, Vendor, JoinedGroupOrder } from '../../src/types/groupBuying';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../../src/services/firebase/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupBuyingScreen() {
  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'peta' | 'vendors' | 'nearby'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Real data state
  const [activeOrders, setActiveOrders] = useState<GroupOrder[]>([]);
  const [joinedOrders, setJoinedOrders] = useState<JoinedGroupOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Join modal state
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinQuantity, setJoinQuantity] = useState('');
  const [orderToJoin, setOrderToJoin] = useState<GroupOrder | null>(null);

  // Invite modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [umkmToInvite, setUmkmToInvite] = useState<UMKMLocation | null>(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editQuantity, setEditQuantity] = useState('');
  const [orderToEdit, setOrderToEdit] = useState<JoinedGroupOrder | null>(null);

  const handleOpenInvite = (umkm: UMKMLocation) => {
    if (joinedOrders.length === 0) {
      Alert.alert('Info', 'Anda belum mengikuti order kolektif manapun. Bergabunglah dengan order terlebih dahulu sebelum mengundang UMKM lain.');
      return;
    }
    setUmkmToInvite(umkm);
    setInviteModalVisible(true);
  };

  const handleSendInvite = (order: JoinedGroupOrder) => {
    if (!umkmToInvite?.phone) {
      Alert.alert('Error', 'UMKM ini belum melengkapi nomor telepon di profil mereka.');
      return;
    }
    
    // Format nomor telepon (ganti 08.. jadi 628..)
    let phone = umkmToInvite.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const message = `Halo ${umkmToInvite.businessName}, yuk gabung patungan beli ${order.productName} lewat DagangCerdas biar kita dapat harga grosir ${formatRupiah(order.wholesalePrice)}! Tinggal kurang ${order.targetQuantity - order.currentQuantity} unit lagi nih.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phone}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Tidak dapat membuka WhatsApp. Pastikan WhatsApp sudah terinstal.');
    });
    
    setInviteModalVisible(false);
  };

  const { user } = useAuthStore();
  const router = useRouter();

  const loadOrders = async () => {
    setIsRefreshing(true);
    try {
      await downloadActiveGroupOrders(); // Sync latest from cloud first
      const orders = await getActiveGroupOrders(); // Load from local SQLite
      setActiveOrders(orders);
      
      if (user) {
        const joined = await getJoinedGroupOrders(user.id);
        setJoinedOrders(joined);
      }

      await fetchNearbyUMKMs(); // Fetch UMKM data for map
      await fetchNearbyVendors(); // Fetch Vendor data for map
    } catch (e) {
      console.error('Failed to load group orders:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleJoinOrder = async () => {
    if (!orderToJoin || !user) return;
    
    const qty = parseInt(joinQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }

    if (orderToJoin.currentQuantity + qty > orderToJoin.targetQuantity) {
      Alert.alert('Error', 'Jumlah pesanan melebihi sisa target yang dibutuhkan.');
      return;
    }

    try {
      const participantId = Crypto.randomUUID();
      const participant: GroupOrderParticipant = {
        id: participantId,
        groupOrderId: orderToJoin.id,
        userId: user.id,
        userName: user.name,
        businessName: user.businessName || user.name,
        quantity: qty,
        status: 'bergabung',
        joinedAt: Date.now(),
      };

      // 1. Simpan ke SQLite lokal
      await joinGroupOrder(participant);
      
      // 2. Upload ke Firestore
      await uploadGroupOrderParticipant(participantId);

      Alert.alert('Berhasil', `Anda telah bergabung dalam pesanan ${orderToJoin.productName}`);
      
      setJoinModalVisible(false);
      setJoinQuantity('');
      setOrderToJoin(null);
      loadOrders(); // Refresh list
    } catch (error) {
      console.error('Failed to join order:', error);
      Alert.alert('Error', 'Gagal bergabung dengan pesanan. Silakan coba lagi.');
    }
  };

  const handleEditOrder = async () => {
    if (!orderToEdit || !user) return;
    
    const qty = parseInt(editQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Masukkan jumlah yang valid');
      return;
    }

    const qtyDifference = qty - orderToEdit.myQuantity;
    if (qtyDifference > 0 && (orderToEdit.currentQuantity + qtyDifference > orderToEdit.targetQuantity)) {
      Alert.alert('Error', 'Jumlah pesanan baru melebihi sisa target yang dibutuhkan.');
      return;
    }

    try {
      // 1. Update ke SQLite lokal
      await updateGroupOrderParticipation(orderToEdit.id, user.id, qty);
      
      // 2. Sync perubahan ke Firestore agar tidak muncul kembali saat sync
      if (qty === 0) {
        // Hapus dari Firestore
        await deleteGroupOrderParticipantFromCloud(orderToEdit.id, user.id);
      } else {
        // Update kuantitas di Firestore
        await updateGroupOrderParticipantInCloud(orderToEdit.id, user.id, qty);
      }

      Alert.alert('Berhasil', qty === 0 ? 'Anda telah membatalkan pesanan.' : 'Jumlah pesanan berhasil diperbarui.');
      
      setEditModalVisible(false);
      setEditQuantity('');
      setOrderToEdit(null);
      loadOrders(); // Refresh list
    } catch (error) {
      console.error('Failed to update order:', error);
      Alert.alert('Error', 'Gagal memperbarui pesanan.');
    }
  };

  const userLat = user?.latitude ?? 3.08;
  const userLng = user?.longitude ?? 9.04;

  const [nearbyUMKM, setNearbyUMKM] = useState<UMKMLocation[]>([]);

  const fetchNearbyUMKMs = async () => {
    try {
      const usersRef = collection(firestoreDb, 'users');
      const snapshot = await getDocs(usersRef);
      const umkms: UMKMLocation[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude && doc.id !== user?.id) {
          const distance = haversineDistance(userLat, userLng, data.latitude, data.longitude);
          umkms.push({
            id: doc.id,
            userId: doc.id,
            businessName: data.businessName || data.name || 'UMKM',
            businessType: data.businessType || 'Retail',
            latitude: data.latitude,
            longitude: data.longitude,
            address: `${data.latitude.toFixed(3)}°N, ${data.longitude.toFixed(3)}°E`, 
            phone: data.phone || '',
            distance: distance,
          });
        }
      });
      
      umkms.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setNearbyUMKM(umkms);
    } catch (e) {
      console.error('Failed to fetch UMKM map data:', e);
    }
  };

  const [nearbyVendors, setNearbyVendors] = useState<Vendor[]>([]);

  const fetchNearbyVendors = async () => {
    try {
      console.log('[Sync] Starting to fetch vendors from Firestore...');
      const vendorsRef = collection(firestoreDb, 'vendors');
      const snapshot = await getDocs(vendorsRef);
      console.log(`[Sync] Found ${snapshot.size} vendor documents in Firestore`);
      
      const vendors: Vendor[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`[Sync] Vendor ${doc.id} data:`, data);
        if (data.latitude && data.longitude) {
          const distance = haversineDistance(userLat, userLng, data.latitude, data.longitude);
          vendors.push({
            id: doc.id,
            name: data.name || 'Vendor Tanpa Nama',
            address: `${data.latitude.toFixed(3)}°N, ${data.longitude.toFixed(3)}°E`,
            latitude: data.latitude,
            longitude: data.longitude,
            phone: data.phone || '',
            category: data.category || 'Distributor',
            products: data.products || [],
            minOrderValue: data.minOrderValue || 0,
            distance: distance,
          });
        } else {
          console.log(`[Sync] Vendor ${doc.id} skipped due to missing lat/lng`);
        }
      });
      
      vendors.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setNearbyVendors(vendors);
      console.log(`[Sync] Successfully loaded ${vendors.length} vendors to map`);
    } catch (e) {
      console.error('[Sync] Failed to fetch vendor map data:', e);
    }
  };

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
          { key: 'history', label: 'Riwayat', icon: 'receipt-outline' },
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
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadOrders} colors={[colors.primary[500]]} />
        }>

        {/* GROUP ORDERS TAB */}
        {activeTab === 'orders' && (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                Gabung order kolektif untuk mendapatkan harga grosir dari distributor di Kawasan Industri Medan (KIM).
              </Text>
            </View>

            {activeOrders.length === 0 && !isRefreshing ? (
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Text style={{ color: colors.text.secondary }}>Belum ada tawaran order kolektif saat ini.</Text>
              </View>
            ) : null}

            {activeOrders.map((order) => {
              const savings = calculateGroupSavings(
                order.wholesalePrice, order.retailPrice, order.targetQuantity
              );
              const progress = order.currentQuantity / order.targetQuantity;
              const timeDiff = order.deadline - Date.now();
              let timeLeftString = '';
              if (timeDiff <= 0) {
                timeLeftString = 'Berakhir';
              } else if (timeDiff < 86400000) {
                const hoursLeft = Math.ceil(timeDiff / 3600000);
                timeLeftString = `${hoursLeft} jam lagi`;
              } else {
                const daysLeft = Math.ceil(timeDiff / 86400000);
                timeLeftString = `${daysLeft} hari lagi`;
              }
              
              // Simplification: we don't fetch exact participants count for UI yet, we show a mock count based on qty
              const participantsCount = 1 + Math.floor(order.currentQuantity / (order.targetQuantity / 5 || 10));

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => setSelectedOrder(order)}
                  activeOpacity={0.8}
                >
                  <View style={styles.orderHeader}>
                    <View style={styles.orderStatusBadge}>
                      <Text style={styles.orderStatusText}>🟢 Terbuka</Text>
                    </View>
                    <Text style={styles.orderDeadline}>{timeLeftString}</Text>
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
                        <Ionicons name="people" size={12} color={colors.text.tertiary} /> {participantsCount} peserta
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <View style={styles.orderVendor}>
                      <Ionicons name="business-outline" size={14} color={colors.text.tertiary} />
                      <Text style={styles.orderVendorText}>{order.vendorName}</Text>
                    </View>
                    <TouchableOpacity style={styles.joinButton}
                      onPress={() => {
                        setOrderToJoin(order);
                        setJoinQuantity('');
                        setJoinModalVisible(true);
                      }}>
                      <Text style={styles.joinButtonText}>+ Gabung</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}


          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                Riwayat pesanan kolektif yang sedang Anda ikuti.
              </Text>
            </View>

            {joinedOrders.length === 0 ? (
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Text style={{ color: colors.text.secondary }}>Anda belum bergabung dengan order manapun.</Text>
              </View>
            ) : null}

            {joinedOrders.map((order) => {
              const progress = order.currentQuantity / order.targetQuantity;
              const timeDiff = order.deadline - Date.now();
              let timeLeftString = '';
              if (timeDiff <= 0) {
                timeLeftString = 'Berakhir';
              } else if (timeDiff < 86400000) {
                const hoursLeft = Math.ceil(timeDiff / 3600000);
                timeLeftString = `${hoursLeft} jam lagi`;
              } else {
                const daysLeft = Math.ceil(timeDiff / 86400000);
                timeLeftString = `${daysLeft} hari lagi`;
              }
              const isFull = progress >= 1 || order.status === 'terkonfirmasi';

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={[styles.orderStatusBadge, isFull && { backgroundColor: '#fee2e2' }]}>
                      <Text style={[styles.orderStatusText, isFull && { color: '#ef4444' }]}>
                        {isFull ? '🔴 Penuh' : `🟢 ${order.status}`}
                      </Text>
                    </View>
                    <Text style={styles.orderDeadline}>{timeLeftString}</Text>
                  </View>

                  <Text style={styles.orderProductName}>{order.productName}</Text>
                  <Text style={styles.orderDescription} numberOfLines={2}>{order.description}</Text>

                  {/* Joined Info */}
                  <View style={{ backgroundColor: colors.primary[50], padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[600]} style={{ marginRight: spacing.xs }} />
                      <Text style={{ color: colors.primary[800], fontWeight: 'bold' }}>
                        Telah Bergabung: {order.myQuantity} unit
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      setOrderToEdit(order);
                      setEditQuantity(order.myQuantity.toString());
                      setEditModalVisible(true);
                    }}>
                      <Ionicons name="create-outline" size={20} color={colors.primary[600]} />
                    </TouchableOpacity>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                    </View>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressText}>
                        Terkumpul: {order.currentQuantity}/{order.targetQuantity} unit
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
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
              radiusKm={10}
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
                <Text style={styles.mapStatValue}>10 km</Text>
                <Text style={styles.mapStatLabel}>Radius</Text>
              </View>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="map" size={20} color={colors.primary[600]} />
              <Text style={styles.infoBannerText}>
                Peta menampilkan UMKM (hijau) dan vendor/distributor (oranye) dalam radius 10 km.
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
                UMKM dalam radius 10 km dari lokasi Anda. Ajak bergabung order kolektif!
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
                    onPress={() => handleOpenInvite(umkm)}>
                    <Text style={styles.inviteButtonText}>Undang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Join Order Modal */}
      <Modal
        visible={joinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gabung Belanja Kolektif</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {orderToJoin && (
              <>
                <Text style={styles.modalSubtitle}>{orderToJoin.productName}</Text>
                
                <View style={styles.modalInfoBox}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Harga Eceran</Text>
                    <Text style={styles.modalInfoValueLineThrough}>{formatRupiah(orderToJoin.retailPrice)}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Harga Kolektif</Text>
                    <Text style={styles.modalInfoValueSuccess}>{formatRupiah(orderToJoin.wholesalePrice)}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Sisa Target</Text>
                    <Text style={styles.modalInfoValue}>{orderToJoin.targetQuantity - orderToJoin.currentQuantity} unit</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Jumlah yang ingin dipesan (Unit):</Text>
                <TextInput
                  style={styles.modalInput}
                  value={joinQuantity}
                  onChangeText={setJoinQuantity}
                  placeholder="Masukkan angka..."
                  keyboardType="numeric"
                  autoFocus
                />

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleJoinOrder}>
                  <Text style={styles.modalSubmitBtnText}>Konfirmasi Pesanan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Undang UMKM */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Order untuk Dibagikan</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={{ marginBottom: spacing.md, color: colors.text.secondary }}>
              Kirim undangan via WhatsApp ke {umkmToInvite?.businessName}:
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {joinedOrders.map((order) => {
                const isFull = order.currentQuantity >= order.targetQuantity || order.status === 'terkonfirmasi';
                return (
                  <TouchableOpacity key={order.id} 
                    style={{ padding: spacing.md, borderWidth: 1, borderColor: colors.neutral[200], borderRadius: borderRadius.md, marginBottom: spacing.sm, opacity: isFull ? 0.6 : 1 }}
                    onPress={() => {
                      if (isFull) {
                        Alert.alert('Info', 'Pesanan ini sudah terkonfirmasi penuh dan tidak dapat menerima partisipan baru.');
                        return;
                      }
                      handleSendInvite(order);
                    }}
                    activeOpacity={isFull ? 1 : 0.7}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: isFull ? colors.text.secondary : colors.text.primary }}>
                      {order.productName} {isFull && '(Penuh)'}
                    </Text>
                    <Text style={{ color: colors.text.tertiary, marginTop: 4 }}>Pesananku: {order.myQuantity} unit | Harga: {formatRupiah(order.wholesalePrice)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Edit UMKM Quantity */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ubah Jumlah Pesanan</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {orderToEdit && (
              <>
                <Text style={{ marginBottom: spacing.sm, fontWeight: 'bold', fontSize: 16 }}>{orderToEdit.productName}</Text>
                <Text style={{ marginBottom: spacing.md, color: colors.text.secondary }}>
                  Sisa target yang dibutuhkan: {orderToEdit.targetQuantity - orderToEdit.currentQuantity + orderToEdit.myQuantity} unit
                </Text>

                <Text style={{ marginBottom: spacing.xs, fontWeight: 'bold', color: colors.text.primary }}>
                  Masukkan jumlah baru (isi 0 untuk batal):
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Contoh: 5"
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="numeric"
                  autoFocus
                />

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleEditOrder}>
                  <Text style={styles.modalSubmitBtnText}>Simpan Perubahan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl, paddingBottom: spacing.xl * 2,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h4, color: colors.text.primary },
  modalSubtitle: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.lg },
  modalInfoBox: {
    backgroundColor: colors.neutral[50], padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  modalInfoLabel: { ...typography.bodySm, color: colors.text.secondary },
  modalInfoValue: { ...typography.bodySm, color: colors.text.primary, fontWeight: '600' },
  modalInfoValueLineThrough: { ...typography.bodySm, color: colors.text.tertiary, textDecorationLine: 'line-through' },
  modalInfoValueSuccess: { ...typography.bodySm, color: colors.success, fontWeight: '700' },
  inputLabel: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm },
  modalInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border.default,
    borderRadius: borderRadius.md, padding: spacing.md, ...typography.h4,
    marginBottom: spacing.xl,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary[500], paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  modalSubmitBtnText: { ...typography.button, color: '#FFFFFF' },
});
