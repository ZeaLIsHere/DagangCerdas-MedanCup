import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { logoutUser } from '../../src/services/firebase/auth';
import { BUSINESS_TYPE_LABELS } from '../../src/types/user';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await logoutUser();
        logout();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profil Bisnis', onPress: () => router.push('/profile/edit') },
    { icon: 'chatbubble-ellipses-outline', label: 'AI Asisten Cerdas', onPress: () => router.push('/chat') },
    { icon: 'analytics-outline', label: 'AI Mentor Bisnis', onPress: () => router.push('/ai-mentor') },
    { icon: 'receipt-outline', label: 'Riwayat Transaksi', onPress: () => router.push('/transaction') },
    { icon: 'cloud-outline', label: 'Sinkronisasi Data', onPress: () => Alert.alert('Sync', 'Sinkronisasi data berhasil! ✅') },
    { icon: 'help-circle-outline', label: 'Bantuan & FAQ', onPress: () => router.push('/profile/faq') },
    { icon: 'information-circle-outline', label: 'Tentang Aplikasi', onPress: () => Alert.alert('DagangCerdas v1.0.0', 'Dibuat untuk MCC 2026\n\nSolusi Cerdas UMKM Naik Kelas\n\n© 2026 Tim DagangCerdas') },
    { icon: 'log-out-outline', label: 'Keluar (Logout)', onPress: handleLogout },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'Toko').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Pengguna UMKM'}</Text>
        <Text style={styles.businessName}>{user?.businessName || user?.name || 'Toko Anda'}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {BUSINESS_TYPE_LABELS[user?.businessType || 'lainnya'] || 'UMKM Retail'}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={18} color={colors.primary[500]} />
          <Text style={styles.statValue}>Medan</Text>
          <Text style={styles.statLabel}>Lokasi</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary[500]} />
          <Text style={styles.statValue}>{user?.phone || '-'}</Text>
          <Text style={styles.statLabel}>Telepon</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
          <Text style={styles.statValue}>Aktif</Text>
          <Text style={styles.statLabel}>Sync</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={22} color={colors.text.secondary} />
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>DagangCerdas v1.0.0 • MCC 2026</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary[500], paddingTop: 56, paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  avatarText: { ...typography.h2, color: '#FFFFFF' },
  userName: { ...typography.h4, color: '#FFFFFF', marginBottom: 2 },
  businessName: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.sm },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: borderRadius.full,
  },
  typeBadgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: spacing.lg,
    marginTop: -spacing.lg, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { ...typography.labelSm, color: colors.text.primary },
  statLabel: { ...typography.caption, color: colors.text.tertiary },
  statDivider: { width: 1, backgroundColor: colors.border.light },

  menuSection: {
    marginTop: spacing.xl, marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemLabel: { ...typography.body, color: colors.text.primary },

  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error, backgroundColor: '#FFF',
  },
  logoutText: { ...typography.button, color: colors.error },

  versionText: {
    ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg,
  },
});
