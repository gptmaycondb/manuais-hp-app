import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, StatusBar
} from 'react-native';
import { searchManual, hasRelevantContent } from './search';
import { API_URL } from './data';

const C = {
  bg: '#0d0f14', surface: '#161920', surface2: '#1e2230',
  border: '#2a2f3e', accent: '#0096ff', accent2: '#00d4aa',
  text: '#e4e8f0', dim: '#7a8299', muted: '#4a5168',
  userBubble: '#1a2744', aiBubble: '#131a28',
  error: '#ff4d6d', errorBg: '#1a0a10',
};

export default function ChatScreen({ manual, isOnline, pendingQuestion, onQuestionSent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages([]);
  }, [manual.id]);

  useEffect(() => {
    if (pendingQuestion) {
      send(pendingQuestion);
      onQuestionSent && onQuestionSent();
    }
  }, [pendingQuestion]);

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  async function send(question) {
    if (!question.trim() || loading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: question };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    scrollToBottom();

    // Build conversation history for API
    const history = newMsgs.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    // Search manual first
    const chunks = searchManual(question, manual.indexKey, 5);
    const foundInManual = chunks.length > 0 && hasRelevantContent(question, manual.indexKey);

    let contextBlock = '';
    if (chunks.length > 0) {
      contextBlock = '\n\nTRECHOS DO MANUAL:\n\n' +
        chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n') +
        '\n\nInstrucao: responda com base nos trechos acima. Se as informacoes nao estiverem nos trechos, informe claramente e complemente com conhecimento geral.';
    } else {
      contextBlock = '\n\nNenhum trecho relevante encontrado nos manuais para esta pergunta. Informe ao usuario que a resposta nao foi encontrada nos manuais e responda com base em conhecimento geral sobre impressoras HP.';
    }

    const fullSystem = manual.prompt + contextBlock;

    // Offline mode
    if (!isOnline) {
      const offlineMsg = {
        id: Date.now() + 1, role: 'ai',
        text: foundInManual
          ? 'Modo offline â€” trechos encontrados no manual:\n\n' +
            chunks.map((c, i) => `[${i + 1}] ${c.substring(0, 400)}${c.length > 400 ? '...' : ''}`).join('\n\n')
          : 'Modo offline e nenhum trecho encontrado nos manuais para esta pergunta. Conecte-se para buscar online.',
        source: foundInManual ? 'Manual (offline)' : 'Sem resultado',
        offline: true,
      };
      setMessages(m => [...m, offlineMsg]);
      setLoading(false);
      scrollToBottom();
      return;
    }

    // Online: call API
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: fullSystem,
          messages: history,
          manualId: manual.id,
        }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { throw new Error('Resposta invalida do servidor'); }

      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
      if (!data.content?.length) throw new Error('Resposta vazia');

      const answer = data.content.map(b => b.text || '').join('');
      const source = foundInManual ? `Manual: ${manual.subtitle}` : 'Resposta online (nao encontrado no manual)';

      setMessages(m => [...m, {
        id: Date.now() + 1, role: 'ai', text: answer, source,
        fromManual: foundInManual,
      }]);
    } catch (err) {
      setMessages(m => [...m, {
        id: Date.now() + 1, role: 'ai',
        text: 'Erro: ' + err.message, isError: true,
      }]);
    }

    setLoading(false);
    scrollToBottom();
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
        <View style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarAi]}>
          <Text style={[styles.avatarText, { color: isUser ? C.accent : C.accent2 }]}>
            {isUser ? 'EU' : 'HP'}
          </Text>
        </View>
        <View style={styles.msgContent}>
          <View style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAi,
            item.isError && styles.bubbleError,
            item.offline && styles.bubbleOffline,
          ]}>
            <Text style={[styles.bubbleText, item.isError && { color: C.error }]}>
              {item.text}
            </Text>
          </View>
          {item.source && (
            <Text style={[
              styles.source,
              !item.fromManual && { color: '#f59e0b' }
            ]}>
              {item.fromManual ? 'â— ' : 'âš  '}{item.source}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderWelcome() {
    const questions = Object.values(manual.topics).flat().slice(0, 3);
    return (
      <View style={styles.welcome}>
        <View style={[styles.welcomeIcon, { backgroundColor: manual.color }]}>
          <Text style={styles.welcomeIconText}>HP</Text>
        </View>
        <Text style={styles.welcomeTitle}>{manual.label}</Text>
        <Text style={styles.welcomeSub}>{manual.subtitle}</Text>
        <Text style={styles.welcomeHint}>Sugestoes:</Text>
        {questions.map((q, i) => (
          <TouchableOpacity key={i} style={styles.suggBtn} onPress={() => send(q)}>
            <Text style={styles.suggText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <FlatList
            data={[{ key: 'welcome' }]}
            renderItem={renderWelcome}
            style={styles.list}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id.toString()}
            renderItem={renderMessage}
            style={styles.list}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {loading && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={C.accent2} />
            <Text style={styles.typingText}>Consultando manual...</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isOnline ? 'Pergunte sobre o modelo...' : 'Modo offline - busca no manual...'}
            placeholderTextColor={C.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>â–¶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1 },
  welcome: { padding: 24, alignItems: 'center', gap: 12, marginTop: 20 },
  welcomeIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  welcomeIconText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  welcomeTitle: { color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  welcomeSub: { color: C.dim, fontSize: 12, textAlign: 'center' },
  welcomeHint: { color: C.muted, fontSize: 11, marginTop: 8 },
  suggBtn: { width: '100%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12 },
  suggText: { color: C.dim, fontSize: 13 },
  msgRow: { flexDirection: 'row', gap: 8, maxWidth: '95%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowAi: { alignSelf: 'flex-start' },
  msgContent: { flex: 1 },
  avatar: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarUser: { backgroundColor: C.userBubble, borderWidth: 1, borderColor: '#2040a0' },
  avatarAi: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  avatarText: { fontSize: 10, fontWeight: '700' },
  bubble: { padding: 10, borderRadius: 14 },
  bubbleUser: { backgroundColor: C.userBubble, borderWidth: 1, borderColor: '#2040a0', borderTopRightRadius: 4 },
  bubbleAi: { backgroundColor: C.aiBubble, borderWidth: 1, borderColor: C.border, borderTopLeftRadius: 4 },
  bubbleError: { backgroundColor: C.errorBg, borderColor: '#4a1020' },
  bubbleOffline: { backgroundColor: '#1a0d2a', borderColor: '#6b21a8' },
  bubbleText: { color: C.text, fontSize: 13, lineHeight: 20 },
  source: { color: C.muted, fontSize: 10, marginTop: 4, marginLeft: 2 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingLeft: 16 },
  typingText: { color: C.dim, fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  input: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: C.border },
  sendIcon: { color: '#fff', fontSize: 16 },
});
