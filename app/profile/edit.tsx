import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { BUSINESS_TYPE_LABELS, BusinessType } from '../../src/types/user';
import { upsertUser } from '../../src/services/database/repository';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessType, setBusinessType] = useState<BusinessType>(user?.businessType || 'lainnya');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !businessName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Harap isi semua kolom utama');
      return;
    }

    const updatedData = {
      id: user!.id,
      name: name.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      businessType,
      updatedAt: Date.now(),
    };

    updateUser(updatedData);
    upsertUser(updatedData).catch(e => console.error('[EditProfile] Sync error:', e));

    Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const businessTypes = Object.entries(BUSINESS_TYPE_LABELS);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profil Bisnis</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButtonTextContainer}>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'Toko'}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Data Personal</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.neutral[500]} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>No. Handphone (WhatsApp)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={colors.neutral[500]} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="08xx..."
                keyboardType="phone-pad"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Data Bisnis</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Toko / Usaha</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="storefront-outline" size={20} color={colors.neutral[500]} />
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Mis: Toko Maju Jaya"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori Bisnis</Text>
            <TouchableOpacity 
              style={[styles.inputContainer, showTypePicker && styles.inputContainerActive]}
              activeOpacity={0.7}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Ionicons name="grid-outline" size={20} color={colors.neutral[500]} />
              <Text style={styles.pickerText}>
                {BUSINESS_TYPE_LABELS[businessType] || 'Pilih Kategori'}
              </Text>
              <Ionicons 
                name={showTypePicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.neutral[500]} 
              />
            </TouchableOpacity>

            {showTypePicker && (
              <View style={styles.pickerDropdown}>
                {businessTypes.map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.pickerItem,
                      businessType === key && styles.pickerItemActive
                    ]}
                    onPress={() => {
                      setBusinessType(key as BusinessType);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      businessType === key && styles.pickerItemTextActive
                    ]}>
                      {label}
                    </Text>
                    {businessType === key && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonMainText}>Simpan Perubahan</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { ...typography.h4, color: colors.text.primary },
  saveButtonTextContainer: { padding: spacing.xs },
  saveButtonText: { ...typography.button, color: colors.primary[600] },
  
  scrollContent: { flex: 1 },
  
  avatarSection: {
    alignItems: 'center', paddingVertical: spacing.xl,
    backgroundColor: '#FFFFFF', marginBottom: spacing.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[100],
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
    borderWidth: 2, borderColor: colors.primary[200],
  },
  avatarText: { ...typography.h1, color: colors.primary[600] },
  changeAvatarButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50], borderRadius: borderRadius.full,
  },
  changeAvatarText: { ...typography.buttonSm, color: colors.primary[600] },

  formSection: {
    backgroundColor: '#FFFFFF', padding: spacing.lg,
    borderRadius: borderRadius.lg, marginHorizontal: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4, color: colors.text.primary,
    marginBottom: spacing.lg, marginTop: spacing.xs,
  },
  divider: {
    height: 1, backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, height: 48,
    backgroundColor: colors.neutral[50], borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border.default,
  },
  inputContainerActive: { borderColor: colors.primary[400], backgroundColor: '#FFFFFF' },
  input: { flex: 1, ...typography.body, color: colors.text.primary },
  pickerText: { flex: 1, ...typography.body, color: colors.text.primary },
  
  pickerDropdown: {
    marginTop: spacing.xs, backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border.light,
    ...shadows.md, overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  pickerItemActive: { backgroundColor: colors.primary[50] },
  pickerItemText: { ...typography.body, color: colors.text.primary },
  pickerItemTextActive: { color: colors.primary[600], fontWeight: '600' },

  saveButton: {
    marginHorizontal: spacing.md, marginTop: spacing.xl,
    backgroundColor: colors.primary[500], paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, alignItems: 'center', ...shadows.sm,
  },
  saveButtonMainText: { ...typography.button, color: '#FFFFFF' },
});
