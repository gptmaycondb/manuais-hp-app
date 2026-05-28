import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, Modal, Animated, Dimensions,
  Platform
} from 'react-native';
import { MANUALS } from './src/data';
import ChatScreen from './src/ChatScreen';
import DrawerContent from './src/DrawerContent';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.82, 300);

const C = {
  bg: '#0d0f14', surface: '#161920', surface2: '#1e2230',
  border: '#2a2f3e', accent: '#0096ff', accent2: '#00d4aa',
  text: '#e4e8f0', dim: '#7a8299', muted: '#4a5168',
};

export default function App() {
  const [currentId, setCurrentId] = useState(MANUALS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const chatRef = useRef(null);

  const manual = MANUALS.find(m => m.id === currentId);

  // Simulate network check (Expo Network requires extra setup)
  useEffect(() => {
    checkOnline();
    const interval = setInterval(checkOnline, 10000);
    return () => clearInterval(interval);
  }, []);

  async function checkOnline() {
    try {
      const res = await fetch('https://manuais-hp.onrender.com/', {
        method: 'HEAD', signal: AbortSignal.timeout(3000)
      });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }

  function openDrawer() {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 65, friction: 11
    }).start();
  }

  function closeDrawer() {
    Animated.spring(drawerAnim, {
      toValue: -DRAWER_W, useNativeDriver: true,
      tension: 65, friction: 11
    }).start(() => setDrawerOpen(false));
  }

  function handleQuestion(q) {
    closeDrawer();
    setPendingQuestion(q);
  }

  function selectManual(id) {
    setCurrentId(id);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      {/* HEADER */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>HP</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{manual.label}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{manual.subtitle}</Text>
          </View>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>OFFLINE</Text>
            </View>
          )}
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Text style={styles.menuBtnText}>☰</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* TABS */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {MANUALS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.tab, currentId === m.id && { borderColor: m.color, backgroundColor: m.color + '15' }]}
              onPress={() => selectManual(m.id)}
            >
              <Text style={[styles.tabText, currentId === m.id && { color: m.color, fontWeight: '700' }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* CHAT */}
      <ChatScreen
        key={currentId}
        manual={manual}
        isOnline={isOnline}
        pendingQuestion={pendingQuestion}
        onQuestionSent={() => setPendingQuestion(null)}
      />

      {/* DRAWER OVERLAY */}
      {drawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeDrawer}
        />
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.drawerClose}>
              <Text style={styles.drawerCloseTitle}>Topicos Rapidos</Text>
              <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <DrawerContent manual={manual} onQuestion={handleQuestion} />
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerSafe: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  headerLogoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  headerSub: { color: C.dim, fontSize: 10, marginTop: 1 },
  offlineBadge: { backgroundColor: '#1a0d2a', borderWidth: 1, borderColor: '#6b21a8', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  offlineBadgeText: { color: '#a855f7', fontSize: 9, fontWeight: '700' },
  menuBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  menuBtnText: { color: C.dim, fontSize: 18 },
  tabsWrapper: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2 },
  tabText: { color: C.dim, fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_W, backgroundColor: C.surface, zIndex: 50, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 20 },
  drawerClose: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  drawerCloseTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  closeBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: C.dim, fontSize: 14 },
});
