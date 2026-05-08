// DagangCerdas — AI Chatbot Screen
// Asisten AI berbasis Gemini 2.0 Flash untuk menjawab pertanyaan manajerial
// Fallback ke respons lokal jika tidak ada API key

import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { hasApiKey } from '../../src/services/ai/apiKeyStore';
import { chat } from '../../src/services/ai/chatbot';
import { createChatSession, deleteChatSession, getChatHistory, getUserChatSessions, saveChatMessage } from '../../src/services/database/repository';
import { useAuthStore } from '../../src/stores/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '../../src/theme';
import { formatDate } from '../../src/utils/formatters';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  isAI?: boolean; // true = from OpenAI, false = local fallback
}

const WELCOME_MESSAGE = 'Halo! Saya **Cerdas**, asisten AI bisnis Anda.\n\nSaya bisa membantu:\n- Analisis penjualan & rangkuman laporan\n- Cek stok & saran restok\n- Tips meningkatkan omzet\n- Prediksi kebutuhan bisnis\n- Insight pasar UMKM Medan\n\nSilakan tanya apa saja tentang bisnis Anda!';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIActive, setIsAIActive] = useState(false);
  
  // Fitur Sessions
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuthStore();

  const flatListRef = useRef<FlatList>(null);
  const conversationHistoryRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    checkAIStatus();
    loadSessionsList();
    loadChatHistory(null); // Load empty or initialize welcome
  }, [user?.id]); // Reload when user changes (login/logout)

  const checkAIStatus = async () => {
    const active = await hasApiKey();
    setIsAIActive(active);
  };

  const loadSessionsList = async () => {
    try {
      const list = await getUserChatSessions(user?.id || '');
      setSessions(list);
    } catch (error) {
      console.error('[Chat] Error loading sessions:', error);
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      createdAt: Date.now(),
      isAI: false,
    }]);
    conversationHistoryRef.current = [];
    setShowHistory(false);
  };

  const loadChatHistory = async (targetSessionId: string | null) => {
    setSessionId(targetSessionId);
    setShowHistory(false);
    
    // Reset welcome message if no session
    if (!targetSessionId) {
      startNewSession();
      return;
    }

    try {
      const history = await getChatHistory(user?.id || '', targetSessionId);
      if (history.length === 0) {
        // Welcome message
        const welcomeMsg: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: WELCOME_MESSAGE,
          createdAt: Date.now(),
          isAI: false,
        };
        setMessages([welcomeMsg]);
      } else {
        const mapped = history.map((h: any) => ({
          id: h.id,
          role: h.role as 'user' | 'assistant',
          content: h.content,
          createdAt: h.created_at,
          isAI: false,
        }));
        setMessages(mapped);
        // Rebuild conversation history for context
        conversationHistoryRef.current = mapped.map((m: ChatMessage) => ({
          role: m.role,
          content: m.content,
        }));
      }
    } catch (error) {
      console.error('[Chat] Load error:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Generate or use Session ID
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        // Auto-generate title dari pesan pertama
        const title = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
        currentSessionId = await createChatSession(user?.id || '', title);
        setSessionId(currentSessionId);
        loadSessionsList(); // update background list
      }

      // 2. Save user message to DB
      await saveChatMessage(user?.id || '', currentSessionId, 'user', userText);

      // Add to conversation history for context
      conversationHistoryRef.current.push({ role: 'user', content: userText });

      // Get AI response (tries OpenAI first, falls back to local)
      const result = await chat(userText, conversationHistoryRef.current, user);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        createdAt: Date.now(),
        isAI: result.isAI,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant response to DB
      await saveChatMessage(user?.id || '', currentSessionId, 'assistant', result.response);

      // Add to conversation history
      conversationHistoryRef.current.push({ role: 'assistant', content: result.response });

      // Update AI status
      setIsAIActive(result.isAI);
    } catch (error) {
      console.error('[Chat] Send error:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Maaf, terjadi kesalahan. Silakan coba lagi.',
        createdAt: Date.now(),
        isAI: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = (id: string, title: string) => {
    Alert.alert('Hapus Obrolan', `Hapus "${title}"?`, [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive', 
        onPress: async () => {
          await deleteChatSession(id);
          loadSessionsList();
          if (sessionId === id) startNewSession();
        }
      }
    ]);
  };

  const quickQuestions = [
    'Rangkum laporan penjualan minggu ini',
    'Analisis stok produk saya',
    'Berikan tips meningkatkan omzet',
    'Produk apa yang harus saya restok?',
    'Buatkan rekap penjualan hari ini',
    'Insight pasar UMKM di Medan',
  ];

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={[styles.aiAvatar, item.isAI && styles.aiAvatarActive]}>
            <Ionicons name="sparkles" size={16} color={item.isAI ? '#FFFFFF' : colors.primary[600]} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isUser && styles.userTime]}>
              {formatDate(item.createdAt, 'time')}
            </Text>
            {!isUser && item.isAI !== undefined && (
              <View style={[styles.aiBadge, item.isAI ? styles.aiBadgeActive : styles.aiBadgeLocal]}>
                <Text style={[styles.aiBadgeText, item.isAI && styles.aiBadgeTextActive]}>
                  {item.isAI ? 'Gemini' : 'Lokal'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <Stack.Screen 
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.iconBtn}>
                <Ionicons name="time-outline" size={24} color={colors.primary[600]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={startNewSession} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={24} color={colors.primary[600]} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      {/* AI Status Banner */}
      <View style={[styles.statusBanner, isAIActive ? styles.statusBannerAI : styles.statusBannerLocal]}>
        <Ionicons
          name={isAIActive ? 'cloud-done' : 'phone-portrait'}
          size={14}
          color={isAIActive ? colors.success : colors.warning}
        />
        <Text style={styles.statusText}>
          {isAIActive ? 'Terhubung ke AI (Gemini 2.0)' : 'Mode Offline — Atur API Key di Profil'}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListHeaderComponent={
          messages.length <= 1 ? (
            <View style={styles.quickQuestionsSection}>
              <Text style={styles.quickQuestionsTitle}>💬 Tanya Cerdas:</Text>
              {quickQuestions.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickQuestionChip}
                  onPress={() => {
                    setInput(q.replace(/^[\p{Emoji}\s]+/u, '').trim());
                  }}
                >
                  <Text style={styles.quickQuestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.loadingText}>
            {isAIActive ? 'AI Cerdas sedang menganalisis...' : 'Cerdas sedang berpikir...'}
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Tanya seputar bisnis Anda..."
          placeholderTextColor={colors.neutral[400]}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Riwayat Chat</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {sessions.length === 0 ? (
                <Text style={styles.noHistoryText}>Belum ada riwayat chat.</Text>
              ) : (
                sessions.map((session) => (
                  <TouchableOpacity 
                    key={session.id} 
                    style={[styles.sessionItem, sessionId === session.id && styles.sessionItemActive]}
                    onPress={() => loadChatHistory(session.id)}
                  >
                    <View style={styles.sessionItemText}>
                      <Text style={styles.sessionItemTitle} numberOfLines={1}>{session.title}</Text>
                      <Text style={styles.sessionItemTime}>{formatDate(session.updated_at, 'time')} - {formatDate(session.updated_at, 'short')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteSession(session.id, session.title)} style={styles.deleteIconBtn}>
                      <Ionicons name="trash-outline" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  headerButtons: { flexDirection: 'row', gap: spacing.md, marginRight: spacing.sm },
  iconBtn: { padding: 4 },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: 6,
  },
  statusBannerAI: { backgroundColor: colors.successLight },
  statusBannerLocal: { backgroundColor: colors.warningLight },
  statusText: { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },

  messageList: { padding: spacing.lg, paddingBottom: spacing.xl },

  messageBubble: {
    flexDirection: 'row', marginBottom: spacing.md, maxWidth: '85%',
  },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm, marginTop: 4,
  },
  aiAvatarActive: {
    backgroundColor: colors.primary[500],
  },

  messageContent: {
    borderRadius: borderRadius.lg, padding: spacing.md, maxWidth: '95%',
  },
  userContent: {
    backgroundColor: colors.primary[500], borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, ...shadows.sm,
  },

  messageText: { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: spacing.sm, marginTop: spacing.xs,
  },
  messageTime: { ...typography.caption, color: colors.text.tertiary, alignSelf: 'flex-end' },
  userTime: { color: 'rgba(255,255,255,0.7)' },

  // AI badge
  aiBadge: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
  },
  aiBadgeActive: { backgroundColor: colors.primary[50] },
  aiBadgeLocal: { backgroundColor: colors.neutral[100] },
  aiBadgeText: { fontSize: 9, fontWeight: '600', color: colors.text.tertiary },
  aiBadgeTextActive: { color: colors.primary[600] },

  quickQuestionsSection: { marginBottom: spacing.xl },
  quickQuestionsTitle: { ...typography.labelSm, color: colors.text.secondary, marginBottom: spacing.sm },
  quickQuestionChip: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
    borderWidth: 1, borderColor: colors.primary[100],
  },
  quickQuestionText: { ...typography.body, color: colors.primary[600] },

  loadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  loadingText: { ...typography.bodySm, color: colors.text.tertiary },

  inputContainer: {
    flexDirection: 'row', padding: spacing.md, paddingBottom: Platform.OS === 'android' ? spacing.md : spacing.xl,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.border.light,
    alignItems: 'flex-end', gap: spacing.sm,
  },
  textInput: {
    flex: 1, backgroundColor: colors.neutral[50], borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxHeight: 100,
    ...typography.body, color: colors.text.primary,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[500],
    justifyContent: 'center', alignItems: 'center', ...shadows.sm,
  },
  sendButtonDisabled: { backgroundColor: colors.neutral[300] },

  // Modal History
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#fff', borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg, maxHeight: '70%', minHeight: '50%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h3, color: colors.text.primary },
  modalScroll: { flexGrow: 1 },
  noHistoryText: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xl },
  sessionItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  sessionItemActive: { backgroundColor: colors.primary[50], borderRadius: borderRadius.md },
  sessionItemText: { flex: 1 },
  sessionItemTitle: { ...typography.body, color: colors.text.primary, fontWeight: '500', marginBottom: 2 },
  sessionItemTime: { ...typography.caption, color: colors.text.tertiary },
  deleteIconBtn: { padding: spacing.sm },
});
