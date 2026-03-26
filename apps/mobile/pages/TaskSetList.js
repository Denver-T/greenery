import React from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../components/NavBar';
 
const BG = require('../assets/bg.jpg');
const RADIUS = 12;
 
const COLORS = {
  green: '#6f8641',
  greenDark: '#5e7833',
  blockGreen: '#6f8641',
  textOnGreen: '#ffffff',
  cardFill: '#f8f8f8',
  cardBorder: '#d9e1c8',
  tint: 'rgba(125, 145, 98, 0.25)',
  mutedText: '#e9efd9',
  reqText: '#888888',
  titleGreen: '#5a7320',
  pillBg: '#eef3e6',
};
 
// TODO: Replace with real API data when endpoint is available
const TASK_SETS = [
  { id: 1, title: 'Task Set #1', forms: [1738, 1328, 7543] },
  { id: 2, title: 'Task Set #2', forms: [3333, 4444, 5555] },
  { id: 3, title: 'Task Set #3', forms: [6666, 7777, 8888] },
];
 
// ─── Task Set Card ────────────────────────────────────────
function TaskSetCard({ item, onViewMore }) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="clipboard-outline" size={18} color={COLORS.greenDark} />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{item.forms.length} forms</Text>
        </View>
      </View>
 
      {/* Divider */}
      <View style={styles.divider} />
 
      {/* Form list */}
      <View style={styles.cardForms}>
        {item.forms.map((form, index) => (
          <View key={index} style={styles.formRow}>
            <Ionicons name="document-text-outline" size={13} color={COLORS.reqText} />
            <Text style={styles.formText}>REQ Form: {form}</Text>
          </View>
        ))}
      </View>
 
      {/* View More */}
      <Pressable
        style={({ pressed }) => [
          styles.viewMoreBtn,
          pressed && styles.viewMoreBtnPressed,
        ]}
        onPress={() => onViewMore?.(item)}
        accessibilityRole="button"
        accessibilityLabel={`View more for ${item.title}`}
      >
        <Text style={styles.viewMoreText}>View More</Text>
        <Ionicons name="arrow-forward" size={13} color={COLORS.greenDark} />
      </Pressable>
    </View>
  );
}
 
// ─── Empty State ──────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="clipboard-outline" size={48} color={COLORS.greenDark} />
      <Text style={styles.emptyTitle}>No Task Sets</Text>
      <Text style={styles.emptySubtitle}>
        Task sets will appear here once they are assigned to you.
      </Text>
    </View>
  );
}
 
// ─── Screen ───────────────────────────────────────────────
export default function TaskSetList() {
  const handleViewMore = (item) => {
    // TODO: Navigate to task set detail screen when route is available
    console.log('View More pressed for:', item.title);
  };
 
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={COLORS.green} barStyle="light-content" />
 
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <View style={styles.tint} />
 
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Ionicons name="person-outline" size={22} color={COLORS.textOnGreen} />
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Greenery Team App</Text>
            <Text style={styles.topSubtitle}>Mobile View</Text>
          </View>
          <View style={[styles.topBarSide, { alignItems: 'flex-end' }]}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textOnGreen} />
          </View>
        </View>
 
        {/* Header Block */}
        <View style={styles.menuBlockWrap}>
          <View style={styles.menuBlock}>
            <Ionicons
              name="clipboard-text-outline"
              size={20}
              color={COLORS.textOnGreen}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.menuBlockText}>Task Sets</Text>
          </View>
        </View>
 
        {/* List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {TASK_SETS.length === 0 ? (
            <EmptyState />
          ) : (
            TASK_SETS.map((item) => (
              <TaskSetCard key={item.id} item={item} onViewMore={handleViewMore} />
            ))
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
 
        {/* Nav Bar */}
        <View style={styles.tabBar}>
          <NavBar />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.green },
  bg: { flex: 1 },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.tint },
 
  topBar: {
    height: 52,
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 6,
  },
  topBarSide: { width: 32 },
  topBarCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    color: COLORS.textOnGreen,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topSubtitle: { color: COLORS.mutedText, fontSize: 11, marginTop: -2 },
 
  menuBlockWrap: { marginTop: 8, marginBottom: 8, paddingHorizontal: 6 },
  menuBlock: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.blockGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  menuBlockText: {
    color: COLORS.textOnGreen,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
 
  scrollContent: { paddingHorizontal: 12, paddingTop: 6 },
 
  // Card
  card: {
    backgroundColor: COLORS.cardFill,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.titleGreen },
  countPill: {
    backgroundColor: COLORS.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: { fontSize: 11, color: COLORS.greenDark, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginBottom: 10 },
  cardForms: { marginBottom: 12, gap: 6 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formText: { fontSize: 13, color: COLORS.reqText, lineHeight: 18 },
 
  // View More
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  viewMoreBtnPressed: { backgroundColor: COLORS.pillBg },
  viewMoreText: { fontSize: 13, color: COLORS.greenDark, fontWeight: '600' },
 
  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.titleGreen,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },
 
  tabBar: { backgroundColor: COLORS.green },
});