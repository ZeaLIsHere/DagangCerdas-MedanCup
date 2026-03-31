// DagangCerdas — Login / Welcome Screen
// Firebase Auth + Demo Mode fallback

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { loginWithEmail, registerWithEmail } from '../../src/services/firebase/auth';
import { isFirebaseConfigured } from '../../src/services/firebase/config';
import { FadeInView, ScalePressable } from '../../src/components/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { loginAsDemo, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    loginAsDemo();
    router.replace('/(tabs)');
  };

  const handleAuth = async () => {
    // Validasi input
    if (!email.trim()) {
      Alert.alert('Error', 'Email harus diisi');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Error', 'Kata sandi minimal 6 karakter');
      return;
    }
    if (isRegister && !name.trim()) {
      Alert.alert('Error', 'Nama harus diisi');
      return;
    }

    setLoading(true);

    if (isRegister) {
      const result = await registerWithEmail(email, password, name);
      setLoading(false);

      if (result.error === 'DEMO_MODE') {
        Alert.alert(
          'Mode Demo',
          'Firebase belum dikonfigurasi. Masuk ke mode demo?',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Mode Demo', onPress: handleDemoLogin },
          ]
        );
        return;
      }

      if (result.success && result.user) {
        Alert.alert('Berhasil! 🎉', 'Akun berhasil dibuat. Selamat datang!');
        setUser({
          id: result.user.uid,
          name: name || result.user.displayName || 'Pengguna Baru',
          email: result.user.email || email,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Gagal Daftar', result.error || 'Terjadi kesalahan');
      }
    } else {
      const result = await loginWithEmail(email, password);
      setLoading(false);

      if (result.error === 'DEMO_MODE') {
        Alert.alert(
          'Mode Demo',
          'Firebase belum dikonfigurasi. Masuk ke mode demo?',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Mode Demo', onPress: handleDemoLogin },
          ]
        );
        return;
      }

      if (result.success && result.user) {
        setUser({
          id: result.user.uid,
          name: result.user.displayName || 'Pengguna UMKM',
          email: result.user.email || email,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Gagal Login', result.error || 'Terjadi kesalahan');
      }
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary[600], colors.primary[900]]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Brand */}
          <FadeInView delay={0}>
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <Ionicons name="storefront" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>DagangCerdas</Text>
              <Text style={styles.tagline}>Solusi Cerdas UMKM Naik Kelas</Text>
            </View>
          </FadeInView>

          {/* Features Preview */}
          <FadeInView delay={200}>
            <View style={styles.featuresRow}>
              {[
                { icon: 'cart', label: 'Smart Kasir' },
                { icon: 'analytics', label: 'AI Mentor' },
                { icon: 'people', label: 'Belanja Kolektif' },
              ].map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon as any} size={20} color={colors.primary[600]} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </FadeInView>

          {/* Login/Register Form */}
          <FadeInView delay={400}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Akun Anda'}
              </Text>

              {/* Firebase status indicator */}
              <View style={[
                styles.firebaseStatus,
                { backgroundColor: isFirebaseConfigured ? colors.successLight : colors.warningLight },
              ]}>
                <Ionicons
                  name={isFirebaseConfigured ? 'cloud-done' : 'cloud-offline-outline'}
                  size={14}
                  color={isFirebaseConfigured ? colors.success : colors.warning}
                />
                <Text style={[
                  styles.firebaseStatusText,
                  { color: isFirebaseConfigured ? colors.success : colors.warning },
                ]}>
                  {isFirebaseConfigured ? 'Firebase Terhubung' : 'Mode Offline (Demo)'}
                </Text>
              </View>

              {isRegister && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Lengkap</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color={colors.neutral[400]} />
                    <TextInput
                      style={styles.input}
                      placeholder="Masukkan nama lengkap"
                      placeholderTextColor={colors.neutral[400]}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="email@contoh.com"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kata Sandi</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Minimal 6 karakter"
                    placeholderTextColor={colors.neutral[400]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.neutral[400]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScalePressable onPress={handleAuth} style={styles.loginButton} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>
                      {isRegister ? 'Daftar' : 'Masuk'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </ScalePressable>

              {/* Toggle Login/Register */}
              <TouchableOpacity
                style={styles.toggleAuth}
                onPress={() => setIsRegister(!isRegister)}
              >
                <Text style={styles.toggleAuthText}>
                  {isRegister
                    ? 'Sudah punya akun? Masuk'
                    : 'Belum punya akun? Daftar'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              <ScalePressable onPress={handleDemoLogin} style={styles.demoButton}>
                <Ionicons name="flash" size={20} color={colors.primary[600]} />
                <Text style={styles.demoButtonText}>Masuk Mode Demo</Text>
              </ScalePressable>

              <Text style={styles.demoHint}>
                Mode demo menggunakan data contoh Warung Nasi di Medan
              </Text>
            </View>
          </FadeInView>

          {/* Footer */}
          <FadeInView delay={600}>
            <Text style={styles.footer}>
              DagangCerdas v1.0.0 • MCC 2026{'\n'}
              Membangun UMKM Digital Menuju Indonesia Emas 2045
            </Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: SCREEN_HEIGHT * 0.06,
    paddingBottom: spacing['3xl'],
  },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: 32, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 1, marginBottom: spacing.xs,
  },
  tagline: { ...typography.body, color: 'rgba(255,255,255,0.8)' },

  // Features
  featuresRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: spacing.xl, marginBottom: spacing['2xl'],
  },
  featureItem: { alignItems: 'center' },
  featureIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs,
  },
  featureLabel: { ...typography.caption, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // Form
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius['2xl'],
    padding: spacing.xl, ...shadows.xl,
  },
  formTitle: {
    ...typography.h4, color: colors.text.primary,
    textAlign: 'center', marginBottom: spacing.md,
  },
  firebaseStatus: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 4, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full, alignSelf: 'center', marginBottom: spacing.lg,
  },
  firebaseStatusText: { fontSize: 11, fontWeight: '600' },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { ...typography.labelSm, color: colors.text.secondary, marginBottom: spacing.xs },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.neutral[50], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, height: 48,
    borderWidth: 1, borderColor: colors.border.light,
  },
  input: {
    flex: 1, ...typography.body, color: colors.text.primary, marginLeft: spacing.sm,
  },

  loginButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primary[600], borderRadius: borderRadius.md,
    paddingVertical: spacing.lg, gap: spacing.sm, ...shadows.md, marginTop: spacing.sm,
  },
  loginButtonText: { ...typography.button, color: '#FFFFFF', fontSize: 16 },

  toggleAuth: { paddingVertical: spacing.md, alignItems: 'center' },
  toggleAuthText: { ...typography.bodySm, color: colors.primary[500], fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.light },
  dividerText: { ...typography.caption, color: colors.text.tertiary, marginHorizontal: spacing.md },

  demoButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primary[50], borderRadius: borderRadius.md,
    paddingVertical: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  demoButtonText: { ...typography.button, color: colors.primary[600] },
  demoHint: {
    ...typography.caption, color: colors.text.tertiary,
    textAlign: 'center', marginTop: spacing.md,
  },

  // Footer
  footer: {
    ...typography.caption, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginTop: spacing['2xl'], lineHeight: 18,
  },
});
