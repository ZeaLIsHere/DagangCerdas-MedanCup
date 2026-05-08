import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Bagaimana cara menambahkan produk baru?',
    answer: 'Buka menu Kasir atau Inventori, lalu tekan tombol "Tambah Produk", masukkan rincian produk seperti nama, harga, stok, lalu simpan.',
  },
  {
    question: 'Apakah aplikasi bisa dipakai tanpa internet?',
    answer: 'Ya, DagangCerdas dilengkapi fitur offline-first. Semua data disimpan secara lokal dan akan otomatis sinkron ke server saat koneksi internet tersedia.',
  },
  {
    question: 'Bagaimana cara AI Mentor bekerja?',
    answer: 'AI Mentor menganalisis data riwayat transaksi Anda untuk memberikan prediksi penjualan, saran produk terlaris, dan insight bisnis lainnya dengan menggunakan model Gemini.',
  },
  {
    question: 'Di mana saya bisa melihat riwayat transaksi?',
    answer: 'Anda bisa melihatnya di bagian "Riwayat Transaksi" di halaman profil ini, atau langsung di menu Kasir melalui riwayat harian.',
  },
  {
    question: 'Apakah data saya aman?',
    answer: 'Tenang saja, data lokal Anda disimpan aman di perangkat, dan ketika online akan dibackup secara terenkripsi menggunakan Firebase Firestore Authentication.',
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bantuan & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-buoy-outline" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Ada pertanyaan?</Text>
          <Text style={styles.subtitle}>
            Temukan jawaban untuk pertanyaan yang paling sering ditanyakan oleh pengguna DagangCerdas di bawah ini.
          </Text>
        </View>

        <View style={styles.faqSection}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqCardHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(index)}
                >
                  <Text style={[styles.questionText, isExpanded && styles.questionTextActive]}>
                    {faq.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={isExpanded ? colors.primary[500] : colors.neutral[500]}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Masih butuh bantuan?</Text>
          <Text style={styles.supportSubtitle}>
            Tim kami siap membantu Anda menyelesaikan kendala kapan saja.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.contactButtonText}>Hubungi Support</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  backButton: { padding: spacing.xs, width: 40 },
  headerTitle: { ...typography.h4, color: colors.text.primary, flex: 1, textAlign: 'center' },
  
  scrollContent: { flex: 1 },

  contentHeader: {
    padding: spacing.xl, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  title: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: {
    ...typography.body, color: colors.text.secondary,
    textAlign: 'center', paddingHorizontal: spacing.lg,
  },

  faqSection: { padding: spacing.lg, gap: spacing.md },
  faqCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg,
    ...shadows.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.light,
  },
  faqCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, backgroundColor: '#FFFFFF',
  },
  questionText: { flex: 1, ...typography.label, color: colors.text.primary, paddingRight: spacing.md },
  questionTextActive: { color: colors.primary[600] },
  answerContainer: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs,
    backgroundColor: colors.neutral[50],
  },
  answerText: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },

  supportContainer: {
    marginTop: spacing.xl, marginHorizontal: spacing.lg, padding: spacing.xl,
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.xl,
    alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: colors.primary[100],
  },
  supportTitle: { ...typography.h4, color: colors.text.primary, marginBottom: spacing.xs },
  supportSubtitle: {
    ...typography.bodySm, color: colors.text.secondary,
    textAlign: 'center', marginBottom: spacing.lg,
  },
  contactButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.primary[50], borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  contactButtonText: { ...typography.button, color: colors.primary[600] },
});
